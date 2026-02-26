import { NextResponse } from "next/server";
import { getAvailableMonths } from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const months = await getAvailableMonths();
    return NextResponse.json({ months });
  } catch (error) {
    console.error("Failed to fetch months:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
