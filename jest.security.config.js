const baseConfig = require("./jest.config");

module.exports = {
  ...baseConfig,
  globalSetup: undefined,
  globalTeardown: undefined,
  testMatch: ["**/__tests__/GateP0Security.test.ts"],
};
