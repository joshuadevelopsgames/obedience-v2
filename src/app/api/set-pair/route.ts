import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { pairId } = await req.json();
  if (!pairId) {
    return NextResponse.json({ error: "Missing pairId" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("active_pair_id", pairId, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
