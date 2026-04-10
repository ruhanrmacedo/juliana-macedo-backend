import { Request, Response } from "express";
import { PostService } from "../services/PostService";
import { PostType } from "../models/enums/PostType";
import { cloudinary } from "../config/cloudinary";
import { UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

export class PostController {
  static async createPost(req: Request, res: Response) {
    try {
      const { title, content, postType, imageUrl } = req.body;

      if (!req.user) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      let finalImageUrl: string | undefined = imageUrl;

      if (req.file) {
        const fileBuffer = req.file.buffer;

        const uploaded: UploadApiResponse = await new Promise(
          (resolve, reject) => {
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
          }
        );

        finalImageUrl = uploaded.secure_url;
      }

      const post = await PostService.createPost(
        title,
        content,
        postType as PostType,
        req.user.id,
        finalImageUrl
      );

      res.status(201).json(post);
      return;
    } catch (err: unknown) {
      console.error("Erro no createPost:", err);
      const message = err instanceof Error ? err.message : "Erro inesperado";
      res.status(400).json({ error: message });
      return;
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

  static async getAdminPosts(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      if (req.user.role !== "admin") {
        res.status(403).json({ error: "Apenas admins podem acessar esta área" });
        return;
      }

      const posts = await PostService.getAdminPosts();
      res.json(posts);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getPostById(req: Request, res: Response) {
    try {
      const postId = Number(req.params.id);
      if (!postId || isNaN(postId)) {
        res.status(400).json({ error: "ID do post inválido" });
        return;
      }

      await PostService.incrementPostViews(postId);
      const post = await PostService.getPostById(postId);
      res.json(post);
      return;
    } catch (error: any) {
      console.error("Erro no getPostById:", error);
      res.status(400).json({ error: error.message });
      return;
    }
  }

  static async updatePost(req: Request, res: Response) {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Usuário não autenticado" });
        return;
      }

      const postId = Number(req.params.id);
      if (!postId || isNaN(postId)) {
        res.status(400).json({ error: "ID do post inválido" });
        return;
      }

      const { title, content, postType, imageUrl } = req.body;

      let finalImageUrl: string | undefined = imageUrl;

      if (req.file) {
        const fileBuffer = req.file.buffer;

        const uploaded: UploadApiResponse = await new Promise(
          (resolve, reject) => {
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
          }
        );

        finalImageUrl = uploaded.secure_url;
      }

      const post = await PostService.updatePost(
        postId,
        req.user.id,
        req.user.role,
        title,
        content,
        (postType as PostType) || undefined,
        finalImageUrl
      );

      res.json(post);
      return;
    } catch (err: unknown) {
      console.error("Erro no updatePost:", err);
      const message = err instanceof Error ? err.message : "Erro inesperado";
      res.status(400).json({ error: message });
      return;
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

      const post = await PostService.toggleActive(postId, userId, req.user.role);
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

  // Listar posts com paginação
  static async getPaginated(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 6;
      const type = (req.query.type as string | undefined) || undefined; // 👈

      const { posts, total } = await PostService.getPaginated(page, limit, type); // 👈
      res.json({ posts, total });
      return;
    } catch (error) {
      console.error("Erro ao buscar posts paginados:", error);
      res.status(400).json({ error: "Erro ao buscar posts recentes" });
      return;
    }
  }

  static async getTopViewed(req: Request, res: Response) {
    try {
      const limit = Number(req.query.limit) || 3;
      const posts = await PostService.getTopViewed(limit);
      res.json({ posts });
      return;
    } catch (error) {
      console.error("❌ Erro ao buscar posts mais vistos:", error);
      res.status(400).json({ error: "Erro ao buscar destaques" });
      return;
    }
  }
}
