export {
  storeCredential,
  getCredential,
  getAllCredentials,
  getCredentialsByType,
  deleteCredential,
  countCredentials,
  storeKeyPair,
  getKeyPair,
  getAllKeyPairs,
  getDefaultKeyPair,
  deleteKeyPair,
  initializeWallet,
} from "./store";

export {
  CARD_STYLES,
  createMockNINCredential,
  createMockFRSCCredential,
  createMockStudentCredential,
  seedDefaultWalletCredentials,
  ensureWalletCredentials,
} from "./mockCredentials";
