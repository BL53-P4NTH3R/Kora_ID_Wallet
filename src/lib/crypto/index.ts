export {
  generateKeyPair,
  importPrivateKey,
  importPublicKey,
  signData,
  verifySignature,
  computeJwkThumbprint,
  base64urlEncode,
  base64urlDecode,
} from "./keys";

export {
  createDisclosure,
  createDisclosures,
  issueSDJWT,
  createPresentation,
  parseSDJWT,
  decodeDisclosure,
  verifySDJWT,
} from "./sdjwt";

export {
  MOCK_ISSUER_REGISTRY,
  getMockIssuer,
  getIssuerPublicKey,
  getIssuerPrivateKey,
  registerCustomIssuer,
  createSaltedDisclosure,
  issueSDJWTCredential,
  type MockIssuer,
  type IssueSDJWTOptions,
  type IssuedSDJWTCredential,
} from "./issuer";

export {
  generateHolderKeyPair,
  getOrCreateHolderKey,
  getHolderKeyPair,
  decodeDisclosureString,
  createHolderPresentation,
  type GenerateKeyOptions,
  type CreatePresentationParams,
  type HolderPresentationResult,
} from "./holder";
