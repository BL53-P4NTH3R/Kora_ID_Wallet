/**
 * SD-JWT Construction & Verification
 *
 * Implements SD-JWT VC issuance and selective disclosure presentation
 * per draft-ietf-oauth-sd-jwt-vc and draft-ietf-oauth-selective-disclosure-jwt.
 */

import * as jose from "jose";
import type {
  JWK,
  SupportedAlgorithm,
  Disclosure,
  SDJWTCompact,
  SDJWTHeader,
  KeyBindingJWTPayload,
} from "@/types/identity";
import { base64urlEncode, base64urlDecode, importPrivateKey } from "./keys";

// ---------------------------------------------------------------------------
//  Disclosure creation
// ---------------------------------------------------------------------------

/**
 * Create a single SD-JWT disclosure.
 *
 * Format: base64url(JSON([salt, claim_name, claim_value]))
 * Digest: SHA-256(disclosure_string)
 */
export async function createDisclosure(
  claimName: string,
  claimValue: unknown
): Promise<Disclosure> {
  // Generate a cryptographically random 128-bit salt
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = base64urlEncode(saltBytes);

  // Create the disclosure array: [salt, claim_name, claim_value]
  const disclosureArray = JSON.stringify([salt, claimName, claimValue]);
  const encoded = base64urlEncode(new TextEncoder().encode(disclosureArray));

  // Compute the digest
  const digestBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(encoded)
  );
  const digest = base64urlEncode(new Uint8Array(digestBuffer));

  return {
    encoded,
    salt,
    claimName,
    claimValue,
    digest,
  };
}

/**
 * Create disclosures for all claims in an object.
 * Returns the disclosures and the _sd array of digests.
 */
export async function createDisclosures(
  claims: Record<string, unknown>,
  selectiveFields?: string[]
): Promise<{ disclosures: Disclosure[]; sdDigests: string[] }> {
  const fieldsToDisclose = selectiveFields ?? Object.keys(claims);
  const disclosures: Disclosure[] = [];
  const sdDigests: string[] = [];

  for (const field of fieldsToDisclose) {
    if (field in claims) {
      const disclosure = await createDisclosure(field, claims[field]);
      disclosures.push(disclosure);
      sdDigests.push(disclosure.digest);
    }
  }

  return { disclosures, sdDigests };
}

// ---------------------------------------------------------------------------
//  SD-JWT Issuance (Issuer-side)
// ---------------------------------------------------------------------------

/**
 * Issue an SD-JWT VC.
 *
 * @param payload - The full JWT claims payload
 * @param issuerPrivateKey - Issuer's JWK private key
 * @param disclosures - Pre-created disclosures
 * @param algorithm - Signing algorithm
 * @returns The complete SD-JWT compact serialization
 */
export async function issueSDJWT(
  payload: Record<string, unknown>,
  issuerPrivateKey: JWK,
  disclosures: Disclosure[],
  algorithm: SupportedAlgorithm = "ES256"
): Promise<SDJWTCompact> {
  const header: SDJWTHeader = {
    alg: algorithm,
    typ: "vc+sd-jwt",
    kid: issuerPrivateKey.kid,
  };

  // Import the issuer's private key for jose
  const privateKey = await jose.importJWK(
    issuerPrivateKey as jose.JWK,
    algorithm
  );

  // Sign the JWT
  const issuerJwt = await new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKey);

  // Build the compact serialization: <jwt>~<d1>~<d2>~...~
  const disclosureStrings = disclosures.map((d) => d.encoded);
  const compact =
    issuerJwt + "~" + disclosureStrings.join("~") + "~";

  return {
    compact,
    issuerJwt,
    disclosures,
  };
}

// ---------------------------------------------------------------------------
//  SD-JWT Presentation (Holder-side)
// ---------------------------------------------------------------------------

/**
 * Create a selective disclosure presentation.
 * The holder chooses which disclosures to include.
 *
 * @param sdJwt - The full SD-JWT from issuance
 * @param selectedDisclosures - Disclosures the holder consents to share
 * @param holderPrivateKey - Holder's private key for Key Binding JWT
 * @param nonce - Verifier's nonce
 * @param audience - Verifier identifier
 * @param algorithm - Signing algorithm
 * @returns SD-JWT VP compact serialization
 */
export async function createPresentation(
  sdJwt: SDJWTCompact,
  selectedDisclosures: Disclosure[],
  holderPrivateKey: JWK,
  nonce: string,
  audience: string,
  algorithm: SupportedAlgorithm = "ES256"
): Promise<string> {
  // Compute sd_hash: SHA-256 of the presented SD-JWT (without KB-JWT)
  const presentedSdJwt =
    sdJwt.issuerJwt +
    "~" +
    selectedDisclosures.map((d) => d.encoded).join("~") +
    "~";

  const sdHashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(presentedSdJwt)
  );
  const sdHash = base64urlEncode(new Uint8Array(sdHashBuffer));

  // Create Key Binding JWT
  const kbPayload: KeyBindingJWTPayload = {
    nonce,
    aud: audience,
    iat: Math.floor(Date.now() / 1000),
    sd_hash: sdHash,
  };

  const holderKey = await jose.importJWK(
    holderPrivateKey as jose.JWK,
    algorithm
  );

  const kbJwt = await new jose.SignJWT(kbPayload as unknown as jose.JWTPayload)
    .setProtectedHeader({
      alg: algorithm,
      typ: "kb+jwt",
    })
    .sign(holderKey);

  // Final presentation: <issuer-jwt>~<selected-disclosures>~<kb-jwt>
  return presentedSdJwt + kbJwt;
}

// ---------------------------------------------------------------------------
//  SD-JWT Verification (Verifier-side)
// ---------------------------------------------------------------------------

/**
 * Parse an SD-JWT compact serialization into its components.
 */
export function parseSDJWT(compact: string): {
  issuerJwt: string;
  disclosureStrings: string[];
  keyBindingJwt?: string;
} {
  const parts = compact.split("~");

  // First part is always the issuer JWT
  const issuerJwt = parts[0];

  // Last part may be the KB-JWT (non-empty) or empty (trailing ~)
  const lastPart = parts[parts.length - 1];
  const hasKbJwt = lastPart !== "" && parts.length > 2;

  const disclosureStrings = hasKbJwt
    ? parts.slice(1, -1).filter((s) => s !== "")
    : parts.slice(1).filter((s) => s !== "");

  return {
    issuerJwt,
    disclosureStrings,
    keyBindingJwt: hasKbJwt ? lastPart : undefined,
  };
}

/**
 * Decode a disclosure string into its components.
 */
export function decodeDisclosure(encoded: string): {
  salt: string;
  claimName: string;
  claimValue: unknown;
} {
  const decoded = new TextDecoder().decode(base64urlDecode(encoded));
  const [salt, claimName, claimValue] = JSON.parse(decoded);
  return { salt, claimName, claimValue };
}

/**
 * Verify an SD-JWT VP presentation.
 *
 * @param compact - The SD-JWT VP compact serialization
 * @param issuerPublicKey - Issuer's public JWK
 * @param expectedNonce - Expected nonce value
 * @param expectedAudience - Expected verifier identifier
 * @returns Decoded and verified claims
 */
export async function verifySDJWT(
  compact: string,
  issuerPublicKey: JWK,
  expectedNonce?: string,
  expectedAudience?: string
): Promise<{
  verified: boolean;
  disclosedClaims: Record<string, unknown>;
  payload: Record<string, unknown>;
  keyBindingValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let keyBindingValid = false;

  try {
    const { issuerJwt, disclosureStrings, keyBindingJwt } =
      parseSDJWT(compact);

    // 1. Verify the issuer JWT signature
    const pubKey = await jose.importJWK(
      issuerPublicKey as jose.JWK,
      issuerPublicKey.alg ?? "ES256"
    );

    const { payload } = await jose.jwtVerify(issuerJwt, pubKey, {
      typ: "vc+sd-jwt",
    });

    // 2. Decode all provided disclosures
    const disclosedClaims: Record<string, unknown> = {};
    for (const discStr of disclosureStrings) {
      const { claimName, claimValue } = decodeDisclosure(discStr);
      disclosedClaims[claimName] = claimValue;
    }

    // 3. Verify Key Binding JWT if present
    if (keyBindingJwt && payload.cnf) {
      try {
        const holderJwk = (payload.cnf as { jwk: jose.JWK }).jwk;
        const holderPubKey = await jose.importJWK(
          holderJwk,
          holderJwk.alg as string ?? "ES256"
        );

        const { payload: kbPayload } = await jose.jwtVerify(
          keyBindingJwt,
          holderPubKey,
          {
            typ: "kb+jwt",
          }
        );

        // Verify nonce
        if (expectedNonce && kbPayload.nonce !== expectedNonce) {
          errors.push("Key Binding JWT nonce mismatch");
        }

        // Verify audience
        if (expectedAudience && kbPayload.aud !== expectedAudience) {
          errors.push("Key Binding JWT audience mismatch");
        }

        keyBindingValid = errors.length === 0;
      } catch (kbError) {
        errors.push(`Key Binding JWT verification failed: ${kbError}`);
      }
    }

    // 4. Check expiration
    if (payload.exp && typeof payload.exp === "number") {
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        errors.push("Credential has expired");
      }
    }

    return {
      verified: errors.length === 0,
      disclosedClaims,
      payload: payload as Record<string, unknown>,
      keyBindingValid,
      errors,
    };
  } catch (error) {
    return {
      verified: false,
      disclosedClaims: {},
      payload: {},
      keyBindingValid: false,
      errors: [`SD-JWT verification failed: ${error}`],
    };
  }
}
