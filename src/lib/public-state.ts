import { unstable_cache } from "next/cache";
import { BlobRepository } from "./storage";
import type { State } from "./model";
export function publicState(state: State) {
  return {
    versions: state.versions.map((v) => ({
      ...v,
      simulationValidated: state.validations?.[v.id] || v.simulationValidated,
    })),
    pending: state.pending,
    runs: state.runs.slice(0, 30),
    lastAttempt: state.lastAttempt,
    lastSuccess: state.lastSuccess,
    lastAutomatic: state.lastAutomatic,
    methodReviewRequired: state.pending.some((p) => p.id.startsWith("method-")),
    schedule: {
      configured: process.env.SCHEDULER_MODE === "github-actions",
      intervalMinutes: 60,
      minute: 17,
      provider: "GitHub Actions",
      note: "Fila do GitHub pode atrasar ou omitir execuções. Interface atualizada em até 5 minutos após a coleta.",
    },
  };
}
export type PublicSnapshot = ReturnType<typeof publicState>;
export const readCachedState = unstable_cache(
  async () => new BlobRepository().read(),
  ["radar-persisted-state-v1"],
  { revalidate: 300, tags: ["radar-state"] },
);
