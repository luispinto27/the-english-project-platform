'use client';
import type { ComponentType } from 'react';
import styles from './Button.module.css';

type IconProps = {
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
};

export function Button({
  children,
  size = 'lg',
  variant = 'solid',
  fullWidth = false,
  disabled = false,
  iconLeft,
  iconRight,
  onClick,
  type = 'button',
}: {
  children: React.ReactNode;
  size?: 'sm' | 'lg';
  variant?: 'solid' | 'outline';
  fullWidth?: boolean;
  disabled?: boolean;
  iconLeft?: ComponentType<IconProps>;
  iconRight?: ComponentType<IconProps>;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const IconLeft = iconLeft;
  const IconRight = iconRight;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[styles.button, styles[size], styles[variant], fullWidth ? styles.fullWidth : ''].join(' ')}
    >
      {IconLeft ? <IconLeft size={size === 'lg' ? 20 : 16} weight="bold" /> : null}
      <span>{children}</span>
      {IconRight ? <IconRight size={size === 'lg' ? 20 : 16} weight="bold" /> : null}
    </button>
  );
}
