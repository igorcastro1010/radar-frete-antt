import { it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { load } from "cheerio";
const mocks = vi.hoisted(() => ({ html: vi.fn(), calculator: vi.fn() }));
vi.mock("../src/lib/fetch-source", () => ({ officialHtml: mocks.html }));
vi.mock("../src/lib/official-calculator", () => ({
  verifyCalculator: mocks.calculator,
}));
import { collectSources } from "../src/lib/collect";
import { emptyState } from "../src/lib/model";
import { hash } from "../src/lib/extract";
import { METHOD_URL, PREVIOUS_URL, LATEST_URL } from "../src/lib/sources";
const method = readFileSync("docs/research/metodologia5867.html", "utf8");
const previous = readFileSync("docs/research/resolucao6084.html", "utf8");
const latest = readFileSync("docs/research/portaria22.html", "utf8");
it("arquiva HTML original de metodologia divergente e candidatos em quarentena pelo hash registrado", async () => {
  const d = load(method);
  d(".ato").prepend("<p>Art. 2º Alteração metodológica de teste.</p>");
  const changed = d.html();
  mocks.html.mockImplementation(async (url: string) =>
    url === METHOD_URL
      ? changed
      : url === PREVIOUS_URL
        ? previous
        : url === LATEST_URL
          ? latest
          : `<table><tr><td>Reajuste dos pisos mínimos</td><td><a href="${LATEST_URL}">Ato</a></td></tr></table>`,
  );
  const result = await collectSources(emptyState());
  expect(result.pending.length).toBeGreaterThan(0);
  for (const raw of [changed, previous, latest])
    expect(
      result.evidence.some((e) => e.hash === hash(raw) && e.content === raw),
    ).toBe(true);
  expect(result.pending.find((p) => p.id.startsWith("method-"))?.hash).toBe(
    hash(changed),
  );
});
