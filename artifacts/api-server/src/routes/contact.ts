import { Router } from "express";
import { db, contactsTable } from "@workspace/db";
import { SubmitContactBody } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router = Router();

router.post("/contact", async (req, res) => {
  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }

  const { name, email, phone, message, type, warehouseSize, warehouseLocation } = parsed.data;

  const [contact] = await db
    .insert(contactsTable)
    .values({
      name,
      email,
      phone: phone ?? null,
      message,
      type,
      warehouseSize: warehouseSize ?? null,
      warehouseLocation: warehouseLocation ?? null,
    })
    .returning();

  return res.status(201).json({
    ...contact,
    createdAt: contact.createdAt.toISOString(),
  });
});

router.get("/admin/contacts", async (req, res) => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const contacts = await db
    .select()
    .from(contactsTable)
    .orderBy(desc(contactsTable.createdAt));

  return res.json(
    contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
  );
});

router.delete("/admin/contacts/:id", async (req, res) => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const { eq } = await import("drizzle-orm");
  const deleted = await db
    .delete(contactsTable)
    .where(eq(contactsTable.id, id))
    .returning();

  if (deleted.length === 0) return res.status(404).json({ error: "Not found" });

  return res.status(204).send();
});

export default router;
