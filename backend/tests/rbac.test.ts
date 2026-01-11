import { enforceAggregation, rbacMiddleware } from "../src/rbac";
import { Request, Response } from "express";

const mockResponse = {} as Response;

const makeRequest = (role: string, aggregation?: string) => {
  return {
    header: () => role,
    query: aggregation ? { aggregation } : {}
  } as unknown as Request;
};

it("blocks disallowed roles", () => {
  const middleware = rbacMiddleware(["admin"]);
  const request = makeRequest("exec");
  const next = jest.fn();
  middleware(request as any, mockResponse, next);
  expect(next).toHaveBeenCalled();
  const err = next.mock.calls[0][0];
  expect(err).toBeInstanceOf(Error);
});

it("blocks exec team aggregation", () => {
  const request = makeRequest("exec", "team");
  const next = jest.fn();
  enforceAggregation(request as any, mockResponse, next);
  const err = next.mock.calls[0][0];
  expect(err).toBeInstanceOf(Error);
});
