import crypto from "node:crypto";

const pin = process.argv[2];
if (!pin || !/^\d{4,12}$/.test(pin)) {
  console.error("usage: pnpm hash-pin <4-12 digit pin>");
  process.exit(1);
}

const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 });
console.log(`scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`);
