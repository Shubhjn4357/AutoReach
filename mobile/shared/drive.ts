export interface DriveUploadResult {
  success: boolean;
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink?: string;
  error?: string;
}

export async function uploadToGoogleDrive(
  accessToken: string,
  fileName: string,
  mimeType: string,
  fileContent: Buffer | string,
): Promise<DriveUploadResult> {
  if (accessToken === "mock_token") {
    const mockFileId = `drive_file_${Math.random().toString(36).substring(2, 11)}`;
    return {
      success: true,
      fileId: mockFileId,
      name: fileName,
      mimeType,
      size:
        typeof fileContent === "string"
          ? fileContent.length
          : fileContent.byteLength,
      webViewLink: `https://drive.google.com/open?id=${mockFileId}`,
    };
  }

  try {
    const metadata = { name: fileName, mimeType: mimeType };
    const boundary = "314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--\r\n`;

    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      (typeof fileContent === "string"
        ? fileContent
        : fileContent.toString("binary")) +
      closeDelimiter;

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "Content-Length": multipartBody.length.toString(),
        },
        body: multipartBody,
      },
    );
    if (!response.ok)
      throw new Error(`Google API responded with status ${response.status}`);
    const data = await response.json();
    return {
      success: true,
      fileId: data.id,
      name: data.name || fileName,
      mimeType: data.mimeType || mimeType,
      size:
        typeof fileContent === "string"
          ? fileContent.length
          : fileContent.byteLength,
      webViewLink: `https://drive.google.com/open?id=${data.id}`,
    };
  } catch (error: any) {
    console.error("Drive upload failed:", error);
    return {
      success: false,
      fileId: "",
      name: fileName,
      mimeType,
      size: 0,
      error: error.message,
    };
  }
}
