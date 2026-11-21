import { Currency } from '../types/monetization';

// Exchange rates relative to 1 BRL (Real)
export const EXCHANGE_RATES: Record<Currency, number> = {
  BRL: 1.0,
  USD: 0.1724, // ~ 1 USD = R$ 5,80
  EUR: 0.16,   // ~ 1 EUR = R$ 6,25
  AOA: 158.5,  // ~ 1 BRL = 158,50 Kz (Kwanzas Angolanos)
};

export const CURRENCY_SYMBOLS: Record<Currency, { symbol: string; label: string; flag: string }> = {
  BRL: { symbol: 'R$', label: 'Real Brasileiro (BRL)', flag: '🇧🇷' },
  USD: { symbol: '$', label: 'Dólar Americano (USD)', flag: '🇺🇸' },
  EUR: { symbol: '€', label: 'Euro Europeu (EUR)', flag: '🇪🇺' },
  AOA: { symbol: 'Kz', label: 'Kwanza Angolano (AOA)', flag: '🇦🇴' },
};

// Convert an amount in BRL to target currency
export const convertFromBRL = (amountBRL: number, targetCurrency: Currency): number => {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  return Number((amountBRL * rate).toFixed(2));
};

// Convert an amount from selected currency back to BRL base
export const convertToBRL = (amount: number, fromCurrency: Currency): number => {
  const rate = EXCHANGE_RATES[fromCurrency] || 1;
  return Number((amount / rate).toFixed(2));
};

// Master currency formatter
export const formatCurrency = (
  valueInBRL: number,
  currency: Currency = 'BRL',
  convert: boolean = true
): string => {
  const finalValue = convert ? convertFromBRL(valueInBRL, currency) : valueInBRL;

  if (currency === 'BRL') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(finalValue);
  }

  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(finalValue);
  }

  if (currency === 'EUR') {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(finalValue);
  }

  if (currency === 'AOA') {
    // Kwanza Angolano (Kz)
    const formatted = new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(finalValue);
    return `${formatted} Kz`;
  }

  return `${finalValue.toFixed(2)} ${currency}`;
};

export const formatBRL = (value: number): string => formatCurrency(value, 'BRL', false);

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1).replace('.', ',')}%`;
};

export const formatDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
};

export const formatShortDate = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  } catch {
    return isoString;
  }
};

// Generate a valid-looking Pix Copy-and-Paste string
export const generatePixCode = (amount: number, reference: string): string => {
  const cleanRef = reference.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  const formattedAmount = amount.toFixed(2);
  return `00020126580014br.gov.bcb.pix0136monetiza.hub.pay@banco.com.br520400005303986540${formattedAmount.length}${formattedAmount}5802BR5920MONETIZA HUB PLATAF6009SAO PAULO62070503${cleanRef}6304D1B8`;
};
