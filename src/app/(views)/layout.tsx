import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { logoutAction } from '@/lib/actions';
import { ToastProvider } from '@/components/Toast';

export const dynamic = 'force-dynamic';

export default async function ViewsLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');

  return (
    <ToastProvider>
      <div className="top-bar">
        <span className="who">{session.name}</span>
        <span className="role-tag">{session.role}</span>
        <form action={logoutAction}>
          <button type="submit">Sign out</button>
        </form>
      </div>
      {children}
    </ToastProvider>
  );
}
