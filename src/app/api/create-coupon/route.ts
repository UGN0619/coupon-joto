import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    console.log("API route called");

    // Check environment variables
    if (!process.env.SUPABASE_URL) {
      console.error("Missing SUPABASE_URL");
      return NextResponse.json(
        { error: "Missing SUPABASE_URL environment variable" },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable" },
        { status: 500 }
      );
    }

    if (!process.env.NEXT_PUBLIC_SITE_URL) {
      console.error("Missing NEXT_PUBLIC_SITE_URL");
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SITE_URL environment variable" },
        { status: 500 }
      );
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { expires_at, meta, amount, user_name } = body;
    console.log("Request body parsed:", {
      expires_at,
      meta,
      amount,
      user_name,
    });

    // Validate required fields
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    if (
      !user_name ||
      typeof user_name !== "string" ||
      user_name.trim() === ""
    ) {
      return NextResponse.json(
        { error: "User name is required" },
        { status: 400 }
      );
    }

    // Generate random token and hash
    const token = crypto.randomBytes(20).toString("hex");
    const token_hash = crypto.createHash("sha256").update(token).digest("hex");

    console.log("Generated token hash");

    // Prepare meta object with coupon details
    const couponMeta = {
      ...meta,
      amount: amount,
      user_name: user_name.trim(),
      created_at: new Date().toISOString(),
    };

    // Use provided expires_at or default to 3 months from now
    const finalExpiresAt =
      expires_at ||
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("coupons")
      .insert([
        {
          token_hash,
          expires_at: finalExpiresAt,
          meta: couponMeta,
          amount: amount,
          user_name: user_name.trim(),
          status: "unused",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    console.log("Coupon created:", data);

    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/redeem?cid=${data.id}&t=${token}`;

    const response = {
      id: data.id,
      url,
      token,
      amount: data.amount,
      user_name: data.user_name,
      expires_at: data.expires_at,
    };
    console.log("Sending response:", response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("Unexpected error in API route:", error);
    return NextResponse.json(
      {
        error: `Internal server error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
