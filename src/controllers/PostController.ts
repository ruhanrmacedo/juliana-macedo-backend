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
      const post = await PostService.createPost(
        title,
        content,
        postType as PostType,
        authorId,
        imageUrl
      );
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

      const post = await PostService.updatePost(
        postId,
        userId,
        title,
        content,
        postType as PostType,
        imageUrl
      );
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
      console.log(
        "🔥 Recebendo requisição de filtro com parâmetros:",
        req.query
      );

      const title = req.query.title as string | undefined;
      const category = req.query.category as string | undefined;
      const author = req.query.author as string | undefined;
      const date = req.query.date as string | undefined;

      console.log("🔍 Parâmetros extraídos:");
      console.log(" - title:", title);
      console.log(" - category:", category);
      console.log(" - author:", author);
      console.log(" - date:", date);

      if (date && isNaN(Date.parse(date))) {
        console.log("❌ Erro: Formato de data inválido:", date);
        res.status(400).json({ error: "Formato de data inválido" });
        return;
      }

      const posts = await PostService.filterPosts(
        title,
        category,
        author,
        date
      );

      console.log(
        "✅ Posts filtrados com sucesso! Total de posts encontrados:",
        posts.length
      );
      res.json(posts);
    } catch (error: any) {
      console.error("🚨 Erro ao filtrar posts:", error.message);
      res.status(400).json({ error: error.message });
    }
  }
}
