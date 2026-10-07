import { User } from "../models/User";

export type UserSummaryDto = {
  id: number;
  name: string;
};

export function toUserSummary(
  user: Pick<User, "id" | "name"> | null | undefined
): UserSummaryDto | null {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
  };
}
