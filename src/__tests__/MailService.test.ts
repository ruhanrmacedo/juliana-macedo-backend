import axios from "axios";
import { MailService } from "../services/MailService";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("MailService", () => {
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalEmailFrom = process.env.EMAIL_FROM;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Vida & Sabor <nao-responda@julianalcmacedo.com.br>";
    mockedAxios.post.mockResolvedValue({ data: { id: "email-id" } });
  });

  afterAll(() => {
    process.env.RESEND_API_KEY = originalApiKey;
    process.env.EMAIL_FROM = originalEmailFrom;
  });

  it("envia o link de redefinição pela API HTTPS do Resend", async () => {
    const resetUrl = "https://julianalcmacedo.com.br/reset-password#token=token-secreto";
    await MailService.sendPasswordResetEmail({ to: "usuario@example.com", resetUrl, expiresInMinutes: 30 });
    expect(mockedAxios.post).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ from: "Vida & Sabor <nao-responda@julianalcmacedo.com.br>", to: ["usuario@example.com"], subject: "Redefinição de senha - Vida & Sabor", text: expect.stringContaining(resetUrl), html: expect.stringContaining("Redefinir minha senha") }), expect.objectContaining({ headers: { Authorization: "Bearer re_test_key", "Content-Type": "application/json" }, timeout: 10_000 }));
  });

  it("falha sem chamar a API quando a configuração está ausente", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(MailService.sendPasswordResetEmail({ to: "usuario@example.com", resetUrl: "https://example.com/reset-password#token=abc", expiresInMinutes: 30 })).rejects.toThrow("Resend email provider is not configured");
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
