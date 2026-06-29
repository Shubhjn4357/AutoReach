import { GoogleSignin } from "@react-native-google-signin/google-signin";

/**
 * Uploads a local image file to the user's Google Drive.
 * Sets permissions to "anyone with link can view" so the backend can access the image.
 * Returns a direct download URL.
 */
export async function uploadImageToGoogleDrive(localUri: string, filename: string): Promise<string> {
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    if (!accessToken) {
      throw new Error("No Google access token found. Please sign in again.");
    }

    // 1. Create file metadata and initiate multipart upload
    const metadata = {
      name: filename,
      mimeType: "image/jpeg",
    };

    const formData = new FormData();
    formData.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" })
    );

    // Fetch the local file as blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    formData.append("file", blob);

    // 2. Post file to Google Drive v3 upload endpoint
    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Google Drive upload failed: ${uploadRes.statusText} (${errText})`);
    }

    const file = await uploadRes.json();
    const fileId = file.id;

    if (!fileId) {
      throw new Error("Failed to retrieve file ID from Google Drive upload response.");
    }

    // 3. Make file readable by anyone with the link
    const permissionRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: "reader",
          type: "anyone",
        }),
      }
    );

    if (!permissionRes.ok) {
      console.warn("Failed to set public view permission on Drive file:", fileId);
    }

    // Return direct download URL format
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  } catch (error) {
    console.error("Error in uploadImageToGoogleDrive:", error);
    throw error;
  }
}

/**
 * Deletes an image file from Google Drive given its direct download URL.
 */
export async function deleteImageFromGoogleDrive(downloadUrl: string): Promise<void> {
  try {
    if (!downloadUrl || !downloadUrl.includes("docs.google.com/uc")) {
      return; // Not a Google Drive URL, ignore
    }

    const match = downloadUrl.match(/[?&]id=([^&]+)/);
    const fileId = match ? match[1] : null;
    if (!fileId) {
      console.warn("Could not extract Google Drive file ID from URL:", downloadUrl);
      return;
    }

    const { accessToken } = await GoogleSignin.getTokens();
    if (!accessToken) {
      console.warn("Google access token missing; skipping file deletion from Google Drive.");
      return;
    }

    console.log(`Deleting file ${fileId} from Google Drive...`);
    const deleteRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.warn(`Failed to delete Google Drive file ${fileId}: ${deleteRes.statusText} (${errText})`);
    } else {
      console.log(`Successfully deleted file ${fileId} from Google Drive.`);
    }
  } catch (error) {
    console.error("Error in deleteImageFromGoogleDrive:", error);
  }
}
