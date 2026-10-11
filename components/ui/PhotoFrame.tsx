import Image from 'next/image';
import styles from './PhotoFrame.module.css';

export function PhotoFrame({ src, alt, ratio = '4 / 5' }: { src: string; alt: string; ratio?: string }) {
  return (
    <div className={styles.frame} style={{ aspectRatio: ratio }}>
      <Image src={src} alt={alt} fill style={{ objectFit: 'cover' }} />
    </div>
  );
}
