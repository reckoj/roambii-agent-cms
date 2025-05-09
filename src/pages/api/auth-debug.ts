import type { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '../../lib/firebase/config';
import { db } from '../../lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

type ResponseData = {
  auth: {
    currentUser: {
      uid?: string;
      email?: string;
      displayName?: string;
    } | null;
  };
  firestore?: {
    userExists: boolean;
    userData?: any;
  };
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  // Default response with auth state
  const response: ResponseData = {
    auth: {
      currentUser: null
    }
  };

  try {
    // Get current user
    const currentUser = auth.currentUser;
    
    if (currentUser) {
      response.auth.currentUser = {
        uid: currentUser.uid,
        email: currentUser.email || undefined,
        displayName: currentUser.displayName || undefined
      };
      
      // Try to get user document from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        response.firestore = {
          userExists: userDoc.exists(),
          userData: userDoc.exists() ? userDoc.data() : undefined
        };
      } catch (firestoreError: any) {
        response.firestore = {
          userExists: false
        };
        
        response.error = `Firestore error: ${firestoreError.message}`;
      }
    }
    
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(500).json({
      auth: { currentUser: null },
      error: `Server error: ${error.message}`
    });
  }
} 