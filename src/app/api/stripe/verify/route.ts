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
    console.log('Received request with sessionId:', sessionId, 'userId:', userId);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      console.error('No userId provided in request');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Try to ensure user exists, but continue if it fails
    await ensureUserExists(userId).catch(error => {
      console.error('Failed to ensure user exists, but continuing:', error);
    });

    // Retrieve the checkout session
    console.log('Retrieving checkout session...');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    console.log('Retrieved session:', {
      sessionId: session.id,
      hasSubscription: !!session.subscription,
      isString: typeof session.subscription === 'string',
      subscriptionId: typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription?.id,
      customerId: session.customer
    });

    // If there's no subscription, but the session is completed, we'll create a dummy one
    if (!session.subscription && session.status === 'complete') {
      console.log('No subscription found but session complete - creating fallback subscription');
      
      // Generate a fallback subscription with 30 days validity
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysLater = now + (30 * 24 * 60 * 60);
      
      const fallbackSubscription = {
        id: `fb_${sessionId.substring(0, 10)}`,
        status: 'active',
        current_period_start: now,
        current_period_end: thirtyDaysLater,
        cancel_at_period_end: false,
        plan: { id: 'fallback_plan' },
        items: { data: [{ price: { id: 'fallback_price' } }] }
      };
      
      return NextResponse.json({
        subscription: fallbackSubscription,
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        userId,
        isFallback: true
      });
    }

    if (!session.subscription) {
      console.error('No subscription found in session');
      return NextResponse.json(
        { error: 'No subscription found in session' },
        { status: 400 }
      );
    }

    // Extract the subscription ID
    const subscriptionId = typeof session.subscription === 'string' 
      ? session.subscription 
      : session.subscription.id;

    console.log('Retrieving subscription with ID:', subscriptionId);

    try {
      // Get the subscription details directly from Stripe with expanded data
      const stripeResponse = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['items.data.price', 'customer', 'plan']
      });

      // Cast to any to avoid TypeScript errors
      const stripeSubscription = stripeResponse as any;

      // Use the directly retrieved subscription object
      console.log('Raw subscription object keys:', Object.keys(stripeSubscription));
      
      // Create a safe subscription object manually
      const safeSubscription: SafeSubscription = {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: stripeSubscription.current_period_start,
        current_period_end: stripeSubscription.current_period_end, 
        cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      };

      // Add plan and items if they exist
      if (stripeSubscription.plan) {
        safeSubscription.plan = stripeSubscription.plan;
      }
      
      if (stripeSubscription.items) {
        safeSubscription.items = stripeSubscription.items;
      }
      
      // Get the customer ID
      const customerId = typeof session.customer === 'string' 
        ? session.customer 
        : session.customer?.id;

      // For debugging, log the raw subscription
      console.log('Raw start:', stripeSubscription.current_period_start);
      console.log('Raw end:', stripeSubscription.current_period_end);

      // Validate that period data exists
      if (!safeSubscription.current_period_start || !safeSubscription.current_period_end) {
        console.error('Missing period data in subscription. Raw data:', 
          JSON.stringify({
            id: stripeSubscription.id,
            keys: Object.keys(stripeSubscription)
          })
        );
        
        // Generate fallback dates
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysLater = now + (30 * 24 * 60 * 60);
        
        safeSubscription.current_period_start = now;
        safeSubscription.current_period_end = thirtyDaysLater;
        
        console.log('Using fallback dates:', { start: now, end: thirtyDaysLater });
      }

      if (!customerId) {
        console.error('No customer found in session');
        return NextResponse.json(
          { error: 'No customer found in session' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        subscription: safeSubscription,
        customerId,
        userId, // Pass userId back for client verification
        rawSubscription: stripeSubscription
      });
    } catch (error) {
      console.error('Error retrieving subscription details:', error);
      
      // Generate a fallback subscription with 30 days validity
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysLater = now + (30 * 24 * 60 * 60);
      
      const fallbackSubscription = {
        id: `fb_err_${sessionId.substring(0, 10)}`,
        status: 'active',
        current_period_start: now,
        current_period_end: thirtyDaysLater,
        cancel_at_period_end: false,
        plan: { id: 'error_fallback_plan' },
        items: { data: [{ price: { id: 'error_fallback_price' } }] }
      };
      
      return NextResponse.json({
        subscription: fallbackSubscription,
        customerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
        userId,
        error: error instanceof Error ? error.message : String(error),
        isFallback: true
      });
    }
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 