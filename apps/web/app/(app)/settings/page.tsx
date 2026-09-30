import { headers } from 'next/headers';
import { SettingsView } from '@/components/SettingsView';

export default function Page() {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'designsystemvault.xyz';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return <SettingsView origin={`${proto}://${host}`} />;
}
