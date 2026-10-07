import { Request, Response } from "express";
import { uploadPostImage } from "../utils/imageUpload";

export class MediaController {
    static async uploadImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                res.status(400).json({ error: "Arquivo não enviado" });
                return;
            }

            const result = await uploadPostImage(req.file);

            res.status(201).json({
                url: result.secure_url,
                publicId: result.public_id,
            });
            return;
        } catch (err) {
            console.error("Erro ao fazer upload no Cloudinary:", err);
            const message =
                err instanceof Error ? err.message : "Falha no upload de imagem";
            const isValidationError =
                /formato|conteúdo|imagem válida/i.test(message);
            res
                .status(isValidationError ? 400 : 500)
                .json({ error: isValidationError ? message : "Falha no upload de imagem" });
            return;
        }
    }
}
