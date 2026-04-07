# GrubDash — Parafin Internal Demo Tool

An internal testing and exploration tool for Parafin products. Wraps the Parafin Capital widget in a mock food delivery platform UI (GrubDash) to simulate a realistic partner integration.

## Prerequisites

- [Node.js](https://nodejs.org/en/)
- Parafin API credentials (sandbox or prod)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/James9446/parafin-flex-loan-demo.git
cd parafin-flex-loan-demo
npm install
```

### 2. Configure environment variables

Copy `sample.env` to `.env` and fill in your credentials:

```bash
cp sample.env .env
```

Each credential set gets its own uniquely named pair of variables. Add as many as you need — one per account/environment you want to test:

```bash
# .env

# Prod
PROD_CLIENT_ID="your-client-id"
PROD_CLIENT_SECRET="your-client-secret"

# Sandbox
SANDBOX_CLIENT_ID="your-sandbox-client-id"
SANDBOX_CLIENT_SECRET="your-sandbox-client-secret"
```

The variable names can be anything — they just need to match what you put in `credentials.json` (see below).

### 3. Configure credential profiles

Copy `sample.credentials.json` to `credentials.json`:

```bash
cp sample.credentials.json credentials.json
```

`credentials.json` is a lookup table that maps named profiles to the env vars defined in `.env`. This file is gitignored and never committed.

```json
{
  "profiles": [
    {
      "name": "My Account - Sandbox",
      "clientIdVar": "SANDBOX_CLIENT_ID",
      "clientSecretVar": "SANDBOX_CLIENT_SECRET",
      "env": "prod"
    },
    {
      "name": "My Account - Prod",
      "clientIdVar": "PROD_CLIENT_ID",
      "clientSecretVar": "PROD_CLIENT_SECRET",
      "env": "prod"
    }
  ]
}
```

**Profile fields:**

| Field | Description |
|---|---|
| `name` | Display name shown in the Admin page dropdown |
| `clientIdVar` | Name of the env var holding the client ID |
| `clientSecretVar` | Name of the env var holding the client secret |
| `env` | `"prod"` or `"dev"` — controls which Parafin API endpoint is used |

**Adding a new partner or account** — add their credentials to `.env` with unique variable names, then add a new profile entry to `credentials.json`. No code changes required.

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### Admin page

The app opens on the Admin page. Use it to:

- **Select a credential profile** — picks which account's credentials to use for all API calls
- **Toggle Dev / Prod** — switches between the Parafin dev API (`api.dev.parafin.com`) and prod API (`api.parafin.com`). Only profiles with a matching `env` field are shown in the dropdown.
- **Browse businesses and persons** — paginated tables with configurable page size (10 / 25 / 50 / 100)
- **Search** — use the scope toggle (Businesses / Persons) to pick what to search, then type a name, ID, or external ID. Entering a `business_` or `person_` prefixed ID performs a direct lookup; all other input filters the current page.
- **Select** — click Select on any row to load that person in the Capital widget

### Capital page

Displays the Parafin Capital widget for the selected person using the active credential profile. If no person has been selected yet, a prompt will direct you to the Admin page.

---

## Environment notes

**Prod vs Sandbox** — both use `api.parafin.com`. Sandbox is a subset of prod with additional test-only endpoints for simulating outcomes (e.g. funding a capital product). Switching between prod and sandbox means switching credential profiles, not API endpoints.

**Dev** — uses `api.dev.parafin.com`. Set a profile's `env` field to `"dev"` to route it through the dev API.

---

## Documentation

- [Parafin Widget Reference](https://docs.parafin.com/present-offers/embedded)
- [Parafin API Documentation](https://docs.parafin.com/)
