'use client';
import { useEffect, useState } from 'react';
import { fmtDayLabel, fmtTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import styles from './BookingsList.module.css';

type Booking = { id: number; classDate: string; minuteOfDay: number; name: string; email: string; phone: string };

export function BookingsList() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/bookings');
    if (!res.ok) {
      setError('No pudimos cargar las reservas. Intenta de nuevo en un momento.');
      return;
    }
    setError(null);
    setBookings(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function cancel(id: number) {
    await fetch(`/api/admin/bookings/${id}/cancel`, { method: 'POST' });
    await load();
  }

  if (error) return <p className={styles.error}>{error}</p>;
  if (!bookings) return <p>Cargando reservas…</p>;
  if (bookings.length === 0) return <p className={styles.empty}>No hay reservas próximas.</p>;

  return (
    <div className={styles.list}>
      {bookings.map((b) => (
        <div key={b.id} className={styles.row}>
          <div>
            <div className={styles.name}>{b.name}</div>
            <div className={styles.meta}>{fmtDayLabel(b.classDate)} · {fmtTime(b.minuteOfDay)}</div>
            <div className={styles.meta}>{b.email} · {b.phone}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => cancel(b.id)}>Cancelar</Button>
        </div>
      ))}
    </div>
  );
}
