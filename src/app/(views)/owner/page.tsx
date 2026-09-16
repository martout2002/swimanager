import { loadSchool } from '@/lib/data';
import { OwnerView } from '@/components/owner/OwnerView';

export default async function OwnerPage() {
  return <OwnerView school={await loadSchool()} />;
}
