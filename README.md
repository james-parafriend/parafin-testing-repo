# GrubDash + Parafin Capital Integration Demo

A demo application showcasing Parafin's embedded capital widget integration for a food delivery platform (GrubDash). This project demonstrates four distinct widget states for flex loans.

## Widget States Demonstrated

1. **No offers available** - Business exists but no offer generated
2. **Pre-approved offer** - Business has a pre-approved capital offer
3. **Capital on its way** - Offer accepted, funds being transferred
4. **Outstanding balance** - Active loan with repayment progress

## Prerequisites

- [Node.js](https://nodejs.org/en/)
- Parafin sandbox API credentials

## Setup

### 1. Clone and install
```bash
git clone https://github.com/James9446/parafin-flex-loan-demo.git
cd parafin-flex-loan-demo
npm install
```

### 2. Configure API keys

Rename `sample.env` to `.env` and add your Parafin sandbox credentials:
```bash
mv sample.env .env
```
```bash
# .env
PARAFIN_CLIENT_ID=""
PARAFIN_CLIENT_SECRET=""
```

### 3. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Usage

The app includes four pre-configured test restaurants, each demonstrating a different widget state. Use the dropdown in the header to switch between them.

To test with a custom Person ID:
1. Click "Sign Out"
2. Enter a valid Person ID
3. Hit "enter" or click "Load" to fetch the widget state


## API Endpoints Used

- `POST /v1/businesses` - Create a business
- `POST /v1/persons` - Create a person
- `POST /v1/bank_accounts` - Create a bank account
- `POST /v1/sandbox/capital_product_offers` - Generate test offer
- `POST /v1/sandbox/fund_capital_product` - Fund a capital product
- `POST /v1/auth/redeem_token` - Get widget bearer token

## Documentation

- [Parafin Widget Reference](https://docs.parafin.com/capital/present-offers/embedded/reference)
- [Parafin API Documentation](https://docs.parafin.com/)