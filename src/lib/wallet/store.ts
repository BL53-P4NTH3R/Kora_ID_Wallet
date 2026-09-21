/**
 * Wallet Storage Layer
 *
 * IndexedDB-backed storage for credentials and holder keys using idb-keyval.
 * Provides a type-safe API for CRUD operations on wallet data.
 */

import { get, set, del, keys, entries, createStore } from "idb-keyval";
import type {
  StoredCredential,
  StoredKeyPair,
  CredentialType,
} from "@/types/identity";

// ---------------------------------------------------------------------------
//  IndexedDB Stores
// ---------------------------------------------------------------------------

/** Credential store — holds SD-JWT VCs */
const credentialStore = createStore("kora-wallet-credentials", "credentials");

/** Key store — holds holder ECDSA key pairs */
const keyStore = createStore("kora-wallet-keys", "keys");

// ---------------------------------------------------------------------------
//  Credential Operations
// ---------------------------------------------------------------------------

/**
 * Store a credential in the wallet.
 */
export async function storeCredential(
  credential: StoredCredential
): Promise<void> {
  await set(credential.id, credential, credentialStore);
}

/**
 * Retrieve a credential by ID.
 */
export async function getCredential(
  id: string
): Promise<StoredCredential | undefined> {
  return get<StoredCredential>(id, credentialStore);
}

/**
 * Retrieve all stored credentials.
 */
export async function getAllCredentials(): Promise<StoredCredential[]> {
  const allEntries = await entries<string, StoredCredential>(credentialStore);
  return allEntries.map(([, value]) => value);
}

/**
 * Retrieve credentials of a specific type.
 */
export async function getCredentialsByType(
  type: CredentialType
): Promise<StoredCredential[]> {
  const all = await getAllCredentials();
  return all.filter((c) => c.type === type);
}

/**
 * Delete a credential by ID.
 */
export async function deleteCredential(id: string): Promise<void> {
  await del(id, credentialStore);
}

/**
 * Count stored credentials.
 */
export async function countCredentials(): Promise<number> {
  const allKeys = await keys(credentialStore);
  return allKeys.length;
}

// ---------------------------------------------------------------------------
//  Key Operations
// ---------------------------------------------------------------------------

/**
 * Store a key pair in the wallet.
 */
export async function storeKeyPair(keyPair: StoredKeyPair): Promise<void> {
  await set(keyPair.id, keyPair, keyStore);
}

/**
 * Retrieve a key pair by ID.
 */
export async function getKeyPair(
  id: string
): Promise<StoredKeyPair | undefined> {
  return get<StoredKeyPair>(id, keyStore);
}

/**
 * Retrieve all stored key pairs.
 */
export async function getAllKeyPairs(): Promise<StoredKeyPair[]> {
  const allEntries = await entries<string, StoredKeyPair>(keyStore);
  return allEntries.map(([, value]) => value);
}

/**
 * Get the default (most recently created) key pair.
 * If no key exists, returns undefined.
 */
export async function getDefaultKeyPair(): Promise<
  StoredKeyPair | undefined
> {
  const allPairs = await getAllKeyPairs();
  if (allPairs.length === 0) return undefined;

  // Sort by creation date descending
  allPairs.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return allPairs[0];
}

/**
 * Delete a key pair by ID.
 */
export async function deleteKeyPair(id: string): Promise<void> {
  await del(id, keyStore);
}

// ---------------------------------------------------------------------------
//  Wallet Initialization
// ---------------------------------------------------------------------------

/**
 * Initialize the wallet — ensures a default key pair exists.
 * Returns the default key pair.
 */
export async function initializeWallet(): Promise<StoredKeyPair> {
  const { generateKeyPair } = await import("@/lib/crypto/keys");

  let defaultKey = await getDefaultKeyPair();
  if (!defaultKey) {
    defaultKey = await generateKeyPair("ES256");
    defaultKey.label = "Default Wallet Key";
    await storeKeyPair(defaultKey);
  }
  return defaultKey;
}
