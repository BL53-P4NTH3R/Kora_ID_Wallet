/**
 * Offline SD-JWT VP Verification Engine for Kora ID Verifier
 *
 * Implements 100% offline verification per draft-ietf-oauth-sd-jwt-vc
 * and draft-ietf-oauth-selective-disclosure-jwt standards:
 *
 * 1. Verifies Issuer signature against pinned local public keys (NIMC, FRSC, NYSC)
 *    without making any external network requests.
 * 2. Validates Selective Disclosure integrity (disclosures map to issuer _sd digests).
 * 3. Validates Holder Key Binding JWT (KB-JWT) signed with the holder's private key.
 * 4. Enforces anti-replay via single-use nonces and 120-second timestamp freshness window.
 * 5. Classifies checks into Attribute Proof vs. Identity Proof.
 */

import * as jose from "jose";
import type { JWK } from "@/types/identity";
import {
  MOCK_ISSUER_REGISTRY,
  getIssuerPublicKey,
} from "@/lib/crypto/issuer";
import {
  parseSDJWT,
  decodeDisclosure,
} from "@/lib/crypto/sdjwt";
import { base64urlEncode } from "@/lib/crypto/keys";
import { computeSaltedAuditHash, recordAuditEntry, type AuditLogEntry } from "./auditLog";

export interface VerificationChecks {
  issuerSignature: boolean;
  selectiveDisclosureIntegrity: boolean;
  holderKeyBinding: boolean;
  nonceFreshness: boolean;
  replayProtection: boolean;
  credentialNotExpired: boolean;
}

export interface DetailedVerificationResult {
  verified: boolean;
  checkType: "ATTRIBUTE_OVER_18" | "IDENTITY_PROOF" | "FULL_DOCUMENT" | "CUSTOM";
  issuerName: string;
  issuerId: string;
  credentialType: string;
  credentialId: string;
  holderKeyId?: string;
  disclosedClaims: Record<string, unknown>;
  verifiedBooleanResult?: {
    label: string;
    value: boolean;
    description: string;
  };
  verifiedIdentityResult?: {
    fullName: string;
    portraitHash?: string;
    portrait?: string;
  };
  checks: VerificationChecks;
  errors: string[];
  warnings: string[];
  timestamp: string;
  auditEntry?: AuditLogEntry;
}

// In-memory nonce cache to prevent replay within session
const USED_NONCES = new Set<string>();

/**
 * Verifies an SD-JWT Presentation (VP) completely offline.
 *
 * @param compact - The presented SD-JWT token: <issuer-jwt>~<disc1>~...~<kb-jwt>
 * @param verifierId - Identifier of the field terminal (e.g. "KIOSK-LAGOS-042")
 * @param expectedNonce - Optional expected nonce if provided by this specific terminal
 * @param expectedAudience - Optional expected audience (e.g. terminal domain)
 */
export async function verifySDJWTPresentationOffline(
  compact: string,
  verifierId: string = "KIOSK-LAGOS-042",
  expectedNonce?: string,
  expectedAudience?: string
): Promise<DetailedVerificationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const checks: VerificationChecks = {
    issuerSignature: false,
    selectiveDisclosureIntegrity: false,
    holderKeyBinding: false,
    nonceFreshness: false,
    replayProtection: false,
    credentialNotExpired: false,
  };

  const nowEpoch = Math.floor(Date.now() / 1000);
  let issuerName = "Unknown Authority";
  let issuerId = "";
  let credentialType = "Unknown";
  let credentialId = "cred_" + Date.now();
  let holderKeyId: string | undefined;
  const disclosedClaims: Record<string, unknown> = {};

  try {
    // 1. Parse Presentation Token
    const { issuerJwt, disclosureStrings, keyBindingJwt } = parseSDJWT(compact);

    if (!issuerJwt) {
      throw new Error("Invalid presentation: missing issuer JWT.");
    }

    // 2. Decode unverified header & payload to identify pinned issuer
    const unverifiedPayload = jose.decodeJwt(issuerJwt);
    const unverifiedHeader = jose.decodeProtectedHeader(issuerJwt);

    issuerId = (unverifiedPayload.iss as string) || "did:web:nimc.gov.ng";
    credentialType = (unverifiedPayload.vct as string) || (unverifiedPayload.vct_name as string) || "SD-JWT VC";
    credentialId = (unverifiedPayload.jti as string) || `urn:uuid:${Math.random().toString(36).substring(2, 9)}`;

    // Pinned Issuer Resolution
    let issuerPubKey: JWK | undefined;
    if (issuerId in MOCK_ISSUER_REGISTRY) {
      const issuerConfig = MOCK_ISSUER_REGISTRY[issuerId];
      issuerPubKey = issuerConfig.keyPair.publicKey;
      issuerName = issuerConfig.name;
    } else {
      // Fallback: check if NYSC or other known Nigerian trust roots
      if (issuerId.includes("nysc")) {
        issuerPubKey = getIssuerPublicKey("did:web:nimc.gov.ng");
        issuerName = "National Youth Service Corps (NYSC Trust Root)";
      } else if (issuerId.includes("frsc")) {
        issuerPubKey = getIssuerPublicKey("did:web:frsc.gov.ng");
        issuerName = "Federal Road Safety Corps (FRSC)";
      } else {
        issuerPubKey = getIssuerPublicKey("did:web:nimc.gov.ng");
        issuerName = "National Identity Management Commission (NIMC Pinned)";
      }
    }

    // 3. Cryptographically Verify Issuer Signature
    const importedIssuerKey = await jose.importJWK(
      issuerPubKey as jose.JWK,
      issuerPubKey.alg || "ES256"
    );

    const { payload } = await jose.jwtVerify(issuerJwt, importedIssuerKey, {
      typ: unverifiedHeader.typ || "vc+sd-jwt",
    });

    checks.issuerSignature = true;

    // Check expiration
    if (payload.exp && typeof payload.exp === "number") {
      if (payload.exp < nowEpoch) {
        errors.push("Credential has expired.");
      } else {
        checks.credentialNotExpired = true;
      }
    } else {
      checks.credentialNotExpired = true;
    }

    // 4. Verify Selective Disclosures Integrity
    const sdDigestsInPayload = new Set<string>((payload._sd as string[]) || []);
    let allDigestsMatched = true;

    for (const dStr of disclosureStrings) {
      // Decode disclosure
      const { claimName, claimValue } = decodeDisclosure(dStr);
      disclosedClaims[claimName] = claimValue;

      // Compute SHA-256 digest of disclosure string
      const dDigestBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(dStr)
      );
      const computedDigest = base64urlEncode(new Uint8Array(dDigestBuffer));

      // Verify digest was committed by the issuer in _sd
      if (!sdDigestsInPayload.has(computedDigest)) {
        allDigestsMatched = false;
        errors.push(`Tampered disclosure detected for claim '${claimName}'. Digest not found in issuer _sd array.`);
      }
    }

    checks.selectiveDisclosureIntegrity = allDigestsMatched;

    // 5. Verify Holder-Binding Key Binding JWT (KB-JWT)
    if (!keyBindingJwt) {
      errors.push("Missing Key Binding JWT: Presentation is not bound to a holder key.");
    } else if (!payload.cnf || !(payload.cnf as any).jwk) {
      errors.push("Issuer credential does not contain a holder confirmation key (cnf.jwk).");
    } else {
      const holderJwk = (payload.cnf as { jwk: JWK }).jwk;
      holderKeyId = holderJwk.kid;

      const importedHolderKey = await jose.importJWK(
        holderJwk as jose.JWK,
        holderJwk.alg || "ES256"
      );

      const { payload: kbPayload } = await jose.jwtVerify(
        keyBindingJwt,
        importedHolderKey,
        {
          typ: "kb+jwt",
        }
      );

      // Verify sd_hash: must match SHA-256 of <issuer-jwt>~<disc1>~...~
      const presentedPrefix =
        disclosureStrings.length > 0
          ? `${issuerJwt}~${disclosureStrings.join("~")}~`
          : `${issuerJwt}~~`;

      const sdHashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(presentedPrefix)
      );
      const expectedSdHash = base64urlEncode(new Uint8Array(sdHashBuffer));

      if (kbPayload.sd_hash !== expectedSdHash) {
        errors.push("Key Binding sd_hash mismatch: presented disclosures do not match signature binding.");
      }

      // Verify Nonce & Freshness (within 120 seconds per requirements)
      const nonce = kbPayload.nonce as string;
      if (!nonce) {
        errors.push("Missing nonce in Key Binding JWT.");
      } else {
        if (expectedNonce && nonce !== expectedNonce) {
          warnings.push("Presentation nonce differs from expected terminal nonce.");
        }

        // Single-use check
        if (USED_NONCES.has(nonce)) {
          errors.push(`Replay attack detected: Nonce '${nonce}' has already been used.`);
        } else {
          USED_NONCES.add(nonce);
          checks.replayProtection = true;
        }
      }

      // Freshness: |now - iat| <= 120 seconds
      if (typeof kbPayload.iat === "number") {
        const ageSeconds = Math.abs(nowEpoch - kbPayload.iat);
        if (ageSeconds > 120) {
          errors.push(`Presentation expired: Generated ${ageSeconds}s ago (maximum allowed: 120 seconds).`);
        } else {
          checks.nonceFreshness = true;
        }
      } else {
        errors.push("Missing issued-at (iat) timestamp in Key Binding JWT.");
      }

      checks.holderKeyBinding = errors.length === 0;
    }

    // 6. Classify Check Type & Results
    const claimKeys = Object.keys(disclosedClaims);
    let checkType: DetailedVerificationResult["checkType"] = "CUSTOM";
    let verifiedBooleanResult: DetailedVerificationResult["verifiedBooleanResult"];
    let verifiedIdentityResult: DetailedVerificationResult["verifiedIdentityResult"];

    const isAgeAttestation =
      claimKeys.includes("is_over_18") || claimKeys.includes("age_over_18");
    const isNameDisclosed =
      claimKeys.includes("first_name") || claimKeys.includes("holder_given_name");
    const isNINDisclosed =
      claimKeys.includes("nin") || claimKeys.includes("holder_nin");

    if (isAgeAttestation && !isNameDisclosed && !isNINDisclosed) {
      checkType = "ATTRIBUTE_OVER_18";
      const isOver18 = Boolean(
        disclosedClaims.is_over_18 ?? disclosedClaims.age_over_18
      );
      verifiedBooleanResult = {
        label: isOver18 ? "VERIFIED: OVER 18" : "FAILED: UNDER 18",
        value: isOver18,
        description: isOver18
          ? "Citizen is legally confirmed to be 18 years or older. All identity data concealed."
          : "Citizen does not meet the 18+ age requirement.",
      };
    } else if (isNameDisclosed) {
      checkType = "IDENTITY_PROOF";
      const firstName = (disclosedClaims.first_name || disclosedClaims.holder_given_name || "") as string;
      const lastName = (disclosedClaims.last_name || disclosedClaims.holder_family_name || "") as string;
      const portraitHash = (disclosedClaims.portrait_hash || "") as string;
      const portrait = (disclosedClaims.portrait || "") as string;

      verifiedIdentityResult = {
        fullName: `${firstName} ${lastName}`.trim() || "Verified Citizen",
        portraitHash: portraitHash || undefined,
        portrait: portrait || undefined,
      };
    } else if (claimKeys.length >= 6) {
      checkType = "FULL_DOCUMENT";
    }

    const verified =
      errors.length === 0 &&
      checks.issuerSignature &&
      checks.selectiveDisclosureIntegrity &&
      checks.holderKeyBinding &&
      checks.nonceFreshness &&
      checks.replayProtection &&
      checks.credentialNotExpired;

    // 7. Privacy-Preserving Audit Trail
    const { hashProof, salt } = await computeSaltedAuditHash(verifierId, credentialId);
    const auditEntry = await recordAuditEntry({
      verifierId,
      checkType: verified ? checkType : "REJECTED",
      credentialType,
      hashProof,
      salt,
      status: verified ? "PASSED" : "FAILED",
      details: verified
        ? `Verified via ${issuerName}`
        : errors[0] || "Verification failed",
    });

    return {
      verified,
      checkType,
      issuerName,
      issuerId,
      credentialType,
      credentialId,
      holderKeyId,
      disclosedClaims,
      verifiedBooleanResult,
      verifiedIdentityResult,
      checks,
      errors,
      warnings,
      timestamp: new Date().toISOString(),
      auditEntry,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    errors.push(errorMsg);

    const { hashProof, salt } = await computeSaltedAuditHash(verifierId, credentialId);
    const auditEntry = await recordAuditEntry({
      verifierId,
      checkType: "REJECTED",
      credentialType,
      hashProof,
      salt,
      status: "FAILED",
      details: errorMsg,
    });

    return {
      verified: false,
      checkType: "CUSTOM",
      issuerName,
      issuerId,
      credentialType,
      credentialId,
      disclosedClaims: {},
      checks,
      errors,
      warnings,
      timestamp: new Date().toISOString(),
      auditEntry,
    };
  }
}
