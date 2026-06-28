import { containsForbiddenFields } from "@fluencytracr/shared";
import { enforceAggregation } from "../src/rbac";
import { enforceScopeWhitelist, hasDisallowedScopes } from "../src/query_scope";
import { Response } from "express";

const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

it("rejects forbidden prompt/output content in payloads", () => {
  // Use actual forbidden field names from NON_COLLECTABLE_FIELDS
  const payload = {
    metadata: {
      prompt_content: "secret",
      output_content: "secret"
    }
  };
  expect(containsForbiddenFields(payload)).toBe(true);
});

it("blocks employee-level aggregation with 400", () => {
  const request = {
    query: { aggregation: "employee" },
    header: () => "exec"
  } as any;
  const mockResponse = createMockResponse();
  const next = jest.fn();
  enforceAggregation(request, mockResponse, next);
  expect(next).not.toHaveBeenCalled();
  expect(mockResponse.status).toHaveBeenCalledWith(400);
});

it("rejects disallowed scopes", () => {
  expect(hasDisallowedScopes({ scope: "employee" })).toBe(true);
  expect(() => enforceScopeWhitelist("employee")).toThrow();
});
