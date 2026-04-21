import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const crawler = request.nextUrl.searchParams.get("crawler") || "";
  const body = await request.json();

  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (body.rating !== undefined) {
    sets.push("rating = ?");
    values.push(body.rating);
  }
  if (body.status !== undefined) {
    sets.push("status = ?");
    values.push(body.status);
  }
  if (body.notes !== undefined) {
    sets.push("notes = ?");
    values.push(body.notes);
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  sets.push("updated_at = CURRENT_TIMESTAMP");
  values.push(Number(id), crawler);

  getDb()
    .prepare(`UPDATE favorites SET ${sets.join(", ")} WHERE expose_id = ? AND crawler = ?`)
    .run(...values);

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const crawler = request.nextUrl.searchParams.get("crawler") || "";

  getDb()
    .prepare("DELETE FROM favorites WHERE expose_id = ? AND crawler = ?")
    .run(Number(id), crawler);

  return NextResponse.json({ success: true });
}
