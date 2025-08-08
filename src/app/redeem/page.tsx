"use client";
import { useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

export default function RedeemPage() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const startScanner = () => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: 250,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      },
      false
    );
    scanner.render(
      async (decodedText) => {
        scanner.clear();
        try {
          setStatus("loading");
          const { cid, token } =
            JSON.parse(atob(decodedText.split(",")[1] ?? "")) || {};
          const res = await fetch("/api/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cid, token }),
          });
          const json = await res.json();
          if (json.success) {
            setStatus("success");
            setResult("🎉 Coupon redeemed successfully!");
          } else {
            setStatus("error");
            setResult(json.message || "❌ Invalid QR code.");
          }
        } catch (err) {
          console.error(err);
          setStatus("error");
          setResult("❌ Invalid QR code format.");
        }
      },
      (error) => {
        console.warn(error);
      }
    );
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
          className="w-full h-60 bg-neutral-100 dark:bg-neutral-800 rounded-2xl shadow-inner overflow-hidden"
        ></div>

        {/* Start Button */}
        <button
          onClick={startScanner}
          className="w-full bg-black dark:bg-white text-white dark:text-black rounded-full py-3 px-6 font-medium text-lg shadow-md hover:scale-105 active:scale-95 transition-transform duration-200"
        >
          Start Scanning
        </button>

        {/* Result Message */}
        {status !== "idle" && (
          <div
            className={`w-full text-center text-base font-medium rounded-xl px-4 py-2 ${
              status === "success"
                ? "text-green-600 bg-green-50 dark:bg-green-900/20"
                : status === "error"
                ? "text-red-600 bg-red-50 dark:bg-red-900/20"
                : "text-gray-500 bg-gray-50 dark:bg-gray-800/50"
            }`}
          >
            {result}
          </div>
        )}
      </div>
    </div>
  );
}
