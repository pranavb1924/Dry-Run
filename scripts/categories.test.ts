import { describe, expect, test } from 'vitest';
import { categorize } from './categories.ts';

describe('categorize', () => {
  test('groups generic descriptions by keyword', () => {
    expect(categorize('EATING PLACES  RESTAURANTS')).toBe('Food & dining');
    expect(categorize('BOOK STORES')).toBe('Online & retail');
    expect(categorize('INDUSTRIAL SUPPLIES NOT ESLEWHERE CLASSI')).toBe('Industrial & equipment');
    expect(categorize('TELECOMMUNICATION SERV.INCLUD. LOCAL/L.D')).toBe('Utilities & telecom');
    expect(categorize('LAB/MEDICAL/DENTAL/OPHTHALMIC HOSPITAL E')).toBe('Medical & lab');
  });

  test('recognizes airline, hotel and car rental brands', () => {
    expect(categorize('DELTA')).toBe('Airfare');
    expect(categorize('LUFTHANSA')).toBe('Airfare');
    expect(categorize('HAWAIIAN AIR')).toBe('Airfare');
    expect(categorize('AER LINGUS')).toBe('Airfare');
    expect(categorize('SWISSOTEL')).toBe('Lodging');
    expect(categorize('GAYLORD OPRYLAND')).toBe('Lodging');
    expect(categorize('HERTZ CORPORATION')).toBe('Other travel');
  });

  test('settles descriptions that look like two categories', () => {
    expect(categorize('DELTA HOTELS')).toBe('Lodging');
    expect(categorize('AIR CONDITIONING AND REFRIGERATION REPAI')).toBe('Facilities & maintenance');
    expect(categorize('COURIER SERVICES-AIR OR GROUND FREIGHT F')).toBe('Office & shipping');
    expect(categorize('AIRPORTS FLYING FIELDS AIRPORT TERMINA')).toBe('Other travel');
    expect(categorize('AUTOMOTIVE REPAIR SHOPS (NON-DEALER)')).toBe('Vehicles & fuel');
    expect(categorize('AUTOMOBILE PARKING LOTS AND GARAGES')).toBe('Other travel');
    expect(categorize('PHOTOFINISHING LABORATORIES PHOTO DEVEL')).toBe('Office & shipping');
    expect(categorize('TELECOMMUNICATION EQUIPMENT INCLUDING TE')).toBe('Technology & software');
  });

  test('falls back to Other', () => {
    expect(categorize('BEAUTY SHOPS AND BARBER SHOPS')).toBe('Other');
  });
});
