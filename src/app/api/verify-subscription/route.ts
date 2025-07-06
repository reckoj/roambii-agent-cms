import { NextResponse } from 'next/server';
import { subscriptionService } from '@/lib/subscription-service';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check subscription status from database
    const hasActiveSubscription = await subscriptionService.checkSubscriptionStatus(userId);
    
    const response = NextResponse.json({ 
      hasActiveSubscription,
      timestamp: Date.now()
    });

    // Update the subscription cookie based on database result
    if (hasActiveSubscription) {
      response.cookies.set('hasSubscription', 'true', { 
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      response.cookies.set('lastSubscriptionCheck', Date.now().toString(), {
        maxAge: 30 * 24 * 60 * 60, // 30 days
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    } else {
      // Clear subscription cookies if no active subscription
      response.cookies.delete('hasSubscription');
      response.cookies.delete('lastSubscriptionCheck');
    }

    return response;
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      { error: 'Failed to verify subscription' },
      { status: 500 }
    );
  }
} 