import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';
import styles from './back-control.module.css';

export const backControlClassName = styles.back;

export function BackLabel({ children }: { children: ReactNode }) {
  return <>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m10 5-7 7 7 7M3 12h18" />
    </svg>
    <span>{children}</span>
  </>;
}

export function BackLink({ children, className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} className={`${styles.back}${className ? ` ${className}` : ''}`}><BackLabel>{children}</BackLabel></Link>;
}

export function BackButton({ children, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${styles.back}${className ? ` ${className}` : ''}`}><BackLabel>{children}</BackLabel></button>;
}

/** 固定在所屬頁面頂端；後台置於主選單下，列印時隱藏。 */
export function BackBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`${styles.bar}${className ? ` ${className}` : ''}`}>{children}</div>;
}
