import { auth } from '../lib/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Get test credentials
    const testEmail = process.env.TEST_EMAIL || 'reckotjean@gmail.com';
    const testPassword = process.env.TEST_PASSWORD || 'test123'; // Replace with a real test password
    
    console.log('Attempting to sign in with Firebase Auth...');
    console.log('Email:', testEmail);
    
    // Try to sign in
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    const user = userCredential.user;
    
    console.log('Successfully signed in!');
    console.log('User ID:', user.uid);
    console.log('Email:', user.email);
    console.log('Display Name:', user.displayName);
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('Failed to sign in:', error);
    process.exit(1);
  }
}

// Run the script
main(); 