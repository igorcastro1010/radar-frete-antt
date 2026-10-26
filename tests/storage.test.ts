import { it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@vercel/blob", () => ({
  ...mocks,
  BlobNotFoundError: class extends Error {},
}));
import { BlobRepository } from "../src/lib/storage";
import { emptyState } from "../src/lib/model";
it("usa o ETag forte em escritas condicionais quando a leitura privada retorna W/", async () => {
  mocks.get.mockResolvedValue({
    statusCode: 200,
    stream: new Response(JSON.stringify(emptyState())).body,
    blob: { etag: 'W/"revision"' },
  });
  mocks.put.mockResolvedValue({ etag: '"next"' });
  const repo = new BlobRepository(),
    read = await repo.read();
  await repo.save(read.state, read.etag);
  expect(mocks.put.mock.calls[0][2].ifMatch).toBe('"revision"');
});
