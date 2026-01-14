import { enforceAggregation, rbacMiddleware } from "../src/rbac";
import { Request, Response } from "express";

const createMockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const makeRequest = (role: string, aggregation?: string) => {
  return {
    header: () => role,
    query: aggregation ? { aggregation } : {},
    role
  } as unknown as Request;
};

it("blocks disallowed roles with 403", () => {
  const middleware = rbacMiddleware(["ADMIN"]);
  const request = makeRequest("EXEC_VIEWER");
  const mockResponse = createMockResponse();
  const next = jest.fn();
  middleware(request as any, mockResponse, next);
  expect(next).not.toHaveBeenCalled();
  expect(mockResponse.status).toHaveBeenCalledWith(403);
  expect(mockResponse.json).toHaveBeenCalledWith(
    expect.objectContaining({ error: "Forbidden" })
  );
});

it("blocks EXEC_VIEWER team aggregation with 403", () => {
  const request = makeRequest("EXEC_VIEWER", "team");
  const mockResponse = createMockResponse();
  const next = jest.fn();
  enforceAggregation(request as any, mockResponse, next);
  expect(next).not.toHaveBeenCalled();
  expect(mockResponse.status).toHaveBeenCalledWith(403);
  expect(mockResponse.json).toHaveBeenCalledWith(
    expect.objectContaining({ error: "Forbidden" })
  );
});
