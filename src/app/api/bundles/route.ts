import { NextResponse } from "next/server";
import { listBundles } from "@/server/bundle";
import { isEnabled } from "@/config/site";

export async function GET() {
  if (!isEnabled("bundles")) return NextResponse.json({ bundles: [] });
  return NextResponse.json({ bundles: await listBundles(true) });
}
