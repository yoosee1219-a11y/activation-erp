import { getDriveClient, getFolderId } from "./client";
import { Readable } from "stream";

export async function uploadFileToDrive(
  file: Buffer,
  fileName: string,
  mimeType: string,
  subfolder?: string
) {
  const drive = getDriveClient();
  const parentFolderId = getFolderId();

  let targetFolderId = parentFolderId;

  // 하위 폴더가 지정된 경우 해당 폴더 찾기/생성
  if (subfolder) {
    const existing = await drive.files.list({
      q: `name='${subfolder}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id)",
    });

    if (existing.data.files?.length) {
      targetFolderId = existing.data.files[0].id!;
    } else {
      const folder = await drive.files.create({
        requestBody: {
          name: subfolder,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentFolderId],
        },
        fields: "id",
      });
      targetFolderId = folder.data.id!;
    }
  }

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [targetFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(file),
    },
    fields: "id, webViewLink, webContentLink",
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
    webContentLink: response.data.webContentLink,
  };
}

export async function getFileFromDrive(fileId: string) {
  const drive = getDriveClient();

  const metadata = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size",
  });

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return {
    metadata: metadata.data,
    stream: response.data as NodeJS.ReadableStream,
  };
}

export async function deleteFileFromDrive(fileId: string) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}
