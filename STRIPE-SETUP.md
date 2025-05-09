# Stripe Integration Setup Guide

This document outlines how to properly set up your Stripe integration for the Roambii Agent CMS.

## Environment Variables

You need to set up the following environment variables in your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PRICE_ID=price_your_price_id_here
```

## Important Note on Keys

- **Publishable Key**: Starts with `pk_test_` or `pk_live_`. This is safe to use in client-side code.
- **Secret Key**: Starts with `sk_test_` or `sk_live_`. This should NEVER be exposed in client-side code.

## Key Usage in the Application

- The publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) is used in the `SubscriptionPage.tsx` component for Stripe checkout.
- The secret key (`STRIPE_SECRET_KEY`) is used in the `subscription-service.ts` for server-side Stripe operations.
- The price ID (`NEXT_PUBLIC_STRIPE_PRICE_ID`) is used to identify the subscription plan in Stripe.

## Setting Up in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get your API keys from the Developers → API keys section
3. Create a product with a $19.99/month price
4. Copy the price ID (starts with `price_`)
5. Add all these values to your `.env.local` file

## Running the Initialization Script

After setting up your environment variables, you can initialize your subscription plan:

```bash
npm run init-direct
```

This will create a standard subscription plan with the price of $19.99/month in your Firestore database.

## Testing

For testing purposes, you can use the following test card details in the Stripe checkout:
- Card number: `4242 4242 4242 4242`
- Any future expiration date
- Any 3-digit CVC
- Any postal code 