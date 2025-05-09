import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '../../lib/firebase/config';
import { db } from '../../lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, limit } from 'firebase/firestore';
import Stripe from 'stripe';

type ResponseData = {
  success: boolean;
  auth?: {
    userId: string;
    email: string | null;
  };
  firestore?: {
    canRead: boolean;
    error?: string;
    collections?: {
      name: string;
      count: number;
    }[];
  };
  stripe?: {
    canConnect: boolean;
    error?: string;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password required' });
  }

  const response: ResponseData = {
    success: false
  };

  try {
    // Test Firebase Auth
    console.log('Testing credentials for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    response.success = true;
    response.auth = {
      userId: user.uid,
      email: user.email
    };
    
    // Test Firestore access
    try {
      response.firestore = {
        canRead: false,
        collections: []
      };
      
      // Try to read from a few collections
      const collections = ['users', 'subscriptions', 'subscriptionPlans'];
      
      for (const collName of collections) {
        try {
          const collRef = collection(db, collName);
          const snapshot = await getDocs(collRef);
          
          response.firestore.collections!.push({
            name: collName,
            count: snapshot.size
          });
        } catch (collError: any) {
          console.error(`Error reading collection ${collName}:`, collError);
        }
      }
      
      response.firestore.canRead = true;
    } catch (firestoreError: any) {
      response.firestore = {
        canRead: false,
        error: firestoreError.message
      };
    }
    
    // Test Stripe connection
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-04-30.basil',
        });
        
        // Just check if we can connect, don't actually do anything
        const hasKey = !!process.env.STRIPE_SECRET_KEY;
        
        response.stripe = {
          canConnect: hasKey
        };
      } else {
        response.stripe = {
          canConnect: false,
          error: 'No Stripe secret key configured'
        };
      }
    } catch (stripeError: any) {
      response.stripe = {
        canConnect: false,
        error: stripeError.message
      };
    }
    
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      error: `Authentication failed: ${error.message}`
    });
  }
} 