"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { clsx } from "clsx";
import { Camera, CameraOff, RefreshCw, Scan } from "lucide-react";

// ---------------------------------------------------------------------------
//  QRScanner Component
// ---------------------------------------------------------------------------

interface QRScannerProps {
  /** Callback when a QR code is successfully scanned */
  onScan: (data: string) => void;
  /** Whether the scanner is active */
  active?: boolean;
  /** Custom class name */
  className?: string;
}

export function QRScanner({
  onScan,
  active = true,
  className,
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const startScanning = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return;

    try {
      setError(null);
      const scannerId = "kora-qr-scanner";

      // Ensure the container has the required ID
      containerRef.current.id = scannerId;

      const html5QrCode = new Html5Qrcode(scannerId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          setHasScanned(true);
          onScan(decodedText);
          // Stop scanning after successful read
          html5QrCode.stop().catch(console.error);
          scannerRef.current = null;
          setIsScanning(false);
        },
        () => {
          // QR code not found in frame — expected, do nothing
        }
      );

      setIsScanning(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to access camera. Please check permissions."
      );
      setIsScanning(false);
    }
  }, [onScan]);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore — scanner may already be stopped
      }
      scannerRef.current = null;
      setIsScanning(false);
    }
  }, []);

  const resetScanner = useCallback(() => {
    setHasScanned(false);
    setError(null);
    startScanning();
  }, [startScanning]);

  useEffect(() => {
    if (active && !hasScanned) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [active, hasScanned, startScanning, stopScanning]);

  return (
    <div className={clsx("flex flex-col items-center gap-4", className)}>
      {/* Scanner viewport */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
        {/* Camera feed container */}
        <div
          ref={containerRef}
          className="h-72 w-72 sm:h-80 sm:w-80"
          style={{ minHeight: "288px" }}
        />

        {/* Scanning overlay */}
        {isScanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Animated scan line */}
            <div className="absolute h-0.5 w-3/4 animate-pulse bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

            {/* Corner brackets */}
            <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-emerald-600 rounded-tl" />
            <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-emerald-600 rounded-tr" />
            <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-emerald-600 rounded-bl" />
            <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-emerald-600 rounded-br" />
          </div>
        )}

        {/* Inactive state */}
        {!isScanning && !error && !hasScanned && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <Camera className="h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              Camera initializing...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm p-4">
            <CameraOff className="h-12 w-12 text-red-400" />
            <p className="mt-2 text-center text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success state */}
        {hasScanned && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <Scan className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="mt-2 text-sm font-medium text-emerald-700">QR Code Captured!</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {isScanning ? (
          <button
            onClick={stopScanning}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
          >
            <CameraOff className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={resetScanner}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <RefreshCw className="h-4 w-4" />
            {hasScanned ? "Scan Again" : "Start Scanner"}
          </button>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "h-2 w-2 rounded-full",
            isScanning
              ? "animate-pulse bg-emerald-500"
              : hasScanned
                ? "bg-emerald-500"
                : "bg-slate-300"
          )}
        />
        <span className="text-xs text-slate-500">
          {isScanning
            ? "Scanning for QR code..."
            : hasScanned
              ? "Scan complete"
              : "Scanner ready"}
        </span>
      </div>
    </div>
  );
}
