// Readable names for the state's 118 agencies. The source abbreviates many
// of them ("S. W. OKLA. ST. UNIV."), so the abbreviated ones are written out
// by hand; the rest only need title case.

const NAMES: Readonly<Record<string, string>> = {
  'ALCOHOLIC BEV. LAWS ENFORCE.': 'Alcoholic Beverage Laws Enforcement Commission',
  'BD. OF CHEM. TEST ALCOHOL/DRUG': 'Board of Chemical Tests for Alcohol & Drugs',
  'BD. OF MED. LICENSURE & SUPV.': 'Board of Medical Licensure & Supervision',
  'BD. OF PSYCHOLOGISTS EXAMINERS': 'Board of Examiners of Psychologists',
  'BD. OF VETERINARY MED. EXAM.': 'Board of Veterinary Medical Examiners',
  'BOLL WEEVIL ERADICATION ORG.': 'Boll Weevil Eradication Organization',
  'CNTR. FOR ADVANC. OF SCIENCE/TECHNOLOGY': 'Center for the Advancement of Science & Technology',
  'COMM. OF THE LAND OFFICE': 'Commissioners of the Land Office',
  'COMM. ON CONSUMER CREDIT': 'Commission on Consumer Credit',
  'COUNCIL ON LAW ENFC. ED. & TRNG.': 'Council on Law Enforcement Education & Training',
  'DEPT OF AGRICULTURE FOOD & FORESTRY': 'Department of Agriculture, Food & Forestry',
  'DEPT. OF ENVIRONMENTAL QUALITY': 'Department of Environmental Quality',
  'EASTERN OKLA. STATE COLLEGE': 'Eastern Oklahoma State College',
  'FIREFIGHTERS PENS. & RET. SYST.': 'Firefighters Pension & Retirement System',
  'GRAND RIVER DAM AUTH.': 'Grand River Dam Authority',
  'HEALTH CARE WORKFORCE TRNG COM': 'Health Care Workforce Training Commission',
  'INTERSTATE OIL COMPACT COMM.': 'Interstate Oil Compact Commission',
  'J. M. DAVIS ARMS & HIST. MUSEUM': 'J.M. Davis Arms & Historical Museum',
  'J.D. MCCARTY CENTER': 'J.D. McCarty Center',
  'LIQUEFIED PETROLEUM GAS BD': 'Liquefied Petroleum Gas Board',
  'MENTAL HEALTH AND SUBSTANCE ABUSE SERV.': 'Department of Mental Health & Substance Abuse Services',
  'N. E. OKLA. A & M COLLEGE': 'Northeastern Oklahoma A&M College',
  'OFFICE OF EDUC. QUALITY & ACCOUNTABILITY': 'Office of Educational Quality & Accountability',
  'OFFICE OF MANAGEMENT AND ENTERPRISE SERV': 'Office of Management & Enterprise Services',
  'OK DEP AEROSPACE & AERONAUTICS': 'Department of Aerospace & Aeronautics',
  'OK MEDICAL MARIJUANA AUTHORITY': 'Oklahoma Medical Marijuana Authority',
  'OK STATE ATHLETIC COMMISSION': 'State Athletic Commission',
  'OK. HOUSE OF REPRESENTATIVES': 'House of Representatives',
  'OK. LAW ENFORCE. RET. SYSTEM': 'Law Enforcement Retirement System',
  'OK. PUBLIC EMPLOYEES RET. SYS.': 'Public Employees Retirement System',
  'OK. SCHOOL OF SCIENCE & MATH': 'Oklahoma School of Science & Mathematics',
  'OKLA. BD. OF ARCHITECTS': 'Board of Architects',
  'OKLA. BUREAU OF NARCOTICS AND DANGEROUS': 'Bureau of Narcotics & Dangerous Drugs Control',
  'OKLA. CAREER AND TECHNOLOGY EDUCATION': 'Department of Career & Technology Education',
  'OKLA. CITY COMMUNITY COLLEGE': 'Oklahoma City Community College',
  'OKLA. HORSE RACING COMM.': 'Horse Racing Commission',
  'OKLA. PANHANDLE STATE UNIV.': 'Oklahoma Panhandle State University',
  'OKLA. SPACE INDUSTRY DEV. AUTH.': 'Space Industry Development Authority',
  'OKLAHOMA ST.BOARD OF DENTISTRY': 'Board of Dentistry',
  'OKLAHOMA STATE DEPARTMENT OF HEALTH': 'State Department of Health',
  'POLICE PENSION & RET. SYSTEM': 'Police Pension & Retirement System',
  'PROF. ENGI. & LAND SURVEYORS': 'Board of Professional Engineers & Land Surveyors',
  'ROSE STATE COLEGE': 'Rose State College',
  'S. W. OKLA. ST. UNIV.': 'Southwestern Oklahoma State University',
  'SPEECH-LANGUAGE PATHOLOGY & AUDIOLOGY': 'Board of Speech-Language Pathology & Audiology',
  'ST BD OF COSMETOLOGY AND BARBERING': 'Board of Cosmetology & Barbering',
  'ST. BD. OF CHIROPRACTIC EXAM.': 'Board of Chiropractic Examiners',
  'STATE BD. OF OSTEOPATHIC EXAM.': 'Board of Osteopathic Examiners',
  'TOBACCO SETTLEMENT ENDMT TRUST': 'Tobacco Settlement Endowment Trust',
  'UNIV. OF OKLA. HEALTH SCIENCES CENTER': 'University of Oklahoma Health Sciences Center',
  'UNIV.OF SCIENCE & ARTS OF OK': 'University of Science & Arts of Oklahoma',
  'USED MOTOR VEH & MFG HOUSING': 'Used Motor Vehicle & Manufactured Housing Commission',
  "WORKER'S COMP. COMMISSION": "Workers' Compensation Commission",
};

const SMALL_WORDS = new Set(['for', 'of', 'on', 'the', 'to', 'in']);

/** "DEPARTMENT OF TOURISM AND RECREATION" → "Department of Tourism & Recreation". */
export function agencyName(raw: string): string {
  const known = NAMES[raw];
  if (known !== undefined) {
    return known;
  }
  return raw
    .toLowerCase()
    .replaceAll(' and ', ' & ')
    .split(' ')
    .map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}
