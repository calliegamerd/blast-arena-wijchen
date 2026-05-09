const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

function getCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function addCsrfHeader(method: string, headers: Headers): void {
  if (SAFE_METHODS.has(method.toUpperCase())) return;
  const token = getCsrfCookie();
  if (token) {
    headers.set(CSRF_HEADER, token);
  }
}

export { CSRF_HEADER };
