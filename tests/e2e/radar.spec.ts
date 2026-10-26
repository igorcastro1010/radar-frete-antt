import { test, expect } from "@playwright/test";
test("dados persistidos, filtros, comparação, CSV e simulação no navegador", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/state");
  expect(response.ok()).toBe(true);
  const state = await response.json();
  expect(state.versions.length).toBeGreaterThan(0);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Pisos mínimos de frete" }),
  ).toBeVisible();
  await expect(page.getByText("TABELA VIGENTE VALIDADA")).toBeVisible();
  await page.getByRole("link", { name: "Tabela", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tipo de carga", exact: true })
    .selectOption("Carga Geral");
  await page
    .getByRole("combobox", { name: "Quantidade de eixos", exact: true })
    .selectOption("6");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Comparar com outra versão").check();
  await expect(
    page.getByRole("columnheader", { name: "CCD anterior" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("-comparacao.csv");
  await page.getByRole("link", { name: "Histórico", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Registro de sincronizações" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Simulador", exact: true }).click();
  const toggle = page.getByLabel(/Confirmo operação de carga lotação/);
  if (await toggle.isEnabled()) {
    await toggle.check();
    await expect(page.locator(".calculated-value")).toContainText("R$");
  } else
    await expect(
      page.getByText("Simulador temporariamente indisponível"),
    ).toBeVisible();
});
for (const width of [360, 390, 430, 1440])
  test(`quatro telas sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of ["/", "/tabela", "/historico", "/simulador"]) {
      await page.goto(path);
      await expect(page.getByText("Carregando dados persistidos…")).toHaveCount(
        0,
      );
      await expect(page.locator("h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `test-results/${width}-${path.replaceAll("/", "") || "painel"}.png`,
          fullPage: true,
        });
    }
    expect(errors).toEqual([]);
  });
test("rotas internas negam acesso não autenticado e origem externa", async ({
  request,
}) => {
  expect((await request.post("/api/sync")).status()).toBe(401);
  expect(
    (
      await request.post("/api/check", {
        headers: { origin: "https://example.org" },
      })
    ).status(),
  ).toBe(403);
});
