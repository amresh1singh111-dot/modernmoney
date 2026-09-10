export type CurrencyInfo = {
  code: string;
  name: string;
  symbol: string;
  locale: string;
};

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', name: 'British Pound', symbol: '£', locale: 'en-GB' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', locale: 'ja-JP' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', locale: 'zh-CN' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', locale: 'en-IN' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', locale: 'en-AU' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', locale: 'ko-KR' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', locale: 'en-SG' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED', locale: 'ar-AE' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', locale: 'pt-BR' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', locale: 'es-MX' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', locale: 'en-ZA' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', locale: 'en-NG' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', locale: 'en-PK' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', locale: 'bn-BD' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', locale: 'tr-TR' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', locale: 'ru-RU' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', locale: 'de-CH' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', locale: 'sv-SE' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', locale: 'en-NZ' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', locale: 'en-HK' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', locale: 'th-TH' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', locale: 'id-ID' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', locale: 'ms-MY' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', locale: 'en-PH' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', locale: 'vi-VN' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', locale: 'pl-PL' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', locale: 'cs-CZ' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', locale: 'hu-HU' },
  { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', locale: 'he-IL' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', locale: 'ar-SA' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', locale: 'ar-EG' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', locale: 'sw-KE' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', locale: 'en-GH' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', locale: 'es-AR' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', locale: 'es-CL' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', locale: 'es-CO' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', locale: 'es-PE' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू', locale: 'ne-NP' },
];

const currencyMap = new Map(CURRENCIES.map((c) => [c.code, c]));

export function getCurrencyInfo(code: string): CurrencyInfo {
  return currencyMap.get(code) ?? { code, name: code, symbol: code, locale: 'en-US' };
}

export function formatCurrency(amount: number, currencyCode: string): string {
  const info = getCurrencyInfo(currencyCode);
  try {
    return new Intl.NumberFormat(info.locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' || currencyCode === 'VND' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'JPY' || currencyCode === 'KRW' || currencyCode === 'VND' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${info.symbol}${amount.toFixed(2)}`;
  }
}

export function formatCurrencyWithCode(amount: number, currencyCode: string): string {
  return `${formatCurrency(amount, currencyCode)} ${currencyCode}`;
}

// Static fallback exchange rates (USD-based). Used until live rates are fetched.
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CNY: 7.24,
  INR: 83.2,
  CAD: 1.36,
  AUD: 1.52,
  KRW: 1330,
  SGD: 1.35,
  AED: 3.67,
  BRL: 5.04,
  MXN: 17.1,
  ZAR: 18.8,
  NGN: 1600,
  PKR: 278,
  BDT: 117,
  TRY: 32.5,
  RUB: 92,
  CHF: 0.88,
  SEK: 10.6,
  NZD: 1.64,
  HKD: 7.82,
  THB: 36.5,
  IDR: 15800,
  MYR: 4.68,
  PHP: 56.2,
  VND: 24500,
  PLN: 4.0,
  CZK: 23.2,
  HUF: 360,
  ILS: 3.72,
  SAR: 3.75,
  EGP: 48.5,
  KES: 129,
  GHS: 15.2,
  ARS: 950,
  CLP: 890,
  COP: 4100,
  PEN: 3.78,
  NPR: 133.5,
};

export type ExchangeRateData = {
  rates: Record<string, number>;
  date: string;
  source: 'fallback' | 'live';
};

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>,
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) return amount;
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}
