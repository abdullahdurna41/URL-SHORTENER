/**
 * Birim test: kisa kod uretimi. DB gerektirmez.
 */
const { generateShortCode, isValidCustomAlias, ALPHABET } = require('../../src/utils/shortCode');

describe('generateShortCode', () => {
  test('varsayilan uzunluk 7 karakter', () => {
    expect(generateShortCode()).toHaveLength(7);
  });

  test('istenen uzunlukta kod uretir', () => {
    expect(generateShortCode(12)).toHaveLength(12);
  });

  test('sadece izin verilen alfabedeki karakterleri kullanir', () => {
    for (let i = 0; i < 100; i++) {
      for (const char of generateShortCode()) {
        expect(ALPHABET).toContain(char);
      }
    }
  });

  test('karistirilabilir karakterler (0, O, 1, I, l) uretilmez', () => {
    const codes = Array.from({ length: 500 }, () => generateShortCode()).join('');
    expect(codes).not.toMatch(/[0O1Il]/);
  });

  test('10.000 uretimde cakisma yok', () => {
    const codes = new Set();
    for (let i = 0; i < 10_000; i++) codes.add(generateShortCode());
    expect(codes.size).toBe(10_000);
  });
});

describe('isValidCustomAlias', () => {
  test.each(['abc', 'my-link', 'my_link', 'Link123', 'a'.repeat(16)])(
    'gecerli: %s',
    (alias) => expect(isValidCustomAlias(alias)).toBe(true)
  );

  test.each([
    ['ab', 'cok kisa'],
    ['a'.repeat(17), 'cok uzun'],
    ['iki kelime', 'bosluk iceriyor'],
    ['yol/alt', 'slash iceriyor'],
    ['türkçe', 'ascii disi karakter'],
    ['links', 'rezerve kelime'],
    ['AUTH', 'rezerve kelime (buyuk harf)'],
    ['', 'bos'],
    [null, 'null'],
    [undefined, 'undefined'],
    [123, 'sayi'],
  ])('gecersiz: %s (%s)', (alias) => {
    expect(isValidCustomAlias(alias)).toBe(false);
  });
});
