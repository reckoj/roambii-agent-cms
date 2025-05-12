import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Make sure we're using the correct type
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
});

// Make subscription and subscription properties accessible
interface SafeSubscription {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  plan?: any;
  items?: any;
}

// Helper function to ensure user exists
async function ensureUserExists(userId: string) {
  try {
    console.log('Ensuring user exists in Firestore (server-side):', userId);
    
    // Check if user document exists
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('User document does not exist, creating it on server');
      
      // Create basic user document
      await setDoc(userRef, {
        id: userId,
        isAgent: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('User document created successfully on server');
    } else {
      console.log('User document already exists on server');
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring user exists on server:', error);
    // We'll continue with the subscription verification even if this fails
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const { sessionId, userId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing session ID' },
        { status: 400 }
      );
    }

    // Retrieve the session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    if (!session.subscription) {
      return NextResponse.json(
        { error: 'No subscription found in session' },
        { status: 400 }
      );
    }

    // Get the subscription with expanded items
    const subscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : session.subscription.id;

    const subscription = await stripe.subscriptions.retrieve(
      subscriptionId,
      {
        expand: ['latest_invoice', 'customer', 'items.data.price.product'],
      }
    );

    // Get the customer email
    const customer = subscription.customer as Stripe.Customer;
    const customerEmail = customer.email;

    // Log detailed subscription and invoice information
    console.log('Detailed Subscription Info:', {
      subscriptionId: subscription.id,
      status: subscription.status,
      customerEmail,
      customerId: customer.id,
      latestInvoice: subscription.latest_invoice ? {
        id: (subscription.latest_invoice as Stripe.Invoice).id,
        status: (subscription.latest_invoice as Stripe.Invoice).status,
        hosted_invoice_url: (subscription.latest_invoice as Stripe.Invoice).hosted_invoice_url,
        invoice_pdf: (subscription.latest_invoice as Stripe.Invoice).invoice_pdf,
        customer_email: (subscription.latest_invoice as Stripe.Invoice).customer_email,
        billing_reason: (subscription.latest_invoice as Stripe.Invoice).billing_reason,
        collection_method: (subscription.latest_invoice as Stripe.Invoice).collection_method
      } : null
    });

    return NextResponse.json({
      subscription,
      customerId: customer.id,
      customerEmail,
      invoiceUrl: subscription.latest_invoice ? 
        (subscription.latest_invoice as Stripe.Invoice).hosted_invoice_url : null,
      invoicePdf: subscription.latest_invoice ? 
        (subscription.latest_invoice as Stripe.Invoice).invoice_pdf : null
    });
  } catch (error: any) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
} 