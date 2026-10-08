import { Request, Response } from "express";
import { PostService, EditorialPostInput } from "../services/PostService";
import { PostType } from "../models/enums/PostType";
import { uploadPostImage } from "../utils/imageUpload";
import { toPostDto, toPostSummaryDto } from "../serializers/postSerializer";
import { EditorialChannel } from "../models/enums/EditorialChannel";
import { ContentFormat } from "../models/enums/ContentFormat";
import { EditorialStatus } from "../models/enums/EditorialStatus";

function optionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error("Identificador numérico inválido");
  return parsed;
}
function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  return value === true || value === "true" || value === "1";
}
function parseTags(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) throw new Error("Tags inválidas");
    return parsed.map(String);
  }
  return trimmed.split(",").map((tag) => tag.trim()).filter(Boolean);
}
function editorialInput(body: Record<string, unknown>, imageUrl?: string | null): EditorialPostInput {
  return {
    title: String(body.title || ""),
    content: String(body.content || ""),
    postType: body.postType as PostType | undefined,
    slug: body.slug === undefined ? undefined : String(body.slug),
    excerpt: body.excerpt === undefined ? undefined : String(body.excerpt),
    channel: body.channel as EditorialChannel | undefined,
    format: body.format as ContentFormat | undefined,
    status: body.status as EditorialStatus | undefined,
    publishedAt: body.publishedAt === undefined ? undefined : body.publishedAt ? String(body.publishedAt) : null,
    categoryId: optionalNumber(body.categoryId),
    tagNames: parseTags(body.tagNames ?? body.tags),
    authorProfileId: optionalNumber(body.authorProfileId) ?? undefined,
    imageUrl: imageUrl !== undefined ? imageUrl : body.imageUrl === undefined ? undefined : String(body.imageUrl),
    imageAlt: body.imageAlt === undefined ? undefined : String(body.imageAlt),
    imageCaption: body.imageCaption === undefined ? undefined : String(body.imageCaption),
    imageCredit: body.imageCredit === undefined ? undefined : String(body.imageCredit),
    seoTitle: body.seoTitle === undefined ? undefined : String(body.seoTitle),
    seoDescription: body.seoDescription === undefined ? undefined : String(body.seoDescription),
    isFeatured: optionalBoolean(body.isFeatured),
    featuredPriority: optionalNumber(body.featuredPriority),
  };
}
function errorResponse(res: Response, error: unknown, fallback = "Erro inesperado") {
  const message = error instanceof Error ? error.message : fallback;
  const status = /não encontrad|não encontrado/i.test(message) ? 404 : 400;
  return res.status(status).json({ error: message });
}

export class PostController {
  static async createPost(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
      let imageUrl = req.body.imageUrl as string | undefined;
      if (req.file) imageUrl = (await uploadPostImage(req.file)).secure_url;
      const post = await PostService.createPost(editorialInput(req.body, imageUrl), undefined, undefined, req.user.id);
      return res.status(201).json(toPostDto(post, true));
    } catch (error) { return errorResponse(res, error); }
  }

  static async getAllPosts(_req: Request, res: Response) {
    try { return res.json((await PostService.getAllPosts()).map(toPostSummaryDto)); }
    catch (error) { return errorResponse(res, error); }
  }

  static async getAdminPosts(_req: Request, res: Response) {
    try { return res.json((await PostService.getAdminPosts()).map((post) => toPostDto(post, true))); }
    catch (error) { return errorResponse(res, error); }
  }

  static async getAdminPostById(req: Request, res: Response) {
    try { return res.json(toPostDto(await PostService.getAdminPostById(Number(req.params.id)), true)); }
    catch (error) { return errorResponse(res, error); }
  }

  static async getPostById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID do post inválido" });
      const post = await PostService.getPublicPostById(id);
      await PostService.incrementPostViews(id);
      post.views = (post.views || 0) + 1;
      return res.json(toPostDto(post));
    } catch (error) { return errorResponse(res, error); }
  }

  static async getPostBySlug(req: Request, res: Response) {
    try {
      const result = await PostService.getPublicPostBySlug(req.params.slug);
      await PostService.incrementPostViews(result.post.id);
      result.post.views = (result.post.views || 0) + 1;
      return res.json({ ...toPostDto(result.post), redirectedFrom: result.redirectedFrom, canonicalPath: result.canonicalPath });
    } catch (error) { return errorResponse(res, error); }
  }

  static async updatePost(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
      let imageUrl = req.body.imageUrl as string | undefined;
      if (req.file) imageUrl = (await uploadPostImage(req.file)).secure_url;
      const post = await PostService.updatePost(Number(req.params.id), req.user.id, req.user.role, editorialInput(req.body, imageUrl));
      return res.json(toPostDto(post, true));
    } catch (error) { return errorResponse(res, error); }
  }

  static async toggleActive(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
      const post = await PostService.toggleActive(Number(req.params.id), req.user.id, req.user.role);
      return res.json(toPostDto(post, true));
    } catch (error) { return errorResponse(res, error); }
  }

  static async deletePost(req: Request, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });
      return res.json(await PostService.deletePost(Number(req.params.id), req.user.role));
    } catch (error) { return errorResponse(res, error); }
  }

  static async filterPosts(req: Request, res: Response) {
    try {
      const posts = await PostService.filterPosts(req.query.title as string, req.query.category as string, req.query.author as string, req.query.date as string);
      return res.json(posts.map(toPostSummaryDto));
    } catch (error) { return errorResponse(res, error); }
  }

  static async getPaginated(req: Request, res: Response) {
    try {
      const result = await PostService.listPublic({
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 6,
        typeSlug: req.query.type as string | undefined,
        channel: req.query.channel as EditorialChannel | undefined,
        format: req.query.format as ContentFormat | undefined,
        category: req.query.category as string | undefined,
        tag: req.query.tag as string | undefined,
      });
      return res.json({ ...result, posts: result.posts.map(toPostSummaryDto) });
    } catch (error) { return errorResponse(res, error); }
  }

  static async getTopViewed(req: Request, res: Response) {
    try { return res.json({ posts: (await PostService.getTopViewed(Number(req.query.limit) || 3)).map(toPostSummaryDto) }); }
    catch (error) { return errorResponse(res, error); }
  }

  static async getTaxonomy(_req: Request, res: Response) {
    try { return res.json(await PostService.getTaxonomy()); }
    catch (error) { return errorResponse(res, error); }
  }

  static async sitemap(_req: Request, res: Response) {
    try {
      const baseUrl = (process.env.PUBLIC_SITE_URL || "https://julianalcmacedo.com.br").replace(/\/$/, "");
      const entries = await PostService.getSitemapEntries();
      const urls = entries.map(({ path, updatedAt }) => `<url><loc>${baseUrl}${path}</loc><lastmod>${new Date(updatedAt).toISOString()}</lastmod></url>`).join("");
      res.type("application/xml");
      return res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${baseUrl}/</loc></url><url><loc>${baseUrl}/conteudos</loc></url><url><loc>${baseUrl}/blog</loc></url><url><loc>${baseUrl}/receitas</loc></url>${urls}</urlset>`);
    } catch (error) { return errorResponse(res, error); }
  }
}
