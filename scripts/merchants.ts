// Cleans the state's merchant strings into names people recognize, so all of
// a merchant's purchases group together. The raw strings split one merchant
// into many: store numbers ("LOWES #00907"), order codes ("AMAZON RETA
// 922TF7IH3"), legal suffixes ("STAPLES INC") and cut-off names
// ("SOUTH CENTRAL INDUSTRIE").

// Known brands, checked first. Most are the biggest merchants by spend; a few
// are names the generic cleanup below would damage, like "MOTEL 6".
const BRANDS: readonly (readonly [RegExp, string])[] = [
  [/^AMAZON WEB SERVICES|^AWS\b/, 'Amazon Web Services'],
  [/^(AMAZON|AMZN)\b|^AMAZON\.COM/, 'Amazon'],
  [/^(WAL-?MART|WALMART|WM SUPERCENTER)/, 'Walmart'],
  [/^(SAMS ?CLUB|SAM'S CLUB|SAMSCLUB)/, "Sam's Club"],
  [/^COSTCO/, 'Costco'],
  [/^TARGET\b/, 'Target'],
  [/^LOWE'?S\b/, "Lowe's"],
  [/^(THE )?HOME ?DEPOT/, 'The Home Depot'],
  [/^(AT&T|ATT\b|AT T\b)/, 'AT&T'],
  [/^VERIZON/, 'Verizon'],
  [/^T-MOBILE/, 'T-Mobile'],
  [/^COX\b/, 'Cox Communications'],
  [/^(OG&E|OGE\b)/, 'OG&E'],
  [/^PSO\b/, 'PSO'],
  [/^(OKLAHOMA NATURAL GAS|ONG\b)/, 'Oklahoma Natural Gas'],
  [/^SOUTH CENTRAL INDUSTRIE/, 'South Central Industries'],
  [/^(W ?W ?)?GRAINGER/, 'Grainger'],
  [/^STAPLES/, 'Staples'],
  [/^(OFFICE ?DEPOT|OFFICEMAX)/, 'Office Depot'],
  [/^(DMI\s+)?DELL\b/, 'Dell'],
  [/^SHI INTERNATIONAL/, 'SHI International'],
  [/^CDW/, 'CDW'],
  [/^(MICROSOFT|MSFT)/, 'Microsoft'],
  [/^ADOBE/, 'Adobe'],
  [/^(OPENAI|CHATGPT)/, 'OpenAI'],
  [/^GOOGLE/, 'Google'],
  [/^APPLE(\.COM|\b)/, 'Apple'],
  [/^ZOOM(\.US| VIDEO|\b)/, 'Zoom'],
  [/^(FACEBK|FACEBOOK|META PLATFORMS)/, 'Meta'],
  [/^UPS\b/, 'UPS'],
  [/^(FEDEX|FED EX)/, 'FedEx'],
  [/^(USPS|US POSTAL)/, 'USPS'],
  [/^\d?PITNEY/, 'Pitney Bowes'],
  [/^XEROX/, 'Xerox'],
  [/^ULINE/, 'Uline'],
  [/^FASTENAL/, 'Fastenal'],
  [/^MCMASTER/, 'McMaster-Carr'],
  [/^SYSCO/, 'Sysco'],
  [/^(THE )?WEBSTAURANT/, 'WebstaurantStore'],
  [/^MEDLINE/, 'Medline'],
  [/^HENRY SCHEIN/, 'Henry Schein'],
  [/^(TFS FISHERSCI|FISHER ?SCI)/, 'Fisher Scientific'],
  [/^SIGMA ?-?ALDRICH/, 'Sigma-Aldrich'],
  [/^VWR/, 'VWR'],
  [/^THORLABS/, 'Thorlabs'],
  [/^(WIN |WINSUPPLY)/, 'WinSupply'],
  [/^NAPA\b/, 'NAPA Auto Parts'],
  [/^O ?'?REILLY/, "O'Reilly Auto Parts"],
  [/^AUTOZONE/, 'AutoZone'],
  [/^(UNTD RNTLS|UNITED RENTALS)/, 'United Rentals'],
  [/^PIKE ?PASS/, 'PikePass'],
  [/^(QT\b|QUIKTRIP)/, 'QuikTrip'],
  [/^LOVE'?S (TRAVEL|COUNTRY|#)/, "Love's"],
  [/^CASEYS?\b/, "Casey's"],
  [/^ONCUE/, 'OnCue'],
  [/^HOLIDAY INN/, 'Holiday Inn'],
  [/^HAMPTON INN/, 'Hampton Inn'],
  [/^HILTON GARDEN/, 'Hilton Garden Inn'],
  [/^(HOME2|HOMES TO SUITES)/, 'Home2 Suites'],
  [/^MOTEL 6/, 'Motel 6'],
  [/^SUPER 8/, 'Super 8'],
  // Airline tickets carry a ticket number: "UNITED 0162345678901".
  [/^SOUTHWES/, 'Southwest Airlines'],
  [/^AMERICAN(\s+AIR|\s+\d|$)/, 'American Airlines'],
  [/^UNITED(\s+AIR|\s+\d|$)/, 'United Airlines'],
  [/^DELTA(\s+AIR|\s+\d|$)/, 'Delta Air Lines'],
  [/^ALASKA(\s+AIR|\s+\d|$)/, 'Alaska Airlines'],
  [/^FRONTIER(\s+AIR|\s+\d|$)/, 'Frontier Airlines'],
  [/^SPIRIT(\s+AIR|\s+\d|$)/, 'Spirit Airlines'],
  [/^ALLEGIANT/, 'Allegiant Air'],
  [/^JETBLUE/, 'JetBlue'],
  [/^EBAY/, 'eBay'],
  [/^USCIS/, 'USCIS'],
  [/^ENTERPRISE RENT/, 'Enterprise Rent-A-Car'],
  [/^UBER\b/, 'Uber'],
  [/^LYFT/, 'Lyft'],
  [/^(CHICK-?FIL-?A|CHICK FIL A)/, 'Chick-fil-A'],
  [/^STARBUCKS/, 'Starbucks'],
  [/^MCDONALD/, "McDonald's"],
  [/^7-ELEVEN/, '7-Eleven'],
  [/^(HOBBY[- ]LOBBY)/, 'Hobby Lobby'],
  [/^TRACTOR SUPPLY/, 'Tractor Supply'],
  [/^ATWOODS/, 'Atwoods'],
  [/^DOLLAR ?GENERAL/, 'Dollar General'],
  [/^DOLLAR ?TREE/, 'Dollar Tree'],
  [/^WALGREENS/, 'Walgreens'],
  [/^CVS/, 'CVS'],
  [/^BEST ?BUY/, 'Best Buy'],
];

// Legal suffixes add nothing and split "STAPLES" from "STAPLES INC".
const SUFFIX = /\s+(INC|INCORPORATED|LLC|L L C|LP|LLP|LTD|CORP|CORPORATION|CO|COMPANY|PLLC)\.?$/;

// Short words that stay in capitals.
const ACRONYMS = new Set(['AG', 'BG', 'BK', 'CBI', 'CPC', 'DCAM', 'DMI', 'DOC', 'DRTC', 'GSA', 'MMS', 'OKC', 'OSU', 'OU', 'US', 'USA']);
const SMALL_WORDS = new Set(['A', 'AND', 'AT', 'BY', 'FOR', 'IN', 'OF', 'ON', 'THE', 'TO']);

/** Turns a raw MERCHANT value into the name its purchases are grouped under. */
export function cleanMerchant(raw: string): string {
  const upper = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  for (const [pattern, name] of BRANDS) {
    if (pattern.test(upper)) {
      return name;
    }
  }

  // Store numbers and order codes: "#00907", "0032509", "922TF7IH3".
  const words = upper.replace(/#\S*/g, ' ').split(' ').filter((word) => word !== '');
  while (words.length > 1 && /\d/.test(words.at(-1) ?? '')) {
    words.pop();
  }
  // Names are cut off at 25 characters, which can leave a dangling "IN" (of
  // "INC") or "OF".
  while (words.length > 1 && SMALL_WORDS.has(words.at(-1) ?? '')) {
    words.pop();
  }
  let name = words.join(' ');
  while (SUFFIX.test(name)) {
    name = name.replace(SUFFIX, '');
  }
  name = name.replace(/[\s,.&-]+$/, '');
  return titleCase(name === '' ? upper : name);
}

/** "SOUTH CENTRAL INDUSTRIES" → "South Central Industries", keeping acronyms. */
function titleCase(upper: string): string {
  return upper
    .split(' ')
    .map((word, i) => {
      if (i > 0 && SMALL_WORDS.has(word)) {
        return word.toLowerCase();
      }
      if (ACRONYMS.has(word) || word.includes('&') || !/[AEIOUY]/.test(word)) {
        return word;
      }
      return word.toLowerCase().replace(/(^|[-'/])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
    })
    .join(' ');
}
