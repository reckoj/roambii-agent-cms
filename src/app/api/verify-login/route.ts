import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password required' },
        { status: 400 }
      );
    }

    console.log('API: Attempting to sign in with:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('API: Sign in successful:', {
      uid: user.uid,
      email: user.email
    });
    
    return NextResponse.json({
      success: true,
      userId: user.uid,
      email: user.email || undefined
    });
  } catch (error: any) {
    console.error('API: Authentication error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Authentication failed'
      },
      { status: 401 }
    );
  }
} 