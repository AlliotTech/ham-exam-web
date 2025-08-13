// Build-time dataset fetcher & converter
// - Prefers local DATASET_DIR if present
// - Otherwise fetches from GitHub raw repo
// - Outputs static JSON to public/questions-*.json and images to public/qimg/

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const outBaseDir = path.join(publicDir, 'questions');
const outImgDir = path.join(outBaseDir, 'images');

const LOCAL_DIR = process.env.DATASET_DIR || '';
const REMOTE_BASE = process.env.DATASET_REMOTE || 'https://raw.githubusercontent.com/AlliotTech/crac-amateur-radio-exam-questions-2025-csv/main';

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

function sanitizeOptionText(s) {
  if (!s) return s;
  // Remove trailing image footnote like "[F]LK0500.jpg" or "[F]LK0942.jpg179"
  return s.replace(/\s*\[F\][^\s,]+\.jpg\d*/gi, '').trim();
}

function parseCsv(text) {
  const rows = [];
  let i = 0, field = '', inQuotes = false, current = [];
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      field += ch; i += 1; continue;
    } else {
      if (ch === '"') { inQuotes = true; i += 1; continue; }
      if (ch === ',') { current.push(field); field = ''; i += 1; continue; }
      if (ch === '\n') { current.push(field); rows.push(current); current = []; field = ''; i += 1; continue; }
      if (ch === '\r') { i += 1; continue; }
      field += ch; i += 1;
    }
  }
  current.push(field); rows.push(current);
  return rows;
}

function headerIndex(header) {
  const map = {}; header.forEach((h, i) => map[h.trim()] = i); return map;
}

async function readTextLocalOrRemote(rel) {
  if (LOCAL_DIR) {
    const p = path.join(LOCAL_DIR, rel);
    if (await exists(p)) return fs.readFile(p, 'utf8');
  }
  const url = `${REMOTE_BASE}/${rel}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  return await res.text();
}

async function readBinaryLocalOrRemote(rel) {
  if (LOCAL_DIR) {
    const p = path.join(LOCAL_DIR, rel);
    if (await exists(p)) return await fs.readFile(p);
  }
  const url = `${REMOTE_BASE}/${rel}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

async function build() {
  console.log('Building dataset for static hosting...');
  await ensureDir(publicDir);
  await ensureDir(outBaseDir);
  await ensureDir(outImgDir);

  // Load image map
  const imagesCsv = await readTextLocalOrRemote('images.csv');
  const imgRows = parseCsv(imagesCsv);
  const imgHeader = imgRows.shift() || [];
  const imgIdx = headerIndex(imgHeader);
  const mapJtoImage = new Map();
  for (const r of imgRows) {
    const j = (r[imgIdx['J']] || '').trim();
    const p = (r[imgIdx['ImagePath']] || '').trim();
    if (j && p) mapJtoImage.set(j, p);
  }

  async function processBank(bankKey) {
    const rel = bankKey === 'full' ? 'full.csv' : bankKey === 'A' ? 'class_a.csv' : bankKey === 'B' ? 'class_b.csv' : 'class_c.csv';
    const csv = await readTextLocalOrRemote(rel);
    const rows = parseCsv(csv);
    const header = rows.shift() || [];
    const idx = headerIndex(header);
    const out = [];
    for (const r of rows) {
      const jraw = (r[idx['J']] || '').trim();
      const primaryJ = jraw.includes(',') ? jraw.split(',')[0].trim() : jraw;
      const p = (r[idx['P']] || '').trim();
      const q = (r[idx['Q']] || '').trim();
      const t = (r[idx['T']] || '').trim();
      const A = sanitizeOptionText((r[idx['A']] || '').trim());
      const B = sanitizeOptionText((r[idx['B']] || '').trim());
      const C = sanitizeOptionText((r[idx['C']] || '').trim());
      const D = sanitizeOptionText((r[idx['D']] || '').trim());
      if (!q) continue;
      const options = [];
      if (A) options.push({ key: 'A', text: A });
      if (B) options.push({ key: 'B', text: B });
      if (C) options.push({ key: 'C', text: C });
      if (D) options.push({ key: 'D', text: D });
      const answer_keys = (t || '').split('').filter(ch => ch >= 'A' && ch <= 'Z');
      const type = answer_keys.length <= 1 ? 'single' : 'multiple';
      let imageUrl = null;
      const imageRel = primaryJ ? mapJtoImage.get(primaryJ) : null; // e.g., images/0.jpg
      if (imageRel) {
        const base = path.basename(imageRel); // 0.jpg
        const data = await readBinaryLocalOrRemote(imageRel);
        await fs.writeFile(path.join(outImgDir, base), data);
        imageUrl = `/questions/images/${base}`;
      }
      out.push({ id: jraw || null, codes: { J: jraw || null, P: p || null }, question: q, options, answer_keys, type, pages: undefined, imageUrl });
    }
    const outName = bankKey === 'full' ? 'full.json' : `${bankKey}.json`;
    await fs.writeFile(path.join(outBaseDir, outName), JSON.stringify(out, null, 2), 'utf8');
    console.log(`Wrote /questions/${outName} (${out.length})`);
  }

  await Promise.all([
    processBank('A'),
    processBank('B'),
    processBank('C'),
    processBank('full'),
  ]);

  console.log('Dataset build complete.');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});


