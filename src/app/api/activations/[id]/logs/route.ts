import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getActivationById } from "@/lib/db/queries/activations";
import { getActivationLogs } from "@/lib/db/queries/activation-logs";
import { resolveAllowedAgencyIds } from "@/lib/db/queries/users";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const activation = await getActivationById(id);
    if (!activation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // 카테고리 기반 권한 인식
    const allowedIds = await resolveAllowedAgencyIds(user);
    const canAccess =
      allowedIds === null || allowedIds.includes(activation.agencyId);
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const logs = await getActivationLogs(id);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Failed to fetch activation logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
