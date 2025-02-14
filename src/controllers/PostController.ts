import { Request, Response } from "express";
import { PostService } from "../services/PostService";
import { PostType } from "../models/enums/PostType";

export class PostController {
  static async createPost(req: Request, res: Response) {
    try {
      const { title, content, postType, imageUrl } = req.body;

      if (!req.user) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const authorId = req.user.id;
      const post = await PostService.createPost(title, content, postType as PostType, authorId, imageUrl);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getAllPosts(req: Request, res: Response) {
    try {
      const posts = await PostService.getAllPosts();
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getPostById(req: Request, res: Response) {
    try {
      const postId = Number(req.params.id);
      const post = await PostService.getPostById(postId);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updatePost(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const postId = Number(req.params.id);
      const userId = req.user.id;
      const { title, content, postType, imageUrl } = req.body;

      const post = await PostService.updatePost(postId, userId, title, content, postType as PostType, imageUrl);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async toggleActive(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const postId = Number(req.params.id);
      const userId = req.user.id;

      const post = await PostService.toggleActive(postId, userId);
      res.json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async deletePost(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const postId = Number(req.params.id);
      const userRole = req.user.role;

      const result = await PostService.deletePost(postId, userRole);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async filterPosts(req: Request, res: Response) {
    try {
      const { title, category, author, date } = req.query;

      const posts = await PostService.filterPosts(
        title as string,
        category as PostType,
        author as string,
        date as string
      );
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
