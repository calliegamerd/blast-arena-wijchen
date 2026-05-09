import { Router } from "express";
import { db } from "@workspace/db";
import { subscribersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/requireAdmin";
import { verifyCsrf } from "../lib/csrf";
import { ensureInbox, sendVerificationEmail, sendBroadcast } from "../lib/agentmail";
import { logger } from "../lib/logger";

const router = Router();

function makeCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

router.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Ongeldig e-mailadres" });
  }
  const lower = email.toLowerCase().trim();

  const existing = await db.select().from(subscribersTable).where(eq(subscribersTable.email, lower));
  if (existing.length > 0 && existing[0].verified) {
    return res.status(409).json({ error: "Al ingeschreven" });
  }

  const code = makeCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  let fromAddress = "blast-arena-wijchen@agentmail.to";
  try {
    fromAddress = await ensureInbox();
  } catch (e) {
    logger.error({ err: e }, "AgentMail ensureInbox failed");
  }

  if (existing.length > 0) {
    await db.update(subscribersTable)
      .set({ verifyCode: code, verifyExpires: expires })
      .where(eq(subscribersTable.email, lower));
  } else {
    await db.insert(subscribersTable).values({ email: lower, verifyCode: code, verifyExpires: expires });
  }

  try {
    await sendVerificationEmail(lower, code, fromAddress);
  } catch (e) {
    logger.error({ err: e }, "AgentMail send failed");
    return res.status(500).json({ error: "Kon verificatie e-mail niet verzenden" });
  }

  return res.json({ ok: true });
});

router.post("/subscribe/verify", async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: "Ontbrekende gegevens" });
  const lower = email.toLowerCase().trim();

  const [sub] = await db.select().from(subscribersTable).where(eq(subscribersTable.email, lower));
  if (!sub) return res.status(404).json({ error: "E-mailadres niet gevonden" });
  if (sub.verified) return res.json({ ok: true });
  if (sub.verifyCode !== String(code)) return res.status(400).json({ error: "Onjuiste code" });
  if (!sub.verifyExpires || sub.verifyExpires < new Date()) {
    return res.status(400).json({ error: "Code verlopen, vraag een nieuwe aan" });
  }

  await db.update(subscribersTable)
    .set({ verified: true, verifyCode: null, verifyExpires: null })
    .where(eq(subscribersTable.email, lower));

  return res.json({ ok: true });
});

router.get("/admin/subscribers", requireAdmin, async (_req, res) => {
  const subs = await db.select().from(subscribersTable).orderBy(subscribersTable.createdAt);
  return res.json(subs.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.delete("/admin/subscribers/:id", requireAdmin, verifyCsrf, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(subscribersTable).where(eq(subscribersTable.id, id));
  return res.status(204).send();
});

router.post("/admin/broadcast", requireAdmin, verifyCsrf, async (req, res) => {
  const { subject, html, text } = req.body;
  if (!subject || !html || !text) return res.status(400).json({ error: "Ontbrekende gegevens" });

  const subs = await db.select().from(subscribersTable).where(eq(subscribersTable.verified, true));
  if (subs.length === 0) return res.json({ sent: 0 });

  let fromAddress = "blast-arena-wijchen@agentmail.to";
  try {
    fromAddress = await ensureInbox();
  } catch (e) {
    logger.error({ err: e }, "ensureInbox failed");
  }

  await sendBroadcast(fromAddress, subs.map((s) => s.email), subject, html, text);
  return res.json({ sent: subs.length });
});

export default router;
