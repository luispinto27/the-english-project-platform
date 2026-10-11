import styles from './Footer.module.css';

export function Footer({ note }: { note: string }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.brand}>The English Project</span>
        <p className={styles.note}>{note}</p>
      </div>
    </footer>
  );
}
