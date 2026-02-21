import { NextRequest, NextResponse } from "next/server";
import {
  getActivationById,
  updateActivation,
  deleteActivation,
} from "@/lib/db/queries/activations";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessAgency } from "@/lib/db/queries/users";

// 거래처(PARTNER)가 편집할 수 있는 필드
const PARTNER_EDITABLE_FIELDS = new Set([
  "customerName",
  "usimNumber",
  "entryDate",
  "subscriptionType",
  "ratePlan",
  "applicationDocs",
  "nameChangeDocs",
  "arcAutopayInfo",
  "arcSupplement",
]);

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

    if (
      !canAccessAgency(user.role, user.allowedAgencies, activation.agencyId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ activation });
  } catch (error) {
    console.error("Failed to fetch activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "GUEST") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getActivationById(id);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      !canAccessAgency(user.role, user.allowedAgencies, existing.agencyId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // PARTNER 역할 제한
    if (user.role === "PARTNER") {
      // 잠긴 행은 수정 불가
      if (existing.isLocked) {
        return NextResponse.json(
          { error: "이 행은 잠겨있어 수정할 수 없습니다." },
          { status: 403 }
        );
      }

      // 관리자 전용 필드 수정 시도 → 거부
      const requestedFields = Object.keys(body);
      const forbiddenFields = requestedFields.filter(
        (f) => !PARTNER_EDITABLE_FIELDS.has(f)
      );
      if (forbiddenFields.length > 0) {
        return NextResponse.json(
          { error: `수정 권한이 없는 필드: ${forbiddenFields.join(", ")}` },
          { status: 403 }
        );
      }
    }

    // 관리자가 activationStatus = "개통완료" 설정 시 → 자동 잠금
    const updateData: Record<string, unknown> = { ...body };
    if (
      (user.role === "ADMIN" || user.role === "SUB_ADMIN") &&
      body.activationStatus === "개통완료"
    ) {
      updateData.isLocked = true;
      updateData.lockedAt = new Date();
      updateData.lockedBy = user.id;
    }

    const activation = await updateActivation(id, updateData);
    return NextResponse.json({ activation });
  } catch (error) {
    console.error("Failed to update activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await deleteActivation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete activation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
