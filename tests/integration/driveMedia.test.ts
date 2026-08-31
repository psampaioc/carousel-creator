import { afterEach, describe, expect, it, vi } from "vitest";

import { uploadPngToDrive } from "@/convex/driveMedia";
import { validateDriveImages } from "@/lib/drive/mediaCatalog";

afterEach(() => vi.unstubAllGlobals());

describe("Drive media validation", () => {
  it("rejects malformed and inaccessible Drive references", async () => {
    const result = await validateDriveImages(
      [
        {
          driveFileId: "officialImage123",
          sourceUrl: "https://example.org/official.jpg",
          provenance: "official",
          collectedAt: "2026-08-30T08:00:00Z",
        },
        {
          driveFileId: "missingImage456",
          sourceUrl: "https://example.org/poster.jpg",
          provenance: "announcement",
          collectedAt: "2026-08-30T08:00:00Z",
        },
        {
          driveFileId: "bad",
          sourceUrl: "https://example.org/generated.jpg",
          provenance: "generated",
          collectedAt: "2026-08-30T08:00:00Z",
        },
      ],
      async (fileId) => fileId === "officialImage123",
    );

    expect(result.valid.map((image) => image.driveFileId)).toEqual(["officialImage123"]);
    expect(result.findings).toEqual([
      "Drive file is inaccessible: missingImage456",
      "Invalid Drive file ID: bad",
    ]);
  });
});

describe("Drive export upload", () => {
  it("updates an existing numbered file instead of creating a duplicate", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ files: [{ id: "existing-file-id" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "existing-file-id" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const fileId = await uploadPngToDrive("week-folder", "2026-09-07-coimbra-events-01.png", new Uint8Array([1, 2, 3]), "token");

    expect(fileId).toBe("existing-file-id");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("/existing-file-id?uploadType=media");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "PATCH" });
  });
});
