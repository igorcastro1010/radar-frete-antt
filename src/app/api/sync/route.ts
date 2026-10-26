import { revalidateTag } from "next/cache";
import { authorized } from "@/lib/security";
import { BlobRepository } from "@/lib/storage";
import { collectSources } from "@/lib/collect";
import { synchronize } from "@/lib/sync";
export const maxDuration = 240;
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const trigger =
      request.headers.get("x-radar-trigger") === "schedule"
        ? "schedule"
        : "workflow-dispatch";
    const repo = new BlobRepository();
    const result = await synchronize(repo, collectSources, trigger);
    revalidateTag("radar-state", { expire: 0 });
    const failed =
      result.status === "completed" && result.run.status !== "success";
    return Response.json(result, {
      status: failed ? 502 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Falha na sincronização agendada", error);
    return Response.json(
      { error: "Sincronização indisponível; última versão preservada" },
      { status: 503 },
    );
  }
}
