import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { load } from "cheerio";
import { extractAct, discoverActs } from "../src/lib/extract";
import {
  compareVersions,
  currentVersion,
  classifyChange,
  toCsv,
} from "../src/lib/domain";
const html = readFileSync("docs/research/portaria22.html", "utf8");
const previous = readFileSync("docs/research/resolucao6084.html", "utf8");
const url =
  "https://anttlegis.antt.gov.br/action/UrlPublicasAction.php?num_ato=00000022";
const version = () => extractAct(html, url, "2026-10-26T14:00:00Z");
describe("anexos oficiais reais", () => {
  it("extrai quatro tabelas, preserva células não aplicáveis e datas normativas", () => {
    const v = version();
    expect(v.publishedAt).toBe("2026-09-29");
    expect(v.effectiveAt).toBe("2026-09-30");
    expect(v.rows.length).toBe(272);
    expect(
      v.rows.find(
        (r) => r.table === "A" && r.cargo === "Carga Geral" && r.axles === 6,
      ),
    ).toMatchObject({ ccd: 7.5347, cc: 671.93 });
    expect(
      v.rows.some(
        (r) => r.table === "A" && r.cargo === "Conteinerizada" && r.axles === 2,
      ),
    ).toBe(false);
  });
  it("ignora HTML de navegação, atributos e espaços sem falso reajuste", () => {
    const changed = extractAct(
      html
        .replace("<body", '<body data-theme="new"')
        .replace("4,1056", "<span>4,1056</span>"),
      url,
      "2026-10-27T00:00:00Z",
    );
    expect(changed.coefficientsHash).toBe(version().coefficientsHash);
    expect(changed.contentHash).toBe(version().contentHash);
  });
  it("rejeita anexo parcial, número inválido e publicação ausente", () => {
    expect(() =>
      extractAct(html.replace("4,1056", "valor inválido"), url, ""),
    ).toThrow();
    expect(() =>
      extractAct(html.replace("29/09/2026", "data ausente"), url, ""),
    ).toThrow();
    expect(() =>
      extractAct("<html>Fonte indisponível</html>", url, ""),
    ).toThrow();
  });
  it("rejeita a perda de uma categoria completa e cabeçalho de eixos alterado", () => {
    const d = load(html);
    const table = d(".ato table")
      .filter((_, el) => d(el).text().includes("Deslocamento"))
      .first();
    const tr = table
      .find("tr")
      .filter((_, el) => d(el).text().includes("Carga Geral"))
      .first();
    tr.next("tr").remove();
    tr.remove();
    expect(() => extractAct(d.html(), url, "")).toThrow();
    const swapped = load(html);
    const header = swapped(".ato table")
      .first()
      .find("tr")
      .filter((_, el) =>
        swapped(el)
          .children("td,th")
          .toArray()
          .some((c) => swapped(c).text().trim() === "9"),
      )
      .first();
    const cells = header.children("td,th");
    const two = cells.filter((_, e) => swapped(e).text().trim() === "2"),
      three = cells.filter((_, e) => swapped(e).text().trim() === "3");
    two.text("3");
    three.text("2");
    expect(() => extractAct(swapped.html(), url, "")).toThrow();
  });
  it("confirma aumento por item sem converter a primeira carga em alerta", () => {
    const a = extractAct(previous, url, ""),
      b = version();
    const diff = compareVersions(a, b);
    expect(diff.filter((r) => r.ccd.delta! > 0).length).toBe(272);
    expect(diff.every((r) => r.cc.delta === 0)).toBe(true);
    expect(classifyChange(undefined, b)).toBe("baseline");
    expect(classifyChange(a, b)).toBe("increase");
    expect(classifyChange(b, a)).toBe("decrease");
  });
  it("classifica remoção, adição e incompatibilidade sem percentuais inventados", () => {
    const a = version(),
      b = { ...a, rows: a.rows.slice(1) };
    expect(
      compareVersions(a, b).filter((r) => r.status === "removed"),
    ).toHaveLength(1);
    expect(
      compareVersions(b, a).filter((r) => r.status === "added"),
    ).toHaveLength(1);
    expect(
      compareVersions(a, { ...a, methodology: "other" }).every(
        (r) => r.status === "incompatible",
      ),
    ).toBe(true);
  });
  it("não ativa vigência futura antes da meia-noite de Fortaleza", () => {
    const a = version();
    expect(
      currentVersion([a], new Date("2026-09-30T02:59:59Z")),
    ).toBeUndefined();
    expect(currentVersion([a], new Date("2026-09-30T03:00:00Z"))?.id).toBe(
      a.id,
    );
  });
  it("descobre somente atos oficiais relevantes de 2026 em diante", () => {
    const link =
      "https://anttlegis.antt.gov.br/action/UrlPublicasAction.php?acao=abrirAtoPublico&num_ato=00000099&sgl_tipo=POR&sgl_orgao=SUROC/ANTT/MT&vlr_ano=2026";
    expect(
      discoverActs(
        `<table><tr><td>Reajuste do Anexo II dos pisos mínimos</td><td><a href="${link}">Portaria 99/2026</a></td></tr></table>`,
      ),
    ).toEqual([link]);
    expect(
      discoverActs('<a href="https://evil.test/">pisos mínimos</a>'),
    ).toEqual([]);
  });
  it("exporta CSV brasileiro com proteção contra fórmulas", () => {
    expect(
      toCsv([
        ["Carga", "Valor"],
        ["=CMD()", 7.5347],
      ]),
    ).toContain("'=CMD()");
    expect(toCsv([["x;y", "á"]])).toContain('"x;y"');
  });
});
