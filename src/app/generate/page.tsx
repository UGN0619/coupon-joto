"use client";
import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";

export default function GeneratePage() {
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  async function createCoupon() {
    setLoading(true);
    try {
      const res = await fetch("/api/create-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      setQrUrl(json.url);
      setExpiresAt(new Date(Date.now() + 10 * 60 * 1000)); // 10 min expiry
      setToast({ type: "success", message: "🎉 Coupon generated!" });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      setToast({ type: "error", message: "❌ Failed to create coupon" });
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = pngFile;
      link.download = "coupon-qr.png";
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      setToast({ type: "success", message: "🔗 Link copied to clipboard!" });
    } catch {
      setToast({ type: "error", message: "❌ Could not copy link." });
    }
  };

  useEffect(() => {
    if (toast) {
      const timeout = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [toast]);

  const getRemainingTime = () => {
    if (!expiresAt) return null;
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();
    if (diff <= 0) return "Expired";
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-neutral-100 via-white to-neutral-200 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 transition-colors duration-300">
      <div className="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 flex flex-col items-center space-y-6">
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          🎟️ Generate Coupon
        </h1>

        <button
          onClick={createCoupon}
          disabled={loading}
          className={`w-full rounded-full py-3 text-lg font-medium shadow-md transition-transform ${
            loading
              ? "bg-gray-400 dark:bg-neutral-600 text-white cursor-not-allowed"
              : "bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95"
          }`}
        >
          {loading ? "Creating..." : "Create Coupon & QR"}
        </button>

        {qrUrl && (
          <>
            <div
              ref={qrRef}
              className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl shadow-inner"
            >
              <QRCode value={qrUrl} size={200} />
            </div>
            <p className="text-sm text-center text-gray-700 dark:text-gray-300 break-words">
              {qrUrl}
            </p>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={handleDownload}
                className="w-full bg-gray-200 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 rounded-full py-3 text-lg font-medium shadow-md hover:scale-105 active:scale-95 transition-transform"
              >
                Download QR
              </button>
              <button
                onClick={handleCopy}
                className="w-full bg-gray-100 dark:bg-neutral-700 text-gray-900 dark:text-white rounded-full py-3 text-lg font-medium shadow-md hover:scale-105 active:scale-95 transition-transform"
              >
                Copy Link
              </button>
            </div>

            {/* Expiration Timer */}
            {expiresAt && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                ⏳ Expires in: {getRemainingTime()}
              </p>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 text-sm px-4 py-2 rounded-full shadow-lg transition-all duration-300 ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
