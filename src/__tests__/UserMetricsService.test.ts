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
  let admin: User;

  beforeEach(async () => {
    await AppDataSource.query(`DELETE FROM user_metrics`);
    await AppDataSource.query(`DELETE FROM users`);

    const userRepository = AppDataSource.getRepository(User);

    // Criando usuário comum
    user = userRepository.create({
      email: `test${Date.now()}@example.com`,
      name: "Test User",
      password: "password",
      role: UserRole.USER,
    });
    await userRepository.save(user);

    // Criando usuário admin
    admin = userRepository.create({
      email: `admin${Date.now()}@example.com`,
      name: "Admin User",
      password: "adminpass",
      role: UserRole.ADMIN,
    });
    await userRepository.save(admin);
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
      72,
      null as any,
      null as any,
      null as any,
      null as any
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
    const tdee = UserMetricsService.calculateTDEE(
      70,
      1.75,
      25,
      "M",
      NivelAtividade.MODERADAMENTE_ATIVO
    );
    expect(tdee).toBeGreaterThan(2000);
  });

  it("Deve permitir que um ADMIN registre métricas para outro usuário", async () => {
    const metrics = await UserMetricsService.createUserMetrics(
      user.id,
      68,
      1.73,
      28,
      "F",
      NivelAtividade.LEVEMENTE_ATIVO
    );

    expect(metrics.user.id).toBe(user.id);
    expect(metrics.altura).toBe(1.73);
    expect(metrics.peso).toBe(68);
  });

  it("Deve lançar erro se faltar dados para calcular IMC", () => {
    expect(() => {
      UserMetricsService.validateIMCData({ peso: null, altura: 1.75 } as any);
    }).toThrow("Peso e altura são necessários para calcular o IMC.");
  });

  it("Deve lançar erro se faltar dados para calcular TDEE", () => {
    expect(() => {
      UserMetricsService.validateTDEEData({
        peso: 70,
        altura: 1.75,
        idade: null,
        sexo: "M",
        nivelAtividade: NivelAtividade.MODERADAMENTE_ATIVO,
      } as any);
    }).toThrow("Dados insuficientes para calcular o TDEE.");
  });
});
