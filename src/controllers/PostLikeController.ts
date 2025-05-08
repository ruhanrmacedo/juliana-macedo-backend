import { Request, Response } from "express";
import { PostLikeService } from "../services/PostLikeService";

export class PostLikeController {
  static async like(req: Request, res: Response) {
    try {
      const { postId } = req.body;
      const ip = req.ip ?? "unknown";
      const userAgent = req.headers["user-agent"] ?? "unknown";

      const like = await PostLikeService.like(postId, ip, userAgent);
      res.status(201).json(like);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async count(req: Request, res: Response) {
    try {
      const { postId } = req.params;
      const count = await PostLikeService.count(+postId);
      res.json({ likes: count });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
