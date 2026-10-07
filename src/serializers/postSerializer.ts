import { Post } from "../models/Post";
import { toUserSummary } from "./userSerializer";

type PostWithCounts = Post & {
  commentsCount?: number;
  likesCount?: number;
};

export function toPostDto(post: PostWithCounts) {
  return {
    id: post.id,
    title: post.title,
    content: post.content,
    postType: post.postType,
    isActive: post.isActive,
    imageUrl: post.imageUrl ?? null,
    author: toUserSummary(post.author),
    editedBy: toUserSummary(post.editedBy),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    views: post.views ?? 0,
    ...(post.commentsCount !== undefined
      ? { commentsCount: post.commentsCount }
      : {}),
    ...(post.likesCount !== undefined ? { likesCount: post.likesCount } : {}),
  };
}
