"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { clsx } from "clsx";
import { QrCode, Copy, Check, Download, Maximize2, Minimize2, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
//  QRViewer Component
// ---------------------------------------------------------------------------

/** Maximum byte length for QR code at error correction level L */
const QR_MAX_BYTES = 2953;

interface QRViewerProps {
  /** Data to encode in the QR code */
  data: string;
  /** Title shown above the QR code */
  title?: string;
  /** Size of the QR code in pixels */
  size?: number;
  /** Whether to show action buttons */
  showActions?: boolean;
}

export function QRViewer({
  data,
  title = "Scan QR Code",
  size = 256,
  showActions = true,
}: QRViewerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displaySize = expanded ? 400 : size;

  // Check if data fits in a QR code (version 40 with level L supports ~2953 bytes)
  const dataByteLength = new TextEncoder().encode(data).length;
  const isTooLong = dataByteLength > QR_MAX_BYTES;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Title */}
      <div className="flex items-center gap-2 text-slate-700">
        <QrCode className="h-5 w-5 text-emerald-600" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>

      {isTooLong ? (
        /* Fallback: Token too large for QR — show copy-only UI */
        <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Token Too Large for QR Code
            </p>
            <p className="text-xs text-slate-500 mt-1">
              This presentation token ({(dataByteLength / 1024).toFixed(1)} KB) exceeds QR capacity.
              Share using the copy button below.
            </p>
          </div>
          <button
            onClick={handleCopy}
            className={clsx(
              "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all",
              copied
                ? "bg-emerald-100 text-emerald-700"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied to Clipboard!" : "Copy Presentation Token"}
          </button>
        </div>
      ) : (
        /* QR Code Container */
        <>
          <div
            className={clsx(
              "relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-md",
              "transition-all duration-300",
              expanded && "scale-105"
            )}
          >
            <QRCodeSVG
              value={data}
              size={displaySize}
              level="L"
              bgColor="#ffffff"
              fgColor="#0f172a"
            />

            {/* Subtle corner accents */}
            <div className="absolute left-0 top-0 h-4 w-4 border-l-2 border-t-2 border-emerald-600 rounded-tl-lg" />
            <div className="absolute right-0 top-0 h-4 w-4 border-r-2 border-t-2 border-emerald-600 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-emerald-600 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-emerald-600 rounded-br-lg" />
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                  copied
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                )}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy Data
                  </>
                )}
              </button>

              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-slate-200 hover:text-slate-700"
              >
                {expanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5" />
                    Shrink
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expand
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Data preview */}
      <p className="max-w-xs truncate text-center text-[10px] text-slate-400 font-mono">
        {data.length > 80 ? data.slice(0, 80) + "…" : data}
      </p>
    </div>
  );
}
