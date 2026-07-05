import { auth } from '@/auth';
import { redirect } from 'next/navigation';

// Home route. Middleware redirects unauthenticated visitors to /auth/signin,
// so reaching here means the user is (or should be) signed in. Authenticated
// users go straight to the 8-item form; otherwise fall back to sign-in.
export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect('/form');
  }
  redirect('/auth/signin');
}
