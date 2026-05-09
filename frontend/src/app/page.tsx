import { redirect } from 'next/navigation';

// Root → direkt login'e yönlendir
export default function RootPage() {
  redirect('/auth/login');
}
