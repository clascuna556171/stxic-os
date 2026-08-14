import type { Currency } from "@/types";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  PHP: "₱",
  USD: "$",
  EUR: "€",
  JPY: "¥",
};

const CURRENCY_LOCALE: Record<Currency, string> = {
  PHP: "en-PH",
  USD: "en-US",
  EUR: "de-DE",
  JPY: "ja-JP",
};

/** Format an amount in its currency. `compact` trims trailing zeros. */
export function formatCurrency(amount: number, currency: Currency, compact = false): string {
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  };
  if (compact) {
    opts.minimumFractionDigits = 0;
  }
  const formatted = new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? undefined, opts).format(
    amount,
  );
  return formatted;
}

export function currencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency];
}
