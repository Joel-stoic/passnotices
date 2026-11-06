"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = "aes-256-cbc";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
function getKey() {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret)
        throw new Error("ENCRYPTION_KEY not set in environment");
    // Derive a 32-byte key from the secret
    return crypto_1.default.scryptSync(secret, "salt", KEY_LENGTH);
}
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}
function decrypt(text) {
    const [ivHex, encryptedHex] = text.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, getKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
}
