'use client';
import { useEffect, useState } from 'react';
import { CalendarCheck, ChalkboardTeacher, WhatsappLogo, CheckCircle } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { TimeSlot } from '@/components/ui/TimeSlot';
import { fmtTime } from '@/lib/format';
import { nameValid, emailValid, phoneValid } from '@/lib/validate';
import styles from './BookingFlow.module.css';

type DayAvailability = { date: string; weekday: number; slots: { minuteOfDay: number; status: 'available' | 'booked' }[] };
type BookingResponse = { booking: { id: number; classDate: string; minuteOfDay: number; name: string; email: string; phone: string }; dayLabel: string; timeLabel: string; whatsappUrl: string; gcalUrl: string };

const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function BookingFlow() {
  const [days, setDays] = useState<DayAvailability[] | null>(null);
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadAvailability() {
    setLoadError(null);
    const res = await fetch('/api/availability?days=14');
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setLoadError(body?.error ?? 'No pudimos cargar la disponibilidad. Intenta de nuevo.');
      return;
    }
    const data: DayAvailability[] = await res.json();
    setDays(data);
    if (dayIdx === null) {
      const firstOpen = data.findIndex((d) => d.slots.some((s) => s.status === 'available'));
      setDayIdx(firstOpen === -1 ? 0 : firstOpen);
    }
  }

  useEffect(() => {
    loadAvailability();
  }, []);

  if (loadError) {
    return (
      <section className={styles.section}>
        <div className={[styles.loading, styles.loadErrorActions].join(' ')}>
          <div className={styles.submitError}>{loadError}</div>
          <Button size="lg" onClick={loadAvailability}>Reintentar</Button>
        </div>
      </section>
    );
  }

  if (!days) return <section className={styles.section}><p className={styles.loading}>Cargando disponibilidad…</p></section>;

  const day = dayIdx !== null ? days[dayIdx] : undefined;
  const nameOk = nameValid(name);
  const emailOk = emailValid(email);
  const phoneOk = phoneValid(phone);
  const ready = slot !== null && nameOk && emailOk && phoneOk;

  async function submit() {
    if (!ready || !day) {
      setTried(true);
      return;
    }
    setSending(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classDate: day.date, minuteOfDay: slot, name, email, phone }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSubmitError(data?.error ?? 'Error inesperado, intenta de nuevo.');
        setSlot(null);
        await loadAvailability();
        return;
      }
      setResult(data as BookingResponse);
    } finally {
      setSending(false);
    }
  }

  if (result) {
    const firstName = result.booking.name.trim().split(/\s+/)[0] ?? '';
    return (
      <section className={styles.section}>
        <div className={styles.confirmWrap}>
          <CheckCircle size={56} weight="fill" color="var(--lime-500)" />
          <h2 className={styles.confirmTitle}>¡Listo, {firstName}!</h2>
          <p className={styles.confirmLead}>Tu prueba quedó agendada. Te envié la invitación a <b>{result.booking.email}</b>.</p>
          <div className={styles.confirmCard}>
            <div className={styles.confirmCardHeader}>
              <span>Prueba de 30 minutos</span>
              <Badge tone="dark">Virtual · 1-on-1</Badge>
            </div>
            <div className={styles.confirmCardBody}>
              <div className={styles.confirmRow}><CalendarCheck size={24} weight="bold" /><div><div className={styles.confirmRowTitle}>{result.dayLabel}</div><div>{result.timeLabel} · hora de Colombia</div></div></div>
              <div className={styles.confirmRow}><ChalkboardTeacher size={24} weight="bold" /><div><div className={styles.confirmRowTitle}>David E. Garcia V.</div><div>Videollamada — el enlace va en la invitación</div></div></div>
              <div className={styles.confirmRow}><WhatsappLogo size={24} weight="fill" /><div><div className={styles.confirmRowTitle}>{result.booking.phone}</div><div>Te escribo por aquí un día antes</div></div></div>
            </div>
          </div>
          <a href={result.gcalUrl} target="_blank" rel="noopener"><Button size="lg" fullWidth iconLeft={CalendarCheck}>Añadir a mi calendario</Button></a>
          <a href={result.whatsappUrl} target="_blank" rel="noopener"><Button size="lg" variant="outline" fullWidth iconLeft={WhatsappLogo}>Escribirle a David</Button></a>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Disponibilidad</span>
          <h2 className={styles.title}>Agenda tu prueba gratis</h2>
          <p className={styles.lead}>30 minutos para conocerte, ver tu nivel y contarte cómo trabajamos. Hora de Colombia (GMT-5).</p>
        </div>
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}><span>1. Elige el día</span></div>
            <div className={styles.dayScroller}>
              {days.map((d, i) => {
                const free = d.slots.filter((s) => s.status === 'available').length;
                const off = free === 0;
                const selected = i === dayIdx;
                const dow = new Date(d.date + 'T12:00:00').getDay();
                return (
                  <button
                    key={d.date}
                    disabled={off}
                    onClick={() => { setDayIdx(i); setSlot(null); }}
                    className={[styles.dayBtn, selected ? styles.dayBtnSelected : off ? styles.dayBtnOff : ''].join(' ')}
                  >
                    <span className={styles.dayWd}>{WEEKDAY_SHORT[dow]}</span>
                    <span className={styles.dayNum}>{Number(d.date.slice(-2))}</span>
                    <span className={styles.dayNote}>{off ? 'Sin cupos' : `${free} ${free === 1 ? 'cupo' : 'cupos'}`}</span>
                  </button>
                );
              })}
            </div>
            <div className={styles.cardHeader}><span>2. Elige la hora</span></div>
            <div className={styles.slotsGrid}>
              {(day?.slots ?? []).map((s) => (
                <TimeSlot
                  key={s.minuteOfDay}
                  time={fmtTime(s.minuteOfDay)}
                  status={s.status}
                  selected={s.minuteOfDay === slot}
                  onClick={() => setSlot(s.minuteOfDay)}
                />
              ))}
            </div>
          </div>

          <div className={styles.formCard}>
            <span className={styles.cardHeader}>3. Tus datos</span>
            {submitError ? <div className={styles.submitError}>{submitError}</div> : null}
            <Input label="Nombre" placeholder="Tu nombre completo" value={name} onChange={setName} error={tried && !nameOk ? 'Escribe tu nombre' : undefined} />
            <Input label="Correo" type="email" placeholder="tu@correo.com" value={email} onChange={setEmail} error={tried && !emailOk ? 'Revisa tu correo' : undefined} helper="Aquí llega la invitación con el enlace de la videollamada." />
            <Input label="Teléfono / WhatsApp" type="tel" placeholder="300 000 0000" value={phone} onChange={setPhone} error={tried && !phoneOk ? 'Escribe un número válido' : undefined} />
            <Button size="lg" fullWidth disabled={sending} onClick={submit}>
              {sending ? 'Agendando…' : slot === null ? 'Elige un horario' : `Agendar ${fmtTime(slot)}`}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
