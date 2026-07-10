import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import SignInView from './SignInView';

// Google OAuth login screen (task: pages/auth/signin.tsx -> App Router route).
// Server component: redirects already-authenticated staff straight to the admin dashboard.
export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect('/admin');
  }

  // Server action bound to the Google sign-in button.
  async function signInWithGoogle() {
    'use server';
    await signIn('google', { redirectTo: '/admin' });
  }

  return <SignInView signInAction={signInWithGoogle} />;
}
