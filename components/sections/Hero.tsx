import { ArrowRight, Asterisk } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/Button';
import { Highlight } from '@/components/ui/Highlight';
import { PhotoFrame } from '@/components/ui/PhotoFrame';
import styles from './Hero.module.css';

export function Hero({ onAgendaClick }: { onAgendaClick: () => void }) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.kicker}>In the AI age, learning skills is more relevant than ever.</div>
          <h1 className={styles.title}>
            Clases de inglés <Highlight>1-on-1</Highlight> con metas reales.
          </h1>
          <p className={styles.lead}>
            <Asterisk size={28} weight="fill" color="var(--lime-500)" />
            <span>Clases virtuales ajustadas a tus intereses, con tiempos realistas y alineadas a estándares internacionales.</span>
          </p>
          <div className={styles.ctaBlock}>
            <Button size="lg" iconRight={ArrowRight} onClick={onAgendaClick}>
              Agenda tu prueba gratis de 30 min
            </Button>
            <span className={styles.ctaNote}>Sin cuenta ni pagos. Solo eliges un horario y dejas tus datos.</span>
          </div>
          <div className={styles.teacher}>
            <div className={styles.avatar}>DG</div>
            <div>
              <div className={styles.teacherName}>Teacher: David E. Garcia V.</div>
              <div className={styles.teacherNote}>Más de 10 años enseñando inglés</div>
            </div>
          </div>
        </div>
        <div className={styles.photo}>
          <PhotoFrame src="/photos/student-laptop.png" alt="Estudiante tomando clase de inglés en su laptop" ratio="4 / 5" />
        </div>
      </div>
    </section>
  );
}
