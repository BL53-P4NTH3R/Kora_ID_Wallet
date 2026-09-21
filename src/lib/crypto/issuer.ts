/**
 * Issuer Engine for Kora ID (SD-JWT VC)
 *
 * Implements an Issuer Engine compliant with draft-ietf-oauth-sd-jwt-vc
 * and draft-ietf-oauth-selective-disclosure-jwt using `jose` with ES256 / Ed25519 keypairs.
 *
 * Features:
 * - Mock issuer key registry for NIMC and FRSC
 * - Selective disclosure salting for individual attributes (NIN, name, birth date, 18+ status, portrait hash, etc.)
 * - SHA-256 disclosure digest computation
 * - Holder key binding (cnf: { jwk })
 * - SD-JWT credential signing and compact serialization (<jwt>~<d1>~<d2>...~)
 */

import * as jose from "jose";
import type {
  JWK,
  SupportedAlgorithm,
  Disclosure,
  SDJWTHeader,
  IssuerMetadata,
  CredentialType,
} from "@/types/identity";
import { base64urlEncode, computeJwkThumbprint } from "./keys";

// ---------------------------------------------------------------------------
//  Types & Interfaces
// ---------------------------------------------------------------------------

export interface MockIssuer {
  id: string;
  name: string;
  organization: string;
  country: string;
  credentialType: CredentialType;
  vct: string;
  algorithm: SupportedAlgorithm;
  keyPair: {
    publicKey: JWK;
    privateKey: JWK;
  };
}

export interface IssueSDJWTOptions {
  /** Issuer identifier or alias (defaults to "did:web:nimc.gov.ng") */
  issuerId?: string;
  /** Custom Verifiable Credential Type (vct) */
  vct?: string;
  /** Credential validity in seconds (default: 1 year) */
  validitySeconds?: number;
  /** Explicit subject identifier (defaults to holder public key thumbprint) */
  subject?: string;
  /** Additional claims to include in the un-salted JWT payload */
  additionalPayload?: Record<string, unknown>;
}

export interface IssuedSDJWTCredential {
  /** Compact SD-JWT string: <issuer-jwt>~<d1>~<d2>~...~ */
  compact: string;
  /** The issuer signed JWT */
  issuerJwt: string;
  /** List of all generated disclosures */
  disclosures: Disclosure[];
  /** Array of disclosure digests (_sd) */
  sdDigests: string[];
  /** The complete signed payload */
  payload: Record<string, unknown>;
  /** Issuer metadata */
  issuer: IssuerMetadata;
}

// ---------------------------------------------------------------------------
//  Mock Issuer Key Registry
// ---------------------------------------------------------------------------

/**
 * Deterministic ES256 keypairs for Nigerian issuing authorities:
 * - NIMC: National Identity Management Commission (NIN PID)
 * - FRSC: Federal Road Safety Corps (Driver's License)
 */
export const MOCK_ISSUER_REGISTRY: Record<string, MockIssuer> = {
  // National Identity Management Commission (NIMC)
  "did:web:nimc.gov.ng": {
    id: "did:web:nimc.gov.ng",
    name: "National Identity Management Commission (NIMC)",
    organization: "Federal Government of Nigeria",
    country: "NG",
    credentialType: "NIN_PID",
    vct: "https://identity.nimc.gov.ng/credentials/v1/pid",
    algorithm: "ES256",
    keyPair: {
      publicKey: {
        kty: "EC",
        crv: "P-256",
        x: "1FikIPE6dpSM-Bi9TlCnNkNGPQTTyUnOQbOTEKcYirE",
        y: "d0sGA7BMIONDjxWi5y9N3y2QFfsJsu2Ur2iTVqQRQG4",
        kid: "nimc-issuer-key-2026",
        alg: "ES256",
        use: "sig",
      },
      privateKey: {
        kty: "EC",
        crv: "P-256",
        x: "1FikIPE6dpSM-Bi9TlCnNkNGPQTTyUnOQbOTEKcYirE",
        y: "d0sGA7BMIONDjxWi5y9N3y2QFfsJsu2Ur2iTVqQRQG4",
        d: "5MQ6nNVhe4z4_RcrZQfwF-FAwX5Tffs2txX-nCtfdnI",
        kid: "nimc-issuer-key-2026",
        alg: "ES256",
        use: "sig",
      },
    },
  },

  // Federal Road Safety Corps (FRSC)
  "did:web:frsc.gov.ng": {
    id: "did:web:frsc.gov.ng",
    name: "Federal Road Safety Corps (FRSC)",
    organization: "Federal Government of Nigeria",
    country: "NG",
    credentialType: "FRSC_DRIVERS_LICENSE",
    vct: "https://identity.frsc.gov.ng/credentials/v1/drivers-license",
    algorithm: "ES256",
    keyPair: {
      publicKey: {
        kty: "EC",
        crv: "P-256",
        x: "xo0pwoaum7CIdaqDQgjNKvVK52wZgzdngmzzw47I96U",
        y: "AjSdnHsSBkO9B1iOk7pDZ0SOPTpd_kj2FyHCjPGHi2Q",
        kid: "frsc-issuer-key-2026",
        alg: "ES256",
        use: "sig",
      },
      privateKey: {
        kty: "EC",
        crv: "P-256",
        x: "xo0pwoaum7CIdaqDQgjNKvVK52wZgzdngmzzw47I96U",
        y: "AjSdnHsSBkO9B1iOk7pDZ0SOPTpd_kj2FyHCjPGHi2Q",
        d: "Rd2f3BZPaddWFn_TXmx7XR_c6r_kvAYaj_XQV2pj0xw",
        kid: "frsc-issuer-key-2026",
        alg: "ES256",
        use: "sig",
      },
    },
  },

  // National Youth Service Corps (NYSC)
  "did:web:nysc.gov.ng": {
    id: "did:web:nysc.gov.ng",
    name: "National Youth Service Corps (NYSC)",
    organization: "Federal Government of Nigeria",
    country: "NG",
    credentialType: "STUDENT_ID",
    vct: "https://identity.nysc.gov.ng/credentials/v1/nysc-pass",
    algorithm: "ES256",
    keyPair: {
      publicKey: {
        kty: "EC",
        crv: "P-256",
        x: "mOIRCxwaAs9N9Uk2M4UqVG6GV4lEir_q21VO6ezFRSE",
        y: "XGw4KMk7HbeufwJ2s3q2nm1xavQwRB7luu4dLuP5h6k",
        kid: "nysc-issuer-key-2026",
        alg: "ES256",
        use: "sig",
      },
      privateKey: {
        kty: "EC",
        crv: "P-256",
        x: "mOIRCxwaAs9N9Uk2M4UqVG6GV4lEir_q21VO6ezFRSE",
        y: "XGw4KMk7HbeufwJ2s3q2nm1xavQwRB7luu4dLuP5h6k",
        d: "cekJ1araQ4ccPyLUy4HPO_NxfwBFijG4cwFwL2ScO70",
        kid: "nysc-issuer-key-2026",
        alg: "ES256",
        use: "sig",
      },
    },
  },
};

/** Alias registry mapping friendly names / types to issuer IDs */
const ISSUER_ALIASES: Record<string, string> = {
  nimc: "did:web:nimc.gov.ng",
  NIMC: "did:web:nimc.gov.ng",
  NIN_PID: "did:web:nimc.gov.ng",
  frsc: "did:web:frsc.gov.ng",
  FRSC: "did:web:frsc.gov.ng",
  FRSC_DRIVERS_LICENSE: "did:web:frsc.gov.ng",
  nysc: "did:web:nysc.gov.ng",
  NYSC: "did:web:nysc.gov.ng",
  STUDENT_ID: "did:web:nysc.gov.ng",
};

/**
 * Retrieve issuer configuration by ID, alias, or credential type.
 */
export function getMockIssuer(idOrAlias: string = "did:web:nimc.gov.ng"): MockIssuer {
  const resolvedId = ISSUER_ALIASES[idOrAlias] || idOrAlias;
  const issuer = MOCK_ISSUER_REGISTRY[resolvedId];
  if (!issuer) {
    throw new Error(`Issuer not found in registry for identifier: "${idOrAlias}"`);
  }
  return issuer;
}

/**
 * Retrieve the public key for an issuer.
 */
export function getIssuerPublicKey(idOrAlias: string): JWK {
  return getMockIssuer(idOrAlias).keyPair.publicKey;
}

/**
 * Retrieve the private key for an issuer.
 */
export function getIssuerPrivateKey(idOrAlias: string): JWK {
  return getMockIssuer(idOrAlias).keyPair.privateKey;
}

/**
 * Register or override a custom issuer in the registry.
 */
export function registerCustomIssuer(issuer: MockIssuer): void {
  MOCK_ISSUER_REGISTRY[issuer.id] = issuer;
  ISSUER_ALIASES[issuer.name] = issuer.id;
  ISSUER_ALIASES[issuer.credentialType] = issuer.id;
}

// ---------------------------------------------------------------------------
//  Salting and Disclosure Generation Primitives
// ---------------------------------------------------------------------------

/**
 * Create a single salted SD-JWT disclosure.
 *
 * Spec: base64url(JSON([salt, claim_name, claim_value]))
 * Digest: base64url(SHA-256(disclosure_string))
 */
export async function createSaltedDisclosure(
  claimName: string,
  claimValue: unknown
): Promise<Disclosure> {
  // Generate 128 bits (16 bytes) of cryptographically secure random salt
  const saltBytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(saltBytes);
  } else {
    // Fallback for non-standard environments
    for (let i = 0; i < 16; i++) {
      saltBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const salt = base64urlEncode(saltBytes);

  // Per draft-ietf-oauth-selective-disclosure-jwt §5.1:
  // Disclosures are arrays: [salt, claim_name, claim_value]
  const disclosureArray = JSON.stringify([salt, claimName, claimValue]);
  const encoded = base64urlEncode(new TextEncoder().encode(disclosureArray));

  // Compute SHA-256 digest
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

// ---------------------------------------------------------------------------
//  SD-JWT Credential Issuance Engine
// ---------------------------------------------------------------------------

/**
 * Issues an SD-JWT Verifiable Credential.
 *
 * Salts every individual attribute (nin, first_name, last_name, birth_date,
 * is_over_18, portrait_hash, etc.), generates SHA-256 disclosure digests,
 * binds the holder's public key (cnf: { jwk }), and signs the payload
 * using the issuer's ES256 keypair via `jose`.
 *
 * @param claims - Attribute claims dictionary to selectively disclose
 * @param holderPublicKeyJwk - Holder's public key for cryptographic binding
 * @param options - Optional issuance configuration (issuer, validity, etc.)
 * @returns Complete issued SD-JWT credential and disclosures
 */
export async function issueSDJWTCredential(
  claims: Record<string, any>,
  holderPublicKeyJwk: JWK,
  options: IssueSDJWTOptions = {}
): Promise<IssuedSDJWTCredential> {
  if (!claims || typeof claims !== "object") {
    throw new Error("Invalid claims: claims must be a non-null object.");
  }
  if (!holderPublicKeyJwk || !holderPublicKeyJwk.kty) {
    throw new Error("Invalid holder public key: must provide a valid JWK.");
  }

  // 1. Resolve Issuer
  let issuerId = options.issuerId;
  if (!issuerId) {
    // Auto-detect issuer if claims contain driver license fields
    if ("license_number" in claims || "license_classes" in claims) {
      issuerId = "did:web:frsc.gov.ng";
    } else {
      issuerId = "did:web:nimc.gov.ng";
    }
  }
  const issuer = getMockIssuer(issuerId);

  // 2. Salt every individual attribute into an SD-JWT disclosure
  const disclosures: Disclosure[] = [];
  const sdDigests: string[] = [];

  for (const [claimName, claimValue] of Object.entries(claims)) {
    // Only salt defined values
    if (claimValue !== undefined) {
      const disclosure = await createSaltedDisclosure(claimName, claimValue);
      disclosures.push(disclosure);
      sdDigests.push(disclosure.digest);
    }
  }

  // 3. Build Subject identifier and timestamps
  const now = Math.floor(Date.now() / 1000);
  const validitySeconds = options.validitySeconds ?? 365 * 24 * 60 * 60; // 1 year default
  const exp = now + validitySeconds;

  let sub = options.subject;
  if (!sub) {
    sub = holderPublicKeyJwk.kid ?? (await computeJwkThumbprint(holderPublicKeyJwk));
  }

  // 4. Construct SD-JWT VC Payload per draft-ietf-oauth-sd-jwt-vc
  const payload: Record<string, unknown> = {
    iss: issuer.id,
    sub,
    iat: now,
    exp,
    nbf: now,
    jti: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `urn:uuid:${now}-${Math.random()}`,
    vct: options.vct ?? issuer.vct,
    vct_name: issuer.name,
    status: {
      revoked: false,
    },
    // Holder key binding confirmation (RFC 7800)
    cnf: {
      jwk: holderPublicKeyJwk,
    },
    // Selective disclosure algorithm & digests array
    _sd_alg: "sha-256",
    _sd: sdDigests,
    ...(options.additionalPayload ?? {}),
  };

  // 5. Sign the Credential with the Issuer's Private Key using `jose`
  const header: SDJWTHeader = {
    alg: issuer.algorithm,
    typ: "vc+sd-jwt",
    kid: issuer.keyPair.publicKey.kid,
  };

  const privateKey = await jose.importJWK(
    issuer.keyPair.privateKey as jose.JWK,
    issuer.algorithm
  );

  const issuerJwt = await new jose.SignJWT(payload)
    .setProtectedHeader(header)
    .sign(privateKey);

  // 6. Build Compact SD-JWT serialization: <issuerJwt>~<d1>~<d2>~...~
  // Note: Trailing tilde indicates issuance form without KB-JWT
  const disclosureTokens = disclosures.map((d) => d.encoded);
  const compact = `${issuerJwt}~${disclosureTokens.join("~")}~`;

  return {
    compact,
    issuerJwt,
    disclosures,
    sdDigests,
    payload,
    issuer: {
      id: issuer.id,
      name: issuer.name,
      country: issuer.country,
    },
  };
}
