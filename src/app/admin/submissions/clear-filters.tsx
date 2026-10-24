'use client';

import { useRouter } from 'next/navigation';

type Props = {
  /** 清除後要前往的網址（保留目前的排序） */
  href: string;
  defaultStatuses: readonly string[];
};

/**
 * 「清除條件」：先把欄位改回預設再前往列表。
 * 只靠連結的話，網址沒變（例如還沒按過篩選）時頁面不會重畫，已輸入或取消的勾選會留在畫面上。
 */
export function ClearFilters({ href, defaultStatuses }: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="btn btn--ghost"
      onClick={(event) => {
        const form = event.currentTarget.form;
        for (const el of form?.elements ?? []) {
          if (!(el instanceof HTMLInputElement)) continue;
          if (el.name === 'id') el.value = '';
          else if (el.name === 'form') el.checked = true;
          else if (el.name === 'status') el.checked = defaultStatuses.includes(el.value);
        }
        router.push(href);
      }}
    >
      清除條件
    </button>
  );
}
