import { User } from "../models/User";

export type UserSummaryDto = {
  id: number;
  name: string;
};

export type UserAccountDto = {
  id: number;
  name: string;
  email: string;
  role: User["role"];
  cpf: string | null;
  dataNascimento: Date | null;
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

export function toUserAccountDto(
  user: Pick<
    User,
    "id" | "name" | "email" | "role" | "cpf" | "dataNascimento"
  >
): UserAccountDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    cpf: user.cpf ?? null,
    dataNascimento: user.dataNascimento ?? null,
  };
}
