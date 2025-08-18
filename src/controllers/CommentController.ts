import { Request, Response } from "express";
import { CommentService } from "../services/CommentService";
import { AppDataSource } from "../config/ormconfig";
import { Comment } from "../models/Comment";

export class CommentController {
    static async create(req: Request, res: Response) {
        try {
            const { postId, content } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            // Verificar o último comentário do usuário
            const commentRepo = AppDataSource.getRepository(Comment);
            const lastComment = await commentRepo.findOne({
                where: { user: { id: userId } },
                order: { createdAt: "DESC" },
            });

            if (
                lastComment &&
                new Date().getTime() - new Date(lastComment.createdAt).getTime() <
                10_000
            ) {
                res
                    .status(429)
                    .json({
                        error: "Espere pelo menos 10 segundos entre os comentários.",
                    });
            }

            const comment = await CommentService.create(postId, userId, content);
            res.status(201).json(comment);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async update(req: Request, res: Response) {
        try {
            const commentId = Number(req.params.commentId);
            const { content } = req.body;
            const userId = req.user?.id;

            if (!commentId || !userId) {
                res
                    .status(400)
                    .json({ error: "Dados inválidos para atualizar comentário." });
                return;
            }

            const comment = await CommentService.update(commentId, userId, content);
            res.json(comment);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async delete(req: Request, res: Response) {
        try {
            const commentId = Number(req.params.commentId);
            const userId = req.user?.id;
            const isAdmin = req.user?.role === "admin";

            if (!commentId || !userId) {
                res
                    .status(400)
                    .json({ error: "ID do comentário ou usuário inválido." });
                return;
            }

            await CommentService.delete(commentId, userId, isAdmin);
            res.json({ message: "Comentário removido" });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async listByPost(req: Request, res: Response) {
        try {
            const { postId } = req.params;
            const comments = await CommentService.listByPost(+postId);
            res.json(comments);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    // Método para listar comentários de um post com paginação
    static async listByPostPaginated(req: Request, res: Response) {
        try {
            const postId = Number(req.params.postId);
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await CommentService.listByPostPaginated(
                postId,
                page,
                limit
            );
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}
