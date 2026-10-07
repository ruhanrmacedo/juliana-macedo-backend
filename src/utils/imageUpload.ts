import { cloudinary } from "../config/cloudinary";
import {
  UploadApiErrorResponse,
  UploadApiResponse,
} from "cloudinary";

export const ALLOWED_POST_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function startsWithBytes(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) return false;
  return signature.every((byte, index) => buffer[index] === byte);
}

export function hasValidImageSignature(
  buffer: Buffer,
  mimeType: string
): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return startsWithBytes(buffer, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWithBytes(buffer, [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
    case "image/gif":
      return (
        buffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
        buffer.subarray(0, 6).toString("ascii") === "GIF89a"
      );
    case "image/webp":
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

export function assertValidPostImage(file: Express.Multer.File): void {
  if (!ALLOWED_POST_IMAGE_MIME_TYPES.has(file.mimetype)) {
    throw new Error("Formato de imagem não permitido.");
  }
  if (!file.buffer.length || !hasValidImageSignature(file.buffer, file.mimetype)) {
    throw new Error("Conteúdo do arquivo não corresponde a uma imagem válida.");
  }
}

export async function uploadPostImage(
  file: Express.Multer.File
): Promise<UploadApiResponse> {
  assertValidPostImage(file);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "posts",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
      },
      (
        error: UploadApiErrorResponse | undefined,
        result: UploadApiResponse | undefined
      ) => {
        if (error || !result) return reject(error);
        resolve(result);
      }
    );

    stream.end(file.buffer);
  });
}
