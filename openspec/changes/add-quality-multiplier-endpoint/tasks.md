## 1. Implementation
- [x] Add derive-on-read Quality Multiplier service.
- [x] Add `GET /api/v1/quality-multiplier`.
- [x] Keep multiplier null whenever the verdict is `SUPPRESS`.
- [x] Leave authentication as a clearly marked TODO.

## 2. Contracts and Docs
- [x] Add OpenAPI entry.
- [x] Add one-page value-realization integration doc.

## 3. Verification
- [x] Add integration tests for green path, five suppression reasons, malformed input, and multiplier bounds.
- [x] Run focused backend tests.
- [x] Run relevant build/seed checks.
