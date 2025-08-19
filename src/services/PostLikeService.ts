import { AppDataSource } from "../config/ormconfig";
import { PostLike } from "../models/PostLike";
import { Post } from "../models/Post";

const postLikeRepo = AppDataSource.getRepository(PostLike);

export class AlreadyLikedError extends Error { }
export class NotFoundError extends Error { }

export class PostLikeService {
  static async like(postId: number, ip: string, userAgent: string) {
    // cria relacionando só pelo id (sem SELECT extra)
    const like = postLikeRepo.create({
      post: { id: postId } as Post,
      ip,
      userAgent,
    });

    try {
      return await postLikeRepo.save(like);
    } catch (e: any) {
      // 23505 = unique_violation (já curtiu)
      if (e?.code === "23505") throw new AlreadyLikedError("Você já curtiu esse post");
      // 23503 = foreign_key_violation (post inexistente)
      if (e?.code === "23503") throw new NotFoundError("Post não encontrado");
      throw e;
    }
  }

  static async count(postId: number) {
    // Se preferir 404 quando o post não existir:
    const postExists = await AppDataSource.getRepository(Post).exist({ where: { id: postId } });
    if (!postExists) throw new NotFoundError("Post não encontrado");

    return await postLikeRepo.count({ where: { post: { id: postId } } });
  }
}

