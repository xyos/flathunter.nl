import { NextRequest, NextResponse } from "next/server";
import { deleteFavorite, updateFavorite } from "@/lib/db";
import type { FavoriteStatus } from "@/lib/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const crawler = request.nextUrl.searchParams.get("crawler") || "";
  const body = await request.json();

  await updateFavorite(Number(id), crawler, {
    rating: body.rating,
    status: body.status as FavoriteStatus | undefined,
    notes: body.notes,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const crawler = request.nextUrl.searchParams.get("crawler") || "";
  await deleteFavorite(Number(id), crawler);
  return NextResponse.json({ success: true });
}
