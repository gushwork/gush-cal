import { getSchedulerId } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function requireSchedulerId(): Promise<
  { schedulerId: string } | NextResponse
> {
  const schedulerId = await getSchedulerId();
  if (!schedulerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { schedulerId };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
