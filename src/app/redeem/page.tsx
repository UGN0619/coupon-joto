"use client";
import { useState, useEffect } from "react";
import {
  Html5QrcodeScanner,
  Html5QrcodeScanType,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode";

export default function RedeemPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "scanning"
  >("idle");
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  // Check URL parameters on component mount for direct redemption
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const cid = urlParams.get("cid");
    const token = urlParams.get("t");

    if (cid && token) {
      // Auto-redeem if URL contains parameters
      redeemCoupon(cid, token);
    }
  }, []);

  const redeemCoupon = async (cid: string, token: string) => {
    setStatus("loading");
    setResult("Processing coupon...");

    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid, token }),
      });

      const json = await res.json();
      console.log("API response:", json);

      if (json.success) {
        setStatus("success");
        setResult("🎉 Coupon redeemed successfully!");
      } else {
        setStatus("error");
        setResult(json.message || "❌ Invalid coupon.");
      }
    } catch (err) {
      console.error("Redemption error:", err);
      setStatus("error");
      setResult("❌ Error processing coupon");
    }
  };

  const startScanner = () => {
    // Clear any existing scanner first
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }

    setStatus("scanning");
    setResult(null);

    const newScanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        disableFlip: false,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      },
      false
    );

    setScanner(newScanner);

    newScanner.render(
      async (decodedText) => {
        console.log("QR Code detected:", decodedText);

        // Stop scanner immediately to prevent multiple scans
        try {
          await newScanner.clear();
          setScanner(null);
        } catch (clearError) {
          console.warn("Error clearing scanner:", clearError);
        }

        try {
          let cid, token;

          // Try to parse as JSON first (our new format)
          try {
            const parsed = JSON.parse(decodedText);
            cid = parsed.cid;
            token = parsed.token;
            console.log("Parsed JSON QR data:", { cid, token });
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (jsonError) {
            console.log("Not JSON format, trying URL parsing...");

            // Fallback: try to parse as URL
            try {
              const url = new URL(decodedText);
              cid = url.searchParams.get("cid");
              token = url.searchParams.get("t");
              console.log("Parsed URL QR data:", { cid, token });
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (urlError) {
              console.log("Not URL format either");
              throw new Error("QR code format not recognized");
            }
          }

          if (!cid || !token) {
            throw new Error("Missing coupon ID or token in QR code");
          }

          await redeemCoupon(cid, token);
        } catch (err) {
          console.error("QR processing error:", err);
          setStatus("error");
          setResult(
            `❌ Error: ${
              err instanceof Error ? err.message : "Invalid QR code format"
            }`
          );
        }
      },
      (error) => {
        // Only log significant errors, not "not found" errors
        if (
          !error.includes("NotFoundException") &&
          !error.includes("No MultiFormat Readers") &&
          !error.includes("No code found")
        ) {
          console.warn("Scanner error:", error);
        }
      }
    );
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }
    setStatus("idle");
    setResult(null);
  };

  const resetToScan = () => {
    setStatus("idle");
    setResult(null);
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-neutral-100 via-white to-neutral-200 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 transition-colors duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 flex flex-col items-center space-y-6 transition-all duration-300">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          🎁 Redeem Coupon
        </h1>

        {/* QR Scanner */}
        <div
          id="reader"
          className="w-full h-80 bg-neutral-100 dark:bg-neutral-800 rounded-2xl shadow-inner overflow-hidden"
          style={{ transform: "none" }}
        ></div>

        {/* Global CSS to prevent video mirroring */}
        <style jsx global>{`
          #reader video {
            transform: none !important;
            -webkit-transform: none !important;
            -moz-transform: none !important;
            -ms-transform: none !important;
          }
          #reader canvas {
            transform: none !important;
          }
        `}</style>

        {/* Control Buttons */}
        <div className="w-full space-y-2">
          {status === "idle" ? (
            <button
              onClick={startScanner}
              className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Start QR Scanner
            </button>
          ) : status === "scanning" ? (
            <button
              onClick={stopScanner}
              className="w-full bg-red-500 dark:bg-red-600 text-white rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Stop Scanning
            </button>
          ) : status === "loading" ? (
            <button
              disabled
              className="w-full bg-gray-400 text-white rounded-full py-3 px-6 font-medium text-lg shadow-md opacity-50 cursor-not-allowed"
            >
              Processing...
            </button>
          ) : (
            <button
              onClick={resetToScan}
              className="w-full bg-blue-500 dark:bg-blue-600 text-white rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              Scan Another Code
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="w-full text-xs text-neutral-500 dark:text-neutral-400 text-center space-y-1">
          <p>• Allow camera permissions when prompted</p>
          <p>• Hold QR code steady and well-lit</p>
          <p>• Try different distances if not detecting</p>
          <p>• Status: {status}</p>
        </div>

        {/* Result Message */}
        {result && (
          <div
            className={`w-full text-center text-base font-medium rounded-xl px-4 py-3 ${
              status === "success"
                ? "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300"
                : status === "error"
                ? "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300"
                : "text-gray-600 bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300"
            }`}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
