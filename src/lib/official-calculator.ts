import { load } from "cheerio";
import { officialFetch } from "./fetch-source";
import { calculate } from "./calculation";
import type { Version } from "./model";
const base = "https://calculadorafrete.antt.gov.br/";
const fromBr = (v: string) => Number(v.replaceAll(".", "").replace(",", "."));
export function parseOfficialResult(html: string) {
  const $ = load(html);
  const text = $("#resultado-calculadora").text().replace(/\s+/g, " ");
  const ccd = text.match(/\(CCD\):\s*([\d.,]+)/)?.[1],
    cc = text.match(/\(CC\):\s*([\d.,]+)/)?.[1];
  const total = $(".valorFrete")
    .text()
    .match(/R\$\s*([\d.,]+)/)?.[1];
  if (!ccd || !cc || !total)
    throw Error("Resposta da calculadora oficial não reconhecida");
  return { ccd: fromBr(ccd), cc: fromBr(cc), total: fromBr(total) };
}
export async function verifyCalculator(
  version: Version,
  methodHash: string,
  signal?: AbortSignal,
) {
  const response = await officialFetch(base, { signal });
  const html = await response.text();
  const $ = load(html);
  const token = $('input[name="__RequestVerificationToken"]').attr("value");
  if (!token) throw Error("Formulário oficial sem token de sessão");
  const cookie = response.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  let samples = 0;
  for (const table of ["A", "B", "C", "D"] as const) {
    for (const returned of [false, true]) {
      const row = version.rows.find(
        (r) => r.table === table && r.cargo === "Carga Geral" && r.axles === 6,
      );
      if (!row) throw Error("Amostra de validação ausente");
      const distance = returned ? 731 : 100;
      const body = new URLSearchParams({
        __RequestVerificationToken: token,
        "Filtro.IdTipoCarga": "5",
        "Filtro.NumeroEixos": "6",
        "Filtro.Distancia": String(distance),
        "Filtro.CargaLotacao": String(table === "A" || table === "C"),
        "Filtro.AltoDesempenho": String(table === "C" || table === "D"),
        "Filtro.RetornoVazio": String(returned),
      });
      const result = await officialFetch(base + "?Length=4", {
        method: "POST",
        body,
        signal,
        headers: {
          Cookie: cookie,
          "X-Requested-With": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      const official = parseOfficialResult(await result.text());
      if (
        official.ccd !== row.ccd ||
        official.cc !== row.cc ||
        Math.abs(
          official.total -
            calculate(row, distance, returned ? distance : 0).total,
        ) > 0.001
      )
        throw Error(`Divergência com calculadora oficial na tabela ${table}`);
      samples++;
    }
  }
  return { checkedAt: new Date().toISOString(), methodHash, samples };
}
