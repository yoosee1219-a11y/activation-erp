import { db } from "@/lib/db";
import { notices } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getNotices(limit = 50, offset = 0) {
  return db
    .select({
      id: notices.id,
      title: notices.title,
      content: notices.content,
      isImportant: notices.isImportant,
      videoUrl: notices.videoUrl,
      attachmentName: notices.attachmentName,
      attachmentUrl: notices.attachmentUrl,
      createdBy: notices.createdBy,
      createdByName: notices.createdByName,
      createdAt: notices.createdAt,
      updatedAt: notices.updatedAt,
    })
    .from(notices)
    .orderBy(desc(notices.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getNoticeById(id: string) {
  const result = await db
    .select()
    .from(notices)
    .where(eq(notices.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createNotice(params: {
  title: string;
  content: string;
  isImportant?: boolean;
  videoUrl?: string;
  attachmentName?: string;
  attachmentData?: string;
  attachmentUrl?: string;
  createdBy: string;
  createdByName: string;
}) {
  const result = await db.insert(notices).values(params).returning();
  return result[0];
}

export async function updateNotice(
  id: string,
  params: {
    title?: string;
    content?: string;
    isImportant?: boolean;
    videoUrl?: string | null;
    attachmentName?: string | null;
    attachmentData?: string | null;
    attachmentUrl?: string | null;
  }
) {
  const result = await db
    .update(notices)
    .set({ ...params, updatedAt: new Date() })
    .where(eq(notices.id, id))
    .returning();
  return result[0];
}

export async function deleteNotice(id: string) {
  return db.delete(notices).where(eq(notices.id, id));
}
