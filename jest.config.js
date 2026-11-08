const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  collectCoverageFrom: [
    "src/lib/api/client.ts",
    "src/lib/api/config.ts",
    "src/lib/api/session.ts",
    "src/app/api/hsk/**/route.ts",
    "src/lib/validations/auth.ts",
    "src/lib/validations/profile.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 50,
      branches: 50,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
