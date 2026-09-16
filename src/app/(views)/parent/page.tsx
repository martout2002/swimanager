import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth';
import { loadSchool } from '@/lib/data';
import { ParentView } from '@/components/parent/ParentView';

export default async function ParentPage() {
  const session = await readSession();
  if (!session?.parentName) redirect('/login');
  return <ParentView school={await loadSchool()} parentName={session.parentName} />;
}
