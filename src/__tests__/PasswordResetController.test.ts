import { Request, Response } from "express";
import { PasswordResetController } from "../controllers/PasswordResetController";
import { PasswordResetService } from "../services/PasswordResetService";

function createResponse() {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

describe("PasswordResetController", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("encaminha ao serviço somente o token enviado no body", async () => {
    const resetSpy = jest
      .spyOn(PasswordResetService, "resetPassword")
      .mockResolvedValue(undefined);
    const request = {
      body: {
        token: "body-token",
        newPassword: "NovaSenha123",
        confirmPassword: "NovaSenha123",
      },
      query: { token: "query-token" },
    } as unknown as Request;
    const response = createResponse();

    await PasswordResetController.resetPassword(request, response);

    expect(resetSpy).toHaveBeenCalledWith("body-token", "NovaSenha123");
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it("ignora token presente apenas na query string", async () => {
    const resetSpy = jest
      .spyOn(PasswordResetService, "resetPassword")
      .mockResolvedValue(undefined);
    const request = {
      body: {
        newPassword: "NovaSenha123",
        confirmPassword: "NovaSenha123",
      },
      query: { token: "query-token" },
    } as unknown as Request;
    const response = createResponse();

    await PasswordResetController.resetPassword(request, response);

    expect(resetSpy).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(400);
  });
});
