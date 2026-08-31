"use node";

import { GoogleAuth } from "google-auth-library";

function privateKey(): string {
  const value = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!value) throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing");
  return value.replace(/\\n/g, "\n");
}

async function accessTokenFor(scopes: string[]): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!email) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is missing");

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey() },
    scopes,
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Google service account did not return an access token");
  return token;
}

export function googleAccessToken(): Promise<string> {
  return accessTokenFor([
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
  ]);
}

export function googleExportAccessToken(): Promise<string> {
  return accessTokenFor(["https://www.googleapis.com/auth/drive.file"]);
}

function quotedDriveValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function ensureChildFolder(parentId: string, name: string, accessToken: string): Promise<string> {
  const driveQuery = "'" + quotedDriveValue(parentId) + "' in parents and name = '" + quotedDriveValue(name) + "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const existing = await fetch("https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(driveQuery) + "&fields=files(id,name)&pageSize=1", { headers: { Authorization: "Bearer " + accessToken } });
  if (!existing.ok) throw new Error("Drive folder lookup failed (" + existing.status + ")");
  const files = (await existing.json()) as { files?: Array<{ id: string }> };
  if (files.files?.[0]) return files.files[0].id;

  const created = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }),
  });
  if (!created.ok) throw new Error("Drive folder creation failed (" + created.status + ")");
  const folder = (await created.json()) as { id?: string };
  if (!folder.id) throw new Error("Drive did not return the export folder ID");
  return folder.id;
}

export async function ensureWeekExportFolder(weekStart: string, accessToken: string): Promise<string> {
  const rootFolderId = process.env.GOOGLE_DRIVE_EXPORTS_FOLDER_ID;
  if (!rootFolderId) throw new Error("GOOGLE_DRIVE_EXPORTS_FOLDER_ID is missing");
  const yearFolderId = await ensureChildFolder(rootFolderId, weekStart.slice(0, 4), accessToken);
  return ensureChildFolder(yearFolderId, weekStart + "-week-start", accessToken);
}

export async function uploadPngToDrive(folderId: string, filename: string, bytes: Uint8Array, accessToken: string): Promise<string> {
  const fileQuery = "'" + quotedDriveValue(folderId) + "' in parents and name = '" + quotedDriveValue(filename) + "' and trashed = false";
  const existing = await fetch("https://www.googleapis.com/drive/v3/files?q=" + encodeURIComponent(fileQuery) + "&fields=files(id)&pageSize=1", { headers: { Authorization: "Bearer " + accessToken } });
  if (!existing.ok) throw new Error("Drive file lookup failed for " + filename + " (" + existing.status + ")");
  const existingFiles = (await existing.json()) as { files?: Array<{ id: string }> };
  if (existingFiles.files?.[0]) {
    const fileId = existingFiles.files[0].id;
    const updated = await fetch("https://www.googleapis.com/upload/drive/v3/files/" + encodeURIComponent(fileId) + "?uploadType=media", {
      method: "PATCH",
      headers: { Authorization: "Bearer " + accessToken, "Content-Type": "image/png" },
      body: Buffer.from(bytes),
    });
    if (!updated.ok) throw new Error("Drive update failed for " + filename + " (" + updated.status + ")");
    return fileId;
  }
  const boundary = "carousel-" + crypto.randomUUID();
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from("--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + metadata + "\r\n--" + boundary + "\r\nContent-Type: image/png\r\n\r\n"),
    Buffer.from(bytes),
    Buffer.from("\r\n--" + boundary + "--"),
  ]);
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "multipart/related; boundary=" + boundary },
    body,
  });
  if (!response.ok) throw new Error("Drive upload failed for " + filename + " (" + response.status + ")");
  const file = (await response.json()) as { id?: string };
  if (!file.id) throw new Error("Drive did not return a file ID for " + filename);
  return file.id;
}

export async function canAccessDriveFile(fileId: string, accessToken: string): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,trashed`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) return false;
  const file = (await response.json()) as { id?: string; trashed?: boolean };
  return file.id === fileId && file.trashed !== true;
}
