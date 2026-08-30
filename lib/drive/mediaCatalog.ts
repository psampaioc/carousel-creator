import type { ImageInput } from "../sheets/contract";

export type DriveFileLookup = (fileId: string) => Promise<boolean>;

export function isDriveFileId(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,}$/.test(value);
}

export async function validateDriveImages(
  images: ImageInput[],
  canAccess: DriveFileLookup,
): Promise<{ valid: ImageInput[]; findings: string[] }> {
  const checks = await Promise.all(images.map(async (image) => {
    if (!isDriveFileId(image.driveFileId)) {
      return { image, finding: `Invalid Drive file ID: ${image.driveFileId || "(empty)"}` };
    }

    if (!(await canAccess(image.driveFileId))) {
      return { image, finding: `Drive file is inaccessible: ${image.driveFileId}` };
    }

    return { image };
  }));

  return {
    valid: checks.filter((check) => !check.finding).map((check) => check.image),
    findings: checks.flatMap((check) => (check.finding ? [check.finding] : [])),
  };
}
