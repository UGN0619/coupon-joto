"use client";
import { useState, useEffect, useRef } from "react";
import {
  Html5QrcodeScanner,
  Html5QrcodeScanType,
  Html5QrcodeSupportedFormats,
  Html5Qrcode,
} from "html5-qrcode";

interface CouponData {
  id: string;
  amount: number;
  user_name: string;
  status: string;
  used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export default function RedeemPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "scanning"
  >("idle");
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [couponData, setCouponData] = useState<CouponData | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [manualCid, setManualCid] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [uploadMode, setUploadMode] = useState<"camera" | "upload" | "manual">(
    "camera"
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setCouponData(null);

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
        setCouponData(json.coupon);
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

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    addDebugLog(`File selected: ${file.name}, size: ${file.size} bytes`);
    setStatus("loading");
    setResult("Processing QR image...");

    try {
      const html5QrCode = new Html5Qrcode("qr-reader-upload");

      addDebugLog("Starting image decode...");
      const decodedText = await html5QrCode.scanFile(file, true);

      addDebugLog(
        `Image decoded successfully: ${decodedText.substring(0, 100)}...`
      );

      // Process the decoded text same as camera scan
      await processQRData(decodedText);
    } catch (error) {
      addDebugLog(`File decode error: ${error}`);
      setStatus("error");
      setResult(`❌ Could not read QR code from image: ${error}`);
    }
  };

  const processQRData = async (decodedText: string) => {
    try {
      let cid, token;

      addDebugLog(`Processing QR data: ${decodedText}`);

      // Try to parse as URL first (most common format)
      try {
        const url = new URL(decodedText);
        cid = url.searchParams.get("cid");
        token = url.searchParams.get("t");
        addDebugLog(
          `URL parsed - cid: ${cid}, token: ${token?.substring(0, 8)}...`
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (urlError) {
        addDebugLog("Not URL format, trying JSON...");

        // Fallback: try to parse as JSON
        try {
          const parsed = JSON.parse(decodedText);
          cid = parsed.cid;
          token = parsed.token;
          addDebugLog(
            `JSON parsed - cid: ${cid}, token: ${token?.substring(0, 8)}...`
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (jsonError) {
          addDebugLog(`Neither URL nor JSON format`);
          throw new Error(
            "QR code format not recognized. Expected URL or JSON format."
          );
        }
      }

      if (!cid || !token) {
        throw new Error("Missing coupon ID or token in QR code");
      }

      await redeemCoupon(cid, token);
    } catch (err) {
      addDebugLog(`QR processing error: ${err}`);
      setStatus("error");
      setResult(
        `❌ Error: ${
          err instanceof Error ? err.message : "Invalid QR code format"
        }`
      );
    }
  };

  const handleManualRedeem = async () => {
    if (!manualCid || !manualToken) {
      setResult("❌ Please enter both Coupon ID and Token");
      return;
    }
    await redeemCoupon(manualCid, manualToken);
  };

  const addDebugLog = (message: string) => {
    console.log(message);
    setDebugLog((prev) => [
      ...prev.slice(-4),
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const startScanner = () => {
    // Clear any existing scanner first
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }

    setStatus("scanning");
    setResult(null);
    setCouponData(null);
    setDebugLog([]);
    addDebugLog("Starting scanner...");

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
        },
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      },
      true // Enable verbose logging
    );

    setScanner(newScanner);

    newScanner.render(
      async (decodedText) => {
        addDebugLog(`QR Code detected: ${decodedText.substring(0, 100)}...`);

        // Stop scanner immediately to prevent multiple scans
        try {
          await newScanner.clear();
          setScanner(null);
          addDebugLog("Scanner stopped successfully");
        } catch (clearError) {
          addDebugLog(`Error clearing scanner: ${clearError}`);
        }

        await processQRData(decodedText);
      },
      (error) => {
        // Only log significant errors, not routine scanning messages
        if (
          !error.includes("NotFoundException") &&
          !error.includes("No MultiFormat Readers") &&
          !error.includes("No code found") &&
          !error.includes("QR code parse error")
        ) {
          addDebugLog(`Scanner error: ${error}`);
        }
      }
    );

    addDebugLog("Scanner initialized and running");
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.clear().catch(console.error);
      setScanner(null);
    }
    setStatus("idle");
    setResult(null);
    setCouponData(null);
  };

  const resetToScan = () => {
    setStatus("idle");
    setResult(null);
    setCouponData(null);
    setUploadMode("camera");
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isExpired = () => {
    if (!couponData?.expires_at) return false;
    return new Date(couponData.expires_at) < new Date();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-neutral-100 via-white to-neutral-200 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 flex flex-col items-center space-y-6 transition-all duration-300">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          🎁 Redeem Coupon
        </h1>

        {/* Mode Toggle Buttons */}
        <div className="w-full flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => setUploadMode("camera")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === "camera"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            📷 Camera
          </button>
          <button
            onClick={() => setUploadMode("upload")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === "upload"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            📁 Upload
          </button>
          <button
            onClick={() => setUploadMode("manual")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              uploadMode === "manual"
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            ⌨️ Manual
          </button>
        </div>

        {/* Coupon Details Card - Show when we have coupon data */}
        {couponData && (
          <div
            className={`w-full rounded-2xl p-6 border-2 transition-all duration-300 ${
              status === "success"
                ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-300 dark:border-green-700"
                : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-700"
            }`}
          >
            {/* Success Badge */}
            {status === "success" && (
              <div className="flex justify-center mb-4">
                <span className="px-3 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 text-sm font-medium rounded-full">
                  ✅ REDEEMED
                </span>
              </div>
            )}

            {/* Coupon Details */}
            <div className="text-center space-y-4">
              <div>
                <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Coupon For
                </h2>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {couponData.user_name}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  Amount
                </h3>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  ₮{couponData.amount.toLocaleString()}
                </p>
              </div>

              {/* Additional Info */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Coupon ID:</span>
                  <span className="font-mono">#{couponData.id}</span>
                </div>
                {couponData.used_at && (
                  <div className="flex justify-between">
                    <span>Redeemed:</span>
                    <span className="text-green-600 dark:text-green-400">
                      {formatDate(couponData.used_at)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{formatDate(couponData.created_at)}</span>
                </div>
                {couponData.expires_at && (
                  <div className="flex justify-between">
                    <span>Expires:</span>
                    <span className={isExpired() ? "text-red-500" : ""}>
                      {formatDate(couponData.expires_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR Scanner - Camera Mode */}
        {uploadMode === "camera" && (
          <div
            id="reader"
            className="w-full h-80 bg-neutral-100 dark:bg-neutral-800 rounded-2xl shadow-inner overflow-hidden"
            style={{ transform: "none" }}
          ></div>
        )}

        {/* QR Upload - Upload Mode */}
        {uploadMode === "upload" && (
          <div className="w-full h-80 bg-neutral-100 dark:bg-neutral-800 rounded-2xl shadow-inner flex flex-col items-center justify-center p-6">
            <div
              className="w-full h-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-center space-y-4">
                <div className="text-4xl">📱</div>
                <div>
                  <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                    Upload QR Code Image
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Click here or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Supports: JPG, PNG, WEBP
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div id="qr-reader-upload" className="hidden"></div>
          </div>
        )}

        {/* Manual Input - Manual Mode */}
        {uploadMode === "manual" && (
          <div className="w-full h-80 bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-6 flex flex-col justify-center">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-center text-gray-700 dark:text-gray-300">
                Manual Entry
              </h3>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Coupon ID:
                </label>
                <input
                  type="text"
                  value={manualCid}
                  onChange={(e) => setManualCid(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                  placeholder="Enter coupon ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
                  Token:
                </label>
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl dark:bg-neutral-700 dark:border-neutral-600 dark:text-white"
                  placeholder="Enter token"
                />
              </div>
              <button
                onClick={handleManualRedeem}
                disabled={status === "loading"}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-3 font-medium disabled:opacity-50 transition-colors"
              >
                {status === "loading" ? "Processing..." : "Redeem Manually"}
              </button>
            </div>
          </div>
        )}

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
          {uploadMode === "camera" && (
            <>
              {status === "idle" ? (
                <button
                  onClick={startScanner}
                  className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
                >
                  📷 Start Camera Scanner
                </button>
              ) : status === "scanning" ? (
                <button
                  onClick={stopScanner}
                  className="w-full bg-red-500 dark:bg-red-600 text-white rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
                >
                  ⏹️ Stop Scanning
                </button>
              ) : status === "loading" ? (
                <button
                  disabled
                  className="w-full bg-gray-400 text-white rounded-full py-3 px-6 font-medium text-lg shadow-md opacity-50 cursor-not-allowed"
                >
                  ⏳ Processing...
                </button>
              ) : (
                <button
                  onClick={resetToScan}
                  className="w-full bg-blue-500 dark:bg-blue-600 text-white rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
                >
                  🔄 Scan Another Code
                </button>
              )}
            </>
          )}

          {uploadMode === "upload" && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={status === "loading"}
                className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 disabled:opacity-50"
              >
                {status === "loading"
                  ? "⏳ Processing..."
                  : "📁 Select QR Image"}
              </button>
              {(status === "success" || status === "error") && (
                <button
                  onClick={resetToScan}
                  className="w-full bg-blue-500 dark:bg-blue-600 text-white rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
                >
                  🔄 Upload Another Image
                </button>
              )}
            </>
          )}

          {/* Reset button for all modes */}
          {(status === "success" || status === "error") && (
            <button
              onClick={resetToScan}
              className="w-full bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-full py-2 px-4 font-medium text-sm shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
            >
              🔄 Try Again
            </button>
          )}
        </div>

        {/* Instructions */}
        <div className="w-full text-xs text-neutral-500 dark:text-neutral-400 text-center space-y-1">
          {uploadMode === "camera" && (
            <>
              <p>• Allow camera permissions when prompted</p>
              <p>• Hold QR code steady and well-lit</p>
              <p>• Try different distances if not detecting</p>
              <p>• Ensure QR code is clearly visible in the red box</p>
            </>
          )}
          {uploadMode === "upload" && (
            <>
              <p>• Take a clear photo of the QR code</p>
              <p>• Ensure good lighting and focus</p>
              <p>• Supported formats: JPG, PNG, WEBP</p>
              <p>• Max file size: 10MB</p>
            </>
          )}
          {uploadMode === "manual" && (
            <>
              <p>• Enter the Coupon ID and Token manually</p>
              <p>• Find these values in the coupon URL</p>
              <p>• Format: /redeem?cid=ID&t=TOKEN</p>
            </>
          )}
          <p>• Status: {status}</p>
          {process.env.NODE_ENV === "development" && (
            <p className="text-blue-500">
              • Check browser console for debug info
            </p>
          )}
        </div>

        {/* Debug Panel */}
        {debugLog.length > 0 && (
          <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
            <h4 className="text-sm font-semibold mb-2">Debug Log:</h4>
            {debugLog.map((log, index) => (
              <p
                key={index}
                className="text-xs text-gray-600 dark:text-gray-400 font-mono"
              >
                {log}
              </p>
            ))}
          </div>
        )}

        {/* Result Message */}
        {result && !couponData && (
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
