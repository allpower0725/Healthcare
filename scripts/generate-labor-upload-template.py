# 原樣保留指定同意書的全部字形、顏色與版面，產生 SVG 底稿及套印座標。
# 依賴：PyMuPDF==1.26.7；從專案根目錄執行，不修改來源 PDF。
from pathlib import Path
import sys, json
sys.path.insert(0, str(Path('.local/python').resolve()))
import pymupdf

source = Path('預防保健表單電子檔/特約醫事機構上傳民眾自費檢驗(查)結果/自費檢驗（查）、藥物、醫材資料上傳個人資料蒐集處理及利用同意書.pdf')
doc = pymupdf.open(source)
assert len(doc) == 1
page = doc[0]
assert abs(page.rect.width - 595.32) < .01 and abs(page.rect.height - 841.92) < .01
assert '保留隨時取消本同意書之權利' in page.get_text()
Path('public/forms/labor-upload-template.svg').write_text(page.get_svg_image(text_as_path=True), encoding='utf-8')

texts = []
def bind(key, x, y, width):
    texts.append(dict(key=key, x=x, y=y, width=width))
bind('profile.name', 118.1, 142.22, 83.9)
bind('hospital.name', 230.1, 142.22, 139.9)
for suffix, x, width in [('Y', 118.1, 20.9), ('M', 153.0, 21.0), ('D', 188.1, 21.0)]:
    bind('labor.uploadFrom'+suffix, x, 178.22, width)
bind('labor.uploadYears', 331.8, 178.22, 20.8)
bind('labor.uploadUseYears', 342.1, 286.25, 20.9)
bind('hospital.name', 90.02, 567.67, 140.0)
for suffix, x in [('Y', 349.2), ('M', 384.1), ('D', 419.1)]:
    bind('profile.birth'+suffix, x, 623.71, 20.9)
bind('profile.idNo', 322.0, 651.70, 178.0)
bind('labor.uploadRepresentativeName', 322.0, 679.78, 65.0)
bind('labor.uploadRepresentativeIdNo', 322.0, 707.74, 178.0)
for suffix, x, width in [('Y', 266.0, 56.0), ('M', 343.0, 42.0), ('D', 406.0, 42.0)]:
    bind('labor.uploadSigned'+suffix, x, 763.78, width)
checks = [
    dict(key='labor.uploadYearsMode', value='seven', x=258.2, y=178.22),
    dict(key='labor.uploadYearsMode', value='custom', x=317.7, y=178.22),
    dict(key='labor.uploadUseMode', value='permanent', x=272.1, y=286.25),
    dict(key='labor.uploadUseMode', value='custom', x=328.0, y=286.25),
    dict(key='labor.uploadCloud', value='1', x=468.2, y=322.25),
]
output = '// 由 scripts/generate-labor-upload-template.py 產生；座標與原始 PDF 相同。\n'
output += 'export const LABOR_UPLOAD_PRINT_TEXT = ' + json.dumps(texts, ensure_ascii=False, indent=2) + ' as const;\n'
output += 'export const LABOR_UPLOAD_PRINT_CHECKS = ' + json.dumps(checks, ensure_ascii=False, indent=2) + ' as const;\n'
Path('src/forms/labor/upload-print-layout.ts').write_text(output, encoding='utf-8')
print(f'Generated original template, {len(texts)} text fields and {len(checks)} checkboxes.')
