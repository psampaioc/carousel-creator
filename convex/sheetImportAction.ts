"use node";

import { actionGeneric } from "convex/server";

import { internal } from "./_generated/api";
import { requireOperator } from "./authz";
import { canAccessDriveFile, googleAccessToken } from "./driveMedia";
import { SHEET_HEADERS, rowsToRecords } from "../lib/sheets/contract";
import { parseCandidateRow } from "../lib/sheets/parseCandidateRow";

export const importConfiguredSheet = actionGeneric({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    await requireOperator(ctx);
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) throw new Error("GOOGLE_SHEET_ID is missing");

    const token = await googleAccessToken();
    const endColumn = String.fromCharCode(64 + SHEET_HEADERS.length);
    const range = encodeURIComponent(`Candidates!A:${endColumn}`);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/${range}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error(`Google Sheet read failed (${response.status})`);
    const payload = (await response.json()) as { values?: string[][] };
    const records = rowsToRecords(payload.values ?? []);
    const rows = await Promise.all(
      records.map((record) => parseCandidateRow(record, (fileId) => canAccessDriveFile(fileId, token))),
    );
    return await ctx.runMutation(internal.sheetImport.upsertRows, { rows });
  },
});
