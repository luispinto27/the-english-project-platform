'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScheduleGrid } from '@/components/admin/ScheduleGrid';
import { BookingsList } from '@/components/admin/BookingsList';
import { Button } from '@/components/ui/Button';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'schedule' | 'bookings'>('bookings');

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ font: '900 28px var(--font-sans)' }}>Admin · The English Project</h1>
        <Button size="sm" variant="outline" onClick={logout}>Salir</Button>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Button size="sm" variant={tab === 'bookings' ? 'solid' : 'outline'} onClick={() => setTab('bookings')}>Reservas</Button>
        <Button size="sm" variant={tab === 'schedule' ? 'solid' : 'outline'} onClick={() => setTab('schedule')}>Horarios</Button>
      </div>
      {tab === 'bookings' ? <BookingsList /> : <ScheduleGrid />}
    </main>
  );
}
