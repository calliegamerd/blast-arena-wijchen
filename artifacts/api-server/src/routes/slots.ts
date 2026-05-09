import { Router } from "express";
import { db, slotsTable } from "@workspace/db";
import { CreateSlotBody, UpdateSlotBody } from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/slots", async (_req, res) => {
  const slots = await db
    .select()
    .from(slotsTable)
    .orderBy(slotsTable.startTime);

  return res.json(
    slots.map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }))
  );
});

router.get("/admin/slots", async (req, res) => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const slots = await db
    .select()
    .from(slotsTable)
    .orderBy(desc(slotsTable.startTime));

  return res.json(
    slots.map((s) => ({
      ...s,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
    }))
  );
});

router.post("/admin/slots", async (req, res) => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const parsed = CreateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { title, startTime, endTime, capacity, notes } = parsed.data;

  const [slot] = await db
    .insert(slotsTable)
    .values({
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      capacity: capacity ?? 20,
      status: "open",
      notes: notes ?? null,
    })
    .returning();

  return res.status(201).json({
    ...slot,
    startTime: slot.startTime.toISOString(),
    endTime: slot.endTime.toISOString(),
  });
});

router.patch("/admin/slots/:id", async (req, res) => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = UpdateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.startTime !== undefined) updateData.startTime = new Date(parsed.data.startTime);
  if (parsed.data.endTime !== undefined) updateData.endTime = new Date(parsed.data.endTime);
  if (parsed.data.capacity !== undefined) updateData.capacity = parsed.data.capacity;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const [updated] = await db
    .update(slotsTable)
    .set(updateData)
    .where(eq(slotsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  return res.json({
    ...updated,
    startTime: updated.startTime.toISOString(),
    endTime: updated.endTime.toISOString(),
  });
});

router.delete("/admin/slots/:id", async (req, res) => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const deleted = await db
    .delete(slotsTable)
    .where(eq(slotsTable.id, id))
    .returning();

  if (deleted.length === 0) return res.status(404).json({ error: "Not found" });

  return res.status(204).send();
});

export default router;
