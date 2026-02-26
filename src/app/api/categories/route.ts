import { NextRequest, NextResponse } from "next/server";
import {
  getCategoryTree,
  createCategory,
  updateCategory,
  softDeleteCategory,
  getLinkedAgencyCount,
  getChildCategoryCount,
} from "@/lib/db/queries/categories";
import { getSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tree = await getCategoryTree();
    return NextResponse.json({ categories: tree });
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, level, parentId, sortOrder } = body;

    if (!id || !name || !level) {
      return NextResponse.json(
        { error: "id, name, level은 필수입니다." },
        { status: 400 }
      );
    }

    const category = await createCategory({
      id,
      name,
      level,
      parentId,
      sortOrder,
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Failed to create category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "id와 name은 필수입니다." },
        { status: 400 }
      );
    }

    const category = await updateCategory(id, { name });
    if (!category) {
      return NextResponse.json(
        { error: "카테고리를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Failed to update category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const force = searchParams.get("force") === "true";

    if (!id) {
      return NextResponse.json(
        { error: "id는 필수입니다." },
        { status: 400 }
      );
    }

    // 연결된 거래처 수 확인
    const linkedCount = await getLinkedAgencyCount(id);
    // 하위 중분류 수 확인
    const childCount = await getChildCategoryCount(id);

    if (!force && (linkedCount > 0 || childCount > 0)) {
      return NextResponse.json({
        needConfirm: true,
        linkedCount,
        childCount,
        message:
          linkedCount > 0
            ? `${linkedCount}개 거래처가 연결되어 있습니다.`
            : `${childCount}개 중분류가 포함되어 있습니다.`,
      });
    }

    const category = await softDeleteCategory(id);
    if (!category) {
      return NextResponse.json(
        { error: "카테고리를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ category, deleted: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
