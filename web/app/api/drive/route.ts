export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "../../../../shared/auth";
import { uploadToGoogleDrive } from "../../../../shared/drive";
import { db } from "../../../../shared/dbClient";
import { driveFiles } from "../../../../shared/db";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid authorization" } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { leadId, fileName, mimeType, fileContent, accessToken } = body;

    if (!fileName || !mimeType || !fileContent) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "Missing required file parameters" } },
        { status: 400 }
      );
    }

    // Decode file content (handles text or base64)
    let bufferContent: Buffer | string = fileContent;
    if (fileContent.includes(";base64,")) {
      const parts = fileContent.split(";base64,");
      const base64Str = parts[parts.length - 1];
      bufferContent = Buffer.from(base64Str, "base64");
    }

    const tokenToUse = accessToken || "mock_token";
    const uploadResult = await uploadToGoogleDrive(tokenToUse, fileName, mimeType, bufferContent);

    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: { code: "DRIVE_UPLOAD_FAILED", message: uploadResult.error } },
        { status: 500 }
      );
    }

    const driveFileRecordId = `df_${Math.random().toString(36).substring(2, 11)}`;

    try {
      await db.insert(driveFiles).values({
        id: driveFileRecordId,
        userId: decoded.userId,
        leadId: leadId || null,
        fileId: uploadResult.fileId,
        name: uploadResult.name,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        webViewLink: uploadResult.webViewLink || null,
        createdAt: Date.now()
      });
    } catch (dbError) {
      console.warn("Saving drive file metadata to SQLite failed:", dbError);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: driveFileRecordId,
        ...uploadResult
      },
      message: "File uploaded and registered successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing authorization" } },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid authorization" } },
        { status: 401 }
      );
    }

    let files: any[] = [];
    try {
      files = await db.select().from(driveFiles).where(eq(driveFiles.userId, decoded.userId));
    } catch (error) {
      files = [];
    }

    return NextResponse.json({
      success: true,
      data: files,
      message: `Retrieved ${files.length} drive files`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
