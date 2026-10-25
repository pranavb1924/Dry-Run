import { describe, expect, test } from 'vitest';
import { cleanMerchant } from './merchants.ts';

describe('cleanMerchant', () => {
  test('merges the spellings of a known brand', () => {
    expect(cleanMerchant('AMAZON MKTPLACE PMTS')).toBe('Amazon');
    expect(cleanMerchant('AMAZON RETA 922TF7IH3')).toBe('Amazon');
    expect(cleanMerchant('AMAZON.COM')).toBe('Amazon');
    expect(cleanMerchant('AMAZON WEB SERVICES')).toBe('Amazon Web Services');
    expect(cleanMerchant('LOWES #00907')).toBe("Lowe's");
    expect(cleanMerchant('THE HOME DEPOT #3906')).toBe('The Home Depot');
    expect(cleanMerchant('HOMEDEPOT.COM')).toBe('The Home Depot');
    expect(cleanMerchant('ATT  BILL PAYMENT')).toBe('AT&T');
    expect(cleanMerchant('AT&T PREMIER EBILL')).toBe('AT&T');
    expect(cleanMerchant('SOUTH CENTRAL INDUSTRIE')).toBe('South Central Industries');
  });

  test('recognizes airline tickets by their ticket number', () => {
    expect(cleanMerchant('UNITED 0162345678901')).toBe('United Airlines');
    expect(cleanMerchant('AMERICAN 0012345678901')).toBe('American Airlines');
    expect(cleanMerchant('UNITED RENTALS 180214')).toBe('United Rentals');
    expect(cleanMerchant('AMERICAN RED CROSS')).toBe('American Red Cross');
  });

  test('drops a word left dangling where a long name was cut off', () => {
    expect(cleanMerchant('KIAMICHI OPPORTUNITIES IN')).toBe('Kiamichi Opportunities');
  });

  test('drops store numbers, order codes and legal suffixes', () => {
    expect(cleanMerchant('REXEL 7685')).toBe('Rexel');
    expect(cleanMerchant('NUTRIEN AG SOLUTION 1133')).toBe('Nutrien AG Solution');
    expect(cleanMerchant('HALL MANUFACTURING CO INC')).toBe('Hall Manufacturing');
    expect(cleanMerchant('BENNETT STEEL INC')).toBe('Bennett Steel');
  });

  test('keeps names the cleanup would damage', () => {
    expect(cleanMerchant('MOTEL 6 #1234')).toBe('Motel 6');
    expect(cleanMerchant('4IMPRINT  INC')).toBe('4imprint');
  });

  test('writes names in title case but keeps acronyms', () => {
    expect(cleanMerchant('THOMSON WEST TCD')).toBe('Thomson West TCD');
    expect(cleanMerchant('CITY OF STILLWATER')).toBe('City of Stillwater');
    expect(cleanMerchant('CURTIS RESTAURANT SUPPLY')).toBe('Curtis Restaurant Supply');
  });
});
