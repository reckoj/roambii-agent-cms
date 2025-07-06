import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
});

export async function POST(request: Request) {
  try {
    const { action, data } = await request.json();

    switch (action) {
      case "createSubscription":
        const { userId, priceId, email } = data;

        // Create or get Stripe customer
        const customer = await stripe.customers.create({
          email,
          metadata: {
            userId,
          },
        });

        // Create a customized checkout session for the subscription
        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscribe?canceled=true`,
          metadata: {
            userId,
          },
          // Essential features for address and tax
          billing_address_collection: "required",
          automatic_tax: {
            enabled: true,
          },
          customer_update: {
            address: "auto",
            name: "auto",
          },
          // Allow promotion codes
          allow_promotion_codes: false,
        });

        return NextResponse.json({
          sessionId: session.id,
          customerId: customer.id,
        });

      case "cancelSubscription":
        const { subscriptionId } = data;
        const canceledSubscription = await stripe.subscriptions.update(
          subscriptionId,
          {
            cancel_at_period_end: true,
          }
        );
        return NextResponse.json({ subscription: canceledSubscription });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Stripe API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
