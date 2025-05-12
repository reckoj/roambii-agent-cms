// 'use client';

// import { useState } from 'react';
// import { auth } from '@/lib/firebase/config';
// import { signInWithEmailAndPassword } from 'firebase/auth';
// import { storeUserInLocalStorage, ensureUserDocument, checkAndStoreSubscriptionStatus } from '@/lib/auth-helpers';
// import { useRouter } from 'next/navigation';
// import { subscriptionService } from '@/lib/subscription-service';
// import { doc, setDoc } from 'firebase/firestore';
// import { db } from '@/lib/firebase/config';
// import Cookies from 'js-cookie';

// export default function LoginDebugger() {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [result, setResult] = useState<any>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [checking, setChecking] = useState(false);

//   const router = useRouter();

//   const testDirectFirebaseLogin = async () => {
//     setError(null);
//     setResult(null);
//     setChecking(true);

//     try {
//       console.log('Attempting direct Firebase login with:', email);
//       const userCredential = await signInWithEmailAndPassword(auth, email, password);
//       const user = userCredential.user;

//       console.log('Firebase login successful:', user);
//       setResult({
//         success: true,
//         userId: user.uid,
//         email: user.email,
//         displayName: user.displayName
//       });

//       // Store in localStorage
//       storeUserInLocalStorage(user);

//       // Ensure user document exists
//       await ensureUserDocument(user.uid, user.email || undefined, user.displayName || undefined);

//       console.log('User data stored in localStorage and Firestore');
//     } catch (err: any) {
//       console.error('Firebase login failed:', err);
//       setError(err.message || 'Login failed');
//       setResult({
//         success: false,
//         errorCode: err.code,
//         errorMessage: err.message
//       });
//     } finally {
//       setChecking(false);
//     }
//   };

//   const checkCurrentAuthState = () => {
//     const currentUser = auth.currentUser;
//     setResult({
//       authState: currentUser ? {
//         userId: currentUser.uid,
//         email: currentUser.email,
//         displayName: currentUser.displayName
//       } : 'No user authenticated',
//       localStorage: {
//         userId: localStorage.getItem('lastUserId'),
//         email: localStorage.getItem('userEmail'),
//         name: localStorage.getItem('userName')
//       }
//     });
//   };

//   const testApiLogin = async () => {
//     setError(null);
//     setResult(null);
//     setChecking(true);

//     try {
//       console.log('Attempting API login with:', email);

//       const response = await fetch('/api/verify-login', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email, password }),
//       });

//       if (!response.ok) {
//         const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
//         console.error('API login failed:', errorData);
//         setError(errorData.error || 'API login failed');
//         setResult({
//           success: false,
//           apiResponse: errorData
//         });
//         return;
//       }

//       const data = await response.json();
//       console.log('API login successful:', data);
//       setResult({
//         success: true,
//         apiResponse: data
//       });
//     } catch (err: any) {
//       console.error('API login error:', err);
//       setError(err.message || 'API request failed');
//       setResult({
//         success: false,
//         error: err.message
//       });
//     } finally {
//       setChecking(false);
//     }
//   };

//   const checkServerAuthState = async () => {
//     setError(null);
//     setResult(null);
//     setChecking(true);

//     try {
//       const response = await fetch('/api/auth-debug');
//       const data = await response.json();

//       console.log('Server auth state:', data);
//       setResult({
//         serverAuthState: data
//       });
//     } catch (err: any) {
//       console.error('Error checking server auth state:', err);
//       setError(err.message || 'Server request failed');
//     } finally {
//       setChecking(false);
//     }
//   };

//   const checkSubscriptionStatus = async () => {
//     setError(null);
//     setResult(null);
//     setChecking(true);

//     try {
//       const currentUser = auth.currentUser;
//       if (!currentUser) {
//         throw new Error('No user is currently logged in');
//       }

//       console.log('Checking subscription status for user:', currentUser.uid);

//       // Use our helper function
//       const hasActiveSubscription = await checkAndStoreSubscriptionStatus(currentUser.uid);

//       setResult({
//         userId: currentUser.uid,
//         hasActiveSubscription,
//         timestamp: new Date().toISOString(),
//         cookieValue: Cookies.get('hasSubscription')
//       });
//     } catch (err: any) {
//       console.error('Error checking subscription status:', err);
//       setError(err.message || 'Failed to check subscription status');
//     } finally {
//       setChecking(false);
//     }
//   };

//   const createTestSubscription = async () => {
//     setError(null);
//     setResult(null);
//     setChecking(true);

//     try {
//       const currentUser = auth.currentUser;
//       if (!currentUser) {
//         throw new Error('No user is currently logged in');
//       }

//       // Create a test subscription document
//       const subscriptionData = {
//         id: `test_sub_${Date.now()}`,
//         userId: currentUser.uid,
//         status: 'active',
//         currentPeriodStart: new Date().toISOString(),
//         currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
//         cancelAtPeriodEnd: false,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString()
//       };

//       const subscriptionRef = doc(db, 'subscriptions', subscriptionData.id);
//       await setDoc(subscriptionRef, subscriptionData);

//       setResult({
//         message: 'Test subscription created',
//         subscription: subscriptionData
//       });

//       // Check subscription status after creating it
//       await checkSubscriptionStatus();
//     } catch (err: any) {
//       console.error('Error creating test subscription:', err);
//       setError(err.message || 'Failed to create test subscription');
//     } finally {
//       setChecking(false);
//     }
//   };

//   return (
//     <div className="mt-8 p-4 border border-gray-300 rounded-md">
//       <h3 className="text-lg font-semibold mb-2">Login Debugger</h3>

//       <div className="space-y-4">
//         <div>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             placeholder="Email"
//             className="p-2 border border-gray-300 rounded w-full"
//           />
//         </div>

//         <div>
//           <input
//             type="password"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="Password"
//             className="p-2 border border-gray-300 rounded w-full"
//           />
//         </div>

//         <div className="flex space-x-2">
//           <button
//             onClick={testDirectFirebaseLogin}
//             disabled={checking}
//             className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
//           >
//             {checking ? 'Testing...' : 'Test Direct Firebase Login'}
//           </button>

//           <button
//             onClick={checkCurrentAuthState}
//             className="px-4 py-2 bg-gray-500 text-white rounded-md"
//           >
//             Check Current Auth State
//           </button>

//           <button
//             onClick={testApiLogin}
//             disabled={checking}
//             className="px-4 py-2 bg-green-500 text-white rounded-md disabled:bg-green-300"
//           >
//             {checking ? 'Testing...' : 'Test API Login'}
//           </button>

//           <button
//             onClick={checkServerAuthState}
//             className="px-4 py-2 bg-purple-500 text-white rounded-md"
//           >
//             Check Server Auth
//           </button>

//           <button
//             onClick={checkSubscriptionStatus}
//             disabled={checking}
//             className="px-4 py-2 bg-orange-500 text-white rounded-md disabled:bg-orange-300"
//           >
//             {checking ? 'Checking...' : 'Check Subscription'}
//           </button>

//           <button
//             onClick={createTestSubscription}
//             disabled={checking}
//             className="px-4 py-2 bg-red-500 text-white rounded-md disabled:bg-red-300"
//           >
//             {checking ? 'Creating...' : 'Create Test Subscription'}
//           </button>
//         </div>

//         {error && (
//           <div className="p-3 bg-red-100 border border-red-400 text-red-800 rounded">
//             {error}
//           </div>
//         )}

//         {result && (
//           <div className="p-3 bg-gray-100 border border-gray-400 rounded">
//             <pre className="whitespace-pre-wrap break-words text-xs">
//               {JSON.stringify(result, null, 2)}
//             </pre>
//           </div>
//         )}
//       </div>

//       {/* Navigation buttons */}
//       <div className="mt-4 pt-4 border-t border-gray-300">
//         <h4 className="text-sm font-semibold mb-2">Test Navigation</h4>
//         <div className="flex space-x-2">
//           <button
//             onClick={() => router.push('/dashboard')}
//             className="px-4 py-2 bg-teal-500 text-white rounded-md"
//           >
//             Go to Dashboard
//           </button>

//           <button
//             onClick={() => router.push('/subscribe')}
//             className="px-4 py-2 bg-teal-500 text-white rounded-md"
//           >
//             Go to Subscribe
//           </button>

//           <button
//             onClick={() => router.push('/subscribe/success?session_id=test_session')}
//             className="px-4 py-2 bg-teal-500 text-white rounded-md"
//           >
//             Test Success Page
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
