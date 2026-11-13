const nextJest = require("next/jest");

// Unit tests use deterministic mock origins, independent of .env.local.
process.env.HSK_API_URL = "http://localhost:3001/api/v1";
process.env.HSK_ADMIN_URL = "http://localhost:3000/";
process.env.NEXT_PUBLIC_HSK_MEDIA_ORIGIN = "http://localhost:3001/";

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
    "src/lib/**/*.ts",
    "!src/lib/**/__tests__/**",
    "!src/lib/api/generated/**",
    "!src/lib/api/types.ts",
    "src/hooks/*.ts",
    "src/components/learning/attempt/attempt-store.ts",
    "src/app/api/hsk/**/route.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 50,
      branches: 50,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
