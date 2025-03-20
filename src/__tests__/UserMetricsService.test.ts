import { AppDataSource } from "../config/ormconfig";
import { UserMetricsService } from "../services/UserMetricsService";
import { User, UserRole } from "../models/User";
import { NivelAtividade } from "../models/enums/NivelAtividade";

beforeAll(async () => {
  await AppDataSource.initialize();
});

afterAll(async () => {
  await AppDataSource.destroy();
});

describe("UserMetricsService", () => {
  let user: User;

  beforeEach(async () => {
    await AppDataSource.query(`DELETE FROM user_metrics`);
    await AppDataSource.query(`DELETE FROM users`);

    const userRepository = AppDataSource.getRepository(User);

    user = userRepository.create({
      email: `test${Date.now()}@example.com`,
      name: "Test User",
      password: "password",
      role: UserRole.USER,
    });

    await userRepository.save(user);
  });

  it("Deve criar métricas do usuário com sucesso", async () => {
    const metrics = await UserMetricsService.createUserMetrics(
      user.id,
      70,
      1.75,
      25,
      "M",
      NivelAtividade.MODERADAMENTE_ATIVO
    );

    expect(metrics).toHaveProperty("id");
    expect(metrics.peso).toBe(70);
    expect(metrics.altura).toBe(1.75);
  });

  it("Deve manter o histórico e não substituir registros anteriores", async () => {
    await UserMetricsService.createUserMetrics(
      user.id,
      70,
      1.75,
      25,
      "M",
      NivelAtividade.MODERADAMENTE_ATIVO
    );

    await UserMetricsService.createUserMetrics(
      user.id,
      72, // Alteração no peso
      1.75,
      25,
      "M",
      NivelAtividade.MODERADAMENTE_ATIVO
    );

    const metrics = await UserMetricsService.getUserMetrics(user.id);
    expect(metrics.length).toBe(2); // Deve ter dois registros
    expect(Number(metrics[0].peso)).toBe(72);
    expect(Number(metrics[1].peso)).toBe(70);
  });

  it("Deve calcular corretamente o IMC", async () => {
    const metrics = await UserMetricsService.createUserMetrics(
      user.id,
      70,
      1.75,
      25,
      "M",
      NivelAtividade.MODERADAMENTE_ATIVO
    );

    const imc = UserMetricsService.calculateIMC(metrics.peso, metrics.altura);
    expect(imc).toBeCloseTo(22.86, 2); // IMC esperado ≈ 22.86
  });

  it("Deve calcular corretamente o TDEE", async () => {
    const tdee = UserMetricsService.calculateTDEE(70, 175, 25, "M", NivelAtividade.MODERADAMENTE_ATIVO);
    expect(tdee).toBeGreaterThan(2000); // TDEE esperado para esse perfil é entre 2500-2700 kcal
  });
});
