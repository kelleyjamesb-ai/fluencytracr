import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const createTestStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
    },
    getItem: (key: string) => values.get(String(key)) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(String(key));
    },
    setItem: (key: string, value: string) => {
      values.set(String(key), String(value));
    }
  };
};

const localStorageStub = createTestStorage();

Object.defineProperty(window, "localStorage", {
  value: localStorageStub,
  configurable: true
});

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageStub,
  configurable: true
});

afterEach(() => {
  cleanup();
  localStorageStub.clear();
});
