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
    <label className={styles.wrapper} htmlFor={id}>
      <span className={styles.label}>{label}</span>
      <input
        id={id}
        className={[styles.input, error ? styles.inputError : ''].join(' ')}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error ? <span className={styles.error}>{error}</span> : helper ? <span className={styles.helper}>{helper}</span> : null}
    </label>
  );
}
