import { Request, Response } from "express";
import { PostLikeService, AlreadyLikedError, NotFoundError } from "../services/PostLikeService";
import { getClientIp, getUserAgent } from "../utils/ip";

export class PostLikeController {
  static async like(req: Request, res: Response) {
    try {
      const postId = Number(req.body?.postId);
      if (!Number.isFinite(postId)) {
        res.status(400).json({ error: "postId inválido" });
        return;
      }

      const ip = getClientIp(req);
      const userAgent = getUserAgent(req);

      const like = await PostLikeService.like(postId, ip, userAgent);
      res.status(201).json(like);
      return;
    } catch (error: any) {
      if (error instanceof AlreadyLikedError) {
        res.status(409).json({ error: error.message }); // conflito (já curtiu)
        return;
      }
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message }); // post não existe
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }
  }

  static async count(req: Request, res: Response) {
    try {
      const postId = Number(req.params.postId);
      if (!Number.isFinite(postId)) {
        res.status(400).json({ error: "postId inválido" });
        return;
      }

      const count = await PostLikeService.count(postId);
      res.json({ likes: count });
      return;
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }
  }
}