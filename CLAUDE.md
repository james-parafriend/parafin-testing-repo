# CLAUDE.md — Parafin Flex Loan Demo

## Project Purpose

This is an **internal Parafin testing and exploration tool**. It is not customer-facing and is not intended for production use. The goal is to explore, understand, and test Parafin products and features using a realistic-looking demo UI (a mock food delivery platform called "GrubDash").

Code quality standards, security hardening, and polish appropriate for production apps are **not** the priority here. Speed of iteration and clarity for testing are.

---

## IMPORTANT: Working Style

**Always suggest changes and get explicit confirmation before implementing or modifying anything.**

Present options and tradeoffs first, then wait for approval before touching any files. This applies to new features, refactors, bug fixes, and anything else.

---

## Environment Variables

The following `.env` vars are required to run the project:

| Variable | Description |
|---|---|
| `PARAFIN_CLIENT_ID` | Parafin API client ID |
| `PARAFIN_CLIENT_SECRET` | Parafin API client secret |
| `PORT` | Server port (defaults to 8080) |

Never commit `.env` to version control.

---

## Test Personas

The `RESTAURANTS` array in `src/App.js` contains pre-configured Parafin sandbox `person_id` values. These map to specific accounts in the Parafin sandbox environment. Update them as needed when testing different scenarios or environments.

---

## Parafin API Environment

The server (`server/server.js`) supports both production and dev Parafin API endpoints. The frontend currently hardcodes `isDev=false`, targeting the production API. To test against the dev environment, change the fetch call in `src/App.js`:

```js
// Dev environment
`/parafin/token/${currentPersonId}/true`

// Production (current default)
`/parafin/token/${currentPersonId}/false`
```

---

## Widget Product

The `ParafinWidget` in `src/App.js` is currently configured with `product="capital"`. Other Parafin products can be tested by changing this prop.

---

## No Tests Expected

This is exploratory/demo code. Unit tests and integration tests are not expected and should not be added unless specifically requested.
