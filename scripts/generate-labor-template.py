# 從已核對的原始 PDF 產生向量底稿及套印座標；不修改來源 PDF。
# 依賴：PyMuPDF==1.26.7。從專案根目錄執行本檔。
import sys, pathlib, json, xml.etree.ElementTree as ET
sys.path.insert(0, str(pathlib.Path('.local/python').resolve()))
import pymupdf
source = pathlib.Path('預防保健表單電子檔/勞工健康檢查.pdf')
pathlib.Path('.local/design-preview').mkdir(parents=True, exist_ok=True)
page = pymupdf.open(source)[0]
svg = ET.fromstring(page.get_svg_image(text_as_path=True))
removed = 0
for parent in svg.iter():
    for child in list(parent):
        if child.get('stroke', '').lower() in ('#ff0000', 'red'):
            parent.remove(child)
            removed += 1
assert removed == 4, f'Expected four edges of the red guide rectangle, got {removed}'
out = pathlib.Path('public/forms/labor-template.svg')
ET.register_namespace('', 'http://www.w3.org/2000/svg')
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
ET.ElementTree(svg).write(out, encoding='utf-8', xml_declaration=True)
spans = []
for block in page.get_text('dict')['blocks']:
    for line in block.get('lines', []):
        for span in line['spans']:
            spans.append({'text': span['text'], 'box': span['bbox'], 'origin': span['origin'], 'size': span['size']})
pathlib.Path('.local/design-preview/labor-text.json').write_text(json.dumps(spans, ensure_ascii=False, indent=2), encoding='utf-8')
lines = []
for block in page.get_text('rawdict')['blocks']:
    for line in block.get('lines', []):
        chars = [c for span in line['spans'] for c in span['chars']]
        if chars:
            lines.append(chars)
def chars_at(y):
    return [c for line in lines for c in line if abs(c['origin'][1] - y) < .4]
def blanks(y):
    groups = []
    current = []
    for c in chars_at(y):
        if c['c'] == '_':
            current.append(c)
        elif current:
            groups.append(current)
            current = []
    if current: groups.append(current)
    return [(g[0]['bbox'][0], g[-1]['bbox'][2] - g[0]['bbox'][0]) for g in groups]
texts = []
checks = []
def bind_blanks(y, keys):
    groups = blanks(y)
    assert len(groups) == len(keys), (y, len(groups), keys)
    for key, (x, width) in zip(keys, groups):
        texts.append(dict(key=key, x=round(x,3), y=y, width=round(width,3)))
def bind_checks(y, key, values):
    boxes = [c for c in chars_at(y) if c['c'] == '□']
    assert len(boxes) == len(values), (y, len(boxes), values)
    for value,c in zip(values,boxes):
        if isinstance(value,tuple): check_key,value=value
        else: check_key=key
        checks.append(dict(key=check_key, value=value, x=round(c['origin'][0],3), y=y))
texts.append(dict(key='profile.name',x=112,y=125.6,width=175))
bind_checks(139.9,'profile.sex',['M','F'])
bind_blanks(154.2,['profile.idNo'])
for y,prefix in [(168.5,'profile.birth'),(182.8,'labor.hired'),(197.1,'labor.exam')]:
    bind_blanks(y,[prefix+s for s in ['Y','M','D']])
bind_blanks(211.4,['labor.company'])
for y,prefix in [(255.6,'labor.previous'),(269.9,'labor.current')]:
    texts.append(dict(key=prefix+'Title',x=151,y=y,width=36))
    bind_checks(y,prefix+'Has',['N'])
    bind_blanks(y,[prefix+s for s in ['StartY','StartM','EndY','EndM','Years','Months']])
bind_checks(284.2,'labor.shift',[
    'Y',('labor.shiftType','two'),('labor.shiftType','three'),('labor.shiftType','four'),('labor.shiftType','other'),'N'])
bind_blanks(284.2,['labor.shiftOther'])
bind_blanks(298.5,['labor.hours1m'])
bind_blanks(312.8,['labor.hours6m'])
bind_checks(342.4,'labor.reason',['new','periodic'])
bind_checks(401.2,'labor.diseases',['hypertension','diabetes','heart','cancer','cataract','stroke','epilepsy','asthma','copd'])
bind_blanks(401.2,['labor.cancerDetail'])
bind_checks(415.5,'labor.diseases',['tuberculosis','kidney','liver','anemia','ear','hearing','thyroid','ulcer'])
bind_checks(429.8,'labor.diseases',['reflux','fracture','surgery','other','none'])
bind_blanks(429.8,['labor.fractureDetail','labor.surgeryDetail','labor.otherDetail'])
for daily,quit,prefix in [(488.3,502.6,'labor.smoke'),(531.2,545.5,'labor.betel'),(574.1,588.4,'labor.drink')]:
    bind_checks(daily,prefix,['never','daily'])
    bind_checks(quit,prefix,['occasional','quit'])
    bind_blanks(daily,[prefix+'Amount',prefix+'Years'] if prefix != 'labor.drink' else [prefix+'Amount','labor.drinkType','labor.drinkBottles'])
    bind_blanks(quit,[prefix+'QuitY',prefix+'QuitM'])
bind_blanks(618.0,['labor.sleep'])
bind_checks(663.8,'labor.symptoms',['cough','sputum','breath','chest','palpitations','dizziness','headache','tinnitus','fatigue','nausea','abdomen'])
bind_checks(678.1,'labor.symptoms',['constipation','diarrhea','bloodyStool','upperBack','lowerBack','numbness','joint','urinary','frequency'])
bind_checks(692.4,'labor.symptoms',['weakness','weightLoss','other','none'])
bind_blanks(692.4,['labor.symptomOther'])
ts = '// 依原 PDF 字元座標產生（單位 pt，原稿 596×842）；填寫 UI 排序不影響紙本。\n'
ts += 'export const LABOR_PRINT_TEXT = '+json.dumps(texts,ensure_ascii=False,indent=2)+' as const;\n'
ts += 'export const LABOR_PRINT_CHECKS = '+json.dumps(checks,ensure_ascii=False,indent=2)+' as const;\n'
pathlib.Path('src/forms/labor/print-layout.ts').write_text(ts,encoding='utf-8')
print('SVG bytes:',out.stat().st_size,'text fields:',len(texts),'checkboxes:',len(checks))
