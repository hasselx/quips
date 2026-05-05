export interface CurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
  label: string;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", locale: "en-IN", label: "Indian Rupee (₹)" },
  { code: "USD", symbol: "$", locale: "en-US", label: "US Dollar ($)" },
  { code: "EUR", symbol: "€", locale: "de-DE", label: "Euro (€)" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "British Pound (£)" },
  { code: "JPY", symbol: "¥", locale: "ja-JP", label: "Japanese Yen (¥)" },
  { code: "AUD", symbol: "A$", locale: "en-AU", label: "Australian Dollar (A$)" },
  { code: "CAD", symbol: "C$", locale: "en-CA", label: "Canadian Dollar (C$)" },
  { code: "AED", symbol: "د.إ", locale: "en-AE", label: "UAE Dirham (د.إ)" },
  { code: "SGD", symbol: "S$", locale: "en-SG", label: "Singapore Dollar (S$)" },
  { code: "CHF", symbol: "CHF", locale: "de-CH", label: "Swiss Franc (CHF)" },
  { code: "CNY", symbol: "¥", locale: "zh-CN", label: "Chinese Yuan (¥)" },
  { code: "MYR", symbol: "RM", locale: "ms-MY", label: "Malaysian Ringgit (RM)" },
  { code: "THB", symbol: "฿", locale: "th-TH", label: "Thai Baht (฿)" },
  { code: "ZAR", symbol: "R", locale: "en-ZA", label: "South African Rand (R)" },
  { code: "BRL", symbol: "R$", locale: "pt-BR", label: "Brazilian Real (R$)" },
];

const DEFAULT: CurrencyInfo = CURRENCIES[0];

export function getCurrency(code?: string | null): CurrencyInfo {
  if (!code) return DEFAULT;
  return CURRENCIES.find((c) => c.code === code) || DEFAULT;
}

export function formatCurrency(
  amount: number,
  code?: string | null,
  opts: { compact?: boolean; minimumFractionDigits?: number } = {}
): string {
  const cur = getCurrency(code);
  const min = opts.minimumFractionDigits ?? 2;
  if (opts.compact) {
    if (amount >= 1000) return `${cur.symbol}${(amount / 1000).toFixed(1)}k`;
    return `${cur.symbol}${amount.toLocaleString(cur.locale)}`;
  }
  return `${cur.symbol}${amount.toLocaleString(cur.locale, { minimumFractionDigits: min, maximumFractionDigits: 2 })}`;
}
