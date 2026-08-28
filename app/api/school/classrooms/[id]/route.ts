import { NextRequest, NextResponse } from "next/server";
import {
  addStudent,
  deleteClassroom,
  getClassroom,
  removeStudent,
  updateClassroom,
} from "@/lib/school";
import type { Classroom } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const c = await getClassroom(id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json();

  if (body.addStudent) {
    const name = String(body.addStudent.name || "").trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const c = await addStudent(id, {
      name,
      rollNo: body.addStudent.rollNo ? String(body.addStudent.rollNo) : undefined,
    });
    if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(c);
  }

  if (body.removeStudentId) {
    const c = await removeStudent(id, String(body.removeStudentId));
    if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(c);
  }

  const patch: Partial<Pick<Classroom, "name" | "students">> = {};
  if (body.name != null) patch.name = String(body.name);
  const c = await updateClassroom(id, patch);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(c);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const ok = await deleteClassroom(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
