import { ChalkboardTeacher, ChatsCircle, Exam, Briefcase } from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/Badge';
import { SERVICES } from '@/lib/services-data';
import styles from './Services.module.css';

const ICONS: Record<string, Icon> = {
  'chalkboard-teacher': ChalkboardTeacher,
  'chats-circle': ChatsCircle,
  exam: Exam,
  briefcase: Briefcase,
};

export function Services() {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Servicios</span>
          <h2 className={styles.title}>¿Qué ofrezco y para quién?</h2>
          <p className={styles.lead}>
            Todo es virtual y 1-on-1, trabajando listening, reading, speaking y writing — y la confianza para usarlos.
          </p>
        </div>
        <div className={styles.grid}>
          {SERVICES.map((s) => {
            const ServiceIcon = ICONS[s.icon];
            return (
              <div key={s.title} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.iconBox}>
                    <ServiceIcon size={26} weight="fill" />
                  </div>
                  <span className={styles.who}>{s.who}</span>
                </div>
                <h3 className={styles.cardTitle}>{s.title}</h3>
                <p className={styles.cardDesc}>{s.desc}</p>
                <div className={styles.tags}>
                  {s.tags.map((t) => (
                    <Badge key={t} tone="outline">{t}</Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
