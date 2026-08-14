import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// Criptografia dos tokens de conta externa.
//
// O schema já chamava os campos de `accessTokenEncrypted` / `refreshTokenEncrypted`
// desde o Sprint 1, mas não havia uma linha de criptografia no projeto — o nome
// prometia uma coisa e o banco guardaria outra. Este arquivo cumpre a promessa.
//
// AES-256-GCM, do `node:crypto`, sem dependência nova. GCM e não CBC porque é
// autenticado: adulterar o texto cifrado faz a decifragem falhar em vez de
// devolver lixo que o código trataria como token.
//
// O formato guardado é `v1.<iv>.<authTag>.<ciphertext>`, tudo em base64url. O
// prefixo de versão existe para o dia em que a chave ou o algoritmo mudarem:
// dá para migrar lendo o formato antigo e escrevendo o novo, sem adivinhação.
// ---------------------------------------------------------------------------

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // recomendado para GCM
const KEY_BYTES = 32; // AES-256

export class TokenEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenEncryptionError";
  }
}

/// Lê e valida a chave do ambiente.
///
/// Falha alto e cedo: uma chave ausente ou de tamanho errado é erro de
/// configuração, não estado de execução. Guardar token com chave inválida é
/// pior que não guardar.
function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new TokenEncryptionError(
      "TOKEN_ENCRYPTION_KEY não configurada. Gere com: openssl rand -base64 32",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new TokenEncryptionError(
      `TOKEN_ENCRYPTION_KEY precisa ter ${KEY_BYTES} bytes em base64 (tem ${key.length}). Gere com: openssl rand -base64 32`,
    );
  }
  return key;
}

export function isTokenEncryptionConfigured(): boolean {
  try {
    getKey();
    return true;
  } catch {
    return false;
  }
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(encoded: string): string {
  const key = getKey();

  const parts = encoded.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new TokenEncryptionError("Formato de token cifrado não reconhecido.");
  }

  const [, ivPart, tagPart, dataPart] = parts;

  try {
    const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Não vaza o erro do OpenSSL: ele diferencia "tag inválida" de outros
    // problemas, e essa distinção é justamente o que um atacante gostaria de
    // usar como oráculo.
    throw new TokenEncryptionError(
      "Falha ao decifrar o token. A chave pode ter mudado, ou o dado foi adulterado.",
    );
  }
}

/// Decifra sem estourar. Usar quando um token ilegível deve degradar a
/// integração (pedir reconexão) em vez de derrubar a página.
export function tryDecryptToken(encoded: string | null | undefined): string | null {
  if (!encoded) return null;
  try {
    return decryptToken(encoded);
  } catch {
    return null;
  }
}
