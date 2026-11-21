import type {
  Aes256EncryptedPayload,
  CreatorProfile,
  NotificationThresholdSettings,
  SensitiveCreatorVault,
  StoredCreatorEnvelope,
  StoredNotificationSettingsEnvelope,
} from '../types/monetization';

const DEVICE_KEY_SEED_STORAGE_KEY = 'monetiza_hub_v1_device_key_seed';
const VAULT_APP_CONTEXT = 'MonetizaHub::AES-256-GCM::CreatorVault::v1';
const PBKDF2_ITERATIONS = 100_000;

export const ENCRYPTED_SENSITIVE_FIELD_LABELS: string[] = [
  'E-mail Principal & Alertas',
  'Telefone / WhatsApp',
  'CPF / CNPJ / BI (Fiscal)',
  'Chave Pix & Tipo',
  'Multicaixa Express (Telefone / Banco / IBAN)',
  'Cartão Visa (Número Completo, Validade & Titular)',
  'Conta Bancária (Agência, Conta & Documento)',
];

let inMemoryFallbackSeed: string | null = null;

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(base64Url: string): Uint8Array {
  const padded = base64Url.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((base64Url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getCryptoApi(): Crypto {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API (AES-256-GCM) indisponível neste navegador.');
}

export function getOrCreateDeviceVaultSecret(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY_SEED_STORAGE_KEY);
    if (existing && existing.length >= 32) {
      return existing;
    }
    const cryptoApi = getCryptoApi();
    const randomBytes = new Uint8Array(32);
    cryptoApi.getRandomValues(randomBytes);
    const seed = toBase64Url(randomBytes);
    localStorage.setItem(DEVICE_KEY_SEED_STORAGE_KEY, seed);
    return seed;
  } catch {
    if (!inMemoryFallbackSeed) {
      const cryptoApi = getCryptoApi();
      const randomBytes = new Uint8Array(32);
      cryptoApi.getRandomValues(randomBytes);
      inMemoryFallbackSeed = toBase64Url(randomBytes);
    }
    return inMemoryFallbackSeed;
  }
}

export function rotateDeviceVaultSecret(): string {
  const cryptoApi = getCryptoApi();
  const randomBytes = new Uint8Array(32);
  cryptoApi.getRandomValues(randomBytes);
  const nextSeed = toBase64Url(randomBytes);
  inMemoryFallbackSeed = nextSeed;
  try {
    localStorage.setItem(DEVICE_KEY_SEED_STORAGE_KEY, nextSeed);
  } catch {
    // Ignore storage quota errors
  }
  return nextSeed;
}

function resolveKeyMaterial(customPassphrase?: string): {
  material: string;
  requiresCustomPassphrase: boolean;
} {
  const trimmed = customPassphrase?.trim();
  if (trimmed && trimmed.length > 0) {
    return {
      material: `${VAULT_APP_CONTEXT}::PASSPHRASE::${trimmed}`,
      requiresCustomPassphrase: true,
    };
  }
  const deviceSeed = getOrCreateDeviceVaultSecret();
  return {
    material: `${VAULT_APP_CONTEXT}::DEVICE::${deviceSeed}`,
    requiresCustomPassphrase: false,
  };
}

export async function computeKeyFingerprint(material: string): Promise<string> {
  const cryptoApi = getCryptoApi();
  const encoded = new TextEncoder().encode(material);
  const digest = await cryptoApi.subtle.digest('SHA-256', encoded);
  const bytes = new Uint8Array(digest);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `SHA256:${hex.slice(0, 8)}…${hex.slice(-6)}`;
}

async function deriveAes256Key(
  material: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const cryptoApi = getCryptoApi();
  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(material),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptJsonAes256<T>(
  data: T,
  options?: {
    customPassphrase?: string;
    encryptedFields?: string[];
  }
): Promise<Aes256EncryptedPayload> {
  const cryptoApi = getCryptoApi();
  const salt = new Uint8Array(16);
  const iv = new Uint8Array(12);
  cryptoApi.getRandomValues(salt);
  cryptoApi.getRandomValues(iv);

  const { material, requiresCustomPassphrase } = resolveKeyMaterial(options?.customPassphrase);
  const aesKey = await deriveAes256Key(material, salt, PBKDF2_ITERATIONS);
  const keyFingerprint = await computeKeyFingerprint(material);

  const plaintextBytes = new TextEncoder().encode(JSON.stringify(data));
  const encryptedBuffer = await cryptoApi.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
      tagLength: 128,
    },
    aesKey,
    plaintextBytes
  );

  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations: PBKDF2_ITERATIONS,
    salt: toBase64Url(salt),
    iv: toBase64Url(iv),
    ciphertext: toBase64Url(new Uint8Array(encryptedBuffer)),
    encryptedFields: options?.encryptedFields ?? ENCRYPTED_SENSITIVE_FIELD_LABELS,
    encryptedAt: new Date().toISOString(),
    keyFingerprint,
    requiresCustomPassphrase,
  };
}

export async function decryptJsonAes256<T>(
  payload: Aes256EncryptedPayload,
  customPassphrase?: string
): Promise<T> {
  if (!payload || payload.algorithm !== 'AES-256-GCM' || !payload.ciphertext || !payload.iv || !payload.salt) {
    throw new Error('Envelope AES-256-GCM inválido ou corrompido.');
  }

  const cryptoApi = getCryptoApi();
  const salt = fromBase64Url(payload.salt);
  const iv = fromBase64Url(payload.iv);
  const ciphertext = fromBase64Url(payload.ciphertext);

  const { material } = resolveKeyMaterial(customPassphrase);
  const aesKey = await deriveAes256Key(
    material,
    salt,
    payload.iterations || PBKDF2_ITERATIONS
  );

  try {
    const decryptedBuffer = await cryptoApi.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        tagLength: 128,
      },
      aesKey,
      ciphertext as BufferSource
    );
    const jsonText = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(jsonText) as T;
  } catch {
    throw new Error(
      payload.requiresCustomPassphrase
        ? 'Frase-senha incorreta ou falha de autenticação AES-256-GCM.'
        : 'Falha ao descriptografar cofre AES-256-GCM (chave do dispositivo incompatível ou dados adulterados).'
    );
  }
}

export function maskEmail(email?: string): string {
  if (!email) return '';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 1) return '***@***';
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone?: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `***-${digits.slice(-4)}`;
}

export function maskDocument(doc?: string): string {
  if (!doc) return '';
  const clean = doc.trim();
  if (clean.length <= 4) return '****';
  return `***.***.***-${clean.slice(-2)}`;
}

export function maskPixKey(pixKey: string, type: CreatorProfile['pixKeyType']): string {
  if (!pixKey) return '';
  if (type === 'email' || pixKey.includes('@')) return maskEmail(pixKey);
  if (type === 'phone') return maskPhone(pixKey);
  if (pixKey.length <= 6) return '******';
  return `${pixKey.slice(0, 2)}******${pixKey.slice(-3)}`;
}

export function extractSensitiveCreatorFields(
  creator: CreatorProfile,
  notificationDestinationEmail?: string
): SensitiveCreatorVault {
  return {
    email: creator.email,
    phone: creator.phone,
    documentNumber: creator.documentNumber,
    pixKey: creator.pixKey,
    pixKeyType: creator.pixKeyType,
    expressPhone: creator.expressPhone,
    expressBankName: creator.expressBankName,
    expressIban: creator.expressIban,
    savedVisaCard: creator.savedVisaCard ? { ...creator.savedVisaCard } : undefined,
    bankAccount: creator.bankAccount ? { ...creator.bankAccount } : undefined,
    notificationDestinationEmail:
      notificationDestinationEmail ?? creator.notificationSettings?.destinationEmail ?? creator.email,
  };
}

export function sanitizeCreatorForStorage(creator: CreatorProfile): CreatorProfile {
  const accountDigits = creator.bankAccount?.accountNumber?.replace(/\D/g, '') || '';
  const accountSuffix = accountDigits.length >= 4 ? accountDigits.slice(-4) : '****';

  return {
    ...creator,
    email: creator.email ? maskEmail(creator.email) : undefined,
    phone: creator.phone ? maskPhone(creator.phone) : undefined,
    documentNumber: creator.documentNumber ? maskDocument(creator.documentNumber) : undefined,
    pixKey: maskPixKey(creator.pixKey, creator.pixKeyType),
    expressPhone: creator.expressPhone ? maskPhone(creator.expressPhone) : undefined,
    expressIban: creator.expressIban ? `****${creator.expressIban.slice(-4)}` : undefined,
    savedVisaCard: creator.savedVisaCard
      ? {
          holderName: '*** (AES-256)',
          last4: creator.savedVisaCard.last4,
          expiryDate: '**/**',
          cardBrand: creator.savedVisaCard.cardBrand,
          fullCardNumber: undefined,
        }
      : undefined,
    bankAccount: creator.bankAccount
      ? {
          bankName: creator.bankAccount.bankName,
          agency: '****',
          accountNumber: `****${accountSuffix}`,
          accountType: creator.bankAccount.accountType,
          documentNumber: creator.bankAccount.documentNumber
            ? maskDocument(creator.bankAccount.documentNumber)
            : undefined,
        }
      : undefined,
    notificationSettings: creator.notificationSettings
      ? {
          ...creator.notificationSettings,
          destinationEmail: maskEmail(creator.notificationSettings.destinationEmail),
        }
      : undefined,
  };
}

export function mergeCreatorWithVault(
  baseProfile: CreatorProfile,
  vault: SensitiveCreatorVault
): CreatorProfile {
  return {
    ...baseProfile,
    email: vault.email ?? baseProfile.email,
    phone: vault.phone ?? baseProfile.phone,
    documentNumber: vault.documentNumber ?? baseProfile.documentNumber,
    pixKey: vault.pixKey ?? baseProfile.pixKey,
    pixKeyType: vault.pixKeyType ?? baseProfile.pixKeyType,
    expressPhone: vault.expressPhone ?? baseProfile.expressPhone,
    expressBankName: vault.expressBankName ?? baseProfile.expressBankName,
    expressIban: vault.expressIban ?? baseProfile.expressIban,
    savedVisaCard: vault.savedVisaCard ? { ...vault.savedVisaCard } : baseProfile.savedVisaCard,
    bankAccount: vault.bankAccount ? { ...vault.bankAccount } : baseProfile.bankAccount,
    notificationSettings: baseProfile.notificationSettings
      ? {
          ...baseProfile.notificationSettings,
          destinationEmail:
            vault.notificationDestinationEmail ?? baseProfile.notificationSettings.destinationEmail,
        }
      : undefined,
  };
}

export async function createEncryptedCreatorEnvelope(
  creator: CreatorProfile,
  options?: {
    customPassphrase?: string;
    notificationDestinationEmail?: string;
  }
): Promise<StoredCreatorEnvelope> {
  const vault = extractSensitiveCreatorFields(creator, options?.notificationDestinationEmail);
  const encryptedVault = await encryptJsonAes256(vault, {
    customPassphrase: options?.customPassphrase,
    encryptedFields: ENCRYPTED_SENSITIVE_FIELD_LABELS,
  });

  return {
    format: 'monetizahub_aes256_vault_v1',
    maskedProfile: sanitizeCreatorForStorage(creator),
    encryptedVault,
  };
}

export async function createEncryptedNotificationEnvelope(
  settings: NotificationThresholdSettings,
  customPassphrase?: string
): Promise<StoredNotificationSettingsEnvelope> {
  const encryptedDestinationEmail = await encryptJsonAes256(
    { destinationEmail: settings.destinationEmail },
    {
      customPassphrase,
      encryptedFields: ['E-mail de Destino para Alertas'],
    }
  );

  return {
    format: 'monetizahub_notif_aes256_v1',
    settings: {
      ...settings,
      destinationEmail: maskEmail(settings.destinationEmail),
    },
    encryptedDestinationEmail,
  };
}

export function isStoredCreatorEnvelope(raw: unknown): raw is StoredCreatorEnvelope {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<StoredCreatorEnvelope>;
  return (
    candidate.format === 'monetizahub_aes256_vault_v1' &&
    Boolean(candidate.maskedProfile) &&
    Boolean(candidate.encryptedVault) &&
    candidate.encryptedVault?.algorithm === 'AES-256-GCM'
  );
}

export function isStoredNotificationEnvelope(raw: unknown): raw is StoredNotificationSettingsEnvelope {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<StoredNotificationSettingsEnvelope>;
  return (
    candidate.format === 'monetizahub_notif_aes256_v1' &&
    Boolean(candidate.settings) &&
    Boolean(candidate.encryptedDestinationEmail) &&
    candidate.encryptedDestinationEmail?.algorithm === 'AES-256-GCM'
  );
}
