import bcrypt from 'bcrypt';

const rounds = 12;
const passwords = [
  { label: 'Admin',   email: 'admin@hoangan.vn',   plain: 'admin123' },
  { label: 'QuanLy',  email: 'manager@hoangan.vn', plain: 'manager123' },
  { label: 'LeTan',   email: 'letan01@hoangan.vn', plain: 'letan123' },
];

console.log('=== Bcrypt Password Hashes for seed.sql ===\n');
for (const { label, plain } of passwords) {
  const hash = await bcrypt.hash(plain, rounds);
  const verified = await bcrypt.compare(plain, hash);
  console.log(`${label} (${plain}):`);
  console.log(`  ${hash}`);
  console.log(`  Verified: ${verified}\n`);
}
console.log('Copy these hashes into database/seed.sql NGUOI_DUNG INSERT statements.');
