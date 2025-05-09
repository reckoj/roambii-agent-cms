'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { setAgent, setLoading } from '@/lib/redux/slices/authSlice';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      dispatch(setLoading(true));
      if (user) {
        // User is signed in
        dispatch(
          setAgent({
            id: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            avatar: user.photoURL || undefined,
          })
        );
      } else {
        // User is signed out
        dispatch(setAgent(null));
        router.push('/login');
      }
      dispatch(setLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch, router]);

  return <>{children}</>;
} 