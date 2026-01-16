module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.ts"],
  moduleNameMapper: {
    "^@learnaire/shared$": "<rootDir>/../shared/src",
    "^@learnaire/shared/(.*)$": "<rootDir>/../shared/src/$1"
  }
};
