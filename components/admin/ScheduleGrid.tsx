'use client';
import { useEffect, useState } from 'react';
import { fmtTime } from '@/lib/format';
import styles from './ScheduleGrid.module.css';

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const CANDIDATE_MINUTES = Array.from({ length: 17 }, (_, i) => 300 + i * 60); // 5:00 am .. 9:00 pm, hourly

type WeeklySlot = { id: number; weekday: number; minuteOfDay: number; active: boolean };

export function ScheduleGrid() {
  const [slots, setSlots] = useState<WeeklySlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/weekly-slots');
    if (!res.ok) {
      setError('No pudimos cargar los horarios. Intenta de nuevo en un momento.');
      return;
    }
    setError(null);
    setSlots(await res.json());
  }

  useEffect(() => { load(); }, []);

  if (error) return <p className={styles.error}>{error}</p>;
  if (!slots) return <p>Cargando horarios…</p>;

  const isActive = (weekday: number, minuteOfDay: number) =>
    slots.some((s) => s.weekday === weekday && s.minuteOfDay === minuteOfDay && s.active);

  async function toggle(weekday: number, minuteOfDay: number) {
    await fetch('/api/admin/weekly-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekday, minuteOfDay, active: !isActive(weekday, minuteOfDay) }),
    });
    await load();
  }

  return (
    <div className={styles.wrap}>
      {WEEKDAY_SHORT.map((label, weekday) => (
        <div key={weekday} className={styles.row}>
          <span className={styles.rowLabel}>{label}</span>
          <div className={styles.cells}>
            {CANDIDATE_MINUTES.map((m) => {
              const active = isActive(weekday, m);
              return (
                <button
                  key={m}
                  onClick={() => toggle(weekday, m)}
                  className={[styles.cell, active ? styles.cellActive : ''].join(' ')}
                >
                  {fmtTime(m)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
