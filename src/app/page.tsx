// Root route → permanently redirect to /dashboard.
// All player navigation is now unified under /dashboard.
import { redirect } from 'next/navigation';
export default function RootPage() { redirect('/dashboard'); }
