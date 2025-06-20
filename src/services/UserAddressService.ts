import { AppDataSource } from "../config/ormconfig";
import { UserAddress } from "../models/user-info/UserAddress";
import { User } from "../models/User";

const addressRepo = AppDataSource.getRepository(UserAddress);
const userRepo = AppDataSource.getRepository(User);

export class UserAddressService {
    static async addAddress(
        userId: number,
        data: { street: string; city: string; state: string; postalCode: string; country: string }
    ) {
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) throw new Error("Usuário não encontrado");

        const address = addressRepo.create({ ...data, user });
        return await addressRepo.save(address);
    }

    static async getAddresses(userId: number) {
        return await addressRepo.find({ where: { user: { id: userId } } });
    }

    static async deleteAddress(id: number, userId: number) {
        const address = await addressRepo.findOne({ where: { id, user: { id: userId } } });
        if (!address) throw new Error("Endereço não encontrado ou não pertence ao usuário");
        await addressRepo.remove(address);
        return { message: "Endereço removido com sucesso" };
    }

    static async updateAddress(
        id: number,
        userId: number,
        newData: {
          street?: string;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        }
      ) {
        const address = await addressRepo.findOne({
          where: { id, user: { id: userId } },
        });
      
        if (!address) {
          throw new Error("Endereço não encontrado ou não pertence ao usuário");
        }
      
        Object.assign(address, {
          ...newData,
        });
      
        return await addressRepo.save(address);
      }
}
