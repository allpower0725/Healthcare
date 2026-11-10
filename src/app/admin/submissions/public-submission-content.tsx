'use client';

import { useMemo } from 'react';
import { FormContext, type FormContextValue } from '@/components/forms/context';
import type { FormValues } from '@/db/schema';
import type { FormId } from '@/lib/forms/catalog';
import { getFormDef } from '@/lib/forms/defs';
import { conditionsHold } from '@/lib/forms/engine';
import { getFormUi } from '@/forms/registry';
import styles from './submissions.module.css';

export function PublicSubmissionContent({ formId, values, title = '民眾填寫內容' }: {
  formId: FormId;
  values: FormValues;
  title?: string;
}) {
  const def = getFormDef(formId)!;
  const { Public } = getFormUi(formId)!;
  const context = useMemo<FormContextValue>(() => ({
    def,
    values,
    set: () => {},
    errors: {},
    validate: () => {},
    readOnly: true,
    holds: (condition) => conditionsHold(condition, values),
  }), [def, values]);

  return (
    <details className={styles.publicPart} open>
      <summary>
        <span>{title}</span>
        <span className={`btn btn--ghost btn--mini ${styles.toggle}`} aria-hidden="true">
          <span className={styles.whenClosed}>展開 ▾</span>
          <span className={styles.whenOpen}>收合 ▴</span>
        </span>
      </summary>
      <FormContext.Provider value={context}>
        <fieldset className="public" disabled>
          <legend className="sr-only">{title}</legend>
          <Public prefilled={false} />
        </fieldset>
      </FormContext.Provider>
    </details>
  );
}
