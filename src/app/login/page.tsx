import { redirect } from 'next/navigation';
import { HOME_FOR_ROLE, readSession } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect(HOME_FOR_ROLE[session.role]);
  return <LoginForm />;
}
