import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { cid, token } = await request.json();

    if (!cid || !token) {
      return NextResponse.json(
        { success: false, message: "Missing params" },
        { status: 400 }
      );
    }

    const token_hash = crypto.createHash("sha256").update(token).digest("hex");

    // Update coupon status to used and get the data
    const { data, error } = await supabase
      .from("coupons")
      .update({ status: "used", used_at: new Date().toISOString() })
      .match({ id: cid, token_hash, status: "unused" })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, message: "Invalid or already used coupon" },
        { status: 400 }
      );
    }

    // Return success with coupon details including amount and user_name
    return NextResponse.json({
      success: true,
      coupon: {
        id: data.id,
        amount: data.amount || 0,
        user_name: data.user_name || "Unknown",
        status: data.status,
        used_at: data.used_at,
        created_at: data.created_at,
        expires_at: data.expires_at,
      },
    });
  } catch (error) {
    console.error("Redeem API error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
