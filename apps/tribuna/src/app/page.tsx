import { redirect } from 'next/navigation';
import { DEFAULT_TEAM } from '@/lib/teams';

export default function Home() {
  redirect(`/${DEFAULT_TEAM}`);
}
