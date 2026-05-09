import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET environment variable is required but was not provided.");
  }
  return secret;
}

export function signAdminToken(): string {
  return jwt.sign({ isAdmin: true }, getSecret(), { expiresIn: "7d" });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret) return false;
    const payload = jwt.verify(token, secret) as { isAdmin?: boolean };
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
