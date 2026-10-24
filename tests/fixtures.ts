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
