module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setup_env.ts"],
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.json"
    }
  },
  moduleNameMapper: {
    "^@learnaire/shared$": "<rootDir>/../shared/src",
    "^@learnaire/shared/(.*)$": "<rootDir>/../shared/src/$1"
  }
};
