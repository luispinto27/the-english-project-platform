'use client';
import { useId } from 'react';
import styles from './Input.module.css';

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helper,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  helper?: string;
}) {
  const id = useId();
  return (
    <div className={styles.wrapper}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <input
        id={id}
        className={[styles.input, error ? styles.inputError : ''].join(' ')}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <span className={styles.error}>{error}</span> : helper ? <span className={styles.helper}>{helper}</span> : null}
    </div>
  );
}
