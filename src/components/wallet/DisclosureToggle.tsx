"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Eye, EyeOff, Lock, Unlock, CheckCircle2 } from "lucide-react";
import type { Disclosure } from "@/types/identity";

// ---------------------------------------------------------------------------
//  DisclosureToggle Component
// ---------------------------------------------------------------------------

interface DisclosureToggleProps {
  disclosures: Disclosure[];
  onSelectionChange?: (selected: Disclosure[]) => void;
  readOnly?: boolean;
}

/** Friendly display names for raw claim keys */
const CLAIM_DISPLAY_NAMES: Record<string, string> = {
  is_over_18: "Age Verification (Confirms Over 18 Only)",
  age_over_18: "Age Verification (Confirms Over 18 Only)",
  first_name: "First Name",
  last_name: "Last Name",
  holder_given_name: "First Name",
  holder_family_name: "Last Name",
  nin: "National Identity Number (NIN)",
  holder_nin: "National Identity Number (NIN)",
  birth_date: "Date of Birth",
  holder_birth_date: "Date of Birth",
  portrait_hash: "Photo Biometric Hash",
  resident_state: "State of Residence",
  resident_address: "Residential Address",
  license_number: "License Number",
  license_classes: "License Class",
  status: "Service Status",
};

function getClaimDisplayName(claimName: string): string {
  return CLAIM_DISPLAY_NAMES[claimName] || claimName.replace(/_/g, " ");
}

export function DisclosureToggle({
  disclosures,
  onSelectionChange,
  readOnly = false,
}: DisclosureToggleProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(disclosures.map((d) => d.digest))
  );

  const toggleDisclosure = (disclosure: Disclosure) => {
    if (readOnly) return;

    const next = new Set(selected);
    if (next.has(disclosure.digest)) {
      next.delete(disclosure.digest);
    } else {
      next.add(disclosure.digest);
    }
    setSelected(next);
    onSelectionChange?.(
      disclosures.filter((d) => next.has(d.digest))
    );
  };

  const selectAll = () => {
    const all = new Set(disclosures.map((d) => d.digest));
    setSelected(all);
    onSelectionChange?.(disclosures);
  };

  const selectNone = () => {
    setSelected(new Set());
    onSelectionChange?.([]);
  };

  return (
    <div className="space-y-3">
      {/* Header with bulk actions */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">
          Select Attributes to Disclose
        </h4>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              <Eye className="h-3 w-3" />
              Share All
            </button>
            <button
              onClick={selectNone}
              className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100"
            >
              <EyeOff className="h-3 w-3" />
              Hide All
            </button>
          </div>
        )}
      </div>

      {/* Disclosure items */}
      <div className="space-y-2">
        {disclosures.map((disclosure) => {
          const isSelected = selected.has(disclosure.digest);
          return (
            <button
              key={disclosure.digest}
              onClick={() => toggleDisclosure(disclosure)}
              disabled={readOnly}
              className={clsx(
                "group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-200",
                isSelected
                  ? "border-emerald-300 bg-emerald-50/60"
                  : "border-slate-200 bg-white",
                !readOnly && "hover:border-emerald-200 hover:bg-emerald-50/30",
                readOnly && "cursor-default"
              )}
            >
              {/* Toggle indicator */}
              <div
                className={clsx(
                  "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                  isSelected
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400"
                )}
              >
                {isSelected ? (
                  <Unlock className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </div>

              {/* Claim info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize text-slate-800">
                  {getClaimDisplayName(disclosure.claimName)}
                </p>
                <p
                  className={clsx(
                    "truncate text-xs transition-all duration-200",
                    isSelected ? "text-slate-500" : "text-slate-400"
                  )}
                >
                  {isSelected
                    ? String(disclosure.claimValue)
                    : "••••••••"}
                </p>
              </div>

              {/* Status badge */}
              <span
                className={clsx(
                  "flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                  isSelected
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {isSelected ? "Shared" : "Hidden"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <p className="text-center text-xs text-slate-500">
        {selected.size} of {disclosures.length} attributes will be shared
      </p>
    </div>
  );
}
