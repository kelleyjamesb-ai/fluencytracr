import { enforceAggregation, rbacMiddleware } from "../src/rbac";
import { Request, Response } from "express";

const mockResponse = {} as Response;

const makeRequest = (role: string, aggregation?: string) => {
  return {
    header: () => role,
    query: aggregation ? { aggregation } : {},
    role
  } as unknown as Request;
};

it("blocks disallowed roles", () => {
  const middleware = rbacMiddleware(["ADMIN"]);
  const request = makeRequest("EXEC_VIEWER");
  const next = jest.fn();
  middleware(request as any, mockResponse, next);
  expect(next).toHaveBeenCalled();
  const err = next.mock.calls[0][0];
  expect(err).toBeInstanceOf(Error);
});

it("blocks EXEC_VIEWER team aggregation", () => {
  const request = makeRequest("EXEC_VIEWER", "team");
  const next = jest.fn();
  enforceAggregation(request as any, mockResponse, next);
  const err = next.mock.calls[0][0];
  expect(err).toBeInstanceOf(Error);
});
