"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import QRCode from "react-qr-code";

export default function GeneratePage() {
  const [qrUrl, setQrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [couponData, setCouponData] = useState<{
    cid: string;
    token: string;
    amount: number;
    userName: string;
  } | null>(null);
  // const [debugInfo, setDebugInfo] = useState<string>("");
  const qrRef = useRef<HTMLDivElement>(null);

  // Form state
  const [amount, setAmount] = useState<string>("");
  const [userName, setUserName] = useState<string>("");

  async function createCoupon() {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      setToast({ type: "error", message: "❌ Please enter a valid amount" });
      return;
    }
    if (!userName.trim()) {
      setToast({ type: "error", message: "❌ Please enter a user name" });
      return;
    }

    setLoading(true);
    // setDebugInfo("Starting coupon creation...");

    try {
      const apiUrl = "/api/create-coupon";
      // setDebugInfo(`Making request to: ${apiUrl}`);

      // Changed expiration to 3 months (90 days)
      const threeMonthsFromNow = new Date(
        Date.now() + 90 * 24 * 60 * 60 * 1000
      );

      const requestBody = {
        amount: parseFloat(amount),
        user_name: userName.trim(),
        expires_at: threeMonthsFromNow.toISOString(), // 3 months
      };
      console.log("Request body:", requestBody);

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // setDebugInfo(`Response status: ${res.status} ${res.statusText}`);

      if (!res.ok) {
        const errorText = await res.text();
        // setDebugInfo(`Error response: ${errorText}`);
        throw new Error(
          `HTTP error! status: ${res.status}, message: ${errorText}`
        );
      }

      const json = await res.json();
      // setDebugInfo(`Response data: ${JSON.stringify(json, null, 2)}`);

      // Extract cid and token from the URL
      const url = new URL(json.url);
      const cid = url.searchParams.get("cid");
      const token = url.searchParams.get("t");

      if (cid && token) {
        const couponInfo = {
          cid,
          token,
          amount: parseFloat(amount),
          userName: userName.trim(),
        };
        setCouponData(couponInfo);

        // Create QR data as JSON string with all info
        const qrData = JSON.stringify({ cid, token });
        setQrUrl(qrData);
        setExpiresAt(threeMonthsFromNow); // Updated to 3 months expiry
        setToast({ type: "success", message: "🎉 Coupon generated!" });
        // setDebugInfo("Success! Coupon created and QR generated.");
      } else {
        throw new Error("Invalid coupon URL format");
      }
    } catch (err) {
      console.error("Full error:", err);
      // const errorMessage = err instanceof Error ? err.message : String(err);
      // setDebugInfo(`Error: ${errorMessage}`);
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
      link.download = `coupon-${couponData?.userName}-${couponData?.amount}MNT.png`;
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleCopy = async () => {
    if (!couponData) return;

    try {
      const redemptionUrl = `${window.location.origin}/redeem?cid=${couponData.cid}&t=${couponData.token}`;
      await navigator.clipboard.writeText(redemptionUrl);
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
    const months = Math.floor(diff / (30 * 24 * 60 * 60 * 1000));
    const days = Math.floor(
      (diff % (30 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000)
    );
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    return `${months}m ${days}d ${hours}h ${minutes}m`;
  };
  const handleRedeem = () => {
    router.push("/redeem");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-neutral-100 via-white to-neutral-200 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-xl p-6 flex flex-col items-center space-y-6">
        <button
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg"
          onClick={handleRedeem}
        >
          Redeem Coupon
        </button>
        <h1 className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight">
          🎟️ Joto Coupon
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Powered by ⚙️Joto Education Center
        </p>

        {/* Form Fields */}
        <div className="w-full space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              User Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter recipient name"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount (₮)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount in MNT"
              min="1"
              step="1"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={loading}
            />
          </div>
        </div>

        <div className="w-full flex flex-col gap-2">
          <button
            onClick={createCoupon}
            disabled={loading || !amount || !userName.trim()}
            className={`w-full rounded-full py-3 text-lg font-medium shadow-md transition-transform ${
              loading || !amount || !userName.trim()
                ? "bg-gray-400 dark:bg-neutral-600 text-white cursor-not-allowed"
                : "bg-black dark:bg-white text-white dark:text-black hover:scale-105 active:scale-95"
            }`}
          >
            {loading ? "Creating..." : "Create Coupon & QR"}
          </button>
        </div>

        {/* Debug Info
        {debugInfo && (
          <div className="w-full bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
            <h3 className="text-sm font-semibold mb-2">Debug Info:</h3>
            <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
              {debugInfo}
            </pre>
          </div>
        )} */}

        {qrUrl && couponData && (
          <>
            {/* Coupon Info Display */}
            <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-2xl border border-blue-200 dark:border-blue-800">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  Coupon Details
                </h3>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  ₮{couponData.amount.toLocaleString()}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  For: {couponData.userName}
                </p>
              </div>
            </div>

            <div
              ref={qrRef}
              className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-2xl shadow-inner"
            >
              <QRCode value={qrUrl} size={200} />
            </div>

            <div className="text-xs text-center text-gray-600 dark:text-gray-400 space-y-1">
              <p>QR contains redemption data</p>
              <p className="break-words">
                Redemption URL available via copy button
              </p>
            </div>

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
                Copy Redemption Link
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
