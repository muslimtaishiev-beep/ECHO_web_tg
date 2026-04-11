import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  /**
   * Generate a random 256-bit key for a chat room
   */
  generateRoomKey(): string {
    return randomBytes(32).toString('base64');
  }

  /**
   * Encrypt a plaintext message using AES-256-GCM
   */
  encrypt(
    plaintext: string,
    keyBase64: string,
  ): { encrypted: string; iv: string; authTag: string } {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag().toString('base64');

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag,
    };
  }

  /**
   * Decrypt a message using AES-256-GCM
   */
  decrypt(
    encryptedBase64: string,
    ivBase64: string,
    authTagBase64: string,
    keyBase64: string,
  ): string {
    const key = Buffer.from(keyBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
