import {
  type ConflictInput,
  type ImageInput,
  type ParsedCandidateRow,
  type SheetHeader,
  type SourceInput,
  type SupportedFactInput,
} from "./contract";
import { validateDriveImages, type DriveFileLookup } from "../drive/mediaCatalog";

const factFields = new Set(["title", "startAt", "endAt", "venue", "city", "status"]);
const formats = new Set(["in_person", "online", "hybrid"]);
const geographyBands = new Set(["coimbra", "north", "central", "online"]);
const provenanceTypes = new Set(["official", "announcement", "generated"]);

function parseJsonArray<T>(value: string, field: string, findings: string[]): T[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) throw new Error();
    return parsed as T[];
  } catch {
    findings.push(`${field} must be a JSON array`);
    return [];
  }
}

function parseDate(value: string, field: string, findings: string[]): number | undefined {
  if (!value.trim()) return undefined;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) findings.push(`${field} must be an ISO date/time`);
  return Number.isNaN(timestamp) ? undefined : timestamp;
}

function validHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export async function parseCandidateRow(
  row: Record<SheetHeader, string>,
  canAccessDriveFile: DriveFileLookup = async () => true,
): Promise<ParsedCandidateRow> {
  const findings: string[] = [];
  const required = ["research_run_id", "external_row_id", "title", "format", "updated_at"] as const;
  for (const field of required) if (!row[field].trim()) findings.push(`${field} is required`);

  const sources = parseJsonArray<SourceInput>(row.sources_json, "sources_json", findings).filter(
    (source) => {
      const collectedAt = Date.parse(source.collectedAt ?? "");
      const valid = Boolean(
        source.sourceId?.trim() &&
          source.label?.trim() &&
          source.excerpt?.trim() &&
          source.collectedAt?.trim() &&
          !Number.isNaN(collectedAt) &&
          validHttpUrl(source.url),
      );
      if (!valid) findings.push("Every source requires sourceId, HTTP URL, label, excerpt, and collectedAt");
      return valid;
    },
  );
  if (sources.length === 0) findings.push("At least one complete source is required");

  const sourceIds = new Set(sources.map((source) => source.sourceId));
  if (sourceIds.size !== sources.length) findings.push("Source IDs must be unique within a candidate");
  const supportedFacts = parseJsonArray<SupportedFactInput>(
    row.supported_facts_json,
    "supported_facts_json",
    findings,
  ).filter((fact) => {
    const valid =
      factFields.has(fact.field) &&
      Boolean(fact.value?.trim()) &&
      Array.isArray(fact.sourceIds) &&
      fact.sourceIds.length > 0 &&
      fact.sourceIds.every((sourceId) => sourceIds.has(sourceId));
    if (!valid) findings.push("Every supported fact must reference one or more imported source IDs");
    return valid;
  });

  if (!supportedFacts.some((fact) => fact.field === "startAt")) {
    findings.push("Event date must be supported by source evidence");
  }

  const conflicts = parseJsonArray<ConflictInput>(row.conflicts_json, "conflicts_json", findings).filter(
    (conflict) => {
      const valid =
        factFields.has(conflict.field) && Array.isArray(conflict.values) && conflict.values.length > 1;
      if (!valid) findings.push("Every conflict requires a material field and at least two values");
      return valid;
    },
  );
  if (conflicts.length > 0) findings.push("Material source conflict requires operator review");

  const rawImages = parseJsonArray<ImageInput>(row.images_json, "images_json", findings).filter(
    (image) => {
      const collectedAt = Date.parse(image.collectedAt ?? "");
      const valid =
        provenanceTypes.has(image.provenance) &&
        validHttpUrl(image.sourceUrl) &&
        Boolean(image.collectedAt?.trim()) &&
        !Number.isNaN(collectedAt);
      if (!valid) findings.push("Every image requires provenance, source URL, and collectedAt");
      return valid;
    },
  );
  const checkedImages = await validateDriveImages(rawImages, canAccessDriveFile);
  findings.push(...checkedImages.findings);

  const format = formats.has(row.format) ? (row.format as ParsedCandidateRow["format"]) : "in_person";
  if (!formats.has(row.format)) findings.push("format must be in_person, online, or hybrid");
  const geographyBand = geographyBands.has(row.geography_band)
    ? (row.geography_band as ParsedCandidateRow["geographyBand"])
    : "coimbra";
  if (!geographyBands.has(row.geography_band)) findings.push("geography_band is invalid");

  const topicRelevance = Number(row.topic_relevance);
  if (!Number.isFinite(topicRelevance) || topicRelevance < 0 || topicRelevance > 100) {
    findings.push("topic_relevance must be between 0 and 100");
  }

  const updatedAt = parseDate(row.updated_at, "updated_at", findings) ?? Date.now();
  const startAt = parseDate(row.start_at, "start_at", findings);
  const endAt = parseDate(row.end_at, "end_at", findings);
  if (startAt && endAt && endAt < startAt) findings.push("end_at cannot be before start_at");
  if (!new Set(["imported", "needs_attention"]).has(row.editorial_status)) {
    findings.push("editorial_status must be imported or needs_attention");
  } else if (row.editorial_status === "needs_attention") {
    findings.push("Research worker marked this row as needing attention");
  }

  return {
    researchRunId: row.research_run_id.trim(),
    externalRowId: row.external_row_id.trim(),
    title: row.title.trim() || "Untitled candidate",
    format,
    startAt,
    endAt,
    venue: row.venue.trim() || undefined,
    city: row.city.trim() || undefined,
    topicRelevance: Number.isFinite(topicRelevance) ? topicRelevance : 0,
    weekMatch: row.week_match.trim().toLowerCase() === "true",
    geographyBand,
    sources,
    supportedFacts,
    conflicts,
    images: checkedImages.valid.map((image) => ({ ...image, collectedAt: Date.parse(image.collectedAt) })),
    editorialStatus: findings.length === 0 ? "imported" : "needs_attention",
    updatedAt,
    findings: [...new Set(findings)],
  };
}
