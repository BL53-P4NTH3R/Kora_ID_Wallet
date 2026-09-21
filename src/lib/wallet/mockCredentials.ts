/**
 * Mock Credential Provisioning for Kora ID Wallet
 *
 * Generates realistic Nigerian digital identity credentials compliant with
 * EUDI ARF and SD-JWT VC standards:
 * 1. NIN PID (National Identity Management Commission)
 * 2. FRSC Driver's License (Federal Road Safety Corps)
 * 3. NYSC / Tertiary Student Identity Credential
 */

import type {
  StoredKeyPair,
  StoredCredential,
  CredentialCardStyle,
} from "@/types/identity";
import { issueSDJWTCredential } from "@/lib/crypto/issuer";
import { storeCredential, getAllCredentials } from "./store";

// ---------------------------------------------------------------------------
//  Card Styles
// ---------------------------------------------------------------------------

export const CARD_STYLES: Record<string, CredentialCardStyle> = {
  NIN_PID: {
    backgroundColor: "linear-gradient(135deg, #064e3b 0%, #022c22 50%, #0f172a 100%)",
    textColor: "#f8fafc",
    accentColor: "#10b981",
    icon: "Shield",
  },
  FRSC_DRIVERS_LICENSE: {
    backgroundColor: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 50%, #1e1b4b 100%)",
    textColor: "#f8fafc",
    accentColor: "#3b82f6",
    icon: "Car",
  },
  STUDENT_ID: {
    backgroundColor: "linear-gradient(135deg, #4c1d95 0%, #312e81 50%, #0f172a 100%)",
    textColor: "#f8fafc",
    accentColor: "#8b5cf6",
    icon: "GraduationCap",
  },
};

// ---------------------------------------------------------------------------
//  Mock Credential Generators
// ---------------------------------------------------------------------------

/**
 * Creates a National Identification Number (NIN PID) credential.
 */
export async function createMockNINCredential(
  holderKey: StoredKeyPair
): Promise<StoredCredential<"NIN_PID">> {
  const claims = {
    nin: "98234156782",
    first_name: "Chukwudi",
    last_name: "Adeyemi",
    birth_date: "1997-08-14",
    is_over_18: true,
    portrait_hash: "urn:sha256:8f3c8a14b568981f21d3e8e1927cb09121a99852f8d8392cf99a80bdf60212ab",
    gender: 1, // Male
    nationality: "NG",
    resident_state: "Lagos State",
    resident_city: "Ikeja",
    resident_address: "14 Awolowo Way, Ikeja, Lagos",
    phone_number: "+2348031234567",
  };

  const issued = await issueSDJWTCredential(claims, holderKey.publicKey, {
    issuerId: "did:web:nimc.gov.ng",
    vct: "https://identity.nimc.gov.ng/credentials/v1/pid",
    validitySeconds: 3 * 365 * 24 * 3600, // 3 years
  });

  const stored: StoredCredential<"NIN_PID"> = {
    id: "cred-nin-" + holderKey.id.substring(0, 8),
    type: "NIN_PID",
    displayName: "National Identity Card (NIN)",
    sdJwtCompact: issued.compact,
    disclosures: issued.disclosures,
    decodedClaims: claims as any,
    issuer: {
      id: issued.issuer.id,
      name: issued.issuer.name,
      country: issued.issuer.country,
    },
    storedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3 * 365 * 24 * 3600 * 1000).toISOString(),
    cardStyle: CARD_STYLES.NIN_PID,
  };

  return stored;
}

/**
 * Creates a Federal Road Safety Corps (FRSC) Driver's License credential.
 */
export async function createMockFRSCCredential(
  holderKey: StoredKeyPair
): Promise<StoredCredential<"FRSC_DRIVERS_LICENSE">> {
  const claims = {
    license_number: "FRSC-LA-2024-8849",
    license_classes: ["B", "E"],
    issue_date: "2023-04-10",
    expiry_date: "2028-04-10",
    issuing_authority: "FRSC Lagos Central",
    issuing_state: "Lagos",
    status: "VALID" as const,
    holder_given_name: "Chukwudi",
    holder_family_name: "Adeyemi",
    holder_birth_date: "1997-08-14",
    holder_nin: "98234156782",
    holder_resident_address: "14 Awolowo Way, Ikeja, Lagos",
  };

  const issued = await issueSDJWTCredential(claims, holderKey.publicKey, {
    issuerId: "did:web:frsc.gov.ng",
    vct: "https://identity.frsc.gov.ng/credentials/v1/drivers-license",
    validitySeconds: 5 * 365 * 24 * 3600, // 5 years
  });

  const stored: StoredCredential<"FRSC_DRIVERS_LICENSE"> = {
    id: "cred-frsc-" + holderKey.id.substring(0, 8),
    type: "FRSC_DRIVERS_LICENSE",
    displayName: "National Driver's License",
    sdJwtCompact: issued.compact,
    disclosures: issued.disclosures,
    decodedClaims: claims as any,
    issuer: {
      id: issued.issuer.id,
      name: issued.issuer.name,
      country: issued.issuer.country,
    },
    storedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000).toISOString(),
    cardStyle: CARD_STYLES.FRSC_DRIVERS_LICENSE,
  };

  return stored;
}

/**
 * Creates a National Youth Service Corps / Student ID credential.
 */
export async function createMockStudentCredential(
  holderKey: StoredKeyPair
): Promise<StoredCredential<"STUDENT_ID">> {
  const claims = {
    student_id: "NYSC/2024/FC/10294",
    institution_name: "National Youth Service Corps (NYSC)",
    programme: "Graduate Corps Service",
    faculty: "Federal Capital Directorate",
    department: "Community Development",
    level: "Batch A, Stream 1",
    matriculation_date: "2024-03-01",
    expected_graduation_date: "2025-02-28",
    status: "ACTIVE" as const,
    holder_given_name: "Chukwudi",
    holder_family_name: "Adeyemi",
    holder_birth_date: "1997-08-14",
    holder_nin: "98234156782",
  };

  const issued = await issueSDJWTCredential(claims, holderKey.publicKey, {
    issuerId: "did:web:nysc.gov.ng",
    vct: "https://identity.nysc.gov.ng/credentials/v1/nysc-pass",
    validitySeconds: 365 * 24 * 3600, // 1 year
    additionalPayload: {
      iss: "did:web:nysc.gov.ng",
      vct_name: "National Youth Service Corps",
    },
  });

  const stored: StoredCredential<"STUDENT_ID"> = {
    id: "cred-nysc-" + holderKey.id.substring(0, 8),
    type: "STUDENT_ID",
    displayName: "NYSC Digital Service Pass",
    sdJwtCompact: issued.compact,
    disclosures: issued.disclosures,
    decodedClaims: claims as any,
    issuer: {
      id: "did:web:nysc.gov.ng",
      name: "National Youth Service Corps (NYSC)",
      country: "NG",
    },
    storedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    cardStyle: CARD_STYLES.STUDENT_ID,
  };

  return stored;
}

// ---------------------------------------------------------------------------
//  Provisioning & Seeding
// ---------------------------------------------------------------------------

/**
 * Provisions a complete suite of mock Nigerian digital identity credentials
 * and stores them in the wallet's IndexedDB.
 */
export async function seedDefaultWalletCredentials(
  holderKey: StoredKeyPair
): Promise<StoredCredential[]> {
  const [nin, frsc, student] = await Promise.all([
    createMockNINCredential(holderKey),
    createMockFRSCCredential(holderKey),
    createMockStudentCredential(holderKey),
  ]);

  await Promise.all([
    storeCredential(nin),
    storeCredential(frsc),
    storeCredential(student),
  ]);

  return [nin, frsc, student];
}

/**
 * Ensures the wallet has credentials. If empty, seeds default credentials.
 */
export async function ensureWalletCredentials(
  holderKey: StoredKeyPair
): Promise<StoredCredential[]> {
  try {
    const existing = await getAllCredentials();
    if (existing && existing.length > 0) {
      return existing;
    }
  } catch (error) {
    console.warn("Could not query credentials from IndexedDB:", error);
  }

  return seedDefaultWalletCredentials(holderKey);
}
