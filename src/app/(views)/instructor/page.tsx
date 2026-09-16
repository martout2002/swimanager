import { loadSchool } from '@/lib/data';
import { InstructorView } from '@/components/instructor/InstructorView';

export default async function InstructorPage() {
  return <InstructorView school={await loadSchool()} />;
}
