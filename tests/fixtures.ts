/** 一份填寫完整、通過驗證的 HPV 民眾區 */
export function hpvPublicSample(): Record<string, string> {
  return {
    'profile.idNo': 'A234567893',
    'profile.name': '王小美',
    'profile.birthY': '72',
    'profile.birthM': '5',
    'profile.birthD': '18',
    'profile.phone': '0912345678',
    'profile.edu': '5',
    'profile.addrCounty': '臺中市',
    'profile.addrTown': '烏日區',
    'profile.addrRoad': '中山路',
    'profile.addrNo': '100',
    'profile.regSame': '1',
    'hpv.q9': '1',
    'hpv.q10': '1',
    'hpv.q11': '1',
    'hpv.q12': '2',
    'hpv.q13': '1',
    'hpv.q14': '1',
    'hpv.q15': '4',
    'hpv.q16': '5',
    'hpv.q17': '4',
    'hpv.sigConsent': 'data:image/png;base64,iVBORw0KGgo=',
  };
}

/** 一份填寫完整、通過驗證的成人預防保健民眾區 */
export function adultPublicSample(): Record<string, string | string[]> {
  return {
    'profile.idNo': 'A123456789',
    'profile.name': '王大明',
    'profile.birthY': '54',
    'profile.birthM': '3',
    'profile.birthD': '9',
    'profile.phone': '04-23456789',
    'profile.edu': '4',
    'profile.addrCounty': '臺中市',
    'profile.addrTown': '烏日區',
    'profile.addrRoad': '中山路',
    'profile.addrNo': '100',
    'profile.sex': 'M',
    'profile.aboriginal': 'N',
    'profile.regSame': '1',
    'adult.dx': ['htn'],
    'adult.med': '1',
    'adult.medCause': '高血壓',
    'adult.fam': ['dm', 'cancer'],
    'adult.famCancer': '大腸癌',
    'adult.smoke': '1',
    'adult.drink': '2',
    'adult.betel': '1',
    'adult.exercise': '2',
    'adult.cough': '2',
  };
}

const SIGNATURE = 'data:image/png;base64,iVBORw0KGgo=';

/** 共用基本資料（通過驗證） */
function profileSample(): Record<string, string> {
  return {
    'profile.idNo': 'A234567893',
    'profile.name': '王小美',
    'profile.birthY': '60',
    'profile.birthM': '5',
    'profile.birthD': '18',
    'profile.phone': '0912345678',
    'profile.edu': '5',
    'profile.addrCounty': '臺中市',
    'profile.addrTown': '烏日區',
    'profile.addrRoad': '中山路',
    'profile.addrNo': '100',
  };
}

/** 一份填寫完整、通過驗證的子宮頸抹片民眾區 */
export function papPublicSample(): Record<string, string | string[]> {
  return {
    ...profileSample(),
    'profile.regSame': '1',
    'pap.q9': '2',
    'pap.q10': '2',
    'pap.q11Y': '115',
    'pap.q11M': '10',
    'pap.q11D': '1',
    'pap.q12': '2',
    'pap.q13': '2',
    'pap.q14': '2',
    'pap.q15': '1',
    'pap.q15Year': '100',
    'pap.sigConsent': SIGNATURE,
  };
}

/** 一份填寫完整、通過驗證的口腔黏膜檢查民眾區 */
export function oralPublicSample(): Record<string, string | string[]> {
  return {
    ...profileSample(),
    'profile.name': '王大明',
    'profile.sex': 'M',
    'profile.aboriginal': 'N',
    'oral.betel': '1',
    'oral.smoke': '2',
    'oral.symptom': '0',
    'oral.sigConsent': SIGNATURE,
  };
}

/** 一份填寫完整、通過驗證的胃幽門螺旋桿菌民眾區 */
export function hpPublicSample(): Record<string, string | string[]> {
  return {
    ...profileSample(),
    'profile.sex': 'F',
    'profile.aboriginal': 'N',
    'hp.religion': '0',
    'hp.job': 'Y',
    'hp.jobName': '教師',
    'hp.marital': '2',
    'hp.pmh': ['gastritis'],
    'hp.pmhYear': '110',
    'hp.eradicate': 'N',
    'hp.endoscopy': 'Y',
    'hp.endoYearU': '1',
    'hp.ppi': 'N',
    'hp.allergy': 'N',
    'hp.famHp': 'N',
    'hp.famPu': 'U',
    'hp.famGc': 'Y',
    'hp.famGcRel': ['father', 'sibling'],
    'hp.famGcSib': '2',
    'hp.meds': 'N',
    'hp.smoke': '0',
    'hp.drink': '1',
    'hp.betel': '0',
    'hp.pickled': '0',
    'hp.smoked': '1',
    'hp.raw': '0',
    'hp.sigConsent': SIGNATURE,
  };
}

/** 一份填寫完整、通過驗證的糞便潛血檢查民眾區（吸菸及大腸直腸癌家族史為「有」，需填附表） */
export function fitPublicSample(): Record<string, string | string[]> {
  return {
    ...profileSample(),
    'profile.name': '王大明',
    'profile.sex': 'M',
    'fit.smoke': '1',
    'fit.smokeAge': '20',
    'fit.famCrc': '1',
    'fit.famCa': '0',
    'fit.symptom': '0',
    'fit.annexConsent': 'Y',
    'fit.smokeHabit': '1',
    'fit.quitAge': '50',
    'fit.t1Rel': ['Father', 'Sib'],
    'fit.t1FatherAge1': '68',
    'fit.t1SibN': '2',
    'fit.t1SibAge1': '55',
    'fit.t1SibAge2': '61',
    'fit.sigAnnex': SIGNATURE,
    'fit.sigConsent': SIGNATURE,
  };
}
