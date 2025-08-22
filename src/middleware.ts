import { NextResponse } from "next/server";

const USERNAME = process.env.AUTH_USERNAME!;
const PASSWORD = process.env.AUTH_PASSWORD!;
const isProd = process.env.NODE_ENV === "production";

export function middleware(request: Request) {
  if (!isProd) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  const expected =
    "Basic " + Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");

  if (authHeader !== expected) {
    return new NextResponse("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Protected"' },
    });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};
