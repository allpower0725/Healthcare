import type { Metadata } from 'next';
import { Suspense } from 'react';
import type { UserStatus } from '@/db/schema';
import { requireManager } from '@/lib/auth/dal';
import { formatDateTime } from '@/lib/time';
import { availableActions, listUsers, type UserAction } from '@/lib/users/service';
import adminStyles from '../admin.module.css';
import { Avatar, ROLE_LABELS } from '../ui';
import { UserActionButton } from './user-action-button';
import styles from './users.module.css';

export const metadata: Metadata = { title: '使用者管理' };

const SECTIONS: { status: UserStatus; title: string; empty?: string }[] = [
  { status: 'pending', title: '待審核', empty: '目前沒有待審核的申請。' },
  { status: 'active', title: '使用中', empty: '目前沒有使用中的人員。' },
  { status: 'disabled', title: '已停用' },
  { status: 'rejected', title: '未通過' },
];

const ACTION_UI: Record<
  UserAction,
  { label: string; variant: 'primary' | 'ghost' | 'danger'; confirm?: (name: string) => string }
> = {
  approve: { label: '核准', variant: 'primary' },
  reject: { label: '拒絕', variant: 'danger', confirm: (n) => `確定拒絕「${n}」的使用申請？` },
  disable: { label: '停用', variant: 'danger', confirm: (n) => `確定停用「${n}」？停用後會立即登出。` },
  enable: { label: '恢復使用', variant: 'ghost' },
  promote: {
    label: '設為管理者',
    variant: 'ghost',
    confirm: (n) => `確定把「${n}」設為管理者？管理者可以審核其他人員的申請。`,
  },
  demote: { label: '改回一般人員', variant: 'ghost', confirm: (n) => `確定把「${n}」改回一般人員？` },
};

export default function UsersPage() {
  return (
    <>
      <div className={adminStyles.pageHead}>
        <h1>使用者管理</h1>
        <p>
          人員用 Google 登入後會出現在「待審核」，核准後即可使用後台。最高管理者可以把人員設為管理者，管理者也能審核申請。
        </p>
      </div>
      <Suspense fallback={<div className={adminStyles.skeleton} aria-label="載入中" />}>
        <UserSections />
      </Suspense>
    </>
  );
}

async function UserSections() {
  const actor = await requireManager();
  const rows = await listUsers();

  return (
    <>
      {SECTIONS.map((section) => {
        const list = rows.filter((row) => row.status === section.status);
        if (list.length === 0 && !section.empty) return null;

        return (
          <section key={section.status} className={styles.section} aria-labelledby={`sec-${section.status}`}>
            <h2 className={styles.sectionHead} id={`sec-${section.status}`}>
              {section.title}
              <span className={styles.count}>{list.length}</span>
            </h2>
            <div className={`${adminStyles.card} ${section.status === 'pending' && list.length ? styles.pending : ''}`}>
              {list.length === 0 ? (
                <p className={styles.empty}>{section.empty}</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">人員</th>
                      <th scope="col">角色</th>
                      <th scope="col">申請／審核</th>
                      <th scope="col">最後登入</th>
                      <th scope="col">
                        <span className="sr-only">操作</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className={styles.person}>
                            <Avatar name={row.name} src={row.avatarUrl} />
                            <div className={styles.personText}>
                              <span className={styles.personName}>
                                {row.name}
                                {row.id === actor.id && <span className={styles.you}>（你）</span>}
                              </span>
                              <span className={styles.email}>{row.email ?? '尚未綁定 Google'}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="角色">
                          <span className={`badge badge--${row.status === 'pending' ? 'pending' : row.role}`}>
                            {row.status === 'pending' ? '申請中' : ROLE_LABELS[row.role]}
                          </span>
                        </td>
                        <td className={styles.meta} data-label="申請">
                          {formatDateTime(row.createdAt)}
                          {row.reviewerName && (
                            <span className={styles.metaSub}>
                              {row.reviewerName} 審核・{formatDateTime(row.reviewedAt)}
                            </span>
                          )}
                        </td>
                        <td className={styles.meta} data-label="最後登入">
                          {formatDateTime(row.lastLoginAt)}
                        </td>
                        <td>
                          <div className={styles.actions}>
                            {availableActions(actor, row).map((action) => {
                              const ui = ACTION_UI[action];
                              return (
                                <UserActionButton
                                  key={action}
                                  userId={row.id}
                                  action={action}
                                  label={ui.label}
                                  variant={ui.variant}
                                  confirmText={ui.confirm?.(row.name)}
                                />
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
