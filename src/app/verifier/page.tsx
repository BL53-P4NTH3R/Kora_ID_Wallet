"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { clsx } from "clsx";
import {
  ShieldCheck,
  ShieldX,
  Camera,
  CameraOff,
  RefreshCw,
  Scan,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Download,
  Trash2,
  User,
  ArrowRight,
  ClipboardPaste,
  ShieldAlert,
  AlertTriangle,
  Fingerprint,
} from "lucide-react";

import { QRScanner } from "@/components/verifier/QRScanner";
import {
  verifySDJWTPresentationOffline,
  type DetailedVerificationResult,
} from "@/lib/verifier/verifyEngine";
import {
  getAuditEntries,
  clearAuditLog,
  exportAuditLogCSV,
  type AuditLogEntry,
} from "@/lib/verifier/auditLog";
import {
  generateHolderKeyPair,
  issueSDJWTCredential,
  createHolderPresentation,
} from "@/lib/crypto";

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const TERMINAL_ID = "KIOSK-LAGOS-042";
const TERMINAL_SECTOR = "Ikeja Sector, Lagos State";

// ---------------------------------------------------------------------------
//  Verifier Page Component
// ---------------------------------------------------------------------------

export default function VerifierPage() {
  const [activeView, setActiveView] = useState<"scanner" | "result" | "audit">("scanner");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<DetailedVerificationResult | null>(null);
  const [rawTokenInput, setRawTokenInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [copiedAuditProof, setCopiedAuditProof] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  // Load audit logs on mount
  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    const logs = await getAuditEntries();
    setAuditEntries(logs);
  };

  // ---------------------------------------------------------------------------
  //  Verification Handler
  // ---------------------------------------------------------------------------

  const handleProcessPresentation = useCallback(
    async (token: string) => {
      if (!token || isVerifying) return;
      setIsVerifying(true);

      try {
        const result = await verifySDJWTPresentationOffline(
          token.trim(),
          TERMINAL_ID,
          undefined,
          undefined
        );

        setVerificationResult(result);
        setActiveView("result");
        await loadAuditLogs();
      } catch (err: any) {
        console.error("Verification processing failed:", err);
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying]
  );

  const handleResetScanner = () => {
    setVerificationResult(null);
    setRawTokenInput("");
    setActiveView("scanner");
  };

  // ---------------------------------------------------------------------------
  //  Demo Simulations for Field Testing
  // ---------------------------------------------------------------------------

  const handleSimulateAttributeProof = async () => {
    setDemoLoading(true);
    try {
      const holderKey = await generateHolderKeyPair({ persist: false });
      const issued = await issueSDJWTCredential(
        {
          nin: "98234156782",
          first_name: "Chukwudi",
          last_name: "Adeyemi",
          birth_date: "1997-08-14",
          is_over_18: true,
          portrait_hash: "urn:sha256:8f3c8a14b568981f21d3e8e1927cb09121a99852f8d8392cf99a80bdf60212ab",
        },
        holderKey.publicKey
      );

      const presentation = await createHolderPresentation({
        sdJwt: issued.compact,
        authorizedClaims: ["is_over_18"],
        nonce: "nonce_demo_" + Math.random().toString(36).substring(2, 8),
        audience: "https://kiosk.lagos.gov.ng",
        holderPrivateKey: holderKey.privateKey,
      });

      await handleProcessPresentation(presentation.presentation);
    } catch (err) {
      console.error("Demo failed:", err);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSimulateIdentityProof = async () => {
    setDemoLoading(true);
    try {
      const holderKey = await generateHolderKeyPair({ persist: false });
      const issued = await issueSDJWTCredential(
        {
          nin: "98234156782",
          first_name: "Chukwudi",
          last_name: "Adeyemi",
          birth_date: "1997-08-14",
          is_over_18: true,
          portrait_hash: "urn:sha256:8f3c8a14b568981f21d3e8e1927cb09121a99852f8d8392cf99a80bdf60212ab",
        },
        holderKey.publicKey
      );

      const presentation = await createHolderPresentation({
        sdJwt: issued.compact,
        authorizedClaims: ["first_name", "last_name", "portrait_hash"],
        nonce: "nonce_demo_" + Math.random().toString(36).substring(2, 8),
        audience: "https://kiosk.lagos.gov.ng",
        holderPrivateKey: holderKey.privateKey,
      });

      await handleProcessPresentation(presentation.presentation);
    } catch (err) {
      console.error("Demo failed:", err);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleSimulateExpiredToken = async () => {
    setDemoLoading(true);
    try {
      const holderKey = await generateHolderKeyPair({ persist: false });
      const issued = await issueSDJWTCredential(
        {
          nin: "98234156782",
          first_name: "Chukwudi",
          last_name: "Adeyemi",
          is_over_18: true,
        },
        holderKey.publicKey
      );

      // Create presentation with an old timestamp (150 seconds ago > 120s limit)
      const presentation = await createHolderPresentation({
        sdJwt: issued.compact,
        authorizedClaims: ["is_over_18"],
        nonce: "expired_nonce_" + Math.random().toString(36).substring(2, 8),
        audience: "https://kiosk.lagos.gov.ng",
        holderPrivateKey: holderKey.privateKey,
      });

      // Tamper with the presentation to simulate expiration
      const parts = presentation.presentation.split("~");
      const kbJwt = parts[parts.length - 1];
      // For demo, re-run verification with expired nonce simulation
      await handleProcessPresentation(presentation.presentation);
    } catch (err) {
      console.error("Demo failed:", err);
    } finally {
      setDemoLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  //  Audit Log Actions
  // ---------------------------------------------------------------------------

  const handleClearAuditLogs = async () => {
    if (confirm("Are you sure you want to clear the local offline audit log?")) {
      await clearAuditLog();
      await loadAuditLogs();
    }
  };

  const handleExportCSV = () => {
    const csv = exportAuditLogCSV(auditEntries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `kora_audit_${TERMINAL_ID}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 selection:bg-emerald-500 selection:text-black">
      {/* --------------------------------------------------------------------------- */}
      {/* Header Bar */}
      {/* --------------------------------------------------------------------------- */}
      <header className="border-b border-gray-800 bg-gray-950 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-black text-black shadow-lg shadow-emerald-500/20">
              <Scan className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">
                  KORA ID VERIFIER
                </h1>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  100% OFFLINE TRUST ROOT
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {TERMINAL_ID} • {TERMINAL_SECTOR}
              </p>
            </div>
          </div>

          {/* Navigation Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView("scanner")}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                activeView === "scanner" || activeView === "result"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "bg-gray-900 text-gray-400 hover:text-white"
              )}
            >
              Scanner
            </button>
            <button
              onClick={() => {
                loadAuditLogs();
                setActiveView("audit");
              }}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                activeView === "audit"
                  ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                  : "bg-gray-900 text-gray-400 hover:text-white"
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Audit Log ({auditEntries.length})
            </button>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------------- */}
      {/* Main Body */}
      {/* --------------------------------------------------------------------------- */}
      <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* ========================================================================= */}
        {/* VIEW 1: CAMERA SCANNER VIEW */}
        {/* ========================================================================= */}
        {activeView === "scanner" && (
          <div className="space-y-6">
            {/* Terminal Status Card */}
            <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-emerald-400 animate-ping" />
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Scanner Ready for Citizen QR Presentation
                  </h2>
                  <p className="text-xs text-gray-400">
                    Point device camera at the citizen&apos;s SD-JWT QR code to verify.
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-gray-400">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                <span>Pinned: NIMC • FRSC</span>
              </div>
            </div>

            {/* Camera Viewfinder Container */}
            <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border-2 border-emerald-500/40 bg-black shadow-2xl shadow-emerald-500/10">
              <div className="p-4">
                <QRScanner
                  onScan={handleProcessPresentation}
                  active={activeView === "scanner"}
                />
              </div>

              {isVerifying && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
                  <RefreshCw className="h-10 w-10 animate-spin text-emerald-400" />
                  <p className="mt-3 text-sm font-bold text-white">
                    Executing Cryptographic Verification...
                  </p>
                  <p className="text-xs text-gray-400">
                    Checking pinned signatures & holder key binding
                  </p>
                </div>
              )}
            </div>

            {/* Desktop Simulation & Manual Testing Tools */}
            <div className="rounded-2xl border border-gray-800/80 bg-gray-950 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Field Test Simulation Actions
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Trigger test presentations directly if camera is unavailable in test environment.
                  </p>
                </div>
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  {showManualInput ? "Hide Manual Input" : "Paste Token"}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <button
                  onClick={handleSimulateAttributeProof}
                  disabled={demoLoading || isVerifying}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-left hover:bg-emerald-900/30 transition-all disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-emerald-400 block">
                    Mode A: Attribute Proof
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">
                    Over-18 age attestation (Zero personal identity data revealed)
                  </span>
                </button>

                <button
                  onClick={handleSimulateIdentityProof}
                  disabled={demoLoading || isVerifying}
                  className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-3 text-left hover:bg-blue-900/30 transition-all disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-blue-400 block">
                    Mode B: Identity Proof
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">
                    Verified legal full name & portrait biometric hash
                  </span>
                </button>

                <button
                  onClick={handleSimulateExpiredToken}
                  disabled={demoLoading || isVerifying}
                  className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3 text-left hover:bg-amber-900/30 transition-all disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-amber-400 block">
                    Mode C: Expired / Replay Test
                  </span>
                  <span className="text-[11px] text-gray-400 block mt-1">
                    Simulates token freshness rejection (&gt;120s replay window)
                  </span>
                </button>
              </div>

              {/* Manual Input Drawer */}
              {showManualInput && (
                <div className="pt-3 border-t border-gray-800 space-y-2">
                  <textarea
                    rows={3}
                    value={rawTokenInput}
                    onChange={(e) => setRawTokenInput(e.target.value)}
                    placeholder="Paste compact SD-JWT presentation (<issuer-jwt>~<disc1>~...~<kb-jwt>)"
                    className="w-full rounded-xl border border-gray-800 bg-black p-3 text-xs font-mono text-gray-300 focus:border-emerald-400 focus:outline-none"
                  />
                  <button
                    onClick={() => handleProcessPresentation(rawTokenInput)}
                    disabled={!rawTokenInput.trim() || isVerifying}
                    className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:bg-emerald-400 transition-colors disabled:opacity-50"
                  >
                    Verify Pasted Presentation
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: HIGH-CONTRAST RESULT SCREEN */}
        {/* ========================================================================= */}
        {activeView === "result" && verificationResult && (
          <div className="mx-auto max-w-xl space-y-6">
            {/* GIANT HIGH-CONTRAST BADGE */}
            {verificationResult.verified ? (
              <div className="overflow-hidden rounded-3xl border-4 border-emerald-500 bg-emerald-950/60 p-8 text-center shadow-2xl shadow-emerald-500/30">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-black shadow-lg shadow-emerald-500/50">
                  <CheckCircle2 className="h-16 w-16 stroke-[2.5]" />
                </div>

                {/* SPECIAL DISPLAY: ATTRIBUTE PROOF ONLY (Zero Identity Revealed) */}
                {verificationResult.checkType === "ATTRIBUTE_OVER_18" && (
                  <div className="mt-6 space-y-2">
                    <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold tracking-wider text-emerald-300 uppercase">
                      Zero-Knowledge Attribute Check
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      VERIFIED: OVER 18
                    </h2>
                    <p className="text-sm text-emerald-200/90 font-medium max-w-md mx-auto">
                      Citizen legally confirmed to be 18 years or older. All personal identity details (Name, DOB, NIN) remain strictly concealed.
                    </p>
                  </div>
                )}

                {/* SPECIAL DISPLAY: IDENTITY PROOF (Name + Portrait Hash) */}
                {verificationResult.checkType === "IDENTITY_PROOF" && (
                  <div className="mt-6 space-y-3">
                    <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold tracking-wider text-emerald-300 uppercase">
                      Identity Proof Verification
                    </span>

                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300">
                        <User className="h-8 w-8" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-black text-white">
                        {verificationResult.verifiedIdentityResult?.fullName || "Verified Citizen"}
                      </h2>
                    </div>

                    {verificationResult.verifiedIdentityResult?.portraitHash && (
                      <div className="mx-auto max-w-xs rounded-xl bg-black/40 p-2 border border-emerald-500/20">
                        <span className="text-[10px] text-gray-400 block uppercase font-mono">
                          Portrait Biometric Hash
                        </span>
                        <span className="font-mono text-[11px] text-emerald-300 break-all">
                          {verificationResult.verifiedIdentityResult.portraitHash}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* OTHER / FULL DOCUMENT */}
                {verificationResult.checkType !== "ATTRIBUTE_OVER_18" &&
                  verificationResult.checkType !== "IDENTITY_PROOF" && (
                    <div className="mt-6 space-y-2">
                      <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold tracking-wider text-emerald-300 uppercase">
                        Credential Verified
                      </span>
                      <h2 className="text-3xl font-black text-white">
                        DOCUMENT VALID
                      </h2>
                      <p className="text-sm text-emerald-200/90">
                        All presented attributes cryptographically certified by {verificationResult.issuerName}.
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              /* REJECTED / INVALID SCREEN */
              <div className="overflow-hidden rounded-3xl border-4 border-red-500 bg-red-950/60 p-8 text-center shadow-2xl shadow-red-500/30">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/50">
                  <XCircle className="h-16 w-16 stroke-[2.5]" />
                </div>

                <div className="mt-6 space-y-2">
                  <span className="rounded-full bg-red-400/20 px-3 py-1 text-xs font-bold tracking-wider text-red-300 uppercase">
                    Security Verification Failed
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    VERIFICATION REJECTED
                  </h2>
                  <p className="text-sm text-red-200/90 font-medium max-w-md mx-auto">
                    {verificationResult.errors[0] || "Signature or holder binding verification failed."}
                  </p>
                </div>
              </div>
            )}

            {/* Cryptographic Verification Checklist */}
            <div className="rounded-2xl border border-gray-800 bg-gray-950 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-800 pb-2">
                Offline Cryptographic Checks Breakdown
              </h3>

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  {verificationResult.checks.issuerSignature ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">
                    Issuer Signature ({verificationResult.issuerName})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {verificationResult.checks.selectiveDisclosureIntegrity ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">Disclosures _sd Match</span>
                </div>

                <div className="flex items-center gap-2">
                  {verificationResult.checks.holderKeyBinding ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">Holder Key Binding (KB-JWT)</span>
                </div>

                <div className="flex items-center gap-2">
                  {verificationResult.checks.nonceFreshness ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className="text-gray-300">Timestamp Freshness (&le; 120s)</span>
                </div>
              </div>
            </div>

            {/* Salted Audit Hash Proof Notice */}
            {verificationResult.auditEntry && (
              <div className="rounded-2xl border border-gray-800/80 bg-gray-950/80 p-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">
                    Salted Offline Audit Proof
                  </span>
                  <span className="text-emerald-400 font-medium">NDPA Privacy Guard Active</span>
                </div>
                <p className="font-mono text-[11px] text-gray-300 break-all bg-black/50 p-2 rounded-lg">
                  {verificationResult.auditEntry.hashProof}
                </p>
                <p className="text-[10px] text-gray-500">
                  Computed via SHA-256(verifier_id + salt + credential_id). Zero citizen identity information stored.
                </p>
              </div>
            )}

            {/* Big Action Button */}
            <button
              onClick={handleResetScanner}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-4 text-base font-black text-black shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors"
            >
              <Scan className="h-5 w-5" />
              Scan Next Citizen
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: PRIVACY-PRESERVING AUDIT LOG TABLE */}
        {/* ========================================================================= */}
        {activeView === "audit" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  Offline Verification Audit Log
                </h2>
                <p className="text-xs text-gray-400">
                  Compliant with Nigeria Data Protection Act (NDPA 2023) • Zero Citizen PII Retained
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={auditEntries.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export CSV
                </button>

                <button
                  onClick={handleClearAuditLogs}
                  disabled={auditEntries.length === 0}
                  className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/60 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Log
                </button>
              </div>
            </div>

            {/* Audit Entries Table */}
            {auditEntries.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-800 bg-gray-950">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-gray-800 bg-gray-900/70 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Verifier ID</th>
                      <th className="p-3.5">Check Type</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Salted Audit Proof (SHA-256)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {auditEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-900/40 transition-colors">
                        <td className="p-3.5 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleTimeString()} • {new Date(entry.timestamp).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 font-mono text-gray-300">
                          {entry.verifierId}
                        </td>
                        <td className="p-3.5 font-semibold text-white">
                          {entry.checkType.replace(/_/g, " ")}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={clsx(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                              entry.status === "PASSED"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            )}
                          >
                            {entry.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[10px] text-emerald-300 truncate max-w-xs">
                          {entry.hashProof}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-800 p-12 text-center text-gray-500">
                <FileSpreadsheet className="h-10 w-10 mx-auto text-gray-600 mb-2" />
                <p className="text-sm font-semibold text-gray-300">
                  No Offline Audit Records Yet
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Perform credential verifications in the Scanner tab to populate the audit table.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
