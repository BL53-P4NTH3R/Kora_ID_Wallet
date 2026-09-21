"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { clsx } from "clsx";
import {
  Shield,
  ShieldCheck,
  CreditCard,
  QrCode,
  KeyRound,
  FileSignature,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  UserCheck,
  ExternalLink,
  ChevronRight,
  UploadCloud,
  FileText,
  FileCheck,
  Fingerprint,
  Smartphone,
  Cpu,
  Download,
  Info,
} from "lucide-react";

import type {
  StoredCredential,
  StoredKeyPair,
  Disclosure,
} from "@/types/identity";
import {
  generateHolderKeyPair,
  getOrCreateHolderKey,
  createHolderPresentation,
  verifySignature,
  base64urlEncode,
} from "@/lib/crypto";
import {
  getAllCredentials,
  ensureWalletCredentials,
  seedDefaultWalletCredentials,
} from "@/lib/wallet";
import {
  CredentialCard,
  DisclosureToggle,
  QRViewer,
  PresentationModeSelector,
  type PresentationMode,
} from "@/components/wallet";

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

type WalletTab = "store" | "share" | "authenticate" | "sign";

interface RelyingPartyOption {
  id: string;
  name: string;
  category: string;
  domain: string;
  logoColor: string;
  requestedClaims: string[];
  purpose: string;
}

const RELYING_PARTIES: RelyingPartyOption[] = [
  {
    id: "remita",
    name: "Remita Federal Payments Gateway",
    category: "Government Financial Services",
    domain: "https://remita.net/auth",
    logoColor: "from-amber-600 to-orange-700",
    requestedClaims: ["first_name", "last_name", "nin"],
    purpose: "KYC verification for government Treasury Single Account (TSA) billing",
  },
  {
    id: "firs",
    name: "Federal Inland Revenue Service (FIRS)",
    category: "Tax Administration",
    domain: "https://taxportal.firs.gov.ng",
    logoColor: "from-emerald-700 to-teal-800",
    requestedClaims: ["first_name", "last_name", "resident_state"],
    purpose: "Automated Taxpayer Identification Number (TIN) issuance & compliance check",
  },
  {
    id: "cbn_open_banking",
    name: "CBN Open Banking Gateway",
    category: "Central Banking & Interbank",
    domain: "https://cbn.gov.ng/open-banking",
    logoColor: "from-blue-700 to-indigo-900",
    requestedClaims: ["first_name", "last_name", "is_over_18", "portrait_hash"],
    purpose: "Tier-3 bank account opening via high-assurance identity attestation",
  },
];

const SAMPLE_DOCUMENTS = [
  {
    name: "Affidavit_of_Age_Declaration.pdf",
    content: "FEDERAL REPUBLIC OF NIGERIA\nIN THE HIGH COURT OF LAGOS STATE\n\nI, Chukwudi Adeyemi, hereby solemnly declare under oath that I was born on the 14th of August 1997 in Lagos, Nigeria. This affidavit is made in support of official identity verification.",
    size: "1.4 KB",
  },
  {
    name: "Employment_Contract_Agreement.txt",
    content: "EMPLOYMENT AGREEMENT\nBetween NITDA Innovation Labs and Chukwudi Adeyemi.\nRole: Lead Cryptographic Security Engineer.\nCommencement: October 2026.\nGoverned under the laws of the Federal Republic of Nigeria.",
    size: "0.8 KB",
  },
];

// ---------------------------------------------------------------------------
//  Main Component
// ---------------------------------------------------------------------------

export default function WalletPage() {
  // Navigation & State
  const [activeTab, setActiveTab] = useState<WalletTab>("store");
  const [isPending, startTransition] = useTransition();

  // Storage data
  const [holderKey, setHolderKey] = useState<StoredKeyPair | null>(null);
  const [credentials, setCredentials] = useState<StoredCredential[]>([]);
  const [selectedCredId, setSelectedCredId] = useState<string>("");
  const [copiedKeyId, setCopiedKeyId] = useState(false);
  const [reseedLoading, setReseedLoading] = useState(false);

  // Share / Presentation State
  const [presentationMode, setPresentationMode] = useState<PresentationMode>("attribute_proof");
  const [selectedClaimNames, setSelectedClaimNames] = useState<string[]>([]);
  const [customDisclosures, setCustomDisclosures] = useState<Disclosure[]>([]);
  const [verifierAudience, setVerifierAudience] = useState<string>("https://verifier.portal.gov.ng");
  const [verifierNonce, setVerifierNonce] = useState<string>("");
  const [presentationToken, setPresentationToken] = useState<string>("");
  const [boundSdHash, setBoundSdHash] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [copiedToken, setCopiedToken] = useState(false);

  // Authenticate (OpenID4VP) State
  const [selectedRelyingParty, setSelectedRelyingParty] = useState<RelyingPartyOption>(RELYING_PARTIES[0]);
  const [authStep, setAuthStep] = useState<"ready" | "prompt" | "verifying" | "success">("ready");
  const [authPayload, setAuthPayload] = useState<any>(null);

  // Sign (e-Signature) State
  const [documentName, setDocumentName] = useState<string>(SAMPLE_DOCUMENTS[0].name);
  const [documentContent, setDocumentContent] = useState<string>(SAMPLE_DOCUMENTS[0].content);
  const [documentDigestHex, setDocumentDigestHex] = useState<string>("");
  const [signedManifest, setSignedManifest] = useState<any>(null);
  const [signStatus, setSignStatus] = useState<string>("");
  const [copiedManifest, setCopiedManifest] = useState(false);

  // ---------------------------------------------------------------------------
  //  Initialization
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function initWallet() {
      try {
        // 1. Get or generate holder hardware key
        const key = await getOrCreateHolderKey({ label: "Kora Secure Enclave Key (P-256)" });
        setHolderKey(key);

        // 2. Load or seed credentials
        const creds = await ensureWalletCredentials(key);
        setCredentials(creds);
        if (creds.length > 0) {
          setSelectedCredId(creds[0].id);
        }

        // 3. Initialize ephemeral nonce
        generateFreshNonce();
      } catch (err) {
        console.error("Failed to initialize wallet:", err);
      }
    }

    initWallet();
  }, []);

  const generateFreshNonce = () => {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const nonce = "nonce_" + base64urlEncode(randomBytes);
    setVerifierNonce(nonce);
    setSecondsRemaining(60);
  };

  // Expiring presentation timer
  useEffect(() => {
    if (activeTab !== "share") return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          generateFreshNonce();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTab]);

  // Selected credential reference
  const selectedCredential = credentials.find((c) => c.id === selectedCredId) || credentials[0];

  // ---------------------------------------------------------------------------
  //  Presentation Generation Effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function updatePresentation() {
      if (!selectedCredential || !holderKey || !verifierNonce) return;

      try {
        let claimsToReveal: string[] = [];

        if (presentationMode === "custom") {
          claimsToReveal = customDisclosures.map((d) => d.claimName);
        } else if (selectedClaimNames.length > 0) {
          claimsToReveal = selectedClaimNames;
        } else {
          // Default: attribute proof
          const ageClaim = selectedCredential.disclosures.find(
            (d) => d.claimName === "is_over_18" || d.claimName === "age_over_18" || d.claimName === "status"
          );
          claimsToReveal = ageClaim ? [ageClaim.claimName] : [selectedCredential.disclosures[0]?.claimName];
        }

        const result = await createHolderPresentation({
          sdJwt: selectedCredential.sdJwtCompact,
          authorizedClaims: claimsToReveal,
          nonce: verifierNonce,
          audience: verifierAudience,
          holderPrivateKey: holderKey.privateKey,
        });

        setPresentationToken(result.presentation);
        setBoundSdHash(result.sdHash);
      } catch (err) {
        console.error("Error generating presentation:", err);
      }
    }

    updatePresentation();
  }, [selectedCredential, presentationMode, selectedClaimNames, customDisclosures, verifierNonce, verifierAudience, holderKey]);

  // ---------------------------------------------------------------------------
  //  Document Digest Computation Effect
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function computeDigest() {
      if (!documentContent) return;
      const encoder = new TextEncoder();
      const data = encoder.encode(documentContent);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setDocumentDigestHex(hex);
      setSignedManifest(null);
      setSignStatus("");
    }
    computeDigest();
  }, [documentContent]);

  // ---------------------------------------------------------------------------
  //  Actions
  // ---------------------------------------------------------------------------

  const handleReseedWallet = async () => {
    if (!holderKey) return;
    setReseedLoading(true);
    try {
      const seeded = await seedDefaultWalletCredentials(holderKey);
      setCredentials(seeded);
      if (seeded.length > 0) setSelectedCredId(seeded[0].id);
    } catch (err) {
      console.error("Reseed failed:", err);
    } finally {
      setReseedLoading(false);
    }
  };

  const handleCopyKeyId = () => {
    if (!holderKey) return;
    navigator.clipboard.writeText(holderKey.id);
    setCopiedKeyId(true);
    setTimeout(() => setCopiedKeyId(false), 2000);
  };

  const handleCopyToken = () => {
    if (!presentationToken) return;
    navigator.clipboard.writeText(presentationToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSelectPresentationMode = (mode: PresentationMode, claims: string[]) => {
    setPresentationMode(mode);
    setSelectedClaimNames(claims);
    if (mode === "custom" && selectedCredential) {
      setCustomDisclosures(selectedCredential.disclosures);
    }
  };

  // OpenID4VP Simulation
  const handleStartAuthFlow = () => {
    setAuthStep("prompt");
  };

  const handleExecuteBiometricAuth = async () => {
    setAuthStep("verifying");
    // Simulate Secure Enclave biometric scan (Touch ID / Face ID)
    await new Promise((resolve) => setTimeout(resolve, 1400));

    try {
      if (!selectedCredential || !holderKey) throw new Error("Missing credential or key");

      const nonce = "auth_nonce_" + Math.random().toString(36).substring(2, 10);
      const pres = await createHolderPresentation({
        sdJwt: selectedCredential.sdJwtCompact,
        authorizedClaims: selectedRelyingParty.requestedClaims,
        nonce,
        audience: selectedRelyingParty.domain,
        holderPrivateKey: holderKey.privateKey,
      });

      const responsePayload = {
        state: "state_" + Math.random().toString(36).substring(2, 8),
        vp_token: pres.presentation,
        id_token_hint: {
          iss: "https://self-issued.me/v2",
          sub: holderKey.id,
          aud: selectedRelyingParty.domain,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 300,
          sub_jwk: holderKey.publicKey,
        },
        disclosed_attributes: pres.disclosedClaims,
        relying_party: selectedRelyingParty.name,
        assurance_level: "eIDAS High (QES Qualified)",
        timestamp: new Date().toISOString(),
      };

      setAuthPayload(responsePayload);
      setAuthStep("success");
    } catch (err) {
      console.error("Auth flow failed:", err);
      setAuthStep("ready");
    }
  };

  // e-Signature Sign Action
  const handleSignDocument = async () => {
    if (!holderKey || !documentDigestHex) return;
    setSignStatus("Signing with hardware-bound private key...");

    try {
      const now = new Date().toISOString();
      const encoder = new TextEncoder();
      const digestBytes = encoder.encode(documentDigestHex);

      // Raw signature over the document digest
      const signatureBuffer = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        await crypto.subtle.importKey(
          "jwk",
          holderKey.privateKey as JsonWebKey,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["sign"]
        ),
        digestBytes
      );

      const signatureB64 = base64urlEncode(new Uint8Array(signatureBuffer));

      // JWS AdES Protected Header (per ETSI TS 119 182-1 / eIDAS)
      const protectedHeader = {
        alg: "ES256",
        b64: false,
        crit: ["b64"],
        kid: holderKey.id,
        sigT: now,
        trust_framework: "NG_PKI_EUDIW",
        cty: "application/sha256",
      };

      const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(protectedHeader)));
      const compactJws = `${headerB64}..${signatureB64}`;

      const manifest = {
        manifest_version: "eIDAS-AdES-v2.0",
        document: {
          file_name: documentName,
          sha256_digest: documentDigestHex,
          size_bytes: documentContent.length,
          timestamp: now,
        },
        signer: {
          name: "Chukwudi Adeyemi",
          holder_did: `did:key:${holderKey.id}`,
          assurance_level: "eIDAS High",
          algorithm: "ES256 (ECDSA P-256)",
        },
        signature: {
          format: "JWS (JSON Web Signature)",
          protected_header: protectedHeader,
          compact_jws: compactJws,
          detached_signature: signatureB64,
        },
      };

      setSignedManifest(manifest);
      setSignStatus("Document successfully signed with device-bound key!");
    } catch (err) {
      console.error("Signing failed:", err);
      setSignStatus("Signing error: " + String(err));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDocumentContent(text || `Binary file: ${file.name} (${file.size} bytes)`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* --------------------------------------------------------------------------- */}
      {/* Top Banner & Header */}
      {/* --------------------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo & Wallet Name */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight text-slate-900">
                  Kora<span className="text-emerald-700">ID</span> <span className="text-slate-500 font-normal">Wallet</span>
                </h1>
                <p className="text-xs text-slate-500">
                  Federal Republic of Nigeria
                </p>
              </div>
            </div>

            {/* Tools */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleReseedWallet}
                disabled={reseedLoading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <RefreshCw className={clsx("h-3 w-3", reseedLoading && "animate-spin text-emerald-600")} />
                Reset Credentials
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-1">
            {[
              { id: "store", label: "My Credentials", icon: CreditCard },
              { id: "share", label: "Selective Sharing", icon: QrCode },
              { id: "authenticate", label: "Online Login", icon: KeyRound },
              { id: "sign", label: "Digital Signatures", icon: FileSignature },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as WalletTab)}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all",
                    isActive
                      ? "border-emerald-700 text-emerald-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* --------------------------------------------------------------------------- */}
      {/* Main Content Area */}
      {/* --------------------------------------------------------------------------- */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ========================================================================= */}
        {/* TAB 1: STORE (VAULT VIEW) */}
        {/* ========================================================================= */}
        {activeTab === "store" && (
          <div className="space-y-8">
            {/* Top Status Badges */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stored Credentials</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">{credentials.length}</span>
                  <span className="text-xs text-emerald-700 font-semibold">Active</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Device Protection</p>
                <div className="mt-2 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-900">Hardware Key Linked</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Security Level</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-sm font-bold text-slate-900">High</span>
                  <span className="text-xs text-slate-500">(eIDAS Level of Assurance)</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Approved Authorities</p>
                <div className="mt-2">
                  <span className="text-sm font-bold text-slate-900">NIMC · FRSC · NYSC</span>
                </div>
              </div>
            </div>

            {/* Credential Cards & Inspector Layout */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Cards Stack */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                    Your Digital Credentials
                  </h3>
                  <span className="text-xs text-slate-400">Tap a card to inspect</span>
                </div>

                <div className="space-y-4">
                  {credentials.map((cred) => (
                    <CredentialCard
                      key={cred.id}
                      credential={cred}
                      selected={cred.id === selectedCredId}
                      onSelect={(c) => setSelectedCredId(c.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Right Column: Inspector */}
              <div className="lg:col-span-6">
                {selectedCredential ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                          Credential Details
                        </span>
                        <h2 className="text-xl font-bold text-slate-900 mt-1">
                          {selectedCredential.displayName}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Issued by {selectedCredential.issuer.name}
                        </p>
                      </div>

                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 flex items-center gap-1.5">
                        <Check className="h-3 w-3" />
                        Valid
                      </span>
                    </div>

                    {/* Claims — clean user-friendly view */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                        Credential Attributes
                      </h4>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {selectedCredential.disclosures.map((d) => (
                          <div
                            key={d.digest}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <Lock className="h-3.5 w-3.5 text-emerald-600" />
                              <span className="font-medium text-slate-700 capitalize">
                                {d.claimName.replace(/_/g, " ")}
                              </span>
                            </div>

                            <span className="font-semibold text-slate-800">
                              {typeof d.claimValue === "boolean"
                                ? d.claimValue ? "YES" : "NO"
                                : String(d.claimValue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-slate-100 flex gap-3">
                      <button
                        onClick={() => {
                          setActiveTab("share");
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 transition-colors"
                      >
                        <QrCode className="h-4 w-4" />
                        Generate Verification QR
                      </button>

                      <button
                        onClick={() => {
                          setActiveTab("authenticate");
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                        Online Login
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
                    No credential selected.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SHARE (SELECTIVE DISCLOSURE) */}
        {/* ========================================================================= */}
        {activeTab === "share" && (
          <div className="space-y-8">
            {/* Header Description */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Selective Sharing Controller
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You control exactly which identity attributes the verifier receives. Hidden attributes remain
                  cryptographically sealed and mathematically impossible for the verifier to deduce.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Configuration Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Select Credential */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    1. Select Credential
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {credentials.map((cred) => (
                      <button
                        key={cred.id}
                        type="button"
                        onClick={() => setSelectedCredId(cred.id)}
                        className={clsx(
                          "rounded-xl border p-3 text-left transition-all text-xs",
                          cred.id === selectedCredId
                            ? "border-emerald-500 bg-emerald-50 text-slate-900 font-semibold shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <div className="truncate font-medium">{cred.displayName}</div>
                        <div className="text-slate-400 truncate mt-0.5">{cred.issuer.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Mode Selector */}
                {selectedCredential && (
                  <PresentationModeSelector
                    credential={selectedCredential}
                    activeMode={presentationMode}
                    onModeChange={handleSelectPresentationMode}
                  />
                )}

                {/* 3. Granular Custom Toggles (when mode is custom) */}
                {presentationMode === "custom" && selectedCredential && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                    <DisclosureToggle
                      disclosures={selectedCredential.disclosures}
                      onSelectionChange={(selected) => setCustomDisclosures(selected)}
                    />
                  </div>
                )}

                {/* 4. Verifier Context & Replay Protection */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Verifier Context
                    </label>
                    <button
                      onClick={generateFreshNonce}
                      className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh Token
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <span className="text-[11px] text-slate-500">Verifier Audience</span>
                      <input
                        type="text"
                        value={verifierAudience}
                        onChange={(e) => setVerifierAudience(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 font-mono focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500">Replay Protection Nonce</span>
                      <input
                        type="text"
                        readOnly
                        value={verifierNonce}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 font-mono"
                      />
                    </div>
                  </div>

                  {/* Countdown Timer */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <span className="text-slate-500">Token Expiry Window:</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {secondsRemaining}s remaining
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-1000"
                      style={{ width: `${(secondsRemaining / 60) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic QR Presentation */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 flex flex-col items-center space-y-6 shadow-sm">
                  {presentationToken ? (
                    <>
                      <QRViewer
                        data={presentationToken}
                        title="Scan on Verifier Terminal"
                        size={220}
                      />

                      {/* Disclosed vs Concealed Summary */}
                      <div className="w-full space-y-3 pt-4 border-t border-slate-100 text-xs">
                        <div>
                          <p className="font-semibold text-emerald-700 flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            Attributes Shared with Verifier:
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {selectedClaimNames.map((name) => (
                              <span
                                key={name}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                              >
                                {name.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="font-semibold text-slate-400 flex items-center gap-1">
                            <EyeOff className="h-3.5 w-3.5" />
                            Attributes Kept Secret:
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {selectedCredential.disclosures
                              .filter((d) => !selectedClaimNames.includes(d.claimName))
                              .map((d) => (
                                <span
                                  key={d.claimName}
                                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400"
                                >
                                  {d.claimName.replace(/_/g, " ")}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>

                      {/* Copy */}
                      <button
                        onClick={handleCopyToken}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {copiedToken ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedToken ? "Presentation Token Copied!" : "Copy Presentation Token"}
                      </button>
                    </>
                  ) : (
                    <div className="py-12 text-center text-slate-400">
                      Generating presentation token...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: AUTHENTICATE (ONLINE LOGIN) */}
        {/* ========================================================================= */}
        {activeTab === "authenticate" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Access Online Services
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Authenticate securely across federal agencies, digital tax portals, and commercial banks.
                  Your identity is verified cryptographically without passwords, powered by hardware-backed biometrics.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Relying Party Selector */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Select Online Portal
                </h3>

                <div className="space-y-3">
                  {RELYING_PARTIES.map((rp) => (
                    <button
                      key={rp.id}
                      onClick={() => {
                        setSelectedRelyingParty(rp);
                        setAuthStep("ready");
                        setAuthPayload(null);
                      }}
                      className={clsx(
                        "w-full rounded-2xl border p-4 text-left transition-all",
                        selectedRelyingParty.id === rp.id
                          ? "border-blue-500 bg-white shadow-md"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white font-bold text-xs",
                            rp.logoColor
                          )}
                        >
                          {rp.name.substring(0, 2)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{rp.name}</h4>
                          <p className="text-xs text-slate-400">{rp.domain}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                        {rp.purpose}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2.5">
                        <span className="text-[10px] text-slate-400">Requires:</span>
                        {rp.requestedClaims.map((claim) => (
                          <span
                            key={claim}
                            className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"
                          >
                            {claim.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Interactive Flow */}
              <div className="lg:col-span-7">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        Authentication Session
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                        {selectedRelyingParty.name}
                      </h3>
                    </div>

                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      High Assurance
                    </span>
                  </div>

                  {/* Flow Stages */}
                  {authStep === "ready" && (
                    <div className="space-y-6 py-4">
                      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                        <h4 className="text-xs font-semibold uppercase text-slate-600">
                          Credential to Present:
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                            <Shield className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {selectedCredential?.displayName || "NIN National Identity"}
                            </p>
                            <p className="text-xs text-slate-500">
                              Device-bound secure credential
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleStartAuthFlow}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-sm"
                      >
                        <Fingerprint className="h-5 w-5" />
                        Authorize with Biometrics
                      </button>
                    </div>
                  )}

                  {authStep === "prompt" && (
                    <div className="space-y-6 py-6 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 animate-pulse">
                        <Fingerprint className="h-8 w-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">
                          Biometric Verification
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Place your finger on the device sensor or look into the camera to unlock your secure key.
                        </p>
                      </div>

                      <div className="flex justify-center gap-3">
                        <button
                          onClick={handleExecuteBiometricAuth}
                          className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500"
                        >
                          Simulate Successful Match
                        </button>
                        <button
                          onClick={() => setAuthStep("ready")}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {authStep === "verifying" && (
                    <div className="py-12 text-center space-y-4">
                      <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto" />
                      <p className="text-sm font-medium text-slate-600">
                        Generating secure authentication response...
                      </p>
                    </div>
                  )}

                  {authStep === "success" && authPayload && (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
                        <Check className="h-5 w-5 text-emerald-600 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold text-emerald-800">
                            Authentication Successful!
                          </h4>
                          <p className="text-xs text-emerald-700">
                            Presentation accepted by {selectedRelyingParty.name}.
                          </p>
                        </div>
                      </div>

                      {/* Response Payload Inspector */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        <span className="text-xs font-semibold text-slate-600">
                          Authentication Response (JSON)
                        </span>
                        <pre className="text-[11px] font-mono text-slate-600 bg-white p-3 rounded-lg overflow-x-auto max-h-56 border border-slate-200">
                          {JSON.stringify(authPayload, null, 2)}
                        </pre>
                      </div>

                      <button
                        onClick={() => setAuthStep("ready")}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Start Another Session
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SIGN (DIGITAL SIGNATURES) */}
        {/* ========================================================================= */}
        {activeTab === "sign" && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shrink-0">
                <FileSignature className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Digital Document Signing
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Sign contracts, affidavits, and official documents directly on your device. Your hardware-bound key
                  produces internationally compliant, legally valid digital signatures.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              {/* Left Column: Document Upload & Sample Selector */}
              <div className="lg:col-span-6 space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Select Document to Sign
                  </label>

                  {/* Sample Documents */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SAMPLE_DOCUMENTS.map((doc) => (
                      <button
                        key={doc.name}
                        onClick={() => {
                          setDocumentName(doc.name);
                          setDocumentContent(doc.content);
                        }}
                        className={clsx(
                          "rounded-xl border p-3 text-left transition-all text-xs",
                          documentName === doc.name
                            ? "border-purple-500 bg-purple-50 text-slate-900 font-semibold shadow-sm"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <FileText className="h-4 w-4 mb-1.5 text-purple-600" />
                        <div className="truncate font-semibold">{doc.name}</div>
                        <div className="text-slate-400">{doc.size}</div>
                      </button>
                    ))}
                  </div>

                  {/* File Upload Zone */}
                  <div className="relative rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center hover:border-slate-400 transition-colors">
                    <UploadCloud className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">
                      Upload Custom Document
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      File never leaves your browser — hash is computed locally
                    </p>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Document Content Preview */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Document Preview
                  </label>
                  <textarea
                    rows={6}
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono text-slate-700 focus:border-purple-500 focus:outline-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Right Column: Signature Output */}
              <div className="lg:col-span-6 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-600" />
                      Document Hash & Signer
                    </h3>
                  </div>

                  {/* Computed Digest */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Document Hash (SHA-256):</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Real-time Computed</span>
                    </div>
                    <p className="text-xs font-mono text-purple-700 break-all bg-white p-2 rounded border border-slate-100">
                      {documentDigestHex || "Computing digest..."}
                    </p>
                  </div>

                  {/* Signer Key */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 space-y-1 text-xs">
                    <span className="text-slate-500 font-medium">Signing Key:</span>
                    <p className="font-mono text-slate-600 truncate">
                      {holderKey?.id}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Algorithm: ES256 (ECDSA P-256) • Holder: Chukwudi Adeyemi
                    </p>
                  </div>

                  {/* Sign Action Button */}
                  <button
                    onClick={handleSignDocument}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-bold text-white hover:bg-purple-500 transition-colors shadow-sm"
                  >
                    <FileCheck className="h-4 w-4" />
                    Sign Document
                  </button>

                  {signStatus && (
                    <p className="text-center text-xs text-emerald-700 font-medium">
                      {signStatus}
                    </p>
                  )}

                  {/* Verifiable Manifest Output */}
                  {signedManifest && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          Verifiable Signature Manifest
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(signedManifest, null, 2));
                            setCopiedManifest(true);
                            setTimeout(() => setCopiedManifest(false), 2000);
                          }}
                          className="text-xs text-purple-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          {copiedManifest ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copiedManifest ? "Copied" : "Copy JSON"}
                        </button>
                      </div>

                      <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 p-3 rounded-xl overflow-x-auto max-h-60 border border-slate-200">
                        {JSON.stringify(signedManifest, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
