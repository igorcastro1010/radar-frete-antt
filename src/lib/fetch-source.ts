import { allowedSource } from "./security";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export async function officialFetch(
  url: string,
  init: RequestInit = {},
  attempts = 2,
): Promise<Response> {
  if (!allowedSource(url)) throw Error("Fonte fora da lista permitida");
  let last: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    init.signal?.throwIfAborted();
    try {
      let current = url;
      for (let redirect = 0; redirect < 4; redirect++) {
        const response = await fetch(current, {
          ...init,
          headers: {
            "User-Agent":
              "RadarFreteANTT/1.0 (+https://github.com/igorcastro1010/radar-frete-antt)",
            ...init.headers,
          },
          redirect: "manual",
          cache: "no-store",
          signal: AbortSignal.any([
            AbortSignal.timeout(12000),
            ...(init.signal ? [init.signal] : []),
          ]),
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          if (!location) throw Error("Redirecionamento sem destino");
          current = new URL(location, current).href;
          if (!allowedSource(current))
            throw Error("Redirecionamento não permitido");
          continue;
        }
        if (!response.ok) throw Error(`HTTP ${response.status}`);
        return response;
      }
      throw Error("Redirecionamentos excessivos");
    } catch (error) {
      last = error;
      if (attempt < attempts - 1) await sleep(500 * 2 ** attempt);
    }
  }
  throw last;
}
export async function officialHtml(url: string, signal?: AbortSignal) {
  const response = await officialFetch(url, { signal });
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > 3_000_000)
    throw Error("Conteúdo maior que o limite de extração");
  const charset =
    response.headers.get("content-type")?.match(/charset=([\w-]+)/i)?.[1] ||
    "utf-8";
  return new TextDecoder(charset).decode(buffer);
}
