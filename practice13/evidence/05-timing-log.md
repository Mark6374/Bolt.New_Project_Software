# Timing log (2026-11-26, local time UTC+5), measured from command/screenshot timestamps

## Code-based track (Bolt.new + local repo)
| Phase | From | To | Minutes |
|---|---|---|---|
| Setup (copy project, npm ci, baseline checks, Bolt baseline run) | 14:45 | 14:47 (+ Bolt 15:05-15:06) | 3 |
| Implementation (contract.ts, fixture, tests, App.tsx) | 14:47 | 14:50 | 3 (AI-generated locally) + 4 transfer to Bolt (15:09-15:13 incl.) |
| Debugging (Bolt broke JSX twice while applying the diff, fixed itself) | 15:10 | 15:13 | 3 |
| Testing (local 63 tests + T1-T8 on live site + narrow screen) | 15:17 | 15:21 | 4 |
| Publish | 15:15 | 15:16 | 1 |

## Low-code track (Appsmith Cloud, free plan)
| Phase | From | To | Minutes |
|---|---|---|---|
| Setup (account login by student, skip datasource, new app) | 15:22 | 15:23 | 1 (+ sign-up time by student, not measured) |
| Implementation (JS object RoomRules, 3 inputs, switch, button, text, table) | 15:23 | 15:28 | 5 |
| Testing v1 (T1-T8 + HTML probe + 390 px) | 15:28 | 15:30 | 2 |
| Debugging / repair (LD1 label, LD3 persisted store -> persist=false + new keys, redeploy x2) | 15:30 | 15:34 | 4 |
| Retest v2 (T1-T8 + reload check) | 15:34 | 15:35 | 1 |
| Export JSON + make public | 15:35 | 15:37 | 2 |

Note: the rule logic was already known from earlier practices, and the code was generated with AI tools, so absolute times are lower than for building from scratch. Use them only for relative comparison.
