'use strict';

const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type'] || req.headers['Content-Type'] || '';
    const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ct);
    if (!m) return reject(Object.assign(new Error('multipart boundary がありません'), { status: 400 }));
    const boundary = m[1] || m[2];
    const chunks = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > MAX_TOTAL_BYTES) {
        req.removeAllListeners('data');
        reject(Object.assign(new Error('リクエストサイズが大きすぎます'), { status: 413 }));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(splitParts(Buffer.concat(chunks), boundary));
      } catch (e) {
        if (!e.status) e.status = 400;
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function splitParts(buf, boundary) {
  const delim = Buffer.from('--' + boundary);
  const fields = {};
  const files = [];
  let idx = buf.indexOf(delim);
  if (idx < 0) throw new Error('boundary が本文に存在しません');
  while (idx >= 0) {
    const start = idx + delim.length;
    // 終端 (--)
    if (buf[start] === 0x2d && buf[start + 1] === 0x2d) break;
    // 直後の CRLF をスキップ
    let partStart = start;
    if (buf[partStart] === 0x0d && buf[partStart + 1] === 0x0a) partStart += 2;
    const next = buf.indexOf(delim, partStart);
    if (next < 0) throw new Error('終端 boundary がありません');
    // 末尾の CRLF を除去
    let partEnd = next;
    if (buf[partEnd - 2] === 0x0d && buf[partEnd - 1] === 0x0a) partEnd -= 2;
    const part = buf.slice(partStart, partEnd);
    parsePart(part, fields, files);
    idx = next;
  }
  return { fields, files };
}

function parsePart(part, fields, files) {
  const sep = Buffer.from('\r\n\r\n');
  const sIdx = part.indexOf(sep);
  if (sIdx < 0) return;
  const headerStr = part.slice(0, sIdx).toString('utf8');
  const body = part.slice(sIdx + sep.length);
  const headers = {};
  for (const line of headerStr.split(/\r\n/)) {
    const c = line.indexOf(':');
    if (c < 0) continue;
    headers[line.slice(0, c).trim().toLowerCase()] = line.slice(c + 1).trim();
  }
  const cd = headers['content-disposition'] || '';
  const nameM = /name="([^"]*)"/.exec(cd);
  if (!nameM) return;
  const name = nameM[1];
  const fileM = /filename="([^"]*)"/.exec(cd);
  if (fileM) {
    files.push({
      fieldName: name,
      filename: fileM[1],
      contentType: headers['content-type'] || 'application/octet-stream',
      buffer: body,
    });
  } else {
    fields[name] = body.toString('utf8');
  }
}

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let cur = [];
  let cell = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQ = true;
      } else if (ch === ',') {
        cur.push(cell); cell = '';
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        cur.push(cell); cell = '';
        rows.push(cur); cur = [];
      } else if (ch === '\n') {
        cur.push(cell); cell = '';
        rows.push(cur); cur = [];
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length > 0 || cur.length > 0) {
    cur.push(cell);
    rows.push(cur);
  }
  // 空行除去
  const filtered = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  if (filtered.length === 0) return { headers: [], records: [] };
  const headers = filtered[0].map((h) => h.trim());
  const records = filtered.slice(1).map((r) => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i] !== undefined ? r[i] : '';
    return obj;
  });
  return { headers, records };
}

module.exports = { parseMultipart, parseCsv };
