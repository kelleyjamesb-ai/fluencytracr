import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";


const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;


function emit(value, status = 0) {
  process.stdout.write(JSON.stringify(value));
  process.exitCode = status;
}


function invalidRequest() {
  emit({ error: "INVALID_REQUEST" }, 1);
}


function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}


function hasExactKeys(value, keys) {
  return (
    isRecord(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key))
  );
}


function decodeBase64(value) {
  if (typeof value !== "string" || !BASE64_PATTERN.test(value)) {
    throw new Error("invalid base64");
  }
  const decoded = Buffer.from(value, "base64");
  if (decoded.toString("base64") !== value) {
    throw new Error("noncanonical base64");
  }
  return decoded;
}


function keyId(anchorSpkiDer) {
  return `P256_SPKI_SHA256:${createHash("sha256").update(anchorSpkiDer).digest("hex")}`;
}


function signBatch(request) {
  if (
    !hasExactKeys(request, ["operation", "preimages_base64"])
    || request.operation !== "sign"
    || !Array.isArray(request.preimages_base64)
  ) {
    throw new Error("invalid sign request");
  }
  const preimages = request.preimages_base64.map(decodeBase64);
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const anchorSpkiDer = publicKey.export({ format: "der", type: "spki" });
  const signatures = preimages.map((preimage) =>
    sign("sha256", preimage, { dsaEncoding: "der", key: privateKey }),
  );

  emit({
    anchor_spki_der_base64: anchorSpkiDer.toString("base64"),
    key_id: keyId(anchorSpkiDer),
    operation: "sign",
    signature_der_base64: signatures.map((signature) => signature.toString("base64")),
  });
}


function verifyBatch(request) {
  if (
    !hasExactKeys(request, ["operation", "anchor_spki_der_base64", "vectors"])
    || request.operation !== "verify"
    || !Array.isArray(request.vectors)
  ) {
    throw new Error("invalid verify request");
  }
  const anchorSpkiDer = decodeBase64(request.anchor_spki_der_base64);
  const anchor = createPublicKey({
    format: "der",
    key: anchorSpkiDer,
    type: "spki",
  });
  if (
    anchor.asymmetricKeyType !== "ec"
    || anchor.asymmetricKeyDetails?.namedCurve !== "prime256v1"
  ) {
    throw new Error("invalid anchor");
  }
  const vectors = request.vectors.map((vector) => {
    if (!hasExactKeys(vector, ["preimage_base64", "signature_der_base64"])) {
      throw new Error("invalid verification vector");
    }
    return {
      preimage: decodeBase64(vector.preimage_base64),
      signature: decodeBase64(vector.signature_der_base64),
    };
  });

  emit({
    operation: "verify",
    valid: vectors.map(({ preimage, signature }) =>
      verify("sha256", preimage, { dsaEncoding: "der", key: anchor }, signature),
    ),
  });
}


const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  try {
    const request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!isRecord(request)) {
      throw new Error("invalid request");
    }
    if (request.operation === "sign") {
      signBatch(request);
      return;
    }
    if (request.operation === "verify") {
      verifyBatch(request);
      return;
    }
    throw new Error("invalid operation");
  } catch {
    invalidRequest();
  }
});
