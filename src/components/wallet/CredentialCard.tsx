"use client";

import { clsx } from "clsx";
import {
  CreditCard,
  Car,
  GraduationCap,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { StoredCredential, CredentialType } from "@/types/identity";

// ---------------------------------------------------------------------------
//  Icon Mapping
// ---------------------------------------------------------------------------

const CREDENTIAL_ICONS: Record<CredentialType, React.ComponentType<{ className?: string }>> = {
  NIN_PID: Shield,
  FRSC_DRIVERS_LICENSE: Car,
  STUDENT_ID: GraduationCap,
};

const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  NIN_PID: "National ID (NIN)",
  FRSC_DRIVERS_LICENSE: "Driver's License",
  STUDENT_ID: "NYSC Service Pass",
};

// ---------------------------------------------------------------------------
//  CredentialCard Component
// ---------------------------------------------------------------------------

interface CredentialCardProps {
  credential: StoredCredential;
  onSelect?: (credential: StoredCredential) => void;
  selected?: boolean;
  compact?: boolean;
}

export function CredentialCard({
  credential,
  onSelect,
  selected = false,
  compact = false,
}: CredentialCardProps) {
  const Icon = CREDENTIAL_ICONS[credential.type] ?? CreditCard;
  const label = CREDENTIAL_LABELS[credential.type] ?? credential.type;

  const isExpired =
    credential.expiresAt && new Date(credential.expiresAt) < new Date();

  return (
    <button
      onClick={() => onSelect?.(credential)}
      className={clsx(
        "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
        "hover:scale-[1.01] hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:ring-offset-slate-50",
        selected
          ? "border-emerald-500 shadow-md shadow-emerald-100"
          : "border-slate-200 shadow-sm",
        compact ? "p-3" : "p-5"
      )}
      style={{
        background: credential.cardStyle.backgroundColor,
        color: credential.cardStyle.textColor,
      }}
    >
      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />

      {/* Decorative circles */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-125" />
      <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-110" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: credential.cardStyle.accentColor + "30" }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider opacity-70">
                {label}
              </p>
              <h3 className="text-lg font-bold">
                {credential.displayName}
              </h3>
            </div>
          </div>

          {isExpired ? (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-200">
              <AlertTriangle className="h-3 w-3" />
              Expired
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200">
              <Shield className="h-3 w-3" />
              Valid
            </span>
          )}
        </div>

        {/* Body — show key claims */}
        {!compact && (
          <div className="mt-4 space-y-1">
            {Object.entries(credential.decodedClaims)
              .filter(
                ([key]) =>
                  !["portrait", "holder_portrait"].includes(key) &&
                  typeof credential.decodedClaims[key as keyof typeof credential.decodedClaims] !== "object"
              )
              .slice(0, 4)
              .map(([key, value]) => (
                <div
                  key={key}
                  className="flex justify-between text-sm opacity-80"
                >
                  <span className="capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between text-xs opacity-60">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Issued{" "}
              {new Date(credential.storedAt).toLocaleDateString("en-NG", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <span>{credential.issuer.name}</span>
        </div>
      </div>

      {/* Selection indicator */}
      {selected && (
        <div className="absolute right-3 top-3 h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
      )}
    </button>
  );
}
