import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { sha256Json, selfHash, stableStringify } from "../dist/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "golden");

// Vectors generated with the verbatim scripts/ spine algorithm; any change to
// stableStringify/sha256Json that alters these breaks the entire hash chain.
const VECTORS = [
  { name: "empty_object", value: {}, hash: "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a" },
  {
    name: "nested_sorted",
    value: { b: [1, 2, { z: null, a: "x" }], a: { c: true } },
    hash: "c06ffe864132ffca9a709c67059c4cd8602bb8d11995c708b6d647fe85774b63"
  },
  {
    name: "numbers",
    value: { f: 0.1, neg: -0, big: 1e21, small: 5e-324, i: 10 },
    hash: "44896721dc9abeaefb43f55487b6431d5cfc6683969d4c089cec1b3f9baa8d22"
  },
  {
    name: "unicode_keys",
    value: { "klюч": "value", "键": ["值", ""] },
    hash: "46fffc3a6feee19b11d9d2d349992b64e38c9fd1f3d2863704e9d9268df5c417"
  },
  {
    name: "milestones",
    value: { required_milestone_days: [0, 30, 60, 90, 180, 365] },
    hash: "095ab92c1224ebb6a53b13f069f08ca2db192b3c9d484f6dc66f1f4897f61338"
  }
];

test("stableStringify sorts keys and is order-insensitive", () => {
  assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }));
  assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]));
});

test("sha256Json matches the scripts/ spine algorithm test vectors", () => {
  for (const vector of VECTORS) {
    assert.equal(sha256Json(vector.value), vector.hash, vector.name);
  }
});

test("selfHash recomputes every golden spine artifact's own hash field", () => {
  const files = readdirSync(goldenDir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length >= 15, `expected the full golden chain, found ${files.length}`);
  for (const file of files) {
    const artifact = JSON.parse(readFileSync(join(goldenDir, file), "utf8"));
    const hashFields = Object.keys(artifact).filter(
      (key) => key.endsWith("_hash") && typeof artifact[key] === "string"
    );
    const selfHashed = hashFields.some(
      (field) => selfHash(artifact, field) === artifact[field]
    );
    // Envelope/input files carry no top-level self-hash; artifacts must.
    if (hashFields.length > 0) {
      assert.ok(selfHashed, `${file}: no *_hash field matches selfHash recomputation`);
    }
  }
});
