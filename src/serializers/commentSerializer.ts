import { Comment } from "../models/Comment";
import { toUserSummary } from "./userSerializer";

export function toCommentDto(comment: Comment) {
  return {
    id: comment.id,
    content: comment.content,
    user: toUserSummary(comment.user),
    createdAt: comment.createdAt,
    editedAt: comment.editedAt,
    isEdited: comment.isEdited,
  };
}
