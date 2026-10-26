import { revalidateTag } from "next/cache";
import { sameOrigin } from "@/lib/security";
import { readCachedState, publicState } from "@/lib/public-state";
import { BlobRepository } from "@/lib/storage";
import { collectSources } from "@/lib/collect";
import { COOLDOWN_MS, synchronize } from "@/lib/sync";
export const maxDuration = 240;
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Origem não permitida" }, { status: 403 });
  try {
    const cached = await readCachedState();
    if (
      cached.state.lastAttempt &&
      Date.now() - Date.parse(cached.state.lastAttempt) < COOLDOWN_MS
    )
      return Response.json(
        {
          error:
            "Consulta central já realizada. Nova consulta liberada após 55 minutos; o agendamento é horário.",
          nextAt: new Date(
            Date.parse(cached.state.lastAttempt) + COOLDOWN_MS,
          ).toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil(
                (Date.parse(cached.state.lastAttempt) +
                  COOLDOWN_MS -
                  Date.now()) /
                  1000,
              ),
            ),
          },
        },
      );
    const repo = new BlobRepository();
    const result = await synchronize(repo, collectSources, "manual");
    revalidateTag("radar-state", { expire: 0 });
    return Response.json(
      { ...result, snapshot: publicState((await repo.read()).state) },
      {
        status: result.status === "completed" ? 200 : 429,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Falha na consulta manual", error);
    return Response.json(
      {
        error: "Falha na consulta. Os últimos dados válidos foram preservados.",
      },
      { status: 503 },
    );
  }
}
