/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js"],
  testMatch: [
    "**/__tests__/ProfessionalValidation.test.ts",
    "**/__tests__/ProfessionalSerializer.test.ts",
    "**/__tests__/ProfessionalMigration.test.ts",
    "**/__tests__/ProfessionalApiInputs.test.ts",
    "**/__tests__/ProfessionalApiService.test.ts",
    "**/__tests__/ProfessionalApiRoutes.test.ts",
    "**/__tests__/ProfessionalAccountProtection.test.ts",
    "**/__tests__/ProfessionalSeedSafety.test.ts"
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
