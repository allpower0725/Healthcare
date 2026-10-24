import Link from 'next/link';
import { Suspense } from 'react';
import { logout } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/dal';
import { countPendingUsers } from '@/lib/users/service';
import styles from './admin.module.css';
import { Avatar, ROLE_LABELS } from './ui';
import { NavLinks } from './nav-links';

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/admin">
          <img src="/brand/logo.svg" alt="烏日澄清醫院" width={160} height={30} />
          <span>預防保健表單後台</span>
        </Link>
        <Suspense
          fallback={
            <div className={styles.navSkeleton} aria-hidden="true">
              <span />
              <span />
            </div>
          }
        >
          <Nav />
        </Suspense>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

async function Nav() {
  const user = await requireUser();
  const isManager = user.role !== 'staff';
  const pending = isManager ? await countPendingUsers() : 0;

  return (
    <NavLinks
      items={[
        { href: '/admin', label: '首頁', icon: 'home' },
        { href: '/admin/forms', label: '表單管理', icon: 'forms' },
        ...(isManager ? [{ href: '/admin/users', label: '使用者管理', icon: 'users' as const, count: pending }] : []),
      ]}
    />
  );
}

async function UserMenu() {
  const user = await requireUser();
  return (
    <div className={styles.user}>
      <div className={styles.userText}>
        <span className={styles.userName}>{user.name}</span>
        <span className={`badge badge--${user.role}`}>{ROLE_LABELS[user.role]}</span>
      </div>
      <Avatar name={user.name} src={user.avatarUrl} />
      <form action={logout}>
        <button type="submit" className="btn btn--ghost btn--sm">
          登出
        </button>
      </form>
    </div>
  );
}
