import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { GoogleAuth } from "google-auth-library";
import { NextResponse } from "next/server";

import { api } from "@/convex/_generated/api";

export async function GET(_request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const user = await currentUser();
  const operatorEmail = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
  const signedInEmail = user?.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)?.emailAddress.toLowerCase();
  if (!user || !operatorEmail || signedInEmail !== operatorEmail) return new NextResponse("Unauthorized", { status: 401 });

  const { fileId } = await params;
  if (!/^[A-Za-z0-9_-]{10,}$/.test(fileId)) return new NextResponse("Invalid Drive file ID", { status: 400 });
  const { getToken } = await auth();
  const convexToken = await getToken({ template: "convex" });
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexToken || !convexUrl) return new NextResponse("Image authorization is unavailable", { status: 503 });
  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(convexToken);
  const allowed = await convex.query(api.images.isApprovedDriveImage, { fileId });
  if (!allowed) return new NextResponse("Drive image is unavailable", { status: 404 });
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!serviceAccountEmail || !privateKey) return new NextResponse("Drive credentials are not configured", { status: 503 });

  const driveAuth = new GoogleAuth({ credentials: { client_email: serviceAccountEmail, private_key: privateKey }, scopes: ["https://www.googleapis.com/auth/drive.readonly"] });
  const driveToken = await driveAuth.getAccessToken();
  if (!driveToken) return new NextResponse("Drive authentication failed", { status: 502 });
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: `Bearer ${driveToken}` }, cache: "no-store" });
  if (!response.ok || !response.body) return new NextResponse("Drive image unavailable", { status: response.status || 502 });
  const contentType = response.headers.get("Content-Type")?.toLowerCase();
  if (contentType !== "image/jpeg" && contentType !== "image/png" && contentType !== "image/webp") return new NextResponse("Drive file is not a supported raster image", { status: 415 });
  return new NextResponse(response.body, { headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
