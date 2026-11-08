// Emulador mínimo de Google Apps Script para probar Codigo.gs en Node.
const fs = require('fs'), vm = require('vm'), crypto = require('crypto');

function makeEnv(opts) {
  opts = opts || {};
  const sheets = new Map(); // name -> {name, rows: [][]}
  const mails = [], props = {}, cache = {}, files = {}, triggers = [];
  function sheetObj(sh) {
    function lastCol() { return sh.rows.reduce((m, r) => Math.max(m, r.length), 0); }
    function range(r, c, nr, nc) {
      nr = nr || 1; nc = nc || 1;
      const R = {
        getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] === undefined ? '' : row[c - 1 + j]); out.push(o); } return out; },
        getValue() { return R.getValues()[0][0]; },
        setValues(v) { for (let i = 0; i < v.length; i++) { while (sh.rows.length < r + i) sh.rows.push([]); const row = sh.rows[r - 1 + i]; for (let j = 0; j < v[i].length; j++) { while (row.length < c + j - 1) row.push(''); row[c - 1 + j] = v[i][j]; } } return R; },
        setValue(v) { return R.setValues([[v]]); },
        setFontWeight() { return R; }, setNumberFormat() { return R; }, clearContent() { for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i]; if (row) for (let j = 0; j < nc; j++) row[c - 1 + j] = ''; } return R; }
      };
      return R;
    }
    return {
      getName: () => sh.name,
      getLastRow() { let n = sh.rows.length; while (n > 0 && sh.rows[n - 1].every(v => v === '' || v === undefined)) n--; return n; },
      getLastColumn: lastCol,
      getRange(a, b, c, d) {
        if (typeof a === 'string') { // 'B:B' o 'A1'
          const m = a.match(/^([A-Z]+)(\d*)/); const col = m[1].charCodeAt(0) - 64; return range(m[2] ? +m[2] : 1, col, Math.max(1, sh.rows.length), 1);
        }
        return range(a, b, c, d);
      },
      appendRow(v) { const n = this.getLastRow(); sh.rows.length = n; sh.rows.push(v.slice()); return this; },
      deleteRow(i) { sh.rows.splice(i - 1, 1); },
      setFrozenRows() {}, clear() { sh.rows = []; }
    };
  }
  const ss = {
    getSheetByName(n) { const s = sheets.get(n); return s ? sheetObj(s) : null; },
    insertSheet(n) { const s = { name: n, rows: [] }; sheets.set(n, s); return sheetObj(s); },
    getSheets() { return [...sheets.values()].map(sheetObj); },
    deleteSheet(o) { sheets.delete(o.getName()); }
  };
  const TZFMT = (d, tz, pat) => {
    d = new Date(d);
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(p => [p.type, p.value]));
    return pat.replace(/'([^']*)'|yyyy|yy|MM|dd|HH|mm|ss|SSS|XXX/g, (t, lit) => lit !== undefined ? lit : t === 'yyyy' ? parts.year : t === 'yy' ? parts.year.slice(2) : t === 'MM' ? parts.month : t === 'dd' ? parts.day : t === 'HH' ? parts.hour : t === 'mm' ? parts.minute : t === 'ss' ? parts.second : t === 'SSS' ? '000' : '-03:00');
  };
  const ctx = {
    console, JSON, Math, Date, Object, Array, String, Number, Error, RegExp, isFinite, parseInt, parseFloat, encodeURIComponent,
    SpreadsheetApp: { getActive: () => ss, flush() {}, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: k => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); }, remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {}, tryLock: () => true }) },
    Utilities: {
      formatDate: TZFMT, getUuid: () => crypto.randomUUID(), sleep() {},
      base64Decode: s => [...Buffer.from(s, 'base64')], base64EncodeWebSafe: b => Buffer.from(b).toString('base64url'),
      computeHmacSha256Signature: (v, k) => [...crypto.createHmac('sha256', k).update(v).digest()],
      newBlob: (d, m, n) => ({ getName: () => n, setName() { return this; } })
    },
    ContentService: { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    HtmlService: { createHtmlOutput: h => ({ html: h, setTitle() { return this; } }) },
    MailApp: { sendEmail: o => mails.push(o), getRemainingDailyQuota: () => (opts.quota == null ? 100 : opts.quota) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 500, getContentText: () => '{}' }) },
    ScriptApp: {
      getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/TEST/exec' }), getOAuthToken: () => 'x',
      getProjectTriggers: () => triggers, deleteTrigger() {}, newTrigger: () => ({ timeBased: () => ({ everyHours: () => ({ create() {} }) }) })
    },
    DriveApp: {
      getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => ({ createFile: b => { const id = 'f' + Object.keys(files).length; files[id] = b; return { getId: () => id, setSharing() {}, getUrl: () => 'u' }; } }),
      getFileById: id => ({ setTrashed() {}, makeCopy() { return { getId: () => 'c' }; } }), Access: {}, Permission: {}
    },
    Logger: { log() {} }
  };
  vm.createContext(ctx);
  const code = fs.readFileSync(opts.file, 'utf8');
  vm.runInContext(code, ctx, { filename: opts.file });
  props.ADMIN_PASSWORD = opts.password || 'test';
  return { ctx, sheets, mails, props, cache, ss,
    post(body) { const r = ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify(body) } }); return JSON.parse(r.text); },
    dump(n) { const s = sheets.get(n); return s ? s.rows : null; } };
}
module.exports = { makeEnv };

// Servidor HTTP opcional: node gas-emu.js Codigo.gs [puerto]
if (require.main === module) {
  const http = require('http');
  const env = makeEnv({ file: process.argv[2] });
  env.ctx.instalar();
  if (process.argv[4]) require(require('path').resolve(process.argv[4]))(env);
  const port = +process.argv[3] || 8787;
  http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') { res.end(); return; }
    let b = ''; req.on('data', c => b += c); req.on('end', () => {
      let out;
      try { out = JSON.stringify(env.post(JSON.parse(b || '{}'))); } catch (e) { out = JSON.stringify({ ok: false, error: String(e.stack || e) }); }
      res.setHeader('Content-Type', 'application/json'); res.end(out);
    });
  }).listen(port, () => console.log('GAS emu on ' + port));
}
