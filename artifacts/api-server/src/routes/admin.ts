import { Router } from "express";
import { db, contactsTable, slotsTable } from "@workspace/db";
import { count, eq, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/requireAdmin";

const router = Router();

router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const [totalContactsResult] = await db
    .select({ count: count() })
    .from(contactsTable);

  const [warehouseContactsResult] = await db
    .select({ count: count() })
    .from(contactsTable)
    .where(eq(contactsTable.type, "warehouse"));

  const [totalSlotsResult] = await db
    .select({ count: count() })
    .from(slotsTable);

  const [openSlotsResult] = await db
    .select({ count: count() })
    .from(slotsTable)
    .where(eq(slotsTable.status, "open"));

  const recentContacts = await db
    .select()
    .from(contactsTable)
    .orderBy(desc(contactsTable.createdAt))
    .limit(5);

  return res.json({
    totalContacts: Number(totalContactsResult.count),
    warehouseContacts: Number(warehouseContactsResult.count),
    totalSlots: Number(totalSlotsResult.count),
    openSlots: Number(openSlotsResult.count),
    recentContacts: recentContacts.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    })),
  });
});

export default router;
