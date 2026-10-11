'use strict';
const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const AI_KEY = process.env.ANTHROPIC_API_KEY || '';
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const PROD = process.env.NODE_ENV === 'production';

if (!DATABASE_URL) { console.error('Falta DATABASE_URL'); process.exit(1); }
const needsSsl = /\.render\.com|neon\.tech|sslmode=require/.test(DATABASE_URL) || process.env.PGSSL === '1';
const pool = new Pool({ connectionString: DATABASE_URL, ssl: needsSsl ? { rejectUnauthorized: false } : false, max: 8 });
const q = (text, params) => pool.query(text, params);

const gid = () => Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
const now = () => Date.now();
const pairKey = (a, b) => [a, b].sort().join('+');

/* ---------- Esquema ---------- */
async function migrate() {
  await q(`
  CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY, username TEXT UNIQUE, display TEXT, color TEXT,
    pass_hash TEXT, created BIGINT NOT NULL, last_read JSONB NOT NULL DEFAULT '{}'::jsonb);
  CREATE TABLE IF NOT EXISTS sessions(
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS folders(
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, color TEXT, created BIGINT NOT NULL);
  CREATE INDEX IF NOT EXISTS folders_user ON folders(user_id);
  CREATE TABLE IF NOT EXISTS recipes(
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id TEXT, data JSONB NOT NULL, created BIGINT NOT NULL, updated BIGINT NOT NULL);
  CREATE INDEX IF NOT EXISTS recipes_user ON recipes(user_id);
  CREATE INDEX IF NOT EXISTS recipes_folder ON recipes(folder_id);
  CREATE TABLE IF NOT EXISTS requests(
    from_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, to_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL, ts BIGINT NOT NULL, PRIMARY KEY(from_id,to_id));
  CREATE TABLE IF NOT EXISTS chats(
    id TEXT PRIMARY KEY, a TEXT NOT NULL, b TEXT NOT NULL, ts BIGINT NOT NULL, last JSONB);
  CREATE INDEX IF NOT EXISTS chats_a ON chats(a); CREATE INDEX IF NOT EXISTS chats_b ON chats(b);
  CREATE TABLE IF NOT EXISTS messages(
    id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, from_id TEXT NOT NULL, ts BIGINT NOT NULL, data JSONB NOT NULL);
  CREATE INDEX IF NOT EXISTS messages_chat ON messages(chat_id, ts);
  `);
}

/* ---------- Contraseñas y sesiones ---------- */
function hashPass(p) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(p, salt, 64);
  return salt.toString('hex') + ':' + h.toString('hex');
}
function checkPass(p, stored) {
  if (!stored) return false;
  const [s, h] = stored.split(':');
  const calc = crypto.scryptSync(p, Buffer.from(s, 'hex'), 64);
  return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
}
function parseCookies(h) {
  const o = {}; (h || '').split(';').forEach(p => { const i = p.indexOf('='); if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim()); }); return o;
}
function setSession(res, token) {
  res.setHeader('Set-Cookie', `ef=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 400}${PROD ? '; Secure' : ''}`);
}
async function newSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await q('INSERT INTO sessions(token,user_id,created) VALUES($1,$2,$3)', [token, userId, now()]);
  setSession(res, token);
}
async function auth(req, res, next) {
  try {
    const token = parseCookies(req.headers.cookie).ef;
    if (token) {
      const r = await q('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=$1', [token]);
      if (r.rows[0]) { req.user = r.rows[0]; req.token = token; return next(); }
    }
    const id = gid();
    await q('INSERT INTO users(id,created) VALUES($1,$2)', [id, now()]);
    await q('INSERT INTO folders(id,user_id,name,color,created) VALUES($1,$2,$3,$4,$5)', [gid(), id, 'Mis recetas', '#2F5D46', now()]);
    await newSession(res, id);
    req.user = (await q('SELECT * FROM users WHERE id=$1', [id])).rows[0];
    next();
  } catch (e) { next(e); }
}
const needProfile = (req, res, next) => req.user.username ? next() : res.status(403).json({ error: 'Necesitas un perfil para esto.' });

/* ---------- Ayudantes ---------- */
const pub = u => u ? { id: u.id, username: u.username, display: u.display, color: u.color } : null;
function recipeOut(r) { return { ...r.data, id: r.id, folderId: r.folder_id, created: Number(r.created), updated: Number(r.updated) }; }
function cleanRecipe(b) {
  const s = (v, n) => String(v ?? '').slice(0, n);
  const arr = (v, n, m) => (Array.isArray(v) ? v : []).map(x => s(x, m)).filter(Boolean).slice(0, n);
  let image = s(b.image, 400000);
  if (image && !/^data:image\/(jpeg|png|webp);base64,/.test(image) && !/^https?:\/\//.test(image)) image = '';
  return {
    title: s(b.title, 160) || 'Sin título', image, servings: s(b.servings, 20), time: s(b.time, 40), difficulty: s(b.difficulty, 20),
    ingredients: arr(b.ingredients, 120, 300), steps: arr(b.steps, 80, 2000), notes: s(b.notes, 2000),
    source: /^https?:\/\//.test(b.source || '') ? s(b.source, 600) : '', fromUid: b.fromUid ? s(b.fromUid, 60) : null
  };
}
const idOk = id => /^[A-Za-z0-9]{6,40}$/.test(id || '');

/* ---------- App ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '6mb' }));
app.get('/healthz', (req, res) => res.send('ok'));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: 'index.html' }));

const api = express.Router();
api.use(auth);

api.get('/config', (req, res) => res.json({ ai: !!AI_KEY }));

api.get('/state', async (req, res, next) => {
  try {
    const me = req.user.id;
    const [folders, recipes, reqs, chats] = await Promise.all([
      q('SELECT * FROM folders WHERE user_id=$1 ORDER BY created', [me]),
      q('SELECT * FROM recipes WHERE user_id=$1 ORDER BY updated DESC', [me]),
      q('SELECT * FROM requests WHERE from_id=$1 OR to_id=$1', [me]),
      q('SELECT * FROM chats WHERE a=$1 OR b=$1 ORDER BY ts DESC', [me])
    ]);
    const ids = new Set();
    reqs.rows.forEach(r => { ids.add(r.from_id); ids.add(r.to_id); });
    chats.rows.forEach(c => { ids.add(c.a); ids.add(c.b); });
    recipes.rows.forEach(r => r.data.fromUid && ids.add(r.data.fromUid));
    ids.delete(me);
    const people = ids.size ? (await q('SELECT id,username,display,color FROM users WHERE id = ANY($1)', [[...ids]])).rows : [];
    const profiles = {}; people.forEach(p => profiles[p.id] = pub(p));
    res.json({
      me: { ...pub(req.user), lastRead: req.user.last_read || {} }, profiles,
      folders: folders.rows.map(f => ({ id: f.id, name: f.name, color: f.color, created: Number(f.created) })),
      recipes: recipes.rows.map(recipeOut),
      requests: reqs.rows.map(r => ({ from: r.from_id, to: r.to_id, status: r.status, ts: Number(r.ts) })),
      chats: chats.rows.map(c => ({ id: c.id, members: [c.a, c.b], ts: Number(c.ts), last: c.last }))
    });
  } catch (e) { next(e); }
});

/* Perfil */
api.post('/register', async (req, res, next) => {
  try {
    if (req.user.username) return res.status(400).json({ error: 'Ya tienes perfil.' });
    const username = String(req.body.username || '').toLowerCase();
    const display = String(req.body.display || '').trim().slice(0, 40);
    const password = String(req.body.password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'El nombre de usuario debe tener de 3 a 20 letras minúsculas, números o _.' });
    if (!display) return res.status(400).json({ error: 'Escribe tu nombre.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    const taken = await q('SELECT 1 FROM users WHERE username=$1', [username]);
    if (taken.rows[0]) return res.status(409).json({ error: `@${username} ya está cogido. Prueba con otro.` });
    await q('UPDATE users SET username=$1, display=$2, color=$3, pass_hash=$4 WHERE id=$5', [username, display, String(req.body.color || '#B5562B').slice(0, 9), hashPass(password), req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.put('/me', needProfile, async (req, res, next) => {
  try {
    const display = String(req.body.display || '').trim().slice(0, 40);
    if (!display) return res.status(400).json({ error: 'Escribe tu nombre.' });
    await q('UPDATE users SET display=$1, color=$2 WHERE id=$3', [display, String(req.body.color || '#B5562B').slice(0, 9), req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').toLowerCase().replace(/^@/, '');
    const r = await q('SELECT * FROM users WHERE username=$1', [username]);
    const u = r.rows[0];
    if (!u || !checkPass(String(req.body.password || ''), u.pass_hash)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    const cur = req.user;
    if (!cur.username && cur.id !== u.id) {
      // Las recetas hechas sin perfil pasan a la cuenta
      await q('UPDATE folders SET user_id=$1 WHERE user_id=$2 AND id IN (SELECT DISTINCT folder_id FROM recipes WHERE user_id=$2 AND folder_id IS NOT NULL)', [u.id, cur.id]);
      await q('UPDATE recipes SET user_id=$1 WHERE user_id=$2', [u.id, cur.id]);
      await q('DELETE FROM users WHERE id=$1', [cur.id]);
    } else {
      await q('DELETE FROM sessions WHERE token=$1', [req.token]);
    }
    await newSession(res, u.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.post('/logout', async (req, res, next) => {
  try { await q('DELETE FROM sessions WHERE token=$1', [req.token]); res.setHeader('Set-Cookie', 'ef=; Path=/; Max-Age=0'); res.json({ ok: true }); } catch (e) { next(e); }
});

/* Carpetas */
api.put('/folders/:id', async (req, res, next) => {
  try {
    const id = req.params.id; if (!idOk(id)) return res.status(400).json({ error: 'Id no válido' });
    const ex = await q('SELECT user_id FROM folders WHERE id=$1', [id]);
    if (ex.rows[0] && ex.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'No es tuya' });
    const name = String(req.body.name || '').trim().slice(0, 40) || 'Sin nombre';
    const color = String(req.body.color || '#2F5D46').slice(0, 9);
    await q(`INSERT INTO folders(id,user_id,name,color,created) VALUES($1,$2,$3,$4,$5)
             ON CONFLICT(id) DO UPDATE SET name=$3, color=$4`, [id, req.user.id, name, color, Number(req.body.created) || now()]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.delete('/folders/:id', async (req, res, next) => {
  try {
    await q('UPDATE recipes SET folder_id=NULL WHERE folder_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    await q('DELETE FROM folders WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* Recetas */
api.put('/recipes/:id', async (req, res, next) => {
  try {
    const id = req.params.id; if (!idOk(id)) return res.status(400).json({ error: 'Id no válido' });
    const ex = await q('SELECT user_id FROM recipes WHERE id=$1', [id]);
    if (ex.rows[0] && ex.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'No es tuya' });
    let folderId = req.body.folderId || null;
    if (folderId) { const f = await q('SELECT 1 FROM folders WHERE id=$1 AND user_id=$2', [folderId, req.user.id]); if (!f.rows[0]) folderId = null; }
    const data = cleanRecipe(req.body);
    await q(`INSERT INTO recipes(id,user_id,folder_id,data,created,updated) VALUES($1,$2,$3,$4,$5,$6)
             ON CONFLICT(id) DO UPDATE SET folder_id=$3, data=$4, updated=$6`, [id, req.user.id, folderId, data, Number(req.body.created) || now(), now()]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.delete('/recipes/:id', async (req, res, next) => {
  try { await q('DELETE FROM recipes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); res.json({ ok: true }); } catch (e) { next(e); }
});

/* Enlaces públicos */
api.get('/public/recipe/:id', async (req, res, next) => {
  try {
    const r = (await q('SELECT r.*, u.username, u.display, u.color FROM recipes r JOIN users u ON u.id=r.user_id WHERE r.id=$1', [req.params.id])).rows[0];
    if (!r) return res.status(404).json({ error: 'Esta receta ya no existe.' });
    res.json({ recipe: recipeOut(r), owner: { id: r.user_id, username: r.username, display: r.display, color: r.color } });
  } catch (e) { next(e); }
});
api.get('/public/folder/:id', async (req, res, next) => {
  try {
    const f = (await q('SELECT f.*, u.username, u.display, u.color AS ucolor FROM folders f JOIN users u ON u.id=f.user_id WHERE f.id=$1', [req.params.id])).rows[0];
    if (!f) return res.status(404).json({ error: 'Esta carpeta ya no existe.' });
    const rs = await q('SELECT * FROM recipes WHERE folder_id=$1 AND user_id=$2', [f.id, f.user_id]);
    res.json({ folder: { id: f.id, name: f.name, color: f.color }, recipes: rs.rows.map(recipeOut), owner: { id: f.user_id, username: f.username, display: f.display, color: f.ucolor } });
  } catch (e) { next(e); }
});

/* Personas y amigos */
api.get('/users', needProfile, async (req, res, next) => {
  try {
    const term = String(req.query.q || '').toLowerCase().replace(/^@/, '').slice(0, 40);
    const r = await q(`SELECT id,username,display,color FROM users WHERE username IS NOT NULL AND id<>$1
      AND ($2='' OR username LIKE '%'||$2||'%' OR lower(display) LIKE '%'||$2||'%') ORDER BY display LIMIT 40`, [req.user.id, term]);
    res.json(r.rows.map(pub));
  } catch (e) { next(e); }
});
api.post('/friends/:id', needProfile, async (req, res, next) => {
  try {
    const other = req.params.id, me = req.user.id;
    const o = (await q('SELECT username FROM users WHERE id=$1', [other])).rows[0];
    if (!o || !o.username || other === me) return res.status(404).json({ error: 'Esa persona no existe.' });
    const rev = (await q('SELECT * FROM requests WHERE from_id=$1 AND to_id=$2', [other, me])).rows[0];
    if (rev) { await q("UPDATE requests SET status='accepted', ts=$3 WHERE from_id=$1 AND to_id=$2", [other, me, now()]); return res.json({ status: 'accepted' }); }
    await q("INSERT INTO requests(from_id,to_id,status,ts) VALUES($1,$2,'pending',$3) ON CONFLICT DO NOTHING", [me, other, now()]);
    res.json({ status: 'pending' });
  } catch (e) { next(e); }
});
api.delete('/friends/:id', needProfile, async (req, res, next) => {
  try { await q('DELETE FROM requests WHERE (from_id=$1 AND to_id=$2) OR (from_id=$2 AND to_id=$1)', [req.user.id, req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});

/* Chat */
api.get('/chats/:other/messages', needProfile, async (req, res, next) => {
  try {
    const key = pairKey(req.user.id, req.params.other);
    const after = Number(req.query.after) || 0;
    const r = after
      ? await q('SELECT * FROM messages WHERE chat_id=$1 AND ts>$2 ORDER BY ts ASC LIMIT 200', [key, after])
      : await q('SELECT * FROM (SELECT * FROM messages WHERE chat_id=$1 ORDER BY ts DESC LIMIT 200) t ORDER BY ts ASC', [key]);
    res.json(r.rows.map(m => ({ ...m.data, id: m.id, from: m.from_id, ts: Number(m.ts) })));
  } catch (e) { next(e); }
});
api.post('/chats/:other/messages', needProfile, async (req, res, next) => {
  try {
    const me = req.user.id, other = req.params.other;
    const o = (await q('SELECT username FROM users WHERE id=$1', [other])).rows[0];
    if (!o || !o.username) return res.status(404).json({ error: 'Esa persona no existe.' });
    const key = pairKey(me, other), ts = now(), b = req.body || {};
    const type = ['text', 'ask', 'recipe', 'folder'].includes(b.type) ? b.type : 'text';
    const data = { type, text: String(b.text || '').slice(0, 2000) };
    if (b.purpose) data.purpose = String(b.purpose).slice(0, 20);
    if (b.ref && idOk(b.ref.id)) data.ref = { owner: String(b.ref.owner || '').slice(0, 60), id: b.ref.id };
    if (b.snap) data.snap = { title: String(b.snap.title || '').slice(0, 160), time: String(b.snap.time || '').slice(0, 40), servings: String(b.snap.servings || '').slice(0, 20), n: Number(b.snap.n) || 0 };
    if (type === 'text' && !data.text) return res.status(400).json({ error: 'Mensaje vacío' });
    await q('INSERT INTO messages(id,chat_id,from_id,ts,data) VALUES($1,$2,$3,$4,$5)', [gid(), key, me, ts, data]);
    const preview = type === 'recipe' ? `Receta: ${data.snap?.title || ''}` : type === 'folder' ? `Carpeta: ${data.snap?.title || ''}` : (type === 'ask' ? 'Pide una receta: ' : '') + data.text;
    const [a, bb] = [me, other].sort();
    await q(`INSERT INTO chats(id,a,b,ts,last) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET ts=$4, last=$5`, [key, a, bb, ts, { from: me, text: preview.slice(0, 140) }]);
    res.json({ ok: true, ts });
  } catch (e) { next(e); }
});
api.post('/chats/:other/read', needProfile, async (req, res, next) => {
  try {
    const key = pairKey(req.user.id, req.params.other);
    await q(`UPDATE users SET last_read = jsonb_set(last_read, ARRAY[$1::text], to_jsonb($2::bigint)) WHERE id=$3`, [key, Number(req.body.ts) || now(), req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* ---------- Importar desde enlace ---------- */
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  const l = ip.toLowerCase();
  return l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
}
async function safeFetch(url, opts = {}, hops = 0) {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) throw new Error('bad_url');
  const addrs = await dns.lookup(u.hostname, { all: true });
  if (addrs.some(a => privateIp(a.address))) throw new Error('bad_url');
  const r = await fetch(u, { redirect: 'manual', signal: AbortSignal.timeout(15000), headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6', ...(opts.headers || {}) } });
  if (r.status >= 300 && r.status < 400 && r.headers.get('location') && hops < 5) return safeFetch(new URL(r.headers.get('location'), u).toString(), opts, hops + 1);
  return r;
}
const decodeEnt = s => String(s || '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
// Conserva negritas y cursivas como **texto** y *texto*
function keepFmt(h) {
  return String(h || '')
    .replace(/<(strong|b)\b[^>]*>\s*([\s\S]*?)\s*<\/\1>/gi, (_, t, x) => x.trim() ? `**${x.trim()}**` : '')
    .replace(/<(em|i)\b[^>]*>\s*([\s\S]*?)\s*<\/\1>/gi, (_, t, x) => x.trim() ? `*${x.trim()}*` : '')
    .replace(/<span[^>]*font-weight\s*:\s*(?:bold|[6-9]00)[^>]*>([\s\S]*?)<\/span>/gi, (_, x) => x.trim() ? `**${x.trim()}**` : '')
    .replace(/<span[^>]*font-style\s*:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, (_, x) => x.trim() ? `*${x.trim()}*` : '');
}
const txt = v => keepFmt(decodeEnt(typeof v === 'string' ? v : '')).replace(/<[^>]+>/g, '').replace(/\*\*\s*\*\*/g, '').replace(/\s+/g, ' ').trim();
function isoDur(s) { if (!s || typeof s !== 'string') return ''; const m = s.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/); if (!m || (!m[1] && !m[2] && !m[3])) return txt(s); const h = (+m[2] || 0) + (+m[1] || 0) * 24, mi = +m[3] || 0; return [h ? h + ' h' : '', mi ? mi + ' min' : ''].filter(Boolean).join(' '); }
function pickImage(img) {
  if (!img) return ''; if (typeof img === 'string') return img; if (Array.isArray(img)) return pickImage(img[0]); return img.url || img.contentUrl || '';
}
function parseJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  let rec = null;
  const isR = o => o && (o['@type'] === 'Recipe' || (Array.isArray(o['@type']) && o['@type'].includes('Recipe')));
  const walk = o => { if (rec || !o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk); if (isR(o)) { rec = o; return; } if (o['@graph']) walk(o['@graph']); if (o.mainEntity) walk(o.mainEntity); };
  for (const b of blocks) { try { walk(JSON.parse(b.trim())); } catch { } if (rec) break; }
  if (!rec) return null;
  const steps = [];
  const ws = x => { if (!x) return; if (typeof x === 'string') { decodeEnt(x).split(/\n+|<br\s*\/?>/i).map(txt).filter(Boolean).forEach(s => steps.push(s)); return; } if (Array.isArray(x)) return x.forEach(ws); if (x.itemListElement) ws(x.itemListElement); else if (x.text) steps.push(txt(x.text)); else if (x.name) steps.push(txt(x.name)); };
  ws(rec.recipeInstructions);
  const y = Array.isArray(rec.recipeYield) ? rec.recipeYield[0] : rec.recipeYield;
  const servings = y ? (String(y).match(/\d+/) || [''])[0] : '';
  return { title: txt(rec.name), servings, time: isoDur(rec.totalTime || rec.cookTime || rec.prepTime), difficulty: '', image: pickImage(rec.image),
    ingredients: (rec.recipeIngredient || rec.ingredients || []).map(txt).filter(Boolean), steps, notes: '' };
}
function htmlToText(html) {
  return decodeEnt(keepFmt(html.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' '))
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}
function ogImage(html) { const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i); return m ? decodeEnt(m[1]) : ''; }

api.post('/import', async (req, res) => {
  const url = String(req.body.url || '').trim();
  let html;
  try { const r = await safeFetch(url); if (!r.ok) throw new Error('status ' + r.status); html = await r.text(); }
  catch (e) { return res.status(422).json({ error: 'No he podido abrir esa web. Pega el texto de la receta y la saco de ahí.', needText: true }); }
  const ld = parseJsonLd(html);
  if (ld && ld.ingredients.length) return res.json({ recipe: { ...ld, source: url } });
  if (AI_KEY) {
    try { const r = await aiExtract(htmlToText(html)); if (r) return res.json({ recipe: { ...r, image: ogImage(html), source: url } }); } catch (e) { console.error(e); }
  }
  res.status(422).json({ error: 'No he encontrado la receta en esa página. Pega el texto de la receta y la saco de ahí.', needText: true });
});

/* ---------- Claude (opcional) ---------- */
const SCHEMA = `{"title":string,"servings":string (solo el número de raciones si aparece),"time":string (p. ej. "45 min"),"difficulty":"Fácil"|"Media"|"Difícil"|"","ingredients":[string],"steps":[string],"notes":string}`;
async function claude(content, maxTokens = 3000) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) throw new Error('claude ' + r.status + ' ' + (await r.text()).slice(0, 300));
  const j = await r.json();
  const t = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const m = t.match(/\{[\s\S]*\}/); if (!m) return null;
  return JSON.parse(m[0]);
}
function cleanAi(r) {
  if (!r || r.error || !r.title) return null;
  return { title: String(r.title), servings: String(r.servings || ''), time: String(r.time || ''), difficulty: String(r.difficulty || ''),
    ingredients: (r.ingredients || []).map(String).filter(Boolean), steps: (r.steps || []).map(s => String(s).replace(/^\s*\d+[.)]\s*/, '')).filter(Boolean), notes: String(r.notes || '') };
}
async function aiExtract(text) {
  return cleanAi(await claude(`Extrae la receta del texto de una página web que va entre las marcas. Devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Reglas: usa solo lo que aparece en el texto, sin inventar nada. Escribe en español (traduce si hace falta). Un ingrediente por elemento, con su cantidad delante. Un paso por elemento, sin numerar. Si alguna palabra o frase está en negrita escríbela como **texto**, y si está en cursiva como *texto*; no añadas formato que no esté. Ignora comentarios, anuncios y menús de la web. Si no hay ninguna receta, devuelve {"error":"no_recipe"}.
<<<TEXTO
${String(text).slice(0, 45000)}
TEXTO>>>`));
}
const noAi = res => res.status(503).json({ error: 'Las funciones con Claude no están activadas en este servidor.' });
api.post('/ai/extract', async (req, res) => {
  if (!AI_KEY) return noAi(res);
  try { const r = await aiExtract(req.body.text || ''); if (!r) return res.status(422).json({ error: 'No he encontrado una receta en ese texto. Revisa que hayas copiado la página entera.' }); res.json({ recipe: r }); }
  catch (e) { console.error(e); res.status(502).json({ error: 'Claude no ha podido leer el texto. Vuelve a intentarlo.' }); }
});
api.post('/ai/create', async (req, res) => {
  if (!AI_KEY) return noAi(res);
  try {
    const r = cleanAi(await claude(`Escribe una receta de cocina casera en español de España para esta petición: "${String(req.body.prompt || '').slice(0, 600)}".
Devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Usa cantidades métricas (g, ml, cucharadas), pasos claros y concretos, marca en negrita con **texto** lo más importante de cada paso solo si ayuda, y en "notes" un consejo breve de cocinero.`));
    if (!r) return res.status(502).json({ error: 'Claude no devolvió una receta legible. Vuelve a intentarlo.' });
    res.json({ recipe: r });
  } catch (e) { console.error(e); res.status(502).json({ error: 'Claude no ha podido escribir la receta. Vuelve a intentarlo.' }); }
});
api.post('/ai/photo', async (req, res) => {
  if (!AI_KEY) return noAi(res);
  const m = String(req.body.image || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'Esa imagen no se puede leer.' });
  try {
    const r = cleanAi(await claude([
      { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
      { type: 'text', text: `La imagen es una foto de una receta (de un libro, revista o papel escrito a mano). Transcribe la receta y devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Reglas: usa solo lo que se lee en la foto, sin inventar. Si se ve texto en negrita escríbelo como **texto**, y en cursiva como *texto*. Escribe en español. Un ingrediente por elemento, un paso por elemento sin numerar. Si no hay receta, devuelve {"error":"no_recipe"}.` }]));
    if (!r) return res.status(422).json({ error: 'No he encontrado una receta en la foto. Prueba con una foto más nítida y recta.' });
    res.json({ recipe: r });
  } catch (e) { console.error(e); res.status(502).json({ error: 'Claude no ha podido leer la foto. Vuelve a intentarlo.' }); }
});

app.use('/api', api);
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Algo ha fallado en el servidor. Vuelve a intentarlo.' }); });

migrate().then(() => app.listen(PORT, () => console.log('Entre Fogones en el puerto ' + PORT)))
  .catch(e => { console.error('No se pudo preparar la base de datos', e); process.exit(1); });
