import { db } from "@/lib/db";
import { activationLogs } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function addActivationLog(params: {
  activationId: string;
  userId: string;
  userName: string;
  userRole: string;
  agencyName?: string;
  action: string;
  details: string;
}) {
  return db.insert(activationLogs).values(params);
}

export async function getActivationLogs(activationId: string) {
  return db
    .select()
    .from(activationLogs)
    .where(eq(activationLogs.activationId, activationId))
    .orderBy(asc(activationLogs.createdAt));
}
