import { initializePlans } from '../lib/subscription-service';
import { auth } from '../lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';

async function main() {
  try {
    // Get admin credentials from environment variables
    const adminEmail = process.env.FIREBASE_ADMIN_EMAIL;
    const adminPassword = process.env.FIREBASE_ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials not found in environment variables');
    }

    // Sign in as admin
    console.log('Signing in as admin...');
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('Successfully signed in as admin');

    // Initialize plans
    await initializePlans();
    console.log('Successfully initialized subscription plans');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize subscription plans:', error);
    process.exit(1);
  }
}

main(); 