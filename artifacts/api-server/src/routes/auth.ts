import { Router } from "express";
import { signAdminToken, verifyAdminToken } from "../lib/requireAdmin";

const router = Router();

const IS_PROD = process.env.NODE_ENV === "production";

router.post("/admin/login", (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  if (typeof password !== "string" || password !== adminPassword) {
    return res.status(401).json({ error: "Ongeldig wachtwoord" });
  }

  const token = signAdminToken();

  res.cookie("adminToken", token, {
    httpOnly: true,
    sameSite: IS_PROD ? "none" : "lax",
    secure: IS_PROD,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });

  return res.json({ ok: true });
});

router.post("/admin/logout", (_req, res) => {
  res.clearCookie("adminToken", { path: "/" });
  return res.json({ ok: true });
});

router.get("/admin/me", (req, res) => {
  const cookie = req.cookies?.adminToken as string | undefined;
  const header = req.headers.authorization?.replace("Bearer ", "");
  const token = cookie ?? header;
  if (token && verifyAdminToken(token)) {
    return res.json({ isAdmin: true });
  }
  return res.status(401).json({ isAdmin: false });
});

export default router;
