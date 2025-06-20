import { AppDataSource } from "../config/ormconfig";
import { UserPhone } from "../models/user-info/UserPhone";
import { User } from "../models/User";

const phoneRepository = AppDataSource.getRepository(UserPhone);
const userRepository = AppDataSource.getRepository(User);

export class UserPhoneService {
  static async addPhone(userId: number, number: string) {
    const user = await userRepository.findOne({ where: { id: userId } });
    if (!user) throw new Error("Usuário não encontrado");

    const phone = phoneRepository.create({ number, user });
    return await phoneRepository.save(phone);
  }

  static async getPhones(userId: number) {
    return await phoneRepository.find({ where: { user: { id: userId } } });
  }

  static async deletePhone(id: number, userId: number) {
    const phone = await phoneRepository.findOne({ where: { id, user: { id: userId } } });
    if (!phone) throw new Error("Telefone não encontrado ou não pertence ao usuário");
    await phoneRepository.remove(phone);
    return { message: "Telefone removido com sucesso" };
  }

  static async updatePhone(id: number, userId: number, newNumber: string) {
    const phone = await phoneRepository.findOne({
      where: { id, user: { id: userId } },
    });
  
    if (!phone) {
      throw new Error("Telefone não encontrado ou não pertence ao usuário");
    }
  
    phone.number = newNumber.trim();
    return await phoneRepository.save(phone);
  }
}
