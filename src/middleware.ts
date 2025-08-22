import { NextResponse } from "next/server";

const USERNAME = "joto";
const PASSWORD = "joto_2026";

export function middleware(request: Request) {
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
