module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
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
