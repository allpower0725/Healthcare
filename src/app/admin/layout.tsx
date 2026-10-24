import Link from 'next/link';
import { Suspense } from 'react';
import { logout } from '@/lib/auth/actions';
import { ADMIN_HOME, requireUser } from '@/lib/auth/dal';
import { countPendingUsers } from '@/lib/users/service';
import styles from './admin.module.css';
import { Avatar, ROLE_LABELS } from './ui';
import { NavLinks } from './nav-links';

export default function AdminLayout({ children }: LayoutProps<'/admin'>) {
  return (
    <div className={styles.shell}>
      {/* 功能不多，選單直接放在頂部列 */}
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.brand} href={ADMIN_HOME}>
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
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className={styles.content}>{children}</main>
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
        { href: ADMIN_HOME, label: '表單管理', icon: 'forms' },
        { href: '/admin/submissions', label: '協同完成', icon: 'docs' },
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
