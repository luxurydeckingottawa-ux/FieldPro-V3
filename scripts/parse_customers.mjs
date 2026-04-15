// Script to parse HCP customer CSV and generate seed TypeScript file
import { readFileSync, writeFileSync } from 'fs';

const CSV_PATH = 'C:\\Users\\railm\\Downloads\\hcp_export_temp\\LuxuryDecKing_customer_export.csv';
const OUT_PATH = 'C:\\Users\\railm\\OneDrive\\Documents\\LuxuryDecking\\FieldPro-Claude\\FieldPro-V3-Live\\src\\data\\customers.ts';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  result.push(current);
  return result;
}

function parseCSV(raw) {
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
}

function parseMoney(val) {
  if (!val) return 0;
  const cleaned = val.replace(/[$,]/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseBool(val) {
  return val && val.toLowerCase() === 'true';
}

function parseTags(val) {
  if (!val) return [];
  // Strip surrounding quotes/apostrophes that HCP wraps tags in
  return val.replace(/^['"]|['"]$/g, '').split(',').map(t => t.replace(/^['"]|['"]$/g, '').trim()).filter(Boolean);
}

function classifyStatus(lifetimeValue, tags) {
  if (lifetimeValue > 0) return 'active_client';
  const tagLower = tags.map(t => t.toLowerCase()).join(' ');
  if (tagLower.includes('quote')) return 'quoted_not_converted';
  return 'cold_lead';
}

function mapCustomerType(val) {
  if (!val) return 'homeowner';
  return val.toLowerCase() === 'business' ? 'business' : 'homeowner';
}

function buildAddress(row, prefix) {
  const street1 = row[`${prefix} Street Line 1`] || '';
  if (!street1) return null;
  return {
    streetLine1: street1,
    streetLine2: row[`${prefix} Street Line 2`] || undefined,
    city: row[`${prefix} City`] || '',
    province: row[`${prefix} State`] || '',
    postalCode: row[`${prefix} Postal Code`] || '',
    isBilling: parseBool(row[`${prefix} Billing?`]),
    notes: row[`${prefix} Notes`] || undefined,
  };
}

function escapeStr(s) {
  if (!s) return '';
  return s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');
}

const raw = readFileSync(CSV_PATH, 'utf8');
const rows = parseCSV(raw);

const customers = rows.map((row, index) => {
  const lv = parseMoney(row['Lifetime value']);
  const tags = parseTags(row['Tags']);
  const status = classifyStatus(lv, tags);

  const addr1 = buildAddress(row, 'Address_1');
  const addr2 = buildAddress(row, 'Address_2');
  const addresses = [addr1, addr2].filter(Boolean);

  return {
    id: `cust_${index}`,
    firstName: row['First Name'] || '',
    lastName: row['Last Name'] || '',
    displayName: row['Display Name'] || '',
    phone: row['Mobile Number'] || '',
    homePhone: row['Home Number'] || undefined,
    email: row['Email'] || '',
    company: row['Company'] || undefined,
    customerType: mapCustomerType(row['Customer Type']),
    addresses,
    tags,
    notes: row['Notes'] || '',
    leadSource: row['Lead Source'] || undefined,
    lifetimeValue: lv,
    lastServiceDate: row['Last service date'] || undefined,
    hcpId: row['ID'] || undefined,
    createdAt: row['Customer created at'] || new Date().toISOString(),
    status,
    doNotService: parseBool(row['Do Not Service']),
  };
});

// Build TS output
function renderAddress(addr) {
  const parts = [
    `          streetLine1: \`${escapeStr(addr.streetLine1)}\``,
    addr.streetLine2 ? `          streetLine2: \`${escapeStr(addr.streetLine2)}\`` : null,
    `          city: \`${escapeStr(addr.city)}\``,
    `          province: \`${escapeStr(addr.province)}\``,
    `          postalCode: \`${escapeStr(addr.postalCode)}\``,
    `          isBilling: ${addr.isBilling === true ? 'true' : 'false'}`,
    addr.notes ? `          notes: \`${escapeStr(addr.notes)}\`` : null,
  ].filter(p => p !== null).join(',\n');
  return `        {\n${parts}\n        }`;
}

function renderCustomer(c) {
  const addrLines = c.addresses.map(renderAddress).join(',\n');
  const tagLines = c.tags.map(t => `\`${escapeStr(t)}\``).join(', ');
  const lines = [
    `      id: '${c.id}'`,
    `      firstName: \`${escapeStr(c.firstName)}\``,
    `      lastName: \`${escapeStr(c.lastName)}\``,
    `      displayName: \`${escapeStr(c.displayName)}\``,
    `      phone: \`${escapeStr(c.phone)}\``,
    c.homePhone ? `      homePhone: \`${escapeStr(c.homePhone)}\`` : null,
    `      email: \`${escapeStr(c.email)}\``,
    c.company ? `      company: \`${escapeStr(c.company)}\`` : null,
    `      customerType: '${c.customerType}'`,
    `      addresses: [\n${addrLines || ''}      ]`,
    `      tags: [${tagLines}]`,
    `      notes: \`${escapeStr(c.notes)}\``,
    c.leadSource ? `      leadSource: \`${escapeStr(c.leadSource)}\`` : null,
    `      lifetimeValue: ${c.lifetimeValue}`,
    c.lastServiceDate ? `      lastServiceDate: '${c.lastServiceDate}'` : null,
    c.hcpId ? `      hcpId: '${c.hcpId}'` : null,
    `      createdAt: '${c.createdAt}'`,
    `      status: '${c.status}'`,
    `      doNotService: ${c.doNotService === true ? 'true' : 'false'}`,
  ].filter(l => l !== null).join(',\n');
  return `    {\n${lines}\n    }`;
}

const customerBlocks = customers.map(renderCustomer).join(',\n');

const output = `// Auto-generated from HousecallPro export — do not edit manually
// Source: LuxuryDecKing_customer_export.csv (${customers.length} customers)
// Generated: ${new Date().toISOString()}

import type { Customer } from '../types';

export const SEED_CUSTOMERS: Customer[] = [
${customerBlocks}
];
`;

writeFileSync(OUT_PATH, output, 'utf8');
console.log(`Done — wrote ${customers.length} customers to ${OUT_PATH}`);
