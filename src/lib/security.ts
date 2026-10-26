import { timingSafeEqual } from "node:crypto";
const hosts = new Set([
  "www.gov.br",
  "anttlegis.antt.gov.br",
  "www.in.gov.br",
  "pesquisa.in.gov.br",
  "calculadorafrete.antt.gov.br",
]);
export function allowedSource(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      hosts.has(u.hostname) &&
      !u.username &&
      !u.password &&
      (!u.port || u.port === "443")
    );
  } catch {
    return false;
  }
}
export function authorized(request: Request, secret = process.env.CRON_SECRET) {
  if (!secret || secret.length < 32) return false;
  const value = request.headers.get("authorization") || "",
    expected = `Bearer ${secret}`;
  return (
    value.length === expected.length &&
    timingSafeEqual(Buffer.from(value), Buffer.from(expected))
  );
}
export function sameOrigin(request: Request, origin = process.env.APP_ORIGIN) {
  return Boolean(
    origin && request.headers.get("origin") === new URL(origin).origin,
  );
}
