import { db } from "@/lib/db";
import { usimLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function addUsimLog(params: {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  agencyId?: string;
  agencyName?: string;
  targetAgencyId?: string;
  targetAgencyName?: string;
  usimCount?: number;
}) {
  return db.insert(usimLogs).values(params);
}

export async function getUsimLogs(limit: number = 50) {
  return db
    .select()
    .from(usimLogs)
    .orderBy(desc(usimLogs.createdAt))
    .limit(limit);
}
