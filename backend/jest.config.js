module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json", diagnostics: false }]
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  maxWorkers: 2,
  testTimeout: 30000,
  setupFilesAfterEnv: ["<rootDir>/tests/jest.setup.ts"],
  detectOpenHandles: true,
  forceExit: false,
  moduleNameMapper: {
    "^@fluencytracr/shared$": "<rootDir>/../shared/src",
    "^@fluencytracr/shared/(.*)$": "<rootDir>/../shared/src/$1"
  }
};
