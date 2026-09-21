/**
 * Web Crypto Key Management
 *
 * Generates, stores, and retrieves ECDSA key pairs using the Web Crypto API.
 * Keys are exported as JWK for portability and stored via the wallet store.
 */

import type { JWK, StoredKeyPair, SupportedAlgorithm, SupportedCurve } from "@/types/identity";

/** Map algorithm names to their Web Crypto parameters */
const ALGORITHM_PARAMS: Record<
  SupportedAlgorithm,
  { name: string; namedCurve: SupportedCurve; hash: string }
> = {
  ES256: { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" },
  ES384: { name: "ECDSA", namedCurve: "P-384", hash: "SHA-384" },
  ES512: { name: "ECDSA", namedCurve: "P-521", hash: "SHA-512" },
};

/**
 * Generate a new ECDSA key pair using the Web Crypto API.
 *
 * @param algorithm - Signing algorithm (default: ES256 per ARF mandate)
 * @returns A StoredKeyPair with exported JWKs
 */
export async function generateKeyPair(
  algorithm: SupportedAlgorithm = "ES256"
): Promise<StoredKeyPair> {
  const params = ALGORITHM_PARAMS[algorithm];

  const cryptoKeyPair = await crypto.subtle.generateKey(
    { name: params.name, namedCurve: params.namedCurve },
    true, // extractable
    ["sign", "verify"]
  );

  const [publicJwk, privateJwk] = await Promise.all([
    crypto.subtle.exportKey("jwk", cryptoKeyPair.publicKey),
    crypto.subtle.exportKey("jwk", cryptoKeyPair.privateKey),
  ]);

  const kid = await computeJwkThumbprint(publicJwk as JWK);

  const publicKey: JWK = {
    kty: "EC",
    crv: params.namedCurve,
    x: publicJwk.x!,
    y: publicJwk.y!,
    kid,
    alg: algorithm,
    use: "sig",
  };

  const privateKey: JWK = {
    ...publicKey,
    d: privateJwk.d!,
  };

  return {
    id: kid,
    publicKey,
    privateKey,
    algorithm,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Import a JWK into a CryptoKey for signing operations.
 */
export async function importPrivateKey(
  jwk: JWK,
  algorithm: SupportedAlgorithm = "ES256"
): Promise<CryptoKey> {
  const params = ALGORITHM_PARAMS[algorithm];
  return crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: params.name, namedCurve: params.namedCurve },
    false,
    ["sign"]
  );
}

/**
 * Import a JWK into a CryptoKey for verification operations.
 */
export async function importPublicKey(
  jwk: JWK,
  algorithm: SupportedAlgorithm = "ES256"
): Promise<CryptoKey> {
  const params = ALGORITHM_PARAMS[algorithm];
  return crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: params.name, namedCurve: params.namedCurve },
    false,
    ["verify"]
  );
}

/**
 * Sign arbitrary data with the holder's private key.
 */
export async function signData(
  data: Uint8Array,
  privateKey: JWK,
  algorithm: SupportedAlgorithm = "ES256"
): Promise<ArrayBuffer> {
  const params = ALGORITHM_PARAMS[algorithm];
  const cryptoKey = await importPrivateKey(privateKey, algorithm);
  return crypto.subtle.sign(
    { name: params.name, hash: params.hash },
    cryptoKey,
    data as unknown as BufferSource
  );
}

/**
 * Verify a signature against data using a public key.
 */
export async function verifySignature(
  data: Uint8Array,
  signature: ArrayBuffer,
  publicKey: JWK,
  algorithm: SupportedAlgorithm = "ES256"
): Promise<boolean> {
  const params = ALGORITHM_PARAMS[algorithm];
  const cryptoKey = await importPublicKey(publicKey, algorithm);
  return crypto.subtle.verify(
    { name: params.name, hash: params.hash },
    cryptoKey,
    signature,
    data as unknown as BufferSource
  );
}

/**
 * Compute JWK Thumbprint per RFC 7638.
 * Used as `kid` for key identification.
 */
export async function computeJwkThumbprint(jwk: JWK): Promise<string> {
  // Canonical JSON with required members in lexicographic order
  const canonical = JSON.stringify({
    crv: jwk.crv,
    kty: jwk.kty,
    x: jwk.x,
    y: jwk.y,
  });

  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical)
  );

  return base64urlEncode(new Uint8Array(hash));
}

// ---------------------------------------------------------------------------
//  Encoding Utilities
// ---------------------------------------------------------------------------

/** Encode bytes to base64url (no padding) */
export function base64urlEncode(data: Uint8Array): string {
  const binary = Array.from(data)
    .map((byte) => String.fromCharCode(byte))
    .join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode base64url string to bytes */
export function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
