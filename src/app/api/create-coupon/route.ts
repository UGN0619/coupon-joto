import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const body = await request.json();
  const { expires_at, meta } = body;

  // Generate random token and hash
  const token = crypto.randomBytes(20).toString("hex");
  const token_hash = crypto.createHash("sha256").update(token).digest("hex");

  const { data, error } = await supabase
    .from("coupons")
    .insert([
      { token_hash, expires_at: expires_at || null, meta: meta || null },
    ])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/redeem?cid=${data.id}&t=${token}`;
  return NextResponse.json({ id: data.id, url, token });
}
