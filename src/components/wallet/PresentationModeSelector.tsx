"use client";

import { clsx } from "clsx";
import { ShieldCheck, UserCheck, FileText, Sliders, CheckCircle2 } from "lucide-react";
import type { StoredCredential } from "@/types/identity";

export type PresentationMode = "attribute_proof" | "identity_proof" | "full_document" | "custom";

interface PresentationModeSelectorProps {
  credential: StoredCredential;
  activeMode: PresentationMode;
  onModeChange: (mode: PresentationMode, selectedClaims: string[]) => void;
}

export function PresentationModeSelector({
  credential,
  activeMode,
  onModeChange,
}: PresentationModeSelectorProps) {
  // Compute available claim names
  const availableClaimNames = credential.disclosures.map((d) => d.claimName);

  const getClaimsForMode = (mode: PresentationMode): string[] => {
    switch (mode) {
      case "attribute_proof": {
        // Find age/status attestation claims
        const ageClaims = availableClaimNames.filter(
          (name) =>
            name === "is_over_18" ||
            name === "age_over_18" ||
            name === "status"
        );
        return ageClaims.length > 0 ? ageClaims : [availableClaimNames[0]];
      }
      case "identity_proof": {
        // Find name and photo claims
        return availableClaimNames.filter(
          (name) =>
            name === "first_name" ||
            name === "last_name" ||
            name === "holder_given_name" ||
            name === "holder_family_name" ||
            name === "portrait_hash" ||
            name === "portrait"
        );
      }
      case "full_document": {
        return [...availableClaimNames];
      }
      case "custom": {
        // Keep current or default
        return [];
      }
    }
  };

  const handleSelectMode = (mode: PresentationMode) => {
    const claims = getClaimsForMode(mode);
    onModeChange(mode, claims);
  };

  const modes = [
    {
      id: "attribute_proof" as PresentationMode,
      title: "Attribute Proof",
      subtitle: "Over 18 Verification",
      description:
        "Reveals ONLY the 'Over 18' attestation. Your name, date of birth, and NIN remain completely hidden.",
      icon: ShieldCheck,
      privacyBadge: "Maximum Privacy",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      accentBorder: "border-emerald-500",
      selectedBg: "bg-emerald-50/50",
    },
    {
      id: "identity_proof" as PresentationMode,
      title: "Identity Proof",
      subtitle: "Name + Photo Match",
      description:
        "Discloses given name, family name, and portrait hash. Your NIN and birth date remain strictly confidential.",
      icon: UserCheck,
      privacyBadge: "Selective Sharing",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      accentBorder: "border-blue-500",
      selectedBg: "bg-blue-50/50",
    },
    {
      id: "full_document" as PresentationMode,
      title: "Full Document",
      subtitle: "Complete Disclosure",
      description:
        "Presents all credential attributes for official governmental, immigration, or high-tier financial inspection.",
      icon: FileText,
      privacyBadge: "Full Disclosure",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      accentBorder: "border-amber-500",
      selectedBg: "bg-amber-50/50",
    },
    {
      id: "custom" as PresentationMode,
      title: "Custom Selection",
      subtitle: "Granular Control",
      description:
        "Hand-pick each individual attribute you consent to share using fine-grained toggles.",
      icon: Sliders,
      privacyBadge: "Custom Scope",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      accentBorder: "border-purple-500",
      selectedBg: "bg-purple-50/50",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Select Sharing Profile
        </label>
        <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          eIDAS 2.0 Compliant
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isSelected = activeMode === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleSelectMode(mode.id)}
              className={clsx(
                "group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200",
                isSelected
                  ? clsx("bg-white shadow-md", mode.accentBorder)
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:text-slate-700"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        {mode.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {mode.subtitle}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mt-2">
                  {mode.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span
                  className={clsx(
                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                    mode.badgeColor
                  )}
                >
                  {mode.privacyBadge}
                </span>

                <span className="text-[11px] text-slate-400 group-hover:text-slate-600 transition-colors">
                  {mode.id === "attribute_proof" && "1 claim revealed"}
                  {mode.id === "identity_proof" && "2-3 claims revealed"}
                  {mode.id === "full_document" && `${availableClaimNames.length} claims revealed`}
                  {mode.id === "custom" && "Manual pick"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
