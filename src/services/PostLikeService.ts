import { AppDataSource } from "../config/ormconfig";
import { PostLike } from "../models/PostLike";
import { Post } from "../models/Post";

const postLikeRepo = AppDataSource.getRepository(PostLike);

export class PostLikeService {
  static async like(postId: number, ip: string, userAgent: string) {
    const post = await AppDataSource.getRepository(Post).findOneBy({ id: postId });
    if (!post) throw new Error("Post não encontrado");

    const existing = await postLikeRepo.findOne({
      where: { post: { id: postId }, ip, userAgent },
    });
    if (existing) throw new Error("Você já curtiu esse post");

    const like = postLikeRepo.create({ post, ip, userAgent });
    return await postLikeRepo.save(like);
  }

  static async count(postId: number) {
    return await postLikeRepo.count({ where: { post: { id: postId } } });
  }
}
