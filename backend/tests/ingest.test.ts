import { containsForbiddenFields } from "@learnaire/shared";
import { rejectForbiddenFields } from "../src/ingest";

const makeResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

it("detects forbidden fields deep in payload", () => {
  const payload = {
    metadata: {
      nested: [{ prompt_content: "secret" }]
    }
  };
  expect(containsForbiddenFields(payload)).toBe(true);
});

it("detects governance forbidden keys", () => {
  const payload = {
    metrics: {
      count: 3
    }
  };
  expect(containsForbiddenFields(payload)).toBe(true);
});

it("allows payloads without forbidden fields", () => {
  const payload = {
    metadata: {
      team_id: "team-1"
    }
  };
  expect(containsForbiddenFields(payload)).toBe(false);
});

it("rejects requests containing forbidden fields", () => {
  const req: any = { body: { details: { keystrokes: "nope" } } };
  const res = makeResponse();
  const next = jest.fn();
  rejectForbiddenFields(req, res as any, next);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(next).not.toHaveBeenCalled();
});
