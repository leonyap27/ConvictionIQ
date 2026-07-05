---
ticket: CIQ-5
title: Set Up Local Development Baseline
audience: Business
tag: b
bucket: Frontend
sprint: v0.1.0
tracker: CIQ-12
date: 2026-07-05
---

**Size: M**

## What changed

The ConvictionIQ prototype can now be picked up and run by any developer on a fresh laptop without prior knowledge of the project's tooling. A setup guide was written (README), a reference file listing all optional credentials was created (`.env.example`), and a confusing error message shown during startup was corrected to give actionable guidance instead of a Lovable-platform instruction that had no meaning outside Lovable's own hosted environment.

---

## What operators and developers can do now

| Capability | Status before CIQ-5 | Status after CIQ-5 |
|---|---|---|
| Follow documented steps from checkout to running app | Not possible — no README | `bun install` then `bun dev` — documented, two commands |
| Know which credentials are needed for which features | Not possible — no reference file | `.env.example` groups credentials by feature (cloud sync vs. AI Q&A) |
| Understand that the app works without any API keys | Unclear — error messages referenced Lovable Cloud | Explicit — README offline feature matrix and corrected error message confirm it |
| Know the minimum Bun version required | Not stated anywhere | Bun ≥ 1.1.0, stated in README and enforced in `package.json` |

---

## What users see

No change to the running application. This ticket made changes to developer setup only — no screen, workflow, or data behavior was altered. Users who already had the app running are unaffected.

---

## Caveats

Full runtime verification (cloning the repo and running `bun install` + `bun dev` on a clean machine) was not completed in this sprint — it requires a developer with Bun installed to run the commands manually. The static checks (reading the README, checking the scripts, verifying the credential list) all passed.
