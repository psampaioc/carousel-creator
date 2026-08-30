export const SHEET_HEADERS = [
  "research_run_id",
  "external_row_id",
  "title",
  "format",
  "start_at",
  "end_at",
  "venue",
  "city",
  "topic_relevance",
  "week_match",
  "geography_band",
  "sources_json",
  "supported_facts_json",
  "conflicts_json",
  "images_json",
  "editorial_status",
  "updated_at",
] as const;

export type SheetHeader = (typeof SHEET_HEADERS)[number];

export type SourceInput = {
  sourceId: string;
  url: string;
  label: string;
  excerpt: string;
  collectedAt: string;
  isOfficial: boolean;
};

export type SupportedFactInput = {
  field: "title" | "startAt" | "endAt" | "venue" | "city" | "status";
  value: string;
  sourceIds: string[];
};

export type ConflictInput = {
  field: SupportedFactInput["field"];
  values: string[];
};

export type ImageInput = {
  driveFileId: string;
  sourceUrl: string;
  provenance: "official" | "announcement" | "generated";
  collectedAt: string;
};

export type ParsedCandidateRow = {
  researchRunId: string;
  externalRowId: string;
  title: string;
  format: "in_person" | "online" | "hybrid";
  startAt?: number;
  endAt?: number;
  venue?: string;
  city?: string;
  topicRelevance: number;
  weekMatch: boolean;
  geographyBand: "coimbra" | "north" | "central" | "online";
  sources: SourceInput[];
  supportedFacts: SupportedFactInput[];
  conflicts: ConflictInput[];
  images: Array<Omit<ImageInput, "collectedAt"> & { collectedAt: number }>;
  editorialStatus: "imported" | "needs_attention";
  updatedAt: number;
  findings: string[];
};

export function rowsToRecords(rows: string[][]): Record<SheetHeader, string>[] {
  const [headers = [], ...dataRows] = rows;
  const normalizedHeaders = headers.map((header) => header.trim());
  const missing = SHEET_HEADERS.filter((header) => !normalizedHeaders.includes(header));

  if (missing.length > 0) {
    throw new Error(`Sheet is missing required headers: ${missing.join(", ")}`);
  }

  return dataRows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) =>
      Object.fromEntries(
        SHEET_HEADERS.map((header) => [header, row[normalizedHeaders.indexOf(header)] ?? ""]),
      ) as Record<SheetHeader, string>,
    );
}
