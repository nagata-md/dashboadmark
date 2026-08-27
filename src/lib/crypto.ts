import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// E3: OAuthトークン（ad_connections.access_token/refresh_token）の暗号化。
// AES-256-GCM。鍵は環境変数 TOKEN_ENCRYPTION_KEY（32byteをbase64化したもの）で管理し、
// 復号はService Role経由のサーバーサイド処理からのみ行う（spec §6、masterplan E3）。
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const base64Key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!base64Key) {
    throw new Error("TOKEN_ENCRYPTION_KEY が設定されていません");
  }
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY は32byte（base64化前）である必要があります");
  }
  return key;
}

// 暗号文は "iv:authTag:ciphertext"（各base64）の1文字列にまとめて保存する。
export function encryptToken(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(
    ":",
  );
}

export function decryptToken(encoded: string): string {
  const key = getKey();
  const [ivB64, authTagB64, dataB64] = encoded.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("暗号化されたトークンの形式が不正です");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
