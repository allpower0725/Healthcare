import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { getTableConfig } from 'drizzle-orm/pg-core';
import ts from 'typescript';
import { SUBMISSION_STATUSES, submissions } from '../src/db/schema';
import { FORM_IDS, FORMS } from '../src/lib/forms/catalog';
import { getFormDef } from '../src/lib/forms/defs';
import type { FieldSpec } from '../src/lib/forms/engine';
import { columnLabels, fieldLabels, fieldOptions } from './lib/submission-dictionary-metadata';

const root = new URL('../', import.meta.url);
const file = (path: string) => new URL(path, root);
const check = process.argv.includes('--check');

/** 讀取畫面既有的字串常數，不載入 CSS、頁面或資料庫連線。 */
function readLabels(path: string, constant: string): Record<string, string> {
  const source = ts.createSourceFile(path, readFileSync(file(path), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let labels: Record<string, string> | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === constant && node.initializer) {
      assert(ts.isObjectLiteralExpression(node.initializer), `${constant} 必須是字串對照物件；若實作改變，請同步調整字典產生器。`);
      labels = {};
      for (const prop of node.initializer.properties) {
        assert(ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.initializer), `${constant} 包含非字串對照。`);
        const key = ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name) ? prop.name.text : undefined;
        assert(key, `${constant} 包含不支援的 key。`);
        labels[key] = prop.initializer.text;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert(labels, `找不到 ${path} 的 ${constant}。`);
  return labels;
}

const statusLabels = readLabels('src/app/admin/ui.tsx', 'SUBMISSION_STATUS_LABELS');
const exactKeys = (actual: readonly string[], expected: readonly string[], name: string) =>
  assert.deepEqual([...actual].sort(), [...expected].sort(), `${name} 的 key 不完整或含有過期定義。`);
exactKeys(Object.keys(FORMS), FORM_IDS, 'form_id');
exactKeys(Object.keys(statusLabels), SUBMISSION_STATUSES, 'status');

const columns = getTableConfig(submissions).columns.map((column) => {
  assert(columnLabels[column.name]?.trim(), `缺少實體欄位 ${column.name} 的中文名稱。`);
  return { key: column.name, label: columnLabels[column.name] };
});
exactKeys(Object.keys(columnLabels), columns.map((c) => c.key), 'heal_submissions 實體欄位');

const usedLabels = new Set<string>();
const usedOptions = new Set<string>();
function describeField(key: string, spec: FieldSpec) {
  assert(fieldLabels[key]?.trim(), `缺少 ${key} 的中文名稱；請更新 scripts/lib/submission-dictionary-metadata.ts。`);
  assert(/[\u3400-\u9fff]/u.test(fieldLabels[key]), `${key} 的名稱須包含中文說明。`);
  usedLabels.add(key);
  let choices: Record<string, string> | undefined;
  if (spec.kind === 'choice' || spec.kind === 'multi') {
    const source = fieldOptions[key];
    assert(source, `缺少 ${key} 的選項對照。`);
    choices = Object.fromEntries(source);
    assert.equal(Object.keys(choices).length, source.length, `${key} 的選項代碼重複。`);
    exactKeys(Object.keys(choices), spec.options ?? [], `${key} 選項`);
    assert(Object.values(choices).every((v) => v.trim()), `${key} 有空白的選項名稱。`);
    usedOptions.add(key);
  } else if (spec.kind === 'flag') {
    choices = { [spec.value ?? '1']: '勾選' };
  }
  // 值本身就是名稱時不重複列出，例如「臺北市 → 臺北市」、「16 → 16」。
  const meaningfulOptions = Object.fromEntries(Object.entries(choices ?? {}).filter(([value, label]) => value !== label));
  return {
    label: fieldLabels[key],
    ...(Object.keys(meaningfulOptions).length ? { options: meaningfulOptions } : {}),
  };
}

const forms = Object.fromEntries(FORM_IDS.map((id) => {
  const def = getFormDef(id);
  assert(def, `缺少 ${id} 的表單定義。`);
  const part = (name: 'public' | 'staff') => Object.fromEntries(Object.entries(def.fields)
    .filter(([, spec]) => spec.part === name).map(([key, spec]) => [key, describeField(key, spec)]));
  return [id, {
    public_data: part('public'), staff_data: part('staff'),
  }];
}));
exactKeys(Object.keys(fieldLabels), [...usedLabels], '欄位中文名稱');
exactKeys(Object.keys(fieldOptions), [...usedOptions], '欄位選項對照');

const dictionary = {
  columns: Object.fromEntries(columns.map(({ key, label }) => [key, label])),
  form_id: Object.fromEntries(FORM_IDS.map((id) => [id, FORMS[id].name])),
  status: statusLabels,
  forms,
};

const cell = (value: unknown) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
const code = (value: unknown) => '`' + cell(value) + '`';
const mappingRows = (mapping: Record<string, string>) => Object.entries(mapping)
  .map(([key, label]) => `| ${code(key)} | ${cell(label)} |`);
const lines = [
  '# heal_submissions 共用資料對照表', '',
  '依表單種類查閱 `public_data`、`staff_data`。選項用「代碼 → 名稱」表示，多個選項以「；」分隔；值本身就是名稱的選項省略對照。', '',
  '## 實體欄位', '', '| 欄位 | 中文名稱 |', '|---|---|',
  ...mappingRows(dictionary.columns), '',
  '## form_id', '', '| 代碼 | 中文名稱 |', '|---|---|',
  ...mappingRows(dictionary.form_id), '',
  '## status', '', '| 代碼 | 中文名稱 |', '|---|---|',
  ...mappingRows(dictionary.status), '',
  '## 表單內容', '',
];
let fieldCount = 0;
for (const [id, form] of Object.entries(forms)) {
  lines.push(`### ${id}－${dictionary.form_id[id]}`, '');
  for (const part of ['public_data', 'staff_data'] as const) {
    lines.push(`#### ${part}`, '');
    const entries = Object.entries(form[part]);
    fieldCount += entries.length;
    if (!entries.length) { lines.push('無院所填寫欄位。', ''); continue; }
    lines.push('| key | 中文名稱 | 選項代碼 → 名稱 |', '|---|---|---|');
    for (const [key, field] of entries) {
      const choices = Object.entries(field.options ?? {}).map(([value, label]) => `${code(value)} → ${cell(label)}`).join('；');
      lines.push(`| ${code(key)} | ${cell(field.label)} | ${choices} |`);
    }
    lines.push('');
  }
}
lines.push('維護方式見 [開發規範](../../AGENTS.md#共用資料契約與欄位對照)；相同內容另提供 [JSON 字典](heal-submissions.json)。', '');

for (const [path, content] of [
  ['docs/data/heal-submissions.json', JSON.stringify(dictionary, null, 2) + '\n'],
  ['docs/data/heal-submissions.md', lines.join('\n')],
] as const) {
  if (check) {
    let actual = '';
    try { actual = readFileSync(file(path), 'utf8').replace(/\r\n/g, '\n'); } catch { /* 缺少產物也視為未同步 */ }
    assert.equal(actual === content, true, `${path} 未同步；請執行 npm run dictionary:generate 並提交產生的差異。`);
  } else writeFileSync(file(path), content, 'utf8');
}
console.log(`${check ? '已核對' : '已產生'} heal_submissions 字典：${columns.length} 個實體欄位、${FORM_IDS.length} 種表單、${fieldCount} 個 JSONB 欄位（依表單分列）。`);
