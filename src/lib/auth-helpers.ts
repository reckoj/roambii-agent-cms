import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import Cookies from 'js-cookie';
import { subscriptionService } from './subscription-service';

interface UserData {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
  isAgent?: boolean;
  stripeCustomerId?: string;
  [key: string]: any;
}

/**
 * Ensures a user document exists in Firestore for the given user.
 * Creates it if it doesn't exist.
 */
export async function ensureUserDocument(userId: string, email?: string, name?: string) {
  try {
    console.log('[Auth Helper] Ensuring user document exists:', userId);
    
    // First check if we can read from Firestore
    try {
      console.log('[Auth Helper] Checking Firestore read access...');
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      console.log('[Auth Helper] Firestore read result:', userSnap.exists() ? 'Document exists' : 'Document does not exist');
      
      if (!userSnap.exists()) {
        console.log('[Auth Helper] Creating user document:', userId);
        
        // Get values from localStorage if available
        let storedEmail = email;
        let storedName = name;
        
        if (typeof window !== 'undefined') {
          if (!storedEmail) storedEmail = localStorage.getItem('userEmail') || '';
          if (!storedName) storedName = localStorage.getItem('userName') || '';
        }
        
        // Create the user document
        try {
          console.log('[Auth Helper] Attempting to write to Firestore...');
          await setDoc(userRef, {
            id: userId,
            email: storedEmail || '',
            name: storedName || '',
            isAgent: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('[Auth Helper] User document created successfully');
        } catch (writeError: any) {
          // Only log non-permission errors
          if (writeError.code !== 'permission-denied' && !writeError.message?.includes('insufficient permissions')) {
            console.error('[Auth Helper] Firestore write error:', writeError);
            console.error('[Auth Helper] Error code:', writeError.code);
            console.error('[Auth Helper] Error message:', writeError.message);
          }
          return false;
        }
      } else {
        console.log('[Auth Helper] User document already exists');
      }
    } catch (readError: any) {
      // Only log non-permission errors
      if (readError.code !== 'permission-denied' && !readError.message?.includes('insufficient permissions')) {
        console.error('[Auth Helper] Firestore read error:', readError);
        console.error('[Auth Helper] Error code:', readError.code);
        console.error('[Auth Helper] Error message:', readError.message);
      }
      return false;
    }
    
    return true;
  } catch (error: any) {
    // Only log non-permission errors
    if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
      console.error('[Auth Helper] Error ensuring user document:', error);
      console.error('[Auth Helper] Error code:', error.code);
      console.error('[Auth Helper] Error message:', error.message);
    }
    return false;
  }
}

/**
 * Stores the current user's information in localStorage for persistence
 */
export function storeUserInLocalStorage(user: User | { uid?: string; id?: string; email?: string; displayName?: string; name?: string; photoURL?: string; avatar?: string } | null) {
  if (!user) {
    console.log('[Auth Helper] Clearing user from localStorage');
    localStorage.removeItem('lastUserId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userAvatar');
    return;
  }
  
  // Handle different user object formats
  const userId = 'uid' in user ? user.uid : user.id;
  const userEmail = 'email' in user ? user.email : undefined;
  const userName = 'displayName' in user ? user.displayName : 'name' in user ? user.name : undefined;
  const userAvatar = 'photoURL' in user ? user.photoURL : 'avatar' in user ? user.avatar : undefined;
  
  if (!userId) {
    console.error('[Auth Helper] Cannot store user without id/uid');
    return;
  }
  
  console.log('[Auth Helper] Storing user in localStorage:', userId);
  localStorage.setItem('lastUserId', userId);
  if (userEmail) localStorage.setItem('userEmail', userEmail);
  if (userName) localStorage.setItem('userName', userName);
  if (userAvatar) localStorage.setItem('userAvatar', userAvatar);
}

/**
 * Gets the current user information from localStorage
 */
export function getUserFromLocalStorage() {
  if (typeof window === 'undefined') return null;
  
  const userId = localStorage.getItem('lastUserId');
  if (!userId) return null;
  
  return {
    id: userId,
    email: localStorage.getItem('userEmail') || '',
    name: localStorage.getItem('userName') || '',
    avatar: localStorage.getItem('userAvatar') || undefined
  };
}

/**
 * Gets the current authenticated user from multiple sources
 * Tries Firebase Auth first, then localStorage
 */
export async function getCurrentUser() {
  // First try Firebase Auth
  const currentUser = auth.currentUser;
  if (currentUser) {
    await ensureUserDocument(
      currentUser.uid, 
      currentUser.email || undefined, 
      currentUser.displayName || undefined
    );
    
    return {
      id: currentUser.uid,
      email: currentUser.email || '',
      name: currentUser.displayName || '',
      avatar: currentUser.photoURL || undefined
    };
  }
  
  // Then try localStorage
  const localUser = getUserFromLocalStorage();
  if (localUser) {
    await ensureUserDocument(localUser.id, localUser.email, localUser.name);
    return localUser;
  }
  
  return null;
}

/**
 * Logs out the current user and clears all auth state
 */
export async function logoutUser() {
  try {
    // First, try to clear cookies and localStorage - this is most important
    // to ensure user can't access protected routes after logout
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('lastUserId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userAvatar');
        localStorage.removeItem('subscriptionData');
        console.log('[Auth Helper] Cleared localStorage');
        
        // Clear cookies
        Cookies.remove('lastUserId');
        Cookies.remove('hasSubscription');
        Cookies.remove('session');
        console.log('[Auth Helper] Cleared cookies');
      } catch (storageError) {
        console.error('[Auth Helper] Error clearing local storage or cookies:', storageError);
        // Continue with logout even if this fails
      }
    }
    
    // Then, try to sign out from Firebase Auth
    // Wrap this in try-catch to ensure we always return success even if Firebase fails
    try {
      await signOut(auth);
      console.log('[Auth Helper] Firebase signOut successful');
    } catch (signOutError) {
      console.error('[Auth Helper] Error during Firebase signOut:', signOutError);
      // We still consider this a successful logout since we've cleared cookies and localStorage
    }
    
    console.log('[Auth Helper] User logged out and auth state cleared');
    return true;
  } catch (error) {
    // If we get here, something really unexpected happened
    console.error('[Auth Helper] Unexpected error during logout:', error);
    
    // Try one more time to clear cookies directly
    try {
      Cookies.remove('lastUserId');
      Cookies.remove('hasSubscription');
      Cookies.remove('session');
    } catch (e) {
      // Ignore errors here
    }
    
    // Even if we hit an error, we want to return true so the UI updates correctly
    // and the user gets logged out on the client side
    return true;
  }
}

/**
 * Checks if a user has an active subscription and stores the result in a cookie
 */
export async function checkAndStoreSubscriptionStatus(userId: string): Promise<boolean> {
  try {
    console.log('[Auth Helper] Checking subscription status for user:', userId);
    
    // Skip the database check if user is admin
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (isAdmin) {
      console.log('[Auth Helper] User is admin, skipping subscription check');
      Cookies.set('hasSubscription', 'true', { expires: 30 });
      return true;
    }
    
    // First check if we have a local record of subscription in cookie or localStorage
    const subscriptionCookie = Cookies.get('hasSubscription');
    if (subscriptionCookie === 'true') {
      console.log('[Auth Helper] Found active subscription in cookie');
      return true;
    }
    
    // Check localStorage for subscription data
    const localSubscriptionData = localStorage.getItem('subscriptionData');
    if (localSubscriptionData) {
      try {
        const subscriptionData = JSON.parse(localSubscriptionData);
        console.log('[Auth Helper] Local subscription data:', JSON.stringify(subscriptionData, null, 2));
        
        // Check if subscription is still valid
        if (subscriptionData.status === 'active') {
          try {
            // Handle case where currentPeriodEnd is an object or invalid
            const endDateValue = typeof subscriptionData.currentPeriodEnd === 'object'
              ? subscriptionData.currentPeriodEnd.toDate?.() || new Date()
              : subscriptionData.currentPeriodEnd;

            if (!endDateValue) {
              console.error('[Auth Helper] Missing currentPeriodEnd in local storage');
              // Continue to check with Firestore
            } else {
              const endDate = new Date(endDateValue);
              // Validate the date
              if (isNaN(endDate.getTime())) {
                console.error('[Auth Helper] Invalid end date in local storage:', {
                  original: subscriptionData.currentPeriodEnd,
                  parsed: endDateValue,
                  type: typeof subscriptionData.currentPeriodEnd
                });
                // Continue to check with Firestore
              } else {
                const now = new Date();
                const isExpired = endDate < now;
                
                console.log('[Auth Helper] Local subscription validation:', {
                  endDate: endDate.toISOString(),
                  now: now.toISOString(),
                  isExpired,
                  cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
                  status: subscriptionData.status
                });
                
                // If subscription is not expired and not set to cancel, it's valid
                const isValid = !isExpired && !subscriptionData.cancelAtPeriodEnd;
                console.log('[Auth Helper] Final local subscription validation:', {
                  isExpired,
                  cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
                  isValid
                });
                
                if (isValid) {
                  Cookies.set('hasSubscription', 'true', { expires: 30 });
                  return true;
                }
              }
            }
          } catch (dateError) {
            console.error('[Auth Helper] Error processing subscription date:', dateError);
            // Continue to check with Firestore
          }
        }
      } catch (error) {
        console.error('[Auth Helper] Error parsing local subscription data:', error);
        // Continue to check with Firestore
      }
    }
    
    // Check subscription status with Firestore
    let hasSubscription = false;
    try {
      hasSubscription = await subscriptionService.checkSubscriptionStatus(userId);
      console.log('[Auth Helper] Firestore subscription status:', hasSubscription);
    } catch (error) {
      console.error('[Auth Helper] Error checking subscription with Firestore:', error);
      
      // Fallback to just return the cookie value on error
      return subscriptionCookie === 'true';
    }
    
    // Store in cookie
    Cookies.set('hasSubscription', hasSubscription ? 'true' : 'false', { expires: 30 });
    
    return hasSubscription;
  } catch (error) {
    console.error('[Auth Helper] Error checking subscription:', error);
    // On error, be permissive - check the cookie value
    const subscriptionCookie = Cookies.get('hasSubscription');
    return subscriptionCookie === 'true';
  }
}

export const validateSubscription = async (userId: string): Promise<boolean> => {
  try {
    console.log('=== Subscription Validation Start ===');
    console.log('User ID:', userId);
    
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log('❌ User document does not exist');
      return false;
    }
    
    const userData = userSnap.data() as UserData;
    console.log('=== User Details ===');
    console.log('User ID:', userId);
    console.log('Stripe Customer ID:', userData.stripeCustomerId);
    console.log('Is Admin:', userData.isAdmin);
    console.log('Is Agent:', userData.isAgent);
    
    // If user is admin, they have access
    if (userData.isAdmin) {
      console.log('✅ User is admin, granting access');
      return true;
    }
    
    // If user is not an agent, they don't have access
    if (!userData.isAgent) {
      console.log('❌ User is not an agent');
      return false;
    }
    
    // Check subscription status
    const hasSubscription = await subscriptionService.checkSubscriptionStatus(userId);
    console.log('=== Subscription Check Result ===');
    console.log('User ID:', userId);
    console.log('Has Subscription:', hasSubscription);
    
    return hasSubscription;
  } catch (error) {
    console.error('Error validating subscription:', error);
    return false;
  }
}; 