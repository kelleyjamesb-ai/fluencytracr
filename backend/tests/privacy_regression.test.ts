import { containsForbiddenFields } from "@learnaire/shared";
import { enforceAggregation } from "../src/rbac";
import { enforceScopeWhitelist, hasDisallowedScopes } from "../src/query_scope";

const mockResponse = {} as any;

it("rejects forbidden prompt/output content in payloads", () => {
  const payload = {
    metadata: {
      prompt_content: "secret",
      output_content: "secret"
    }
  };
  expect(containsForbiddenFields(payload)).toBe(true);
});

it("blocks employee-level aggregation", () => {
  const request = {
    query: { aggregation: "employee" },
    header: () => "exec"
  } as any;
  const next = jest.fn();
  enforceAggregation(request, mockResponse, next);
  const err = next.mock.calls[0][0];
  expect(err).toBeInstanceOf(Error);
});

it("rejects disallowed scopes", () => {
  expect(hasDisallowedScopes({ scope: "employee" })).toBe(true);
  expect(() => enforceScopeWhitelist("employee")).toThrow();
});
