import { readCachedState, publicState } from "@/lib/public-state";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(publicState((await readCachedState()).state), {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Falha ao ler persistência", error);
    return Response.json(
      {
        error:
          "Dados persistidos temporariamente indisponíveis. A última tabela exibida foi preservada.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
