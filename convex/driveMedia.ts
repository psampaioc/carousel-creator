"use node";

import { GoogleAuth } from "google-auth-library";

function privateKey(): string {
  const value = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!value) throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is missing");
  return value.replace(/\\n/g, "\n");
}

export async function googleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!email) throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL is missing");

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey() },
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ],
  });
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Google service account did not return an access token");
  return token;
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
