import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function getSecret(): string {
  return process.env.SESSION_SECRET ?? "dev-secret-change-in-prod";
}

export function signAdminToken(): string {
  return jwt.sign({ isAdmin: true }, getSecret(), { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const payload = jwt.verify(token, getSecret()) as { isAdmin?: boolean };
    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const cookie = req.cookies?.adminToken as string | undefined;
  const header = req.headers.authorization?.replace("Bearer ", "");
  const token = cookie ?? header;
  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
