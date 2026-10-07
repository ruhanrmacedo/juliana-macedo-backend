import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ALLOWED_POST_IMAGE_MIME_TYPES } from "../utils/imageUpload";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_POST_IMAGE_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("Formato de imagem não permitido."));
    }
    cb(null, true);
  },
});

export function uploadSingleImage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  upload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "A imagem deve ter no máximo 5 MB."
        : error instanceof Error
          ? error.message
          : "Arquivo de imagem inválido.";

    res.status(400).json({ error: message });
  });
}
