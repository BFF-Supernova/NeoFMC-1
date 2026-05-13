import crypto from "crypto";

const testKey = crypto.randomBytes(32).toString("hex");
process.env.ENCRYPTION_KEY = testKey;

import { encryptField, decryptField, encryptPII, decryptPII, isEncrypted, hashForLookup, generateEncryptionKey } from "../../artifacts/api-server/src/lib/encryption";

console.log("=== Encryption Utility Unit Tests ===\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  FAIL: ${testName}`);
    failed++;
  }
}

console.log("Basic encrypt/decrypt:");
const plaintext = "Mohamed Ahmed Ibrahim";
const encrypted = encryptField(plaintext);
assert(encrypted !== plaintext, "Encrypted value should differ from plaintext");
assert(encrypted.split(":").length === 3, "Encrypted format should be iv:tag:ciphertext");

const decrypted = decryptField(encrypted);
assert(decrypted === plaintext, "Decrypted value should match original");

console.log("\nUnicode/Arabic text:");
const arabic = "محمد أحمد إبراهيم";
const encArabic = encryptField(arabic);
const decArabic = decryptField(encArabic);
assert(decArabic === arabic, "Should handle Arabic text correctly");

console.log("\nNational ID:");
const nid = "29001011234567";
const encNid = encryptField(nid);
const decNid = decryptField(encNid);
assert(decNid === nid, "Should encrypt/decrypt national IDs correctly");

console.log("\nisEncrypted detection:");
assert(isEncrypted(encrypted) === true, "Should detect encrypted values");
assert(isEncrypted("plain text") === false, "Should detect plain text");
assert(isEncrypted("") === false, "Should handle empty strings");

console.log("\nPII batch operations:");
const piiData = { nationalId: "29001011234567", fullNameAr: "محمد", phone: "01012345678", address: "Cairo", riskScore: 75 };
const piiFields = ["nationalId", "phone", "address"];

const encPii = encryptPII(piiData, piiFields);
assert(encPii.nationalId !== piiData.nationalId, "nationalId should be encrypted");
assert(encPii.phone !== piiData.phone, "phone should be encrypted");
assert(encPii.address !== piiData.address, "address should be encrypted");
assert(encPii.fullNameAr === piiData.fullNameAr, "non-PII field should be unchanged");
assert(encPii.riskScore === 75, "numeric field should be unchanged");

const decPii = decryptPII(encPii, piiFields);
assert(decPii.nationalId === piiData.nationalId, "nationalId should decrypt correctly");
assert(decPii.phone === piiData.phone, "phone should decrypt correctly");
assert(decPii.address === piiData.address, "address should decrypt correctly");

console.log("\nNull/undefined handling:");
const withNulls = { nationalId: null, phone: undefined, address: "" };
const encNulls = encryptPII(withNulls, ["nationalId", "phone", "address"]);
assert(encNulls.nationalId === null, "null values should stay null");
assert(encNulls.phone === undefined, "undefined values should stay undefined");
assert(encNulls.address === "", "empty strings should stay empty");

console.log("\nLegacy data compatibility:");
const legacyData = { nationalId: "29001011234567" };
const decLegacy = decryptPII(legacyData, ["nationalId"]);
assert(decLegacy.nationalId === "29001011234567", "Unencrypted legacy data should pass through");

console.log("\nHash for lookup:");
const hash1 = hashForLookup("test@example.com");
const hash2 = hashForLookup("TEST@example.com");
assert(hash1 === hash2, "Hash should be case-insensitive");
assert(hash1.length === 64, "Hash should be 64-char hex");

console.log("\nKey generation:");
const newKey = generateEncryptionKey();
assert(newKey.length === 64, "Generated key should be 64 hex chars (32 bytes)");

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
