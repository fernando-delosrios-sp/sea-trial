## 1. Fix Out of Scope canvas update

- [x] 1.1 Update `buildUpdatedCanvas` Out of Scope branch to replace existing `## Out of Scope` header when present
- [x] 1.2 Add regression test: second session with out-of-scope items produces single `## Out of Scope` header

## 2. Verification

- [x] 2.1 Run `npm test` in agent-service and confirm all tests pass

## 3. Documentation

- [x] 3.1 No README update required (internal canvas merge fix, no user-visible API change)

## 4. Changelog

- [x] 4.1 Add changelog entry for Out of Scope canvas duplication fix
