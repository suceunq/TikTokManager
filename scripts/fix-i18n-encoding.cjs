const fs = require('fs');
const path = 'shared/i18n.ts';
const raw = fs.readFileSync(path, 'utf8');
const hadBom = raw.charCodeAt(0) === 0xfeff;
const s = hadBom ? raw.slice(1) : raw;

const HIGH = {
  '\u20AC': 0x80, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84, '\u2026': 0x85,
  '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89, '\u0160': 0x8A,
  '\u2039': 0x8B, '\u0152': 0x8C, '\u017D': 0x8E, '\u2018': 0x91, '\u2019': 0x92,
  '\u201C': 0x93, '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97,
  '\u02DC': 0x98, '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C,
  '\u017E': 0x9E, '\u0178': 0x9F,
};

function toByte(ch) {
  const c = ch.codePointAt(0);
  if (c < 0x80) return c;
  if (c >= 0xa0 && c <= 0xff) return c;
  if (HIGH[ch] !== undefined) return HIGH[ch];
  if (c >= 0x80 && c <= 0x9f) return c;
  return null;
}

const bytes = [];
const failed = new Set();
for (const ch of s) {
  const b = toByte(ch);
  if (b === null) {
    failed.add(ch + ' U+' + ch.codePointAt(0).toString(16).padStart(4, '0'));
    bytes.push(0x3f);
  } else {
    bytes.push(b);
  }
}
if (failed.size) {
  console.log('UNMAPPABLE CHARS:', Array.from(failed).join(', '));
  process.exit(1);
}
const recovered = Buffer.from(bytes).toString('utf8');
if (recovered.includes('\uFFFD')) {
  console.log('ABORT: replacement chars produced');
  process.exit(1);
}
const checks = ['Langue du syst\u00e8me', '\u00c9chec', 'Publier sur TikTok', 'Cha\u00eene YouTube'];
for (const c of checks) {
  if (!recovered.includes(c)) {
    console.log('ABORT: missing expected string:', c);
    process.exit(1);
  }
}
fs.writeFileSync(path, (hadBom ? '\ufeff' : '') + recovered, 'utf8');
console.log('OK - mojibake reverted, BOM preserved:', hadBom);
