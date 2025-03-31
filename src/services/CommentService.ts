import { AppDataSource } from "../config/ormconfig";
import { Comment } from "../models/Comment";
import { Post } from "../models/Post";
import { User } from "../models/User";

const commentRepository = AppDataSource.getRepository(Comment);

export class CommentService {
  static async create(postId: number, userId: number, content: string) {
    const post = await AppDataSource.getRepository(Post).findOneBy({ id: postId });
    const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
    if (!post || !user) throw new Error("Post ou usuário não encontrado");

    const comment = commentRepository.create({ content, post, user });
    return await commentRepository.save(comment);
  }

  static async update(commentId: number, userId: number, content: string) {
    const comment = await commentRepository.findOne({
      where: { id: commentId },
      relations: ["user"],
    });
    if (!comment) throw new Error("Comentário não encontrado");
    if (comment.user.id !== userId) throw new Error("Apenas o autor pode editar");

    comment.content = content;
    comment.isEdited = true;
    return await commentRepository.save(comment);
  }

  static async delete(commentId: number, userId: number, isAdmin: boolean) {
    const comment = await commentRepository.findOne({
      where: { id: commentId },
      relations: ["user"],
    });
    if (!comment) throw new Error("Comentário não encontrado");
    if (comment.user.id !== userId && !isAdmin)
      throw new Error("Apenas o autor ou admin pode excluir");

    return await commentRepository.remove(comment);
  }

  static async listByPost(postId: number) {
    return await commentRepository.find({
      where: { post: { id: postId } },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }
}
