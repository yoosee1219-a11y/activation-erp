import { NextRequest, NextResponse } from "next/server";
import {
  getAllUsers,
  createUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "@/lib/db/queries/users";
import { getSessionUser } from "@/lib/auth/session";
import { auth } from "@/lib/auth/server";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUB_ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Failed to fetch users:", error);
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
    const {
      email: rawEmail,
      password,
      name,
      role,
      allowedAgencies,
      allowedMajorCategory,
      allowedMediumCategories,
    } = body;

    if (!rawEmail || rawEmail.length < 4) {
      return NextResponse.json(
        { error: "아이디는 4글자 이상이어야 합니다." },
        { status: 400 }
      );
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "비밀번호는 4글자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 이메일 형식이 아니면 자동 변환
    const email = rawEmail.includes("@")
      ? rawEmail
      : `${rawEmail}@activation-erp.local`;

    // Better Auth로 사용자 생성
    const authResult = await auth.api.signUpEmail({
      body: { email, password, name },
    });

    if (!authResult?.user?.id) {
      return NextResponse.json(
        { error: "Failed to create auth user" },
        { status: 500 }
      );
    }

    // user_profiles에 추가
    const profile = await createUserProfile({
      id: authResult.user.id,
      email,
      name,
      role,
      allowedAgencies: allowedAgencies || [],
      allowedMajorCategory: allowedMajorCategory || null,
      allowedMediumCategories: allowedMediumCategories || [],
    });

    return NextResponse.json({ user: profile }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...data } = body;

    const updated = await updateUserProfile(id, data);
    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Failed to update user:", error);
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

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    await deleteUserProfile(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
