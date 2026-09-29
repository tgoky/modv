# modv

A test-experiment forex and crypto broker app: a landing page with live prices, account signup and login, and a dashboard.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in SESSION_SECRET (openssl rand -base64 32)
pnpm dev
```

## Where the prices come from

- **Crypto** streams into the browser from Coinbase's public WebSocket (no key). The dashboard chart loads 5-minute candles through `/api/history` and extends them live.
- **Currencies** are polled from `/api/fx`, which caches the provider server-side. With `TWELVE_DATA_API_KEY` set it uses Twelve Data real-time quotes (free plan: 800 requests a day, so responses are cached for 90 seconds). Without a key, or if the provider errors, it falls back to the ECB's daily reference rates via Frankfurter, and the board labels them as daily rates.

## Accounts

Passwords are hashed with scrypt and sessions are HMAC-signed cookies; there are no extra dependencies. Users are stored in a local JSON file (`.data/users.json`) so the app runs with zero setup. That is for development only: replace the functions in `src/lib/auth/users.ts` with your database before deploying. Balances are virtual.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
