import { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const IS_PROD = process.env.NODE_ENV === "production";

export function issueCsrfToken(res: Response): string {
  const token = randomBytes(32).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return token;
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[CSRF_COOKIE] as string | undefined;
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF-token ongeldig" });
  }
  next();
}
