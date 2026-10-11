'use client';
import styles from './TimeSlot.module.css';

export function TimeSlot({
  time,
  status,
  selected,
  onClick,
}: {
  time: string;
  status: 'available' | 'booked';
  selected: boolean;
  onClick: () => void;
}) {
  const cls = [styles.slot, selected ? styles.selected : status === 'booked' ? styles.booked : styles.available].join(' ');
  return (
    <button type="button" className={cls} disabled={status === 'booked'} onClick={onClick}>
      {time}
    </button>
  );
}
