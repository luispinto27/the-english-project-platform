import styles from './Badge.module.css';

export function Badge({ children, tone = 'outline' }: { children: React.ReactNode; tone?: 'outline' | 'dark' }) {
  return <span className={[styles.badge, styles[tone]].join(' ')}>{children}</span>;
}
