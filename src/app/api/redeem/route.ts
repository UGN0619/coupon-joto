import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { cid, token } = await request.json();

  if (!cid || !token) {
    return NextResponse.json(
      { success: false, message: "Missing params" },
      { status: 400 }
    );
  }

  const token_hash = crypto.createHash("sha256").update(token).digest("hex");

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

  return NextResponse.json({ success: true, coupon: data });
}
