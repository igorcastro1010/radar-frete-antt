import { it, expect } from "vitest";
import { authorized, allowedSource, sameOrigin } from "../src/lib/security";
it("nega sync sem segredo, segredo errado e aceita somente Bearer válido", () => {
  expect(authorized(new Request("https://radar.test"), undefined)).toBe(false);
  expect(
    authorized(
      new Request("https://radar.test", {
        headers: { authorization: "Bearer wrong" },
      }),
      "a".repeat(32),
    ),
  ).toBe(false);
  expect(
    authorized(
      new Request("https://radar.test", {
        headers: { authorization: "Bearer " + "a".repeat(32) },
      }),
      "a".repeat(32),
    ),
  ).toBe(true);
});
it("restringe hosts, protocolo, credenciais e redirecionamentos externos", () => {
  expect(allowedSource("https://anttlegis.antt.gov.br/action/a")).toBe(true);
  for (const url of [
    "http://anttlegis.antt.gov.br/",
    "https://evil.test",
    "https://anttlegis.antt.gov.br.evil.test/",
    "https://user:pass@anttlegis.antt.gov.br/",
    "http://169.254.169.254/",
  ])
    expect(allowedSource(url)).toBe(false);
});
it("consulta pública manual exige mesma origem configurada", () => {
  expect(
    sameOrigin(
      new Request("https://radar.test/api/check", {
        headers: { origin: "https://evil.test" },
      }),
      "https://radar.test",
    ),
  ).toBe(false);
  expect(
    sameOrigin(
      new Request("https://radar.test/api/check", {
        headers: { origin: "https://radar.test" },
      }),
      "https://radar.test",
    ),
  ).toBe(true);
});
