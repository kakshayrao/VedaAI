import { NextRequest, NextResponse } from "next/server";
import { createClassroom, listClassrooms } from "@/lib/school";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await listClassrooms());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const c = await createClassroom(name);
  return NextResponse.json(c);
}
