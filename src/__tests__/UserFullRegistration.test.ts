import { AppDataSource } from "../config/ormconfig";
import { User } from "../models/User";
import { UserRole } from "../models/User";
import { UserPhoneService } from "../services/UserPhoneService";
import { UserEmailService } from "../services/UserEmailService";
import { UserAddressService } from "../services/UserAddressService";

beforeAll(async () => {
    await AppDataSource.initialize();
});

afterAll(async () => {
    await AppDataSource.destroy();
});

describe("Cadastro completo do usuário", () => {
    let user: User;

    beforeEach(async () => {
        await AppDataSource.query(`TRUNCATE TABLE user_emails, user_phones, user_addresses, users RESTART IDENTITY CASCADE`);

        const userRepository = AppDataSource.getRepository(User);

        user = userRepository.create({
            email: `teste${Date.now()}@blog.com`,
            name: "Usuário Completo",
            password: "senha123",
            role: UserRole.USER,
        });

        await userRepository.save(user);
    });

    it("Deve cadastrar telefone, e-mail e endereço com sucesso", async () => {
        const phone = await UserPhoneService.addPhone(user.id, "48999990000");
        const email = await UserEmailService.addEmail(user.id, "secundario@blog.com");
        const address = await UserAddressService.addAddress(user.id, {
            street: "Rua das Flores",
            city: "Florianópolis",
            state: "SC",
            postalCode: "88000-000",
            country: "Brasil",
        });

        expect(phone).toHaveProperty("id");
        expect(phone.number).toBe("48999990000");

        expect(email).toHaveProperty("id");
        expect(email.email).toBe("secundario@blog.com");

        expect(address).toHaveProperty("id");
        expect(address.city).toBe("Florianópolis");
    });
});
