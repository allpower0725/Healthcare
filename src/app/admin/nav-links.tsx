'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './admin.module.css';

type Item = { href: string; label: string; icon: keyof typeof ICONS; count?: number };

const ICONS = {
  home: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  ),
  forms: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19h1.5M19 14h1" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="8.5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M15.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.2a6.5 6.5 0 0 1 3.5 5.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function NavLinks({ items }: { items: Item[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="主選單">
      {items.map((item) => {
        const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            className={styles.navLink}
            href={item.href}
            aria-current={active ? 'page' : undefined}
          >
            {ICONS[item.icon]}
            {item.label}
            {item.count ? (
              <span className="badge badge--count" aria-label={`${item.count} 位待審核`}>
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
