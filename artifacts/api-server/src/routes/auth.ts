import { Router } from "express";

const router = Router();

router.post("/admin/login", (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  if (typeof password !== "string" || password !== adminPassword) {
    return res.status(401).json({ error: "Ongeldig wachtwoord" });
  }

  req.session.isAdmin = true;
  return res.json({ ok: true });
});

router.post("/admin/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    return res.json({ ok: true });
  });
});

router.get("/admin/me", (req, res) => {
  if (req.session?.isAdmin) {
    return res.json({ isAdmin: true });
  }
  return res.status(401).json({ isAdmin: false });
});

export default router;
