import { Request, Response } from "express";
import { cloudinary } from "../config/cloudinary";
import { UploadApiErrorResponse, UploadApiResponse } from "cloudinary";

export class MediaController {
    static async uploadImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                res.status(400).json({ error: "Arquivo não enviado" });
                return;
            }

            const fileBuffer = req.file.buffer;

            const result: UploadApiResponse = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "posts", resource_type: "image" },
                    (
                        error: UploadApiErrorResponse | undefined,
                        result: UploadApiResponse | undefined
                    ) => {
                        if (error || !result) return reject(error);
                        resolve(result);
                    }
                );

                stream.end(fileBuffer);
            });

            res.status(201).json({
                url: result.secure_url,
                publicId: result.public_id,
            });
            return;
        } catch (err) {
            console.error("Erro ao fazer upload no Cloudinary:", err);
            res.status(500).json({ error: "Falha no upload de imagem" });
            return;
        }
    }
}
