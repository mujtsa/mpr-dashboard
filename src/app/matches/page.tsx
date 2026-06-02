import { redirect } from 'next/navigation';

// The dedicated Matches page has been removed.
// Match history is accessible via the dashboard filterable results section
// and individual player profiles.
export default function MatchesPage() {
  redirect('/dashboard');
}
