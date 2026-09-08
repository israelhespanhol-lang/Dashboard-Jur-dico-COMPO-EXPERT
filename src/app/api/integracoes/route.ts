import { NextResponse } from "next/server";
import { providerHealth } from "@/lib/providers/provider.registry";

export async function GET() {
  return NextResponse.json({ providers: await providerHealth(), checkedAt: new Date().toISOString() });
}
