// server/utils/onboardStore.ts
import fs from 'fs';

const FILE = '.docs/onboard.txt';

export function getEmployeeById(id: string) {
  if (!fs.existsSync(FILE)) return null;

  const [header, ...rows] = fs.readFileSync(FILE, 'utf-8').trim().split('\n');
  const cols = header.split(',');

  const map = (row: string) =>
    row.split(',').reduce((acc: any, val, i) => {
      acc[cols[i]] = val || null;
      return acc;
    }, {});

  const record = rows.map(map).find(r => r.id === id);
  return record || null;
}
