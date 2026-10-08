import sanitizeHtml from "sanitize-html";
import { ContentFormat } from "../models/enums/ContentFormat";
import { EditorialChannel } from "../models/enums/EditorialChannel";

export function normalizeSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function plainTextFromHtml(value: string): string {
  const separatedBlocks = (value || "")
    .replace(/<\s*(br|hr)\b[^>]*>/gi, " ")
    .replace(/<\/\s*(p|div|h[1-6]|li|blockquote|pre)\s*>/gi, " ");

  return sanitizeHtml(separatedBlocks, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildExcerpt(content: string, maxLength = 220): string {
  const text = plainTextFromHtml(content);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength + 1);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > 120 ? boundary : maxLength).trim()}…`;
}

export function sanitizeEditorialHtml(content: string): string {
  return sanitizeHtml(content || "", {
    allowedTags: [
      "p", "br", "strong", "em", "u", "s", "h2", "h3", "h4",
      "ul", "ol", "li", "blockquote", "a", "img", "hr", "code", "pre",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["class", "style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  }).trim();
}

export function canonicalPostPath(post: {
  slug: string;
  channel: EditorialChannel;
  format: ContentFormat;
}): string {
  if (post.channel === EditorialChannel.BLOG) return `/blog/${post.slug}`;
  if (post.format === ContentFormat.RECIPE) return `/receitas/${post.slug}`;
  return `/conteudos/${post.slug}`;
}
