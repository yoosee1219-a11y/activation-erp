import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getUsimLogs } from "@/lib/db/queries/usim-logs";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN" && user.role !== "SUB_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await getUsimLogs(100);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch usim logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
