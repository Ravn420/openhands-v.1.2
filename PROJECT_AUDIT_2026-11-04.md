# OpenHands Agent Canvas Project-Wide Audit

**Date:** 2026-11-04  
**Repository:** `OpenHands-1.27.1`  
**Scope:** TypeScript compilation, linting, formatting, unit/integration tests, production build, provider/Azure/Venice paths, and repository boundaries.

## Executive summary

The production application builds successfully and the TypeScript compiler passes. The focused Azure/provider regression tests also pass. The full test suite is not green: 8,962 tests pass, 110 fail, 55 are skipped, and 7 are marked todo across 836 test files. ESLint reports 15 errors and 746 warnings. The most directly actionable lint error is an unused `DEFAULT_COOLDOWN_MS` constant in the Venice rate-limit utility; the remaining ESLint errors were not fully recoverable from the truncated process output and should be triaged separately.

The repository is a frontend Agent Canvas checkout. Backend endpoint and wire-contract implementation belongs in `OpenHands/software-agent-sdk`, not this repository. The frontend contract now accepts optional `available_models` on provider connections and filters Azure model choices when that field is supplied.

## Verification results

| Check | Result | Details |
|---|---:|---|
| `npm run typecheck` | PASS | React Router type generation and `tsc` completed successfully. |
| `npm run build` | PASS | Production client/server build completed in about 1m16s. |
| Focused provider/Azure tests | PASS | 2 files, 28 tests passed. |
| `npm test -- --run` | FAIL | 836 files: 8,962 passed, 110 failed, 55 skipped, 7 todo. |
| `npm run lint` | FAIL | 15 errors and 746 warnings. |
| Prettier on touched files | PASS | Touched Azure/Venice files were formatted. |

## Confirmed changes and fixes

- Added optional `available_models?: string[]` to the provider connection frontend contract.
- Added connection-scoped filtering to the add-models modal. It accepts both bare deployment names such as `gpt-4o` and provider-prefixed names such as `azure/gpt-4o`.
- Added an Azure regression test proving unavailable deployments are hidden.
- Restored the truncated Venice account manager JSX component.
- Fixed Venice rotation nullability errors in `llm-rate-limit-handler.ts`.
- The full TypeScript check now passes.

## Full test-suite failure categories

The captured failures include the following categories:

1. **Generated/import inventory mismatch:** `.agents/skills/verify-openhands/scripts/control-openhands.test.mjs` reports many source modules missing from its expected import inventory.
2. **Windows portability:** `tmuxPathFor` tests expect POSIX `/tmp/...` paths but receive Windows `\\tmp\\...` paths.
3. **Process/runtime assumptions:** control-openhands restart tests fail with `Cannot read properties of undefined (reading 'split')` and return the wrong exit code.
4. **Git fixture parsing:** control-openhands map tests receive an undefined range/base source.
5. **Async fixture timing:** conversation-panel tests observe loading skeletons instead of conversation cards.
6. **Timeout sensitivity:** a conversation-confirmation shortcut test exceeds the 30-second test timeout.

These failures are not evidence that the Azure model filtering regression failed; the focused Azure/provider suite passed independently.

## Lint findings

ESLint reports **15 errors** and **746 warnings**. The audit output explicitly identifies this error:

```text
src/utils/llm-rate-limit-handler.ts(22,7): error
'DEFAULT_COOLDOWN_MS' is assigned a value but never used.
```

The file currently uses `ACCOUNT_COOLDOWN_MS` as the fallback account cooldown and uses provider-level exponential backoff when no `Retry-After` value is present. `DEFAULT_COOLDOWN_MS` is dead code and should either be removed or wired into the intended fallback behavior with a regression test. The warnings are predominantly existing design-system lint warnings for raw Tailwind colors, arbitrary values, and inline styles.

## Build warnings

The production build succeeds but emits non-blocking warnings:

- `node:http` and `node:https` are externalized for browser compatibility by Vite through the TypeScript client dependency.
- Several dynamic imports are ineffective because the same modules are also statically imported.
- React Router v8 future-flag warnings are present.
- Vite reports significant plugin time, primarily from `vite-plugin-svgr`.

## Repository boundary

This checkout contains the Agent Canvas frontend and local orchestration. Repository instructions state that backend behavior, endpoints, and wire contracts belong to `OpenHands/software-agent-sdk`. Therefore, the actual Azure deployment discovery implementation—using the Azure resource endpoint and API key, then returning verified deployment names in `available_models`—must be implemented in the Agent Server repository and deployed alongside a compatible server version.

Expected response shape:

```json
{
  "id": "azure-connection",
  "provider": "azure",
  "api_key_set": true,
  "available_models": ["gpt-4o", "gpt-4o-mini"]
}
```

## Recommended next actions

1. Remove or properly use `DEFAULT_COOLDOWN_MS`, then rerun ESLint.
2. Extract the complete 15-error ESLint list from a fresh run with a file-based formatter to avoid terminal truncation.
3. Fix the 34 failing test files by separating Windows-compatible tests from POSIX-only control-openhands tests and stabilizing async conversation fixtures.
4. Add the Azure deployment discovery endpoint and provider-connection serialization in `OpenHands/software-agent-sdk`.
5. Add an end-to-end contract test spanning Agent Server response → Canvas provider connection hook → add-models filtering.
6. Consider addressing the non-blocking Vite dynamic-import and Node-module warnings during a separate build-performance cleanup.
