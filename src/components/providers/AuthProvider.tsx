'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { setAgent, setLoading } from '@/lib/redux/slices/authSlice';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  ensureUserDocument, 
  getUserFromLocalStorage, 
  storeUserInLocalStorage,
  checkAndStoreSubscriptionStatus,
  logoutUser
} from '@/lib/auth-helpers';
import Cookies from 'js-cookie';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);
  const [authChecked, setAuthChecked] = useState(false);

  // Clear auth state on component unmount (page refresh or navigation)
  useEffect(() => {
    return () => {
      // This is a no-op cleanup function
      // Actual cleanup is handled by the auth listener
    };
  }, []);

  useEffect(() => {
    console.log('AuthProvider initialized');
    // Set loading state
    dispatch(setLoading(true));

    // Skip Firebase operations if we're on the login page
    const path = window.location.pathname;
    if (path.includes('/login')) {
      console.log('On login page, skipping Firebase operations');
      dispatch(setLoading(false));
      setAuthChecked(true);
      return;
    }

    const checkLocalStorage = async () => {
      try {
        const localUser = getUserFromLocalStorage();
        if (!localUser) {
          console.log('No user found in localStorage');
          return false;
        }
        
        console.log('Found user data in localStorage:', localUser);
        
        // Try to ensure the user exists in Firestore but don't fail if permissions error
        try {
          await ensureUserDocument(localUser.id, localUser.email, localUser.name);
        } catch (error: any) {
          // Only log non-permission errors
          if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
            console.error('Error ensuring user document, but continuing:', error);
          }
          // Continue even if this fails due to permissions
        }
        
        // Update Redux state with user data
        dispatch(
          setAgent({
            id: localUser.id,
            name: localUser.name,
            email: localUser.email,
            avatar: localUser.avatar,
          })
        );
        
        // Check subscription status but don't fail if it errors
        try {
          await checkAndStoreSubscriptionStatus(localUser.id);
        } catch (error: any) {
          // Only log non-permission errors
          if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
            console.error('Error checking subscription status:', error);
          }
        }
        
        return true;
      } catch (error: any) {
        // Only log non-permission errors
        if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
          console.error('Error in checkLocalStorage:', error);
        }
        return false;
      }
    };

    // Handle auth state changes
    const handleAuthStateChange = async (user: any) => {
      try {
        if (user) {
          // User is signed in
          console.log('Firebase Auth authenticated user:', user.uid);
          
          // Try to ensure user exists in Firestore but don't fail if permissions error
          try {
            await ensureUserDocument(
              user.uid, 
              user.email || undefined, 
              user.displayName || undefined
            );
          } catch (error: any) {
            // Only log non-permission errors
            if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
              console.error('Error ensuring user document, but continuing:', error);
            }
            // Continue even if this fails due to permissions
          }
          
          // Update Redux state
          dispatch(
            setAgent({
              id: user.uid,
              name: user.displayName || '',
              email: user.email || '',
              avatar: user.photoURL || undefined,
            })
          );
          
          // Store in localStorage
          storeUserInLocalStorage(user);
          
          // Check subscription status but don't fail if it errors
          try {
            await checkAndStoreSubscriptionStatus(user.uid);
          } catch (error: any) {
            // Only log non-permission errors
            if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
              console.error('Error checking subscription status:', error);
            }
          }
        } else {
          // User is signed out of Firebase Auth
          console.log('No user in Firebase Auth, checking localStorage...');
          
          // Check if we have a user in localStorage
          const foundInStorage = await checkLocalStorage();
          
          if (!foundInStorage) {
            console.log('No authenticated user found anywhere');
            
            // Clear auth state and cookies
            dispatch(setAgent(null));
            
            // Clear cookies if they exist
            if (Cookies.get('lastUserId')) {
              Cookies.remove('lastUserId');
            }
            
            if (Cookies.get('hasSubscription')) {
              Cookies.remove('hasSubscription');
            }
            
            // Clear localStorage items related to auth
            if (typeof window !== 'undefined') {
              localStorage.removeItem('lastUserId');
              localStorage.removeItem('userEmail');
              localStorage.removeItem('userName');
              localStorage.removeItem('userAvatar');
            }
            
            // Don't redirect to login if we're already on the login page
            // or on the subscribe success page
            const path = window.location.pathname;
            if (!path.includes('/login') && !path.includes('/subscribe/success')) {
              console.log('Redirecting to login page');
              router.push('/login');
            }
          }
        }
      } catch (error: any) {
        // Only log non-permission errors
        if (error.code !== 'permission-denied' && !error.message?.includes('insufficient permissions')) {
          console.error('Error handling auth state change:', error);
        }
      } finally {
        dispatch(setLoading(false));
        setAuthChecked(true);
      }
    };

    // Only set up auth listener if we're not on the login page
    const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

    return () => {
      // When component is unmounted, unsubscribe from the auth listener
      unsubscribe();
    };
  }, [dispatch, router]);

  // Handle user logout when errors are detected
  useEffect(() => {
    const handleErrors = (event: ErrorEvent) => {
      // Skip error handling if we're on the login page
      const path = window.location.pathname;
      if (path.includes('/login')) {
        return;
      }

      // Check if the error is related to Firestore permissions
      if (event.error && (
        (event.error.message && event.error.message.includes('permission-denied')) ||
        (event.error.code && event.error.code === 'permission-denied') ||
        (event.error.message && event.error.message.includes('insufficient permissions'))
      )) {
        // Silently handle permission errors
        return;
      }
    };
    
    // Add error event listener
    window.addEventListener('error', handleErrors);
    
    return () => {
      window.removeEventListener('error', handleErrors);
    };
  }, []);

  // Wait until auth is checked before rendering children
  if (!authChecked && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 