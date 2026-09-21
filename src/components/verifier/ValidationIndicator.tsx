"use client";

import { clsx } from "clsx";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { VerificationResult, VerificationStatus } from "@/types/identity";

// ---------------------------------------------------------------------------
//  Status Configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  VerificationStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    animate?: boolean;
  }
> = {
  PENDING: {
    icon: Clock,
    label: "Awaiting Verification",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/20",
  },
  VERIFYING: {
    icon: Loader2,
    label: "Verifying Credential...",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    animate: true,
  },
  VALID: {
    icon: ShieldCheck,
    label: "Credential Verified ✓",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  INVALID: {
    icon: ShieldX,
    label: "Verification Failed",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  EXPIRED: {
    icon: AlertTriangle,
    label: "Credential Expired",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  REVOKED: {
    icon: ShieldAlert,
    label: "Credential Revoked",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
  ERROR: {
    icon: XCircle,
    label: "Verification Error",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
};

// ---------------------------------------------------------------------------
//  ValidationIndicator Component
// ---------------------------------------------------------------------------

interface ValidationIndicatorProps {
  result?: VerificationResult;
  status: VerificationStatus;
  className?: string;
}

export function ValidationIndicator({
  result,
  status,
  className,
}: ValidationIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl border p-6 transition-all duration-500",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Status icon & label */}
      <div className="flex items-center gap-4">
        <div
          className={clsx(
            "flex h-14 w-14 items-center justify-center rounded-xl",
            config.bgColor
          )}
        >
          <Icon
            className={clsx(
              "h-8 w-8",
              config.color,
              config.animate && "animate-spin"
            )}
          />
        </div>
        <div>
          <h3 className={clsx("text-lg font-bold", config.color)}>
            {config.label}
          </h3>
          {result?.verifiedAt && (
            <p className="text-xs text-gray-500">
              {new Date(result.verifiedAt).toLocaleString("en-NG")}
            </p>
          )}
        </div>
      </div>

      {/* Verification checks */}
      {result && status !== "PENDING" && status !== "VERIFYING" && (
        <div className="mt-5 space-y-2">
          <VerificationCheck
            label="Signature"
            passed={result.signatureValid}
          />
          <VerificationCheck
            label="Not Expired"
            passed={result.notExpired}
          />
          <VerificationCheck
            label="Key Binding"
            passed={result.keyBindingValid}
          />
          {result.issuer && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="text-xs text-gray-500">Issuer:</span>
              <span className="text-xs font-medium text-gray-300">
                {result.issuer.name}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Disclosed claims */}
      {result?.disclosedClaims &&
        Object.keys(result.disclosedClaims).length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-semibold text-gray-400">
              Disclosed Claims
            </h4>
            <div className="space-y-1.5">
              {Object.entries(result.disclosedClaims).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between rounded-lg bg-white/[0.03] px-3 py-2"
                  >
                    <span className="text-xs capitalize text-gray-500">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs font-medium text-gray-300">
                      {String(value)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

      {/* Errors */}
      {result?.errors && result.errors.length > 0 && (
        <div className="mt-4 space-y-1">
          {result.errors.map((err, i) => (
            <p key={i} className="text-xs text-red-400">
              ⚠ {err}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  VerificationCheck sub-component
// ---------------------------------------------------------------------------

function VerificationCheck({
  label,
  passed,
}: {
  label: string;
  passed?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {passed === undefined ? (
        <div className="h-4 w-4 rounded-full bg-gray-700" />
      ) : passed ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}
      <span
        className={clsx(
          "text-sm",
          passed === undefined
            ? "text-gray-500"
            : passed
              ? "text-gray-300"
              : "text-red-300"
        )}
      >
        {label}
      </span>
    </div>
  );
}
