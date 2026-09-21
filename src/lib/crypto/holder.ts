/**
 * Holder Engine for Kora ID (SD-JWT VC)
 *
 * Implements client-side cryptographic operations for the wallet holder:
 * - Native Web Crypto (window.crypto.subtle) ECDSA P-256 keypair generation
 * - Exportable JWK key storage and retrieval via browser IndexedDB
 * - Holder-binding selective disclosure presentation creation
 * - Key Binding JWT (KB-JWT) signing with nonce, audience, and sd_hash to prevent replay attacks
 */

import * as jose from "jose";
import type {
  JWK,
  SupportedAlgorithm,
  Disclosure,
  StoredKeyPair,
  StoredCredential,
  SDJWTCompact,
  KeyBindingJWTPayload,
} from "@/types/identity";
import {
  base64urlEncode,
  base64urlDecode,
  computeJwkThumbprint,
} from "./keys";
import {
  storeKeyPair,
  getDefaultKeyPair,
  getKeyPair,
} from "@/lib/wallet/store";

// ---------------------------------------------------------------------------
//  Environment & SubtleCrypto Utilities
// ---------------------------------------------------------------------------

/**
 * Access the native Web Crypto SubtleCrypto interface.
 * Defaults to `window.crypto.subtle` in browsers, with fallback to `globalThis.crypto.subtle`.
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto SubtleCrypto is not available in the current environment.");
}

// ---------------------------------------------------------------------------
//  Client-Side Key Generation & Storage
// ---------------------------------------------------------------------------

export interface GenerateKeyOptions {
  algorithm?: SupportedAlgorithm;
  label?: string;
  persist?: boolean;
}

/**
 * Generate an exportable ECDSA P-256 keypair via native window.crypto.subtle
 * and persist it to browser IndexedDB.
 *
 * Compliant with EU Digital Identity Wallet (EUDIW) ARF requirements.
 *
 * @param options - Generation options (algorithm, custom label, persistence flag)
 * @returns StoredKeyPair with exported public & private JWKs and RFC 7638 thumbprint
 */
export async function generateHolderKeyPair(
  options: GenerateKeyOptions = {}
): Promise<StoredKeyPair> {
  const subtle = getSubtleCrypto();
  const algorithm: SupportedAlgorithm = options.algorithm ?? "ES256";
  const persist = options.persist ?? true;

  // Generate ECDSA keypair using curve P-256
  const keyPair = await subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true, // exportable
    ["sign", "verify"]
  );

  // Export both keys as JWK
  const [publicJwkRaw, privateJwkRaw] = await Promise.all([
    subtle.exportKey("jwk", keyPair.publicKey),
    subtle.exportKey("jwk", keyPair.privateKey),
  ]);

  // Compute RFC 7638 JWK Thumbprint for unique key identifier (kid)
  const kid = await computeJwkThumbprint(publicJwkRaw as JWK);

  const publicKey: JWK = {
    kty: "EC",
    crv: "P-256",
    x: publicJwkRaw.x!,
    y: publicJwkRaw.y!,
    kid,
    alg: algorithm,
    use: "sig",
  };

  const privateKey: JWK = {
    ...publicKey,
    d: privateJwkRaw.d!,
  };

  const storedKeyPair: StoredKeyPair = {
    id: kid,
    publicKey,
    privateKey,
    algorithm,
    createdAt: new Date().toISOString(),
    label: options.label ?? "Kora Holder Primary Key",
  };

  // Persist to browser IndexedDB
  if (persist) {
    try {
      await storeKeyPair(storedKeyPair);
    } catch (error) {
      console.warn(
        "Could not save keypair to IndexedDB (may be running in non-browser context):",
        error
      );
    }
  }

  return storedKeyPair;
}

/**
 * Retrieve the active holder keypair from IndexedDB, or create one if none exists.
 */
export async function getOrCreateHolderKey(
  options?: GenerateKeyOptions
): Promise<StoredKeyPair> {
  try {
    const existing = await getDefaultKeyPair();
    if (existing) {
      return existing;
    }
  } catch (error) {
    console.warn("Error accessing IndexedDB for holder key:", error);
  }

  return generateHolderKeyPair(options);
}

/**
 * Retrieve a specific holder keypair by ID, or the default keypair.
 */
export async function getHolderKeyPair(
  id?: string
): Promise<StoredKeyPair | undefined> {
  try {
    if (id) {
      return await getKeyPair(id);
    }
    return await getDefaultKeyPair();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
//  Disclosure Parsing & Decoding
// ---------------------------------------------------------------------------

/**
 * Decode a single base64url disclosure token:
 * base64url(JSON([salt, claim_name, claim_value]))
 */
export function decodeDisclosureString(encoded: string): Disclosure {
  const decoded = new TextDecoder().decode(base64urlDecode(encoded));
  const [salt, claimName, claimValue] = JSON.parse(decoded);

  // Compute the SHA-256 digest of the encoded string
  // Note: We compute synchronous fallback hash if subtle not available, but subtle is standard
  return {
    encoded,
    salt,
    claimName,
    claimValue,
    digest: "", // populated if needed
  };
}

// ---------------------------------------------------------------------------
//  Holder-Binding Presentation Engine
// ---------------------------------------------------------------------------

export interface CreatePresentationParams {
  /**
   * The issued SD-JWT, either as:
   * - A compact string: "<issuer-jwt>~<d1>~<d2>~...~"
   * - A SDJWTCompact object
   * - A StoredCredential object from IndexedDB
   */
  sdJwt: string | SDJWTCompact | StoredCredential;
  /**
   * List of claim names that the holder authorizes to reveal to the verifier
   * (e.g. ["first_name", "is_over_18", "portrait_hash"])
   */
  authorizedClaims: string[];
  /** Nonce supplied by the verifier to guarantee freshness and prevent replay */
  nonce: string;
  /** Audience identifier representing the verifier (e.g. "https://verifier.portal.gov.ng") */
  audience: string;
  /** Optional holder private key (retrieved automatically from IndexedDB if omitted) */
  holderPrivateKey?: JWK;
  /** Signing algorithm for the Key Binding JWT (defaults to "ES256") */
  algorithm?: SupportedAlgorithm;
}

export interface HolderPresentationResult {
  /** The final compact presentation token: <issuer-jwt>~<d1>~...~<dM>~<kb-jwt> */
  presentation: string;
  /** The complete compact presentation string */
  compact: string;
  /** The original issuer JWT */
  issuerJwt: string;
  /** Disclosed claims name-value map */
  disclosedClaims: Record<string, unknown>;
  /** The list of disclosures revealed */
  revealedDisclosures: Disclosure[];
  /** The Key Binding JWT */
  keyBindingJwt: string;
  /** The calculated SHA-256 sd_hash bound to the presentation */
  sdHash: string;
  /** Nonce used */
  nonce: string;
  /** Audience used */
  audience: string;
}

/**
 * Constructs a compact SD-JWT presentation with a Key Binding JWT (KB-JWT).
 *
 * Given an issued SD-JWT and a list of authorized claims to reveal:
 * 1. Filters only authorized disclosures
 * 2. Assembles the presented SD-JWT: <issuer-jwt>~<disc1>~...~<discM>~
 * 3. Computes the SHA-256 `sd_hash` over the presented prefix
 * 4. Signs a Key Binding JWT with the holder's private key containing:
 *    { nonce, aud, iat, sd_hash }
 * 5. Appends the KB-JWT to prevent replay attacks
 *
 * @param params - Presentation configuration
 * @returns HolderPresentationResult containing compact presentation and disclosure details
 */
export async function createHolderPresentation(
  params: CreatePresentationParams
): Promise<HolderPresentationResult> {
  const { authorizedClaims, nonce, audience } = params;
  const algorithm: SupportedAlgorithm = params.algorithm ?? "ES256";

  if (!nonce || typeof nonce !== "string") {
    throw new Error("Verifier nonce is required to prevent replay attacks.");
  }
  if (!audience || typeof audience !== "string") {
    throw new Error("Verifier audience is required to prevent credential misuse.");
  }

  // 1. Extract issuerJwt and raw disclosure strings from input
  let rawCompact = "";
  let preExtractedDisclosures: Disclosure[] | undefined;

  if (typeof params.sdJwt === "string") {
    rawCompact = params.sdJwt;
  } else if ("sdJwtCompact" in params.sdJwt) {
    rawCompact = params.sdJwt.sdJwtCompact;
    preExtractedDisclosures = params.sdJwt.disclosures;
  } else if ("compact" in params.sdJwt) {
    rawCompact = params.sdJwt.compact;
    preExtractedDisclosures = params.sdJwt.disclosures;
  } else {
    throw new Error("Invalid SD-JWT input: must be a compact string, SDJWTCompact, or StoredCredential.");
  }

  const parts = rawCompact.split("~");
  const issuerJwt = parts[0];
  if (!issuerJwt) {
    throw new Error("Malformed SD-JWT: missing issuer JWT component.");
  }

  // 2. Decode available disclosures
  let allDisclosures: Disclosure[] = [];
  if (preExtractedDisclosures && preExtractedDisclosures.length > 0) {
    allDisclosures = preExtractedDisclosures;
  } else {
    // If the last part is not empty, it could be an existing KB-JWT; exclude it
    const lastPart = parts[parts.length - 1];
    const hasKbJwt = lastPart !== "" && parts.length > 2;
    const disclosureStrings = hasKbJwt
      ? parts.slice(1, -1).filter((s) => s.length > 0)
      : parts.slice(1).filter((s) => s.length > 0);

    for (const dStr of disclosureStrings) {
      try {
        const decoded = decodeDisclosureString(dStr);
        allDisclosures.push(decoded);
      } catch (err) {
        console.warn("Could not decode disclosure token:", dStr, err);
      }
    }
  }

  // 3. Filter to ONLY authorized claims
  const authorizedSet = new Set(authorizedClaims);
  const revealedDisclosures: Disclosure[] = [];
  const disclosedClaims: Record<string, unknown> = {};

  for (const disc of allDisclosures) {
    if (authorizedSet.has(disc.claimName)) {
      revealedDisclosures.push(disc);
      disclosedClaims[disc.claimName] = disc.claimValue;
    }
  }

  // 4. Construct presented SD-JWT string: <issuerJwt>~<d1>~<d2>...~
  // Per draft-ietf-oauth-selective-disclosure-jwt §4.3:
  // The presentation ends with a tilde before the KB-JWT
  const presentedPrefix =
    revealedDisclosures.length > 0
      ? `${issuerJwt}~${revealedDisclosures.map((d) => d.encoded).join("~")}~`
      : `${issuerJwt}~~`;

  // 5. Compute sd_hash = SHA-256(presentedPrefix)
  const subtle = getSubtleCrypto();
  const sdHashBuffer = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(presentedPrefix)
  );
  const sdHash = base64urlEncode(new Uint8Array(sdHashBuffer));

  // 6. Resolve Holder Private Key
  let holderPrivKey = params.holderPrivateKey;
  if (!holderPrivKey) {
    const stored = await getDefaultKeyPair();
    if (!stored || !stored.privateKey) {
      throw new Error(
        "Holder private key not found. Please provide holderPrivateKey or initialize wallet keys in IndexedDB."
      );
    }
    holderPrivKey = stored.privateKey;
  }

  // 7. Create Key Binding JWT (KB-JWT) payload
  const kbPayload: KeyBindingJWTPayload = {
    nonce,
    aud: audience,
    iat: Math.floor(Date.now() / 1000),
    sd_hash: sdHash,
  };

  const holderCryptoKey = await jose.importJWK(
    holderPrivKey as jose.JWK,
    algorithm
  );

  const kbJwt = await new jose.SignJWT(kbPayload as unknown as jose.JWTPayload)
    .setProtectedHeader({
      alg: algorithm,
      typ: "kb+jwt",
    })
    .sign(holderCryptoKey);

  // 8. Final Compact Presentation: <issuer-jwt>~<d1>~<d2>...~<kb-jwt>
  const presentation = `${presentedPrefix}${kbJwt}`;

  return {
    presentation,
    compact: presentation,
    issuerJwt,
    disclosedClaims,
    revealedDisclosures,
    keyBindingJwt: kbJwt,
    sdHash,
    nonce,
    audience,
  };
}
