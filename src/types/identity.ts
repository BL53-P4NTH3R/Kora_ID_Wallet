/**
 * ============================================================================
 *  Kora ID Wallet — EUDI-Compliant Identity Types
 * ============================================================================
 *
 *  Type definitions aligned with the EU Digital Identity Wallet
 *  Architecture and Reference Framework (ARF) v1.4 and eIDAS 2.0.
 *
 *  Adapted for Nigerian digital identity documents:
 *    • NIN (National Identification Number) as Person Identification Data (PID)
 *    • FRSC Driver's License
 *    • Student ID (tertiary institution credential)
 *
 *  SD-JWT VC format follows:
 *    - IETF draft-ietf-oauth-sd-jwt-vc
 *    - IETF draft-ietf-oauth-selective-disclosure-jwt
 *
 *  Presentation Exchange follows:
 *    - DIF Presentation Exchange v2.0
 * ============================================================================
 */

// ---------------------------------------------------------------------------
//  1. Cryptographic Primitives
// ---------------------------------------------------------------------------

/** Supported elliptic curves for key generation per ARF requirements */
export type SupportedCurve = "P-256" | "P-384" | "P-521";

/** Supported signing algorithms (ES256 is the ARF-mandated default) */
export type SupportedAlgorithm = "ES256" | "ES384" | "ES512";

/** JSON Web Key (subset relevant to ECDSA keys used in the wallet) */
export interface JWK {
  kty: "EC";
  crv: SupportedCurve;
  x: string;
  y: string;
  d?: string; // Private key component — only present in holder's key store
  kid?: string;
  alg?: SupportedAlgorithm;
  use?: "sig";
}

/** Key pair wrapper stored in IndexedDB */
export interface StoredKeyPair {
  id: string;
  publicKey: JWK;
  privateKey: JWK;
  algorithm: SupportedAlgorithm;
  createdAt: string; // ISO 8601
  label?: string;
}

// ---------------------------------------------------------------------------
//  2. Person Identification Data (PID) — ARF Annex 3
// ---------------------------------------------------------------------------

/**
 * Mandatory + optional PID attributes per ARF v1.4 Annex 3, Table 1.
 * Extended with Nigerian-specific fields (NIN, BVN).
 */
export interface PIDAttributes {
  // ── Mandatory (ARF Annex 3 §A.3.1) ──────────────────────────────────────
  /** Family name(s) of the PID holder */
  family_name: string;
  /** Given name(s) of the PID holder */
  given_name: string;
  /** Date of birth in ISO 8601 (YYYY-MM-DD) */
  birth_date: string;
  /**
   * Age attestation — boolean: holder is ≥ 18 at issuance.
   * Per ARF, this is derived and selectively disclosable.
   */
  age_over_18?: boolean;

  // ── Optional (ARF Annex 3 §A.3.2) ───────────────────────────────────────
  /** Family name at birth (maiden name) */
  family_name_birth?: string;
  /** Given name at birth */
  given_name_birth?: string;
  /** Place of birth — free text or structured */
  birth_place?: string;
  /** Country of birth — ISO 3166-1 alpha-2 */
  birth_country?: string;
  /** State / region of birth */
  birth_state?: string;
  /** City of birth */
  birth_city?: string;
  /** Resident address — full string */
  resident_address?: string;
  /** Resident country — ISO 3166-1 alpha-2 */
  resident_country?: string;
  /** Resident state / region */
  resident_state?: string;
  /** Resident city */
  resident_city?: string;
  /** Resident postal code */
  resident_postal_code?: string;
  /** Gender — ISO/IEC 5218 (0 = not known, 1 = male, 2 = female, 9 = N/A) */
  gender?: 0 | 1 | 2 | 9;
  /** Nationality — ISO 3166-1 alpha-2 */
  nationality?: string;
  /** Portrait / photo — base64url-encoded JPEG or PNG */
  portrait?: string;

  // ── Nigerian-specific extensions ─────────────────────────────────────────
  /** National Identification Number (NIN) — 11 digits */
  nin?: string;
  /** Bank Verification Number */
  bvn?: string;
  /** Phone number linked to NIN */
  phone_number?: string;
}

// ---------------------------------------------------------------------------
//  3. Credential Types
// ---------------------------------------------------------------------------

/** Discriminated union tag for each document type */
export type CredentialType =
  | "NIN_PID"
  | "FRSC_DRIVERS_LICENSE"
  | "STUDENT_ID";

/** FRSC Driver's License specific attributes */
export interface FRSCLicenseAttributes {
  license_number: string;
  /** License class(es): A, B, C, D, E, F, etc. */
  license_classes: string[];
  /** ISO 8601 */
  issue_date: string;
  /** ISO 8601 */
  expiry_date: string;
  /** Issuing authority */
  issuing_authority: string;
  /** State of issuance */
  issuing_state: string;
  /** License status */
  status: "VALID" | "EXPIRED" | "SUSPENDED" | "REVOKED";

  // PID attributes embedded for the license holder
  holder_family_name: string;
  holder_given_name: string;
  holder_birth_date: string;
  holder_portrait?: string;
  holder_nin?: string;
  holder_gender?: 0 | 1 | 2 | 9;
  holder_nationality?: string;
  holder_resident_address?: string;
}

/** Tertiary institution Student ID attributes */
export interface StudentIDAttributes {
  student_id: string;
  institution_name: string;
  institution_code?: string;
  faculty?: string;
  department?: string;
  programme: string;
  /** e.g. "100", "200", "300" */
  level?: string;
  /** ISO 8601 */
  matriculation_date: string;
  /** ISO 8601 — expected graduation */
  expected_graduation_date?: string;
  status: "ACTIVE" | "GRADUATED" | "SUSPENDED" | "WITHDRAWN";

  holder_family_name: string;
  holder_given_name: string;
  holder_birth_date: string;
  holder_portrait?: string;
  holder_nin?: string;
  holder_gender?: 0 | 1 | 2 | 9;
}

/** Mapping from CredentialType to its attributes */
export interface CredentialAttributeMap {
  NIN_PID: PIDAttributes;
  FRSC_DRIVERS_LICENSE: FRSCLicenseAttributes;
  STUDENT_ID: StudentIDAttributes;
}

// ---------------------------------------------------------------------------
//  4. SD-JWT Verifiable Credential (SD-JWT VC)
// ---------------------------------------------------------------------------

/**
 * SD-JWT VC Header per draft-ietf-oauth-sd-jwt-vc §3.
 */
export interface SDJWTHeader {
  alg: SupportedAlgorithm;
  typ: "vc+sd-jwt";
  kid?: string;
  /** x5c chain for issuer trust establishment */
  x5c?: string[];
  /** Trust framework hint */
  trust_framework?: string;
  [key: string]: unknown;
}

/**
 * Registered JWT claims used within the SD-JWT VC body.
 */
export interface SDJWTRegisteredClaims {
  /** Issuer identifier (URI) */
  iss: string;
  /** Subject identifier (holder DID or thumbprint) */
  sub?: string;
  /** Issued-at timestamp (NumericDate) */
  iat: number;
  /** Expiration timestamp (NumericDate) */
  exp?: number;
  /** Not-before timestamp (NumericDate) */
  nbf?: number;
  /** JWT ID — unique credential identifier */
  jti?: string;
}

/**
 * Confirmation claim — holder binding per RFC 7800.
 * Contains the holder's public key for Key Binding JWT.
 */
export interface CNFClaim {
  jwk: JWK;
}

/**
 * SD-JWT VC payload — the full JWT claims set before selective disclosure.
 * `T` is the domain-specific claim set (PID, License, Student ID).
 */
/**
 * SD-JWT VC payload — the full JWT claims set before selective disclosure.
 * `T` is the domain-specific claim set (PID, License, Student ID).
 *
 * Intersection of registered JWT claims + VC-specific claims.
 */
export type SDJWTVCPayload<T extends CredentialType> =
  SDJWTRegisteredClaims & {
    /** Credential type (vct) — per draft-ietf-oauth-sd-jwt-vc §3.2.2.2 */
    vct: string;
    /** Verifiable Credential Type — human-readable */
    vct_name?: string;
    /** Status information (e.g., revocation) */
    status?: CredentialStatus;
    /** Holder key binding */
    cnf: CNFClaim;
    /** The selectively-disclosable claims */
    claims: CredentialAttributeMap[T];
    /**
     * SD digests — added by the SD-JWT library.
     * These are SHA-256 hashes of disclosure values.
     */
    _sd?: string[];
    /** Hash algorithm used for SD (default: sha-256) */
    _sd_alg?: string;
  };

/** Credential status descriptor (Token Status List or similar) */
export interface CredentialStatus {
  /** Status list type */
  status_list?: {
    idx: number;
    uri: string;
  };
  /** Simple status flag for demo purposes */
  revoked?: boolean;
}

/**
 * A single SD-JWT disclosure.
 * Format: base64url(JSON([salt, claim_name, claim_value]))
 */
export interface Disclosure {
  /** base64url-encoded disclosure string */
  encoded: string;
  /** Decoded salt */
  salt: string;
  /** Claim name */
  claimName: string;
  /** Claim value */
  claimValue: unknown;
  /** SHA-256 digest of the disclosure */
  digest: string;
}

/**
 * Complete SD-JWT token: issuer JWT + disclosures + optional KB-JWT.
 * Serialized as:  <issuer-jwt>~<disclosure1>~<disclosure2>~...~<kb-jwt>
 */
export interface SDJWTCompact {
  /** The complete compact serialization */
  compact: string;
  /** The issuer-signed JWT portion */
  issuerJwt: string;
  /** Array of disclosures */
  disclosures: Disclosure[];
  /** Optional Key Binding JWT */
  keyBindingJwt?: string;
}

/**
 * Key Binding JWT payload — proves holder possession of the bound key.
 * Per draft-ietf-oauth-sd-jwt-vc §4.3.
 */
export interface KeyBindingJWTPayload {
  /** Nonce from the verifier */
  nonce: string;
  /** Audience — verifier identifier */
  aud: string;
  /** Issued-at timestamp */
  iat: number;
  /** Hash of the SD-JWT presentation (sd_hash) */
  sd_hash: string;
}

// ---------------------------------------------------------------------------
//  5. Wallet Credential Storage
// ---------------------------------------------------------------------------

/**
 * A credential as stored in the wallet's IndexedDB.
 * Wraps the SD-JWT compact form with metadata for UI rendering.
 */
export interface StoredCredential<T extends CredentialType = CredentialType> {
  /** Unique storage ID (UUID v4) */
  id: string;
  /** Discriminated credential type */
  type: T;
  /** Human-readable display name */
  displayName: string;
  /** The full SD-JWT compact token (issuer-signed) */
  sdJwtCompact: string;
  /** Decoded disclosures for UI toggle display */
  disclosures: Disclosure[];
  /** Decoded claims (all of them, before selective disclosure) */
  decodedClaims: T extends keyof CredentialAttributeMap
    ? CredentialAttributeMap[T]
    : Record<string, unknown>;
  /** Issuer information */
  issuer: IssuerMetadata;
  /** When the credential was stored in the wallet */
  storedAt: string; // ISO 8601
  /** When the credential expires */
  expiresAt?: string; // ISO 8601
  /** Visual theming for the credential card */
  cardStyle: CredentialCardStyle;
}

/** Issuer metadata attached to each credential */
export interface IssuerMetadata {
  /** Issuer name */
  name: string;
  /** Issuer identifier (URI) */
  id: string;
  /** Issuer logo URL or base64 */
  logo?: string;
  /** Issuer country — ISO 3166-1 alpha-2 */
  country?: string;
}

/** Visual style configuration for credential cards */
export interface CredentialCardStyle {
  /** CSS gradient or solid color for the card background */
  backgroundColor: string;
  /** Text color */
  textColor: string;
  /** Accent / border color */
  accentColor: string;
  /** Optional background pattern or image */
  backgroundImage?: string;
  /** Icon name from lucide-react */
  icon?: string;
}

// ---------------------------------------------------------------------------
//  6. Presentation Exchange (DIF PE v2.0)
// ---------------------------------------------------------------------------

/**
 * Presentation Definition — specifies which credentials and claims
 * a verifier requires.
 *
 * Subset of DIF Presentation Exchange v2.0.
 * Reference: https://identity.foundation/presentation-exchange/spec/v2.0.0/
 */
export interface PresentationDefinition {
  /** Unique identifier for this definition */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Human-readable purpose */
  purpose?: string;
  /** Input descriptors — one per required credential */
  input_descriptors: InputDescriptor[];
}

/**
 * Input Descriptor — describes a single credential requirement.
 */
export interface InputDescriptor {
  /** Unique ID for this descriptor */
  id: string;
  /** Human-readable name */
  name?: string;
  /** Human-readable purpose */
  purpose?: string;
  /** Format requirements */
  format?: {
    "vc+sd-jwt"?: {
      alg: SupportedAlgorithm[];
    };
  };
  /** Constraints on the credential */
  constraints: InputDescriptorConstraints;
}

/**
 * Constraints block within an Input Descriptor.
 */
export interface InputDescriptorConstraints {
  /** Whether all, any, or none of the fields must match */
  limit_disclosure?: "required" | "preferred";
  /** Field requirements */
  fields: InputDescriptorField[];
}

/**
 * A single field constraint — matches a claim path and optionally
 * validates the value.
 */
export interface InputDescriptorField {
  /** JSONPath expressions to locate the claim */
  path: string[];
  /** Unique ID for the field */
  id?: string;
  /** Human-readable purpose */
  purpose?: string;
  /** Whether this field is required for submission */
  optional?: boolean;
  /** JSON Schema filter to validate the claim value */
  filter?: {
    type?: string;
    const?: unknown;
    enum?: unknown[];
    pattern?: string;
    minimum?: number;
    maximum?: number;
    format?: string;
  };
  /** Intent to retain the disclosed data */
  intent_to_retain?: boolean;
}

// ---------------------------------------------------------------------------
//  7. Presentation Submission
// ---------------------------------------------------------------------------

/**
 * Presentation Submission — the holder's response to a Presentation Definition.
 */
export interface PresentationSubmission {
  /** Unique submission ID */
  id: string;
  /** References the Presentation Definition it responds to */
  definition_id: string;
  /** Descriptor map — maps input descriptors to tokens */
  descriptor_map: DescriptorMapEntry[];
}

/**
 * Maps an input descriptor to a specific token in the VP.
 */
export interface DescriptorMapEntry {
  /** Input descriptor ID this entry fulfills */
  id: string;
  /** Token format */
  format: "vc+sd-jwt";
  /** JSONPath to the token in the VP */
  path: string;
}

// ---------------------------------------------------------------------------
//  8. Verification Result
// ---------------------------------------------------------------------------

/** Granular verification status */
export type VerificationStatus =
  | "PENDING"
  | "VERIFYING"
  | "VALID"
  | "INVALID"
  | "EXPIRED"
  | "REVOKED"
  | "ERROR";

/**
 * Result of verifying a presented SD-JWT VC.
 */
export interface VerificationResult {
  /** Overall status */
  status: VerificationStatus;
  /** Credential type that was verified */
  credentialType?: CredentialType;
  /** Verified (disclosed) claims */
  disclosedClaims?: Record<string, unknown>;
  /** Issuer information */
  issuer?: IssuerMetadata;
  /** Holder public key (from cnf claim) */
  holderKey?: JWK;
  /** Key binding verified? */
  keyBindingValid?: boolean;
  /** Signature verified? */
  signatureValid?: boolean;
  /** Expiration check passed? */
  notExpired?: boolean;
  /** Timestamp of verification */
  verifiedAt: string; // ISO 8601
  /** Error details if status is INVALID or ERROR */
  errors?: string[];
}

// ---------------------------------------------------------------------------
//  9. QR Code Payloads
// ---------------------------------------------------------------------------

/**
 * QR payload for credential sharing.
 * The QR encodes a URI that the verifier scans to retrieve the VP.
 */
export interface QRSharePayload {
  /** Protocol version */
  version: "1.0";
  /** Action type */
  action: "present" | "request";
  /** The SD-JWT VP compact serialization (for small credentials) */
  vpToken?: string;
  /**
   * URI to fetch the VP from (for large credentials).
   * The verifier GETs this URI to retrieve the VP token.
   */
  vpUri?: string;
  /** Presentation submission metadata */
  presentationSubmission?: PresentationSubmission;
  /** Nonce for replay protection */
  nonce: string;
  /** Verifier callback URI */
  responseUri?: string;
}

/**
 * QR payload for a verification request.
 * Displayed by the verifier for the holder to scan.
 */
export interface QRVerificationRequest {
  /** Protocol version */
  version: "1.0";
  /** The presentation definition */
  presentationDefinition: PresentationDefinition;
  /** Nonce for this session */
  nonce: string;
  /** Verifier identifier */
  verifierId: string;
  /** Callback URI for the holder to submit the VP */
  responseUri: string;
}

// ---------------------------------------------------------------------------
//  10. Issuance Flow Types
// ---------------------------------------------------------------------------

/** Status of an issuance flow */
export type IssuanceStatus =
  | "IDLE"
  | "REQUESTING"
  | "AUTHENTICATING"
  | "ISSUING"
  | "ISSUED"
  | "ERROR";

/**
 * Issuance request — from the wallet to the issuer.
 */
export interface IssuanceRequest {
  /** Credential type being requested */
  credentialType: CredentialType;
  /** Holder's public key for binding */
  holderKey: JWK;
  /** Proof of possession of the holder key */
  proofJwt?: string;
  /** Any pre-authorization code */
  preAuthCode?: string;
}

/**
 * Issuance response — from the issuer to the wallet.
 */
export interface IssuanceResponse {
  /** The issued SD-JWT VC in compact form */
  credential: string;
  /** Credential type */
  credentialType: CredentialType;
  /** Transaction ID for audit */
  transactionId: string;
  /** Nonce for subsequent requests */
  cNonce?: string;
  /** Nonce validity period in seconds */
  cNonceExpiresIn?: number;
}
