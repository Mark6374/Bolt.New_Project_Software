# Practice #13 - Compare code-based and low-code solutions

Student: Mark Yeriskin, 24B031748

- Report: [Practice_13_Report.docx](Practice_13_Report.docx)
- Code-based solution: the project in the repository root (`src/contract/` is new in this practice), live demo https://smart-campus-room-av-l91t.bolt.host
- Low-code solution (Appsmith Cloud, free plan): https://app.appsmith.com/app/smart-campus-room-availability-low-code/page1-6b08086c117389f3dc84e2e1
  - `lowcode_appsmith/Smart_Campus_Room_Availability_LowCode.appsmith.json` - Appsmith export (import via Appsmith > Import)
  - `lowcode_appsmith/RoomRules.js` - the JS Object used by the low-code app
- `screenshots/` - screenshots of both implementations and all test cases T1-T8
- `evidence/` - command outputs (baseline, checks, npm audit, headers, timing log, probes)

Run the code-based checks: `npm ci && npm test && npm run typecheck && npm run lint && npm run build`
