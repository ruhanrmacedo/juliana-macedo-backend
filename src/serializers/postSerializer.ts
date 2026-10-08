import { Post } from "../models/Post";
import { canonicalPostPath } from "../utils/editorial";
import { toUserSummary } from "./userSerializer";

type PostWithCounts = Post & { commentsCount?: number; likesCount?: number };

export function toPostDto(post: PostWithCounts, includeTechnical = false) {
  const dto = {
    id: post.id,
    title: post.title,
    slug: post.slug,
    canonicalPath: canonicalPostPath(post),
    content: post.content,
    excerpt: post.excerpt,
    postType: post.postType,
    channel: post.channel,
    format: post.format,
    status: post.status,
    publishedAt: post.publishedAt ?? null,
    isActive: post.isActive,
    imageUrl: post.imageUrl ?? null,
    imageAlt: post.imageAlt ?? null,
    imageCaption: post.imageCaption ?? null,
    imageCredit: post.imageCredit ?? null,
    seoTitle: post.seoTitle ?? null,
    seoDescription: post.seoDescription ?? null,
    isFeatured: post.isFeatured,
    featuredPriority: post.featuredPriority ?? null,
    category: post.category ? { id: post.category.id, name: post.category.name, slug: post.category.slug } : null,
    tags: (post.tags || []).map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug })),
    author: post.authorProfile
      ? { id: post.authorProfile.id, name: post.authorProfile.displayName, displayName: post.authorProfile.displayName, slug: post.authorProfile.slug, headline: post.authorProfile.headline, shortBio: post.authorProfile.shortBio ?? null, avatarUrl: post.authorProfile.avatarUrl ?? null }
      : toUserSummary(post.author),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    views: post.views ?? 0,
    ...(post.commentsCount !== undefined ? { commentsCount: post.commentsCount } : {}),
    ...(post.likesCount !== undefined ? { likesCount: post.likesCount, likes: post.likesCount } : {}),
  };
  if (!includeTechnical) return dto;
  return { ...dto, technicalAuthor: toUserSummary(post.author), editedBy: toUserSummary(post.editedBy) };
}

export function toPostSummaryDto(post: PostWithCounts) {
  const dto = toPostDto(post) as ReturnType<typeof toPostDto>;
  const { content: _content, ...summary } = dto;
  return summary;
}
