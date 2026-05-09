import { Router } from "express";
import { db, contactsTable } from "@workspace/db";
import { SubmitContactBody } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";
import { checkRateLimit } from "../lib/rateLimiter";
import { requireAdmin } from "../lib/requireAdmin";

const router = Router();

router.post("/contact", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: "Te veel verzoeken. Probeer het later opnieuw.",
      retryAfterSeconds: rateCheck.retryAfterSeconds,
    });
  }

  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Ongeldige invoer", details: parsed.error.issues });
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

router.get("/admin/contacts", requireAdmin, async (_req, res) => {
  const contacts = await db
    .select()
    .from(contactsTable)
    .orderBy(desc(contactsTable.createdAt));

  return res.json(
    contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))
  );
});

router.delete("/admin/contacts/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Ongeldig id" });

  const deleted = await db
    .delete(contactsTable)
    .where(eq(contactsTable.id, id))
    .returning();

  if (deleted.length === 0) return res.status(404).json({ error: "Niet gevonden" });

  return res.status(204).send();
});

export default router;
