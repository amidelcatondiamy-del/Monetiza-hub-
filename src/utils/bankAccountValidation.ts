export type BankDocumentType = 'cpf' | 'cnpj' | 'bi' | 'unknown';

export interface BankAccountFormValues {
  bankName: string;
  agency: string;
  accountNumber: string;
  documentNumber: string;
}

export interface BankAccountValidationResult {
  valid: boolean;
  detectedDocType: BankDocumentType;
  errors: {
    bankName?: string;
    agency?: string;
    accountNumber?: string;
    documentNumber?: string;
  };
}

export const POPULAR_BANKS: string[] = [
  '260 - Nu Pagamentos S.A. (Nubank)',
  '001 - Banco do Brasil S.A.',
  '341 - Itaú Unibanco S.A.',
  '033 - Banco Santander (Brasil) S.A.',
  '104 - Caixa Econômica Federal',
  '077 - Banco Inter S.A.',
  '237 - Banco Bradesco S.A.',
  '336 - Banco C6 S.A.',
  'Banco BAI (Banco Angolano de Investimentos)',
  'BFA - Banco de Fomento Angola',
  'Banco BIC Angola',
  'Millennium Atlântico',
  'Standard Bank Angola',
  'Banco Sol Angola',
];

export function isValidCpf(rawDigits: string): boolean {
  const digits = rawDigits.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let firstCheck = (sum * 10) % 11;
  if (firstCheck === 10) firstCheck = 0;
  if (firstCheck !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  let secondCheck = (sum * 10) % 11;
  if (secondCheck === 10) secondCheck = 0;
  return secondCheck === Number(digits[10]);
}

export function isValidCnpj(rawDigits: string): boolean {
  const digits = rawDigits.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const sum = base
      .split('')
      .reduce((acc, ch, idx) => acc + Number(ch) * weights[idx], 0);
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calcDigit(digits.slice(0, 12), w1);
  if (d1 !== Number(digits[12])) return false;

  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d2 = calcDigit(digits.slice(0, 13), w2);
  return d2 === Number(digits[13]);
}

export function isValidAngolaBi(rawValue: string): boolean {
  const clean = rawValue.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  // Angola BI standard: 9 digits + 2 province letters + 3 digits (14 chars), e.g. 001234567LA042
  return /^\d{9}[A-Z]{2}\d{3}$/.test(clean);
}

export function detectDocumentType(rawValue: string): BankDocumentType {
  const trimmed = rawValue.trim();
  if (!trimmed) return 'unknown';

  const hasLetters = /[A-Za-z]/.test(trimmed);
  if (hasLetters) {
    return 'bi';
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length > 0 && digits.length <= 11) return 'cpf';
  if (digits.length > 11) return 'cnpj';
  return 'unknown';
}

export function formatDocumentInput(rawValue: string): string {
  const hasLetters = /[A-Za-z]/.test(rawValue);
  if (hasLetters) {
    return rawValue
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 14);
  }

  const digits = rawValue.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatAgencyInput(rawValue: string): string {
  const clean = rawValue.replace(/[^0-9Xx-]/g, '').toUpperCase();
  if (clean.includes('-')) {
    const [left, right] = clean.split('-');
    return `${left.replace(/\D/g, '').slice(0, 4)}-${(right || '').replace(/[^0-9X]/g, '').slice(0, 1)}`;
  }
  const digits = clean.replace(/[^0-9]/g, '').slice(0, 4);
  return digits;
}

export function formatAccountNumberInput(rawValue: string): string {
  const clean = rawValue.replace(/[^0-9Xx-]/g, '').toUpperCase();
  if (clean.includes('-')) {
    const [left, right] = clean.split('-');
    return `${left.replace(/\D/g, '').slice(0, 12)}-${(right || '').replace(/[^0-9X]/g, '').slice(0, 2)}`;
  }
  const alnum = clean.replace(/[^0-9X]/g, '').slice(0, 13);
  if (alnum.length > 5 && !alnum.slice(0, -1).includes('X')) {
    return alnum;
  }
  return alnum;
}

export function validateBankAccountForm(
  values: BankAccountFormValues
): BankAccountValidationResult {
  const errors: BankAccountValidationResult['errors'] = {};

  const bankTrimmed = values.bankName.trim();
  if (bankTrimmed.length < 3) {
    errors.bankName = 'Informe o nome completo do banco (mínimo 3 caracteres).';
  }

  const agencyTrimmed = values.agency.trim().toUpperCase();
  if (!/^\d{4}(?:-[0-9X])?$/.test(agencyTrimmed)) {
    errors.agency = 'Agência inválida. Utilize 4 dígitos (ex: 0001 ou 1234-5).';
  }

  const accountTrimmed = values.accountNumber.trim().toUpperCase();
  if (!/^\d{5,12}(?:-[0-9X]{1,2})?$/.test(accountTrimmed)) {
    errors.accountNumber = 'Conta inválida. Informe de 5 a 12 dígitos com ou sem dígito (ex: 1234567-8).';
  }

  const docTrimmed = values.documentNumber.trim();
  const detectedDocType = detectDocumentType(docTrimmed);
  if (!docTrimmed) {
    errors.documentNumber = 'Informe o CPF, CNPJ ou BI do titular da conta.';
  } else if (detectedDocType === 'bi') {
    if (!isValidAngolaBi(docTrimmed)) {
      errors.documentNumber =
        'BI angolano inválido. Formato esperado: 9 dígitos + 2 letras + 3 dígitos (ex: 001234567LA042).';
    }
  } else if (detectedDocType === 'cpf') {
    if (!isValidCpf(docTrimmed)) {
      errors.documentNumber = 'CPF inválido. Informe os 11 dígitos válidos (ex: 000.000.000-00).';
    }
  } else if (detectedDocType === 'cnpj') {
    if (!isValidCnpj(docTrimmed)) {
      errors.documentNumber = 'CNPJ inválido. Informe os 14 dígitos válidos (ex: 00.000.000/0001-00).';
    }
  } else {
    errors.documentNumber = 'Documento inválido. Utilize CPF (11 dígitos), CNPJ (14 dígitos) ou BI (ex: 001234567LA042).';
  }

  return {
    valid: Object.keys(errors).length === 0,
    detectedDocType,
    errors,
  };
}
