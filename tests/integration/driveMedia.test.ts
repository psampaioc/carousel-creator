import { describe, expect, it } from "vitest";

import { validateDriveImages } from "@/lib/drive/mediaCatalog";

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
