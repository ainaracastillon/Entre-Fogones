'use strict';
const express = require('express');
const { Pool } = require('pg');
const crypto = require('crypto');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const { legalHtml } = require('./legal');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;
const AI_KEY = process.env.ANTHROPIC_API_KEY || '';
const AI_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_FALLBACK = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || '', CF_TOKEN = process.env.CF_API_TOKEN || '', POLL_TOKEN = process.env.POLLINATIONS_TOKEN || '';
const HAS_CF = !!(CF_ACCOUNT && CF_TOKEN);
const CF_MODEL = process.env.CF_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const CF_VISION_MODEL = process.env.CF_VISION_MODEL || '@cf/meta/llama-4-scout-17b-16e-instruct';
const CF_WHISPER_MODEL = process.env.CF_WHISPER_MODEL || '@cf/openai/whisper-large-v3-turbo';
// Proveedores de IA en orden: si uno falla o llega a su límite, se prueba el siguiente
const PROVIDERS = [GROQ_KEY && 'groq', HAS_CF && 'cloudflare', OPENAI_KEY && 'openai', AI_KEY && 'claude'].filter(Boolean);
const PROVIDER = PROVIDERS[0] || null;
const CAN_HEAR = !!(GROQ_KEY || HAS_CF);
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
  CREATE TABLE IF NOT EXISTS contact_messages(
    id TEXT PRIMARY KEY, email TEXT NOT NULL, subject TEXT, message TEXT NOT NULL, user_id TEXT, created BIGINT NOT NULL);
  ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS allergens JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen BIGINT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at BIGINT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS delete_suggested JSONB;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
  CREATE TABLE IF NOT EXISTS recipe_imgs(recipe_id TEXT PRIMARY KEY, img BYTEA NOT NULL, type TEXT, created BIGINT);
  CREATE TABLE IF NOT EXISTS menus(user_id TEXT NOT NULL, week TEXT NOT NULL, data JSONB NOT NULL, created BIGINT, PRIMARY KEY(user_id, week));
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS credit TEXT;
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS img_v INT;
  ALTER TABLE recipe_imgs ADD COLUMN IF NOT EXISTS v INT;
  CREATE TABLE IF NOT EXISTS pending_signups(
    email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, data JSONB NOT NULL, anon_id TEXT NOT NULL, created BIGINT NOT NULL, expires BIGINT NOT NULL, tries INT NOT NULL DEFAULT 0);
  ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS status TEXT;
  CREATE TABLE IF NOT EXISTS suggestions(
    id TEXT PRIMARY KEY, title TEXT NOT NULL, url TEXT NOT NULL, author TEXT, image TEXT, position INT NOT NULL DEFAULT 0, hidden BOOLEAN, tries INT, created BIGINT NOT NULL);
  CREATE TABLE IF NOT EXISTS ai_usage(day TEXT PRIMARY KEY, n INT NOT NULL DEFAULT 0);
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS data JSONB;
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS img BYTEA;
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS img_type TEXT;
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS img_tries INT;
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS rewritten BOOLEAN;
  ALTER TABLE suggestions ADD COLUMN IF NOT EXISTS title_ok BOOLEAN;
  CREATE TABLE IF NOT EXISTS notices(
    id TEXT PRIMARY KEY, title TEXT, body TEXT, image TEXT, url TEXT, url_label TEXT, dismissible BOOLEAN NOT NULL DEFAULT true,
    popup BOOLEAN NOT NULL DEFAULT false, active BOOLEAN NOT NULL DEFAULT true, created BIGINT NOT NULL, created_by TEXT);
  CREATE TABLE IF NOT EXISTS attachments(
    id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, owner TEXT NOT NULL, name TEXT, type TEXT, size INT, data BYTEA NOT NULL, created BIGINT NOT NULL);
  CREATE INDEX IF NOT EXISTS attachments_chat ON attachments(chat_id);
  CREATE TABLE IF NOT EXISTS notice_reads(
    notice_id TEXT NOT NULL REFERENCES notices(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at BIGINT NOT NULL, dismissed BOOLEAN NOT NULL DEFAULT false, PRIMARY KEY(notice_id,user_id));
  ALTER TABLE notices ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';
  ALTER TABLE notices ADD COLUMN IF NOT EXISTS recipients JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_at BIGINT;
  CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(lower(email)) WHERE email IS NOT NULL;
  CREATE TABLE IF NOT EXISTS password_resets(
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, created BIGINT NOT NULL, expires BIGINT NOT NULL);
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
      const u = r.rows[0];
      if (u) {
        if (u.username && u.email && u.email.toLowerCase() === SUPERADMIN_EMAIL && u.role !== 'superadmin') { await q("UPDATE users SET role='superadmin' WHERE id=$1", [u.id]); u.role = 'superadmin'; }
        req.user = u; req.token = token;
        if (u.username && (!u.last_seen || now() - Number(u.last_seen) > 600e3)) q('UPDATE users SET last_seen=$1 WHERE id=$2', [now(), u.id]).catch(() => {});
        return next();
      }
    }
    const id = gid();
    await q('INSERT INTO users(id,created) VALUES($1,$2)', [id, now()]);
    await q('INSERT INTO folders(id,user_id,name,color,created) VALUES($1,$2,$3,$4,$5)', [gid(), id, 'Mis recetas', '#2F5D46', now()]);
    await newSession(res, id);
    req.user = (await q('SELECT * FROM users WHERE id=$1', [id])).rows[0];
    next();
  } catch (e) { next(e); }
}
const needProfile = (req, res, next) => req.user.username ? next() : res.status(403).json({ error: 'Inicia sesión o crea una cuenta para usar esto.', needAccount: true });
// Cuenta suspendida: solo puede ver por qué, escribir a Contacto o cerrar sesión
const SUSPENDED_OK = new Set(['/state', '/config', '/logout', '/contact', '/notices']);
function suspendedGate(req, res, next) {
  if (req.user && req.user.blocked && req.user.username && !SUSPENDED_OK.has(req.path)) return res.status(403).json({ error: 'Tu cuenta está suspendida.', suspended: true });
  next();
}
const suspension = u => u && u.blocked ? { reason: u.blocked_reason || '', at: Number(u.blocked_at) || null } : null;

/* ---------- Ayudantes ---------- */
const pub = u => u ? { id: u.id, username: u.username, display: u.display, color: u.color, avatar: u.avatar || null } : null;
function recipeOut(r) { return { ...r.data, id: r.id, folderId: r.folder_id, created: Number(r.created), updated: Number(r.updated) }; }
function cleanRecipe(b) {
  const s = (v, n) => String(v ?? '').slice(0, n);
  const arr = (v, n, m) => (Array.isArray(v) ? v : []).map(x => s(x, m)).filter(Boolean).slice(0, n);
  let image = s(b.image, 400000);
  if (image && !/^data:image\/(jpeg|png|webp);base64,/.test(image) && !/^https?:\/\//.test(image) && !/^\/img\/[rs]\/[A-Za-z0-9]+(\?v=\d+)?$/.test(image)) image = '';
  const num = v => { const n = Number(v); return Number.isFinite(n) && n >= 0 && n < 100000 ? Math.round(n * 10) / 10 : null; };
  const nu = b.nutrition && typeof b.nutrition === 'object' ? Object.fromEntries(['kcal', 'carbs', 'sugars', 'fat', 'satfat', 'protein', 'fiber', 'salt', 'grams'].map(k => [k, num(b.nutrition[k])]).filter(([, v]) => v !== null)) : null;
  return {
    title: s(b.title, 160) || 'Sin título', image, servings: s(b.servings, 20), time: s(b.time, 40), difficulty: s(b.difficulty, 20),
    ingredients: arr(b.ingredients, 120, 300), steps: arr(b.steps, 80, 2000), notes: s(b.notes, 2000),
    source: /^https?:\/\//.test(b.source || '') ? s(b.source, 600) : '', fromUid: b.fromUid ? s(b.fromUid, 60) : null, fromSugg: b.fromSugg ? s(b.fromSugg, 60) : null,
    public: !!b.public, credit: s(b.credit, 120), category: s(b.category, 40),
    ...(nu && Object.keys(nu).length ? { nutrition: { ...nu, sig: s(b.nutrition.sig, 64) } } : {})
  };
}
const idOk = id => /^[A-Za-z0-9]{6,40}$/.test(id || '');

/* ---------- App ---------- */
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '6mb' }));
app.get('/healthz', (req, res) => res.send('ok'));
// HTML, JS y manifiesto se revalidan siempre para que se vea la última versión al momento
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', setHeaders(res, file) {
  if (/\.(html|js|css|webmanifest)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
  else res.setHeader('Cache-Control', 'public, max-age=86400');
} }));

const api = express.Router();
api.use(auth);
api.use(suspendedGate);

api.get('/config', (req, res) => res.json({ mail: mailReady(), ai: !!PROVIDER, aiName: PROVIDER === 'claude' ? 'Claude' : PROVIDER === 'openai' ? 'ChatGPT' : 'la IA', canHear: CAN_HEAR }));

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
    const people = ids.size ? (await q('SELECT id,username,display,color,avatar FROM users WHERE id = ANY($1)', [[...ids]])).rows : [];
    const profiles = {}; people.forEach(p => profiles[p.id] = pub(p));
    res.json({
      me: { ...pub(req.user), email: req.user.email || null, role: req.user.username ? req.user.role : 'user', allergens: req.user.allergens || [], prefs: req.user.prefs || {}, lastRead: req.user.last_read || {}, suspended: suspension(req.user) }, profiles,
      folders: folders.rows.map(f => ({ id: f.id, name: f.name, color: f.color, created: Number(f.created) })),
      recipes: recipes.rows.map(recipeOut),
      requests: reqs.rows.map(r => ({ from: r.from_id, to: r.to_id, status: r.status, ts: Number(r.ts) })),
      chats: chats.rows.map(c => ({ id: c.id, members: [c.a, c.b], ts: Number(c.ts), last: c.last }))
    });
  } catch (e) { next(e); }
});

/* Cuenta */
const emailOk = e => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(e);
const genCode = () => String(crypto.randomInt(0, 1e6)).padStart(6, '0');
async function finishSignup(req, d) {
  if ((await q('SELECT 1 FROM users WHERE username=$1', [d.username])).rows[0]) { const e = new Error(`@${d.username} ya está cogido. Prueba con otro.`); e.status = 409; throw e; }
  if (d.email && (await q('SELECT 1 FROM users WHERE lower(email)=$1', [d.email])).rows[0]) { const e = new Error('Ya hay una cuenta con ese correo. Inicia sesión o recupera la contraseña.'); e.status = 409; throw e; }
  await q('UPDATE users SET username=$1, display=$2, color=$3, pass_hash=$4, email=$5, accepted_at=$6 WHERE id=$7',
    [d.username, d.display, d.color, d.pass_hash, d.email || null, now(), req.user.id]);
  await syncRole(req.user.id, d.email);
}
async function sendSignupCode(email, display, code) {
  await sendMail(email, `${code} es tu código de Entre Fogones`,
    `<div style="font-family:system-ui,sans-serif;max-width:420px"><h2 style="color:#B5562B">Entre Fogones</h2><p>Hola, ${String(display).replace(/[<>&]/g, '')}:</p><p>Este es tu código para crear la cuenta:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p><p style="color:#7A5C4C">Caduca en 15 minutos. Si no has sido tú, ignora este correo y no se creará ninguna cuenta.</p></div>`,
    `Tu código de Entre Fogones es ${code}. Caduca en 15 minutos. Si no has sido tú, ignora este correo.`);
}
api.post('/register', async (req, res, next) => {
  try {
    if (req.user.username) return res.status(400).json({ error: 'Ya tienes una cuenta abierta.' });
    const username = String(req.body.username || '').toLowerCase();
    const display = String(req.body.display || '').trim().slice(0, 40);
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
    const password = String(req.body.password || '');
    if (!display) return res.status(400).json({ error: 'Escribe tu nombre.' });
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'El nombre de usuario debe tener de 3 a 20 letras minúsculas, números o _.' });
    if (!emailOk(email)) return res.status(400).json({ error: 'Escribe un correo válido. Te enviaremos un código para comprobarlo.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    if (!req.body.accept) return res.status(400).json({ error: 'Para crear la cuenta tienes que aceptar los Términos de uso y la Política de privacidad.' });
    if ((await q('SELECT 1 FROM users WHERE username=$1', [username])).rows[0]) return res.status(409).json({ error: `@${username} ya está cogido. Prueba con otro.` });
    if ((await q('SELECT 1 FROM users WHERE lower(email)=$1', [email])).rows[0]) return res.status(409).json({ error: 'Ya hay una cuenta con ese correo. Inicia sesión o recupera la contraseña.' });
    const d = { username, display, email, color: String(req.body.color || '#B5562B').slice(0, 9), pass_hash: hashPass(password) };
    if (!mailReady()) { await finishSignup(req, d); return res.json({ ok: true }); }
    // la cuenta no se crea hasta que se escribe el código que llega al correo
    const prev = (await q('SELECT created FROM pending_signups WHERE email=$1', [email])).rows[0];
    if (prev && now() - Number(prev.created) < 30e3) return res.status(429).json({ error: 'Espera unos segundos antes de pedir otro código.' });
    const code = genCode();
    await q(`INSERT INTO pending_signups(email,code_hash,data,anon_id,created,expires,tries) VALUES($1,$2,$3,$4,$5,$6,0)
      ON CONFLICT(email) DO UPDATE SET code_hash=$2, data=$3, anon_id=$4, created=$5, expires=$6, tries=0`, [email, sha(code + email), d, req.user.id, now(), now() + 15 * 60e3]);
    try { await sendSignupCode(email, display, code); }
    catch (e) { console.error(e); return res.status(502).json({ error: 'No he podido enviar el correo con el código. Revisa la dirección o prueba en un rato.' }); }
    res.json({ verify: true, email });
  } catch (e) { next(e); }
});
api.post('/register/verify', async (req, res, next) => {
  try {
    if (req.user.username) return res.status(400).json({ error: 'Ya tienes una cuenta abierta.' });
    const email = String(req.body.email || '').trim().toLowerCase(), code = String(req.body.code || '').replace(/\D/g, '');
    const p = (await q('SELECT * FROM pending_signups WHERE email=$1', [email])).rows[0];
    if (!p || Number(p.expires) < now()) return res.status(400).json({ error: 'El código ha caducado. Pide uno nuevo.', expired: true });
    if (p.tries >= 5) return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.', expired: true });
    if (sha(code + email) !== p.code_hash) { await q('UPDATE pending_signups SET tries=tries+1 WHERE email=$1', [email]); return res.status(400).json({ error: 'Ese código no es correcto. Revisa el correo.' }); }
    await finishSignup(req, p.data);
    await q('DELETE FROM pending_signups WHERE email=$1', [email]);
    res.json({ ok: true });
  } catch (e) { if (e.status) return res.status(e.status).json({ error: e.message }); next(e); }
});
api.post('/register/resend', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const p = (await q('SELECT * FROM pending_signups WHERE email=$1', [email])).rows[0];
    if (!p) return res.status(400).json({ error: 'Vuelve a rellenar el formulario.' });
    if (now() - Number(p.created) < 30e3) return res.status(429).json({ error: 'Espera unos segundos antes de pedir otro código.' });
    const code = genCode();
    await q('UPDATE pending_signups SET code_hash=$1, created=$2, expires=$3, tries=0 WHERE email=$4', [sha(code + email), now(), now() + 15 * 60e3, email]);
    await sendSignupCode(email, p.data.display, code);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(502).json({ error: 'No he podido enviar el correo. Prueba en un rato.' }); }
});
api.put('/me', needProfile, async (req, res, next) => {
  try {
    const display = String(req.body.display || '').trim().slice(0, 40);
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
    if (!display) return res.status(400).json({ error: 'Escribe tu nombre.' });
    if (email && !emailOk(email)) return res.status(400).json({ error: 'Escribe un correo válido.' });
    if (!email && req.user.email) return res.status(400).json({ error: 'Escribe tu correo.' });
    if (req.user.role === 'superadmin' && email !== String(req.user.email || '').toLowerCase()) return res.status(400).json({ error: 'El correo del Superadministrador solo se puede cambiar desde el código.' });
    if (email && (await q('SELECT 1 FROM users WHERE lower(email)=$1 AND id<>$2', [email, req.user.id])).rows[0]) return res.status(409).json({ error: 'Ese correo ya lo usa otra cuenta.' });
    await q('UPDATE users SET display=$1, color=$2, email=$3 WHERE id=$4', [display, String(req.body.color || '#B5562B').slice(0, 9), email || null, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.post('/login', async (req, res, next) => {
  try {
    const who = String(req.body.username || '').trim().toLowerCase().replace(/^@/, '');
    const r = await q('SELECT * FROM users WHERE username=$1 OR (email IS NOT NULL AND lower(email)=$1) LIMIT 1', [who]);
    const u = r.rows[0];
    if (!u || !checkPass(String(req.body.password || ''), u.pass_hash)) return res.status(401).json({ error: 'Usuario, correo o contraseña incorrectos.' });
    await syncRole(u.id, u.email);
    await adoptAnon(req, u.id);
    await newSession(res, u.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
// Las recetas hechas sin cuenta en este dispositivo pasan a la cuenta
async function adoptAnon(req, userId) {
  const cur = req.user;
  if (!cur.username && cur.id !== userId) {
    await q('UPDATE folders SET user_id=$1 WHERE user_id=$2 AND id IN (SELECT DISTINCT folder_id FROM recipes WHERE user_id=$2 AND folder_id IS NOT NULL)', [userId, cur.id]);
    await q('UPDATE recipes SET user_id=$1 WHERE user_id=$2', [userId, cur.id]);
    await q('DELETE FROM users WHERE id=$1', [cur.id]);
  } else await q('DELETE FROM sessions WHERE token=$1', [req.token]);
}
api.post('/logout', async (req, res, next) => {
  try { await q('DELETE FROM sessions WHERE token=$1', [req.token]); res.setHeader('Set-Cookie', 'ef=; Path=/; Max-Age=0'); res.json({ ok: true }); } catch (e) { next(e); }
});
api.delete('/me', needProfile, async (req, res, next) => {
  try {
    if (req.user.role === 'superadmin') return res.status(400).json({ error: 'La cuenta del Superadministrador no se puede borrar.' });
    if (!checkPass(String(req.body.password || ''), req.user.pass_hash)) return res.status(401).json({ error: 'La contraseña no es correcta.' });
    const me = req.user.id;
    await recipesToSuggestions((await q('SELECT id, data FROM recipes WHERE user_id=$1', [me])).rows);
    await q('DELETE FROM messages WHERE from_id=$1', [me]);
    await q('DELETE FROM attachments WHERE owner=$1', [me]);
    await q('DELETE FROM chats WHERE a=$1 OR b=$1', [me]);
    await q('DELETE FROM users WHERE id=$1', [me]);
    res.setHeader('Set-Cookie', 'ef=; Path=/; Max-Age=0');
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* Contacto (también para ejercer los derechos de privacidad) */
let contactCount = 0, contactWindow = 0;
api.post('/contact', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().slice(0, 254), message = String(req.body.message || '').trim().slice(0, 4000);
    if (!emailOk(email)) return res.status(400).json({ error: 'Escribe un correo válido para poder responderte.' });
    if (message.length < 5) return res.status(400).json({ error: 'Escribe tu mensaje.' });
    if (Date.now() - contactWindow > 3600e3) { contactWindow = Date.now(); contactCount = 0; }
    if (++contactCount > 30) return res.status(429).json({ error: 'Se han enviado muchos mensajes. Prueba más tarde.' });
    await q('INSERT INTO contact_messages(id,email,subject,message,user_id,created) VALUES($1,$2,$3,$4,$5,$6)', [gid(), email, String(req.body.subject || '').slice(0, 80), message, req.user.id, now()]);
    if (mailReady() && process.env.LEGAL_EMAIL) sendMail(process.env.LEGAL_EMAIL, 'Entre Fogones · ' + String(req.body.subject || 'Contacto').slice(0, 80), `<p>De: ${email.replace(/[<>&]/g, '')}</p><pre style="white-space:pre-wrap;font:inherit">${message.replace(/[<>&]/g, '')}</pre>`, `De: ${email}\n\n${message}`).catch(e => console.error(e));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

/* Recuperar la contraseña por correo */
const MAIL_FROM = process.env.MAIL_FROM || '';
const mailReady = () => !!((process.env.BREVO_API_KEY || process.env.RESEND_API_KEY) && MAIL_FROM);
async function sendMail(to, subject, html, text) {
  const m = MAIL_FROM.match(/^\s*(.*?)\s*<([^>]+)>\s*$/); const fromName = m ? m[1] : 'Entre Fogones', fromEmail = m ? m[2] : MAIL_FROM;
  let r;
  if (process.env.BREVO_API_KEY) r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'content-type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
    body: JSON.stringify({ sender: { name: fromName, email: fromEmail }, to: [{ email: to }], subject, htmlContent: html, textContent: text }) });
  else r = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, html, text }) });
  if (!r.ok) throw new Error('mail ' + r.status + ' ' + (await r.text()).slice(0, 200));
}
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
api.post('/password/forgot', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!emailOk(email)) return res.status(400).json({ error: 'Escribe el correo de tu cuenta.' });
    if (!mailReady()) return res.status(503).json({ error: 'Ahora mismo no se pueden enviar correos. Inténtalo más tarde.' });
    const u = (await q('SELECT id, display FROM users WHERE lower(email)=$1 AND username IS NOT NULL', [email])).rows[0];
    if (u) {
      const recent = (await q('SELECT count(*)::int n FROM password_resets WHERE user_id=$1 AND created>$2', [u.id, now() - 3600e3])).rows[0].n;
      if (recent < 4) {
        const token = crypto.randomBytes(32).toString('hex');
        await q('INSERT INTO password_resets(token_hash,user_id,created,expires) VALUES($1,$2,$3,$4)', [sha(token), u.id, now(), now() + 3600e3]);
        const link = `${req.protocol}://${req.get('host')}/#reset~${token}`;
        await sendMail(email, 'Cambia tu contraseña de Entre Fogones',
          `<div style="font-family:system-ui,sans-serif;font-size:16px;color:#3B2116;max-width:520px"><p>Hola ${String(u.display || '').replace(/[<>&]/g, '')},</p><p>Has pedido cambiar la contraseña de tu cuenta de Entre Fogones. Pulsa el botón para elegir una nueva. El enlace caduca en una hora.</p><p><a href="${link}" style="display:inline-block;background:#B5562B;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Elegir una contraseña nueva</a></p><p style="color:#7A5C4C;font-size:14px">Si no lo has pedido tú, ignora este correo: tu contraseña no cambia.</p></div>`,
          `Has pedido cambiar la contraseña de Entre Fogones. Abre este enlace en la próxima hora para elegir una nueva: ${link}\nSi no lo has pedido tú, ignora este correo.`);
      }
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.post('/password/reset', async (req, res, next) => {
  try {
    const token = String(req.body.token || ''), password = String(req.body.password || '');
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    const r = (await q('SELECT * FROM password_resets WHERE token_hash=$1', [sha(token)])).rows[0];
    if (!r || Number(r.expires) < now()) return res.status(400).json({ error: 'El enlace ha caducado o ya se usó. Pide uno nuevo.' });
    await q('UPDATE users SET pass_hash=$1 WHERE id=$2', [hashPass(password), r.user_id]);
    await q('DELETE FROM password_resets WHERE user_id=$1', [r.user_id]);
    await q('DELETE FROM sessions WHERE user_id=$1', [r.user_id]);
    await adoptAnon(req, r.user_id);
    await newSession(res, r.user_id);
    res.json({ ok: true });
  } catch (e) { next(e); }
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
    queueRecipeWork(id);
  } catch (e) { next(e); }
});
/* Las recetas que alguien borra no se pierden: pasan a Recetas recomendadas (sin el nombre de quien la hizo) */
async function recipesToSuggestions(rows) {
  for (const r of rows) {
    try {
      const d = r.data || {};
      if (d.fromSugg || !(d.ingredients || []).length || !(d.steps || []).length) continue;
      const title = cleanTitle(d.title || '');
      if ((await q('SELECT 1 FROM suggestions WHERE lower(title)=lower($1) AND data IS NOT NULL', [title])).rows[0]) continue;
      const img = (await q('SELECT img, type FROM recipe_imgs WHERE recipe_id=$1', [r.id])).rows[0];
      const pos = (await q('SELECT coalesce(max(position),0)+1 p FROM suggestions')).rows[0].p;
      const { fromUid, public: _p, credit, folderId, source, ...rest } = d;
      await q('INSERT INTO suggestions(id,url,title,position,created,data,rewritten,img,img_type) VALUES($1,$2,$3,$4,$5,$6,false,$7,$8)',
        [gid(), 'usuario:' + r.id, title, pos, now(), { ...rest, title, image: '', source: '' }, img ? img.img : null, img ? img.type : null]);
    } catch (e) { console.error('a recomendadas', e.message); }
  }
}
api.delete('/recipes/:id', async (req, res, next) => {
  try {
    const rows = (await q('SELECT id, data FROM recipes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id])).rows;
    await recipesToSuggestions(rows);
    await q('DELETE FROM recipes WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]); await q('DELETE FROM recipe_imgs WHERE recipe_id=$1 AND NOT EXISTS (SELECT 1 FROM recipes WHERE id=$1)', [req.params.id]); res.json({ ok: true });
    processSuggestionArt().catch(() => {});
  } catch (e) { next(e); }
});
/* Trabajo en segundo plano para cada receta guardada: foto generada si no tiene, y tabla nutricional */
const recipeQueue = new Set(); let recipeBusy = false, imgPauseUntil = 0;
async function backfillRecipes() {
  try {
    const rows = (await q(`SELECT r.id FROM recipes r LEFT JOIN recipe_imgs i ON i.recipe_id=r.id WHERE coalesce(r.data->>'image','')='' OR (r.data->'nutrition'->>'grams') IS NULL OR coalesce(r.data->>'category','')=''
      OR (r.data->>'image' LIKE '/img/r/%' AND coalesce(i.v,0) < ${IMG_V}) ORDER BY r.updated DESC LIMIT 500`)).rows;
    rows.forEach(r => recipeQueue.add(r.id)); runRecipeQueue();
  } catch (e) { console.error('backfill', e.message); }
}
function queueRecipeWork(id) { recipeQueue.add(id); runRecipeQueue(); }
const nutriSig = d => sha(JSON.stringify(['v2', d.ingredients || [], d.servings || ''])).slice(0, 16);
async function runRecipeQueue() {
  if (recipeBusy) return; recipeBusy = true;
  try {
    while (recipeQueue.size) {
      const id = recipeQueue.values().next().value; recipeQueue.delete(id);
      const r = (await q('SELECT data FROM recipes WHERE id=$1', [id])).rows[0]; if (!r) continue;
      const d = r.data; let changed = false; const oldImage = d.image || '';
      if (/^\/img\/r\//.test(d.image || '')) { const iv = (await q('SELECT v FROM recipe_imgs WHERE recipe_id=$1', [id])).rows[0]; if (!iv || (iv.v || 0) < IMG_V) d.image = ''; }
      if (!d.image && d.title && Date.now() > imgPauseUntil) {
        try {
          const { buf, type } = await aiImage(d.title, '', await dishPrompt(d));
          await q('INSERT INTO recipe_imgs(recipe_id,img,type,created,v) VALUES($1,$2,$3,$4,$5) ON CONFLICT(recipe_id) DO UPDATE SET img=$2, type=$3, created=$4, v=$5', [id, buf, type, now(), IMG_V]);
          d.image = `/img/r/${id}?v=${now()}`; changed = true;
        } catch (e) { console.error('foto receta', e.message); if (e.quota) imgPauseUntil = Date.now() + 3600e3; }
      }
      if (PROVIDER && (d.ingredients || []).length && (!d.nutrition || d.nutrition.sig !== nutriSig(d))) {
        try { const n = await aiNutrition(d); if (n) { d.nutrition = { ...n, sig: nutriSig(d) }; changed = true; } } catch (e) { console.error('nutricion', e.message); }
      }
      if (PROVIDER && !d.category && d.title) {
        try { const c = await categorize([{ id, title: d.title, ingredients: d.ingredients }]); if (c[id]) { d.category = c[id]; changed = true; } } catch (e) { console.error('tipo receta', e.message); }
      }
      if (changed) await q("UPDATE recipes SET data = data || $1::jsonb WHERE id=$2", [JSON.stringify({ image: d.image || oldImage, ...(d.nutrition ? { nutrition: d.nutrition } : {}), ...(d.category ? { category: d.category } : {}) }), id]);
      await sleep(1500);
    }
  } finally { recipeBusy = false; }
}
async function aiNutrition(d) {
  countAi();
  const out = parseJson(await llm({ maxTokens: 700, messages: [{ role: 'user', text: `Calcula la información nutricional aproximada POR RACIÓN de esta receta (${parseInt(d.servings) || 'calcula tú las'} raciones), con valores típicos de tablas de composición de alimentos.
Devuelve SOLO un objeto JSON: {"grams": peso en gramos de una ración ya cocinada, "kcal": número, "carbs": gramos de hidratos de carbono, "sugars": gramos de azúcares, "fat": gramos de grasas, "satfat": gramos de grasas saturadas, "protein": gramos de proteínas, "fiber": gramos de fibra, "salt": gramos de sal}.
Receta: ${String(d.title || '').slice(0, 160)}
Ingredientes:
${(d.ingredients || []).slice(0, 60).join('\n')}` }] }));
  if (!out || !Number(out.kcal)) return null;
  const o = {}; for (const k of ['grams', 'kcal', 'carbs', 'sugars', 'fat', 'satfat', 'protein', 'fiber', 'salt']) { const n = Number(out[k]); if (Number.isFinite(n) && n >= 0) o[k] = Math.round(n * 10) / 10; }
  return o;
}
app.get('/img/r/:id', async (req, res) => {
  try {
    const r = (await q('SELECT img, type FROM recipe_imgs WHERE recipe_id=$1', [req.params.id])).rows[0];
    if (!r) return res.status(404).end();
    res.setHeader('Content-Type', r.type || 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); res.end(r.img);
  } catch { res.status(500).end(); }
});
// Recetas que la gente ha hecho públicas
api.get('/community', async (req, res, next) => {
  try {
    // sin cuenta solo se ven las 6 últimas publicadas
    const full = !!req.user.username;
    const term = full ? String(req.query.q || '').trim().toLowerCase().slice(0, 60) : '';
    const rows = (await q(`SELECT r.*, u.username, u.display, u.color FROM recipes r JOIN users u ON u.id=r.user_id
      WHERE (r.data->>'public')='true' AND u.username IS NOT NULL AND NOT u.blocked AND ($1='' OR lower(r.data->>'title') LIKE '%'||$1||'%' OR lower(r.data::text) LIKE '%'||$1||'%')
      ORDER BY r.created DESC LIMIT $2`, [term, full ? 200 : 6])).rows;
    res.json(rows.map(r => ({ ...recipeOut(r), owner: { id: r.user_id, username: r.username, display: r.display, color: r.color } })));
  } catch (e) { next(e); }
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
    if (!f) return res.status(404).json({ error: 'Este recetario ya no existe.' });
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
// Guarda un mensaje (texto, receta, recetario, foto o archivo), con la respuesta a otro mensaje si la hay
async function saveMessage(me, other, b, file) {
  const key = pairKey(me, other), ts = now();
  const type = ['text', 'ask', 'recipe', 'folder', 'image', 'file'].includes(b.type) ? b.type : 'text';
  const data = { type, text: String(b.text || '').slice(0, 4000) };
  if (b.purpose) data.purpose = String(b.purpose).slice(0, 20);
  if (b.ref && idOk(b.ref.id)) data.ref = { owner: String(b.ref.owner || '').slice(0, 60), id: b.ref.id };
  if (b.snap) data.snap = { title: String(b.snap.title || '').slice(0, 160), time: String(b.snap.time || '').slice(0, 40), servings: String(b.snap.servings || '').slice(0, 20), n: Number(b.snap.n) || 0 };
  if (file) data.file = file;
  const replyId = b.reply && (b.reply.id || b.reply);
  if (replyId && typeof replyId === 'string') {
    const o = (await q('SELECT from_id, data FROM messages WHERE id=$1 AND chat_id=$2', [replyId, key])).rows[0];
    if (o) data.reply = { id: replyId, from: o.from_id, type: o.data.type, text: msgPreview(o.data).slice(0, 160) };
  }
  if (type === 'text' && !data.text) { const e = new Error('Mensaje vacío'); e.status = 400; throw e; }
  const id = gid();
  await q('INSERT INTO messages(id,chat_id,from_id,ts,data) VALUES($1,$2,$3,$4,$5)', [id, key, me, ts, data]);
  const [a, bb] = [me, other].sort();
  await q(`INSERT INTO chats(id,a,b,ts,last) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET ts=$4, last=$5`, [key, a, bb, ts, { from: me, text: msgPreview(data).slice(0, 140) }]);
  return { id, ts };
}
function msgPreview(d) {
  if (d.type === 'recipe') return `Receta: ${d.snap?.title || ''}`;
  if (d.type === 'folder') return `Recetario: ${d.snap?.title || ''}`;
  if (d.type === 'image') return '📷 Foto' + (d.text ? ': ' + d.text : '');
  if (d.type === 'file') return '📎 ' + (d.file?.name || 'Archivo') + (d.text ? ': ' + d.text : '');
  return (d.type === 'ask' ? 'Pide una receta: ' : '') + (d.text || '');
}
async function chatTarget(other) { const o = (await q('SELECT username FROM users WHERE id=$1', [other])).rows[0]; return o && o.username; }
api.post('/chats/:other/messages', needProfile, async (req, res, next) => {
  try {
    if (!(await chatTarget(req.params.other))) return res.status(404).json({ error: 'Esa persona no existe.' });
    const b = { ...(req.body || {}) }; if (['image', 'file'].includes(b.type)) b.type = 'text';
    res.json({ ok: true, ...(await saveMessage(req.user.id, req.params.other, b)) });
  } catch (e) { if (e.status === 400) return res.status(400).json({ error: e.message }); next(e); }
});
// Fotos y archivos en el chat (hasta 10 MB)
api.post('/chats/:other/attach', needProfile, express.raw({ type: () => true, limit: '10mb' }), async (req, res, next) => {
  try {
    const me = req.user.id, other = req.params.other;
    if (!(await chatTarget(other))) return res.status(404).json({ error: 'Esa persona no existe.' });
    if (!req.body || !req.body.length) return res.status(400).json({ error: 'No ha llegado el archivo. Vuelve a intentarlo.' });
    const type = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].slice(0, 100);
    const name = String(req.query.name || 'archivo').replace(/[\\/\r\n"]/g, '_').slice(0, 140) || 'archivo';
    const id = gid();
    await q('INSERT INTO attachments(id,chat_id,owner,name,type,size,data,created) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, pairKey(me, other), me, name, type, req.body.length, req.body, now()]);
    const isImg = /^image\/(jpeg|png|gif|webp)$/.test(type);
    const out = await saveMessage(me, other, { type: isImg ? 'image' : 'file', text: req.query.text || '', reply: req.query.reply ? { id: String(req.query.reply) } : null },
      { id, name, type, size: req.body.length, ...(isImg && req.query.w ? { w: Number(req.query.w) || 0, h: Number(req.query.h) || 0 } : {}) });
    res.json({ ok: true, ...out });
  } catch (e) { if (e.type === 'entity.too.large') return res.status(413).json({ error: 'El archivo es demasiado grande. El máximo son 10 MB.' }); next(e); }
});
api.get('/files/:id', needProfile, async (req, res, next) => {
  try {
    const f = (await q('SELECT chat_id,name,type,data FROM attachments WHERE id=$1', [req.params.id])).rows[0];
    if (!f || !f.chat_id.split('+').includes(req.user.id)) return res.status(404).json({ error: 'Ese archivo ya no existe.' });
    const safeType = /^image\/(jpeg|png|gif|webp)$/.test(f.type) || f.type === 'application/pdf' ? f.type : 'application/octet-stream';
    res.setHeader('Content-Type', safeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    const inline = !req.query.dl && /^image\//.test(safeType);
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(f.name).replace(/%20/g, ' ')}"; filename*=UTF-8''${encodeURIComponent(f.name)}`);
    res.end(f.data);
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

/* ---------- Recetas desde vídeos (YouTube, TikTok, Instagram, Facebook) ---------- */
const VIDEO_RE = /(^|\.)(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|fb\.com)$/i;
const isVideoUrl = u => { try { return VIDEO_RE.test(new URL(u).hostname); } catch { return false; } };
const metaTag = (html, prop) => { const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i'); const m = html.match(re); return m ? decodeEnt(m[1] || m[2]) : ''; };
const BOT_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';
async function getText(url, headers = {}) { const r = await safeFetch(url, { headers }); if (!r.ok) throw new Error('status ' + r.status); return await r.text(); }
function youtubeId(u) {
  const url = new URL(u);
  if (/youtu\.be$/i.test(url.hostname)) return url.pathname.slice(1).split('/')[0];
  if (url.searchParams.get('v')) return url.searchParams.get('v');
  const m = url.pathname.match(/\/(shorts|embed|live)\/([\w-]{6,})/); return m ? m[2] : null;
}
/* TikTok: se lee la página como un navegador (con sus cookies) para sacar la descripción completa,
   los subtítulos automáticos y, si no hay, el propio vídeo para escucharlo */
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
async function jarFetch(url, jar, headers = {}, timeout = 20000) {
  let u = url;
  for (let hop = 0; hop < 6; hop++) {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) throw new Error('bad_url');
    const addrs = await dns.lookup(x.hostname, { all: true });
    if (addrs.some(a => privateIp(a.address))) throw new Error('bad_url');
    const cookie = Object.entries(jar).map(([k, v]) => k + '=' + v).join('; ');
    const r = await fetch(x, { redirect: 'manual', signal: AbortSignal.timeout(timeout), headers: {
      'User-Agent': BROWSER_UA, 'Accept-Language': 'es-ES,es;q=0.9,en;q=0.6', ...(cookie ? { cookie } : {}), ...headers } });
    for (const c of (r.headers.getSetCookie ? r.headers.getSetCookie() : [])) { const [kv] = c.split(';'); const i = kv.indexOf('='); if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); }
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = new URL(r.headers.get('location'), x).toString(); continue; }
    r.finalUrl = u; return r;
  }
  throw new Error('too_many_redirects');
}
function vttToText(v) {
  const out = [];
  for (const line of String(v).split(/\r?\n/)) {
    const l = line.trim();
    if (!l || /^WEBVTT/.test(l) || /-->/.test(l) || /^\d+$/.test(l) || /^(NOTE|STYLE|Kind:|Language:)/.test(l)) continue;
    const t = l.replace(/<[^>]+>/g, '').trim();
    if (t && out[out.length - 1] !== t) out.push(t);
  }
  return out.join(' ');
}
async function tiktokData(url) {
  const jar = {}, out = { title: '', desc: '', speech: '', image: '', how: [] };
  const r = await jarFetch(url, jar, { Accept: 'text/html,application/xhtml+xml' });
  const html = await r.text();
  let item = null;
  const m = html.match(/<script[^>]+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
  if (m) { try { const j = JSON.parse(m[1]); item = j.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct || null; } catch { } }
  if (!item) { const s2 = html.match(/<script[^>]+id="SIGI_STATE"[^>]*>([\s\S]*?)<\/script>/); if (s2) { try { const j = JSON.parse(s2[1]); item = Object.values(j.ItemModule || {})[0] || null; } catch { } } }
  if (!item) {
    out.desc = metaTag(html, 'og:description') || metaTag(html, 'description'); out.title = metaTag(html, 'og:title'); out.image = metaTag(html, 'og:image');
    if (out.desc) out.how.push('meta');
    return out;
  }
  out.how.push('pagina');
  out.desc = [item.desc, ...(item.contents || []).map(c => c.desc)].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('\n');
  if (item.imagePost?.title) out.desc = item.imagePost.title + '\n' + out.desc;
  out.title = item.desc ? item.desc.split('\n')[0].slice(0, 120) : '';
  const v = item.video || {};
  out.image = v.cover || v.originCover || v.dynamicCover || '';
  const hdr = { Referer: 'https://www.tiktok.com/', Accept: '*/*' };
  // subtítulos (los automáticos de TikTok): mejor en español, si no en inglés
  const subs = (v.subtitleInfos || []).filter(x => x.Url);
  const pick = subs.find(x => /^spa|^es/i.test(x.LanguageCodeName || x.LanguageID || '') && x.Source !== 'MT') || subs.find(x => /^spa|^es/i.test(x.LanguageCodeName || ''))
    || subs.find(x => /^eng|^en/i.test(x.LanguageCodeName || '')) || subs[0];
  if (pick) { try { const s3 = await jarFetch(pick.Url, jar, hdr); if (s3.ok) { out.speech = vttToText(await s3.text()); if (out.speech) out.how.push('subtitulos'); } } catch (e) { console.error('tiktok subs', e.message); } }
  // sin subtítulos: se descarga el vídeo y se escucha
  if (!out.speech && CAN_HEAR) {
    const cands = [v.playAddr, v.downloadAddr, ...((v.bitrateInfo || []).flatMap(b => b.PlayAddr?.UrlList || []))].filter(Boolean);
    for (const addr of cands.slice(0, 4)) {
      try {
        const vr = await jarFetch(addr, jar, { ...hdr, Range: 'bytes=0-' }, 60000);
        if (!vr.ok) { console.error('tiktok video', vr.status); continue; }
        const len = Number(vr.headers.get('content-length') || 0); if (len > 24e6) continue;
        const buf = Buffer.from(await vr.arrayBuffer()); if (buf.length < 20000 || buf.length > 24e6) continue;
        out.speech = await transcribe(buf, 'video/mp4'); if (out.speech) { out.how.push('audio'); break; }
      } catch (e) { console.error('tiktok video', e.message); }
    }
  }
  return out;
}
async function videoText(url) {
  const host = new URL(url).hostname.toLowerCase();
  const out = { title: '', text: '', image: '' };
  if (/youtu/.test(host)) {
    const id = youtubeId(url); if (!id) throw new Error('bad_url');
    out.image = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    const html = await getText(`https://www.youtube.com/watch?v=${id}&hl=es`, { cookie: 'CONSENT=YES+1; SOCS=CAI' });
    let pr = null; const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;\s*(?:var\s|<\/script>)/);
    if (m) { try { pr = JSON.parse(m[1]); } catch { } }
    out.title = pr?.videoDetails?.title || metaTag(html, 'og:title');
    const desc = pr?.videoDetails?.shortDescription || metaTag(html, 'og:description');
    let transcript = '';
    const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const tr = tracks.find(t => /^es/.test(t.languageCode)) || tracks.find(t => /^en/.test(t.languageCode)) || tracks[0];
    if (tr?.baseUrl) {
      try { const j = JSON.parse(await getText(tr.baseUrl + '&fmt=json3'));
        transcript = (j.events || []).map(e => (e.segs || []).map(s => s.utf8).join('')).join(' ').replace(/\s+/g, ' ').trim(); } catch { }
    }
    out.text = [desc, transcript && 'Lo que se dice en el vídeo: ' + transcript].filter(Boolean).join('\n\n');
  } else if (/tiktok/.test(host)) {
    let t = null;
    try { t = await tiktokData(url); } catch (e) { console.error('tiktok', e.message); }
    if (!t || !t.desc) {
      try { const j = JSON.parse(await getText('https://www.tiktok.com/oembed?url=' + encodeURIComponent(t?.finalUrl || url)));
        t = t || { how: [] }; t.desc = t.desc || j.title || ''; t.title = t.title || (j.title || '').slice(0, 120); t.image = t.image || j.thumbnail_url || ''; t.how.push('oembed'); } catch { }
    }
    if (t) { out.title = t.title || ''; out.image = t.image || ''; out.how = t.how;
      out.text = [t.desc && 'Descripción del vídeo: ' + t.desc, t.speech && 'Lo que se dice en el vídeo: ' + t.speech].filter(Boolean).join('\n\n'); }
  } else if (/instagram/.test(host)) {
    const m = new URL(url).pathname.match(/\/(p|reel|reels|tv)\/([\w-]+)/);
    if (m) {
      try { const html = await getText(`https://www.instagram.com/p/${m[2]}/embed/captioned/`);
        const c = html.match(/class="Caption"[^>]*>([\s\S]*?)<div class="CaptionComments/i);
        if (c) out.text = htmlToText(c[1].replace(/<a[^>]*class="CaptionUsername"[\s\S]*?<\/a>/i, ''));
        const im = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/i); if (im) out.image = decodeEnt(im[1]);
      } catch { }
    }
    if (!out.text) { const html = await getText(url, { 'User-Agent': BOT_UA }); out.text = metaTag(html, 'og:description'); out.title = metaTag(html, 'og:title'); out.image = out.image || metaTag(html, 'og:image'); }
  } else {
    const html = await getText(url, { 'User-Agent': BOT_UA });
    out.title = metaTag(html, 'og:title'); out.text = metaTag(html, 'og:description') || metaTag(html, 'description'); out.image = metaTag(html, 'og:image');
  }
  out.text = String(out.text || '').trim();
  return out;
}
async function aiFromVideo(title, text) {
  return cleanAi(parseJson(await llm({ messages: [{ role: 'user', text: `Este es el texto de un vídeo de cocina de redes sociales: su título, su descripción y, a veces, lo que se dice en el vídeo. Saca la receta y devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Reglas: usa solo lo que aparece en el texto, sin inventar. Si no se dice una cantidad, pon el ingrediente sin cantidad. Escribe en español (traduce si hace falta), con un ingrediente por elemento y un paso por elemento sin numerar. Ignora hashtags, menciones, promociones y frases tipo "sígueme". Si no hay receta, devuelve {"error":"no_recipe"}.
<<<VIDEO
Título: ${String(title).slice(0, 300)}
${String(text).slice(0, 40000)}
VIDEO>>>` }] })));
}
async function importVideo(url, res, note = '') {
  let v;
  try { v = await videoText(url); }
  catch (e) { return res.status(422).json({ error: 'No he podido abrir ese vídeo. Si es privado no se puede leer; pega aquí la descripción o lo que dicen en el vídeo.', needText: true }); }
  if (note) v.text = 'Lo que cuenta quien comparte el vídeo: ' + note + (v.text ? '\n\n' + v.text : '');
  if (v.text && PROVIDER && res.req.user.username) {
    countAi();
    try { const r = await aiFromVideo(v.title, v.text); if (r) return res.json({ recipe: { ...r, image: v.image || '', source: url }, fromVideo: true }); } catch (e) { console.error(e); }
  }
  res.status(422).json({ needText: true, text: v.text || '', error: v.text
    ? 'El vídeo no trae la receta completa por escrito. Te dejo lo que he encontrado: completa lo que falte o sube el vídeo para que se escuche.'
    : 'Ese vídeo no trae texto que se pueda leer. Pega la descripción o lo que dicen, o sube el vídeo para que se escuche.' });
}
// Subir el vídeo: se transcribe lo que se dice (Groq Whisper) y se saca la receta
api.post('/import/video-file', needProfile, express.raw({ type: () => true, limit: '25mb' }), async (req, res) => {
  if (!CAN_HEAR) return noAi(res);
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'No ha llegado el vídeo. Vuelve a intentarlo.' });
  try {
    const type = String(req.headers['content-type'] || 'video/mp4').split(';')[0];
    let text = '', quota = false;
    try { text = await transcribe(req.body, type); }
    catch (e) { quota = e.status === 429; }
    if (!text && quota) return res.status(502).json({ error: 'Se ha llegado al límite gratis de la IA por ahora. Prueba dentro de un rato.' });
    if (!text) return res.status(422).json({ error: 'En el vídeo no se dice nada que se pueda transcribir, o no he podido escucharlo. Prueba con otro formato o un vídeo más corto.' });
    const note = String(req.query.note || '').slice(0, 2000);
    const rec = await aiFromVideo(String(req.query.title || ''), (note ? 'Lo que cuenta quien sube el vídeo: ' + note + '\n\n' : '') + 'Lo que se dice en el vídeo: ' + text);
    if (!rec) return res.status(422).json({ error: 'He escuchado el vídeo pero no he encontrado una receta.', needText: true, text });
    res.json({ recipe: rec });
  } catch (e) { console.error(e); res.status(502).json({ error: 'No he podido procesar el vídeo. Vuelve a intentarlo.' }); }
});

api.post('/import', async (req, res) => {
  if (isVideoUrl(String(req.body.url || '').trim())) return importVideo(String(req.body.url).trim(), res, String(req.body.note || '').slice(0, 2000));
  const url = String(req.body.url || '').trim();
  let html;
  try { const r = await safeFetch(url); if (!r.ok) throw new Error('status ' + r.status); html = await r.text(); }
  catch (e) { return res.status(422).json({ error: 'No he podido abrir esa web. Pega el texto de la receta y la saco de ahí.', needText: true }); }
  const ld = parseJsonLd(html);
  if (ld && ld.ingredients.length) return res.json({ recipe: { ...ld, source: url } });
  if (PROVIDER && req.user.username) {
    try { countAi(); const r = await aiExtract(htmlToText(html)); if (r) return res.json({ recipe: { ...r, image: ogImage(html), source: url } }); } catch (e) { console.error(e); }
  }
  res.status(422).json({ error: 'No he encontrado la receta en esa página. Pega el texto de la receta y la saco de ahí.', needText: true });
});

/* ---------- IA (opcional): Groq (GROQ_API_KEY, gratis), ChatGPT (OPENAI_API_KEY) o Claude (ANTHROPIC_API_KEY) ---------- */
const SCHEMA = `{"title":string,"servings":string (solo el número de raciones),"time":string (p. ej. "45 min"),"difficulty":"Fácil"|"Media"|"Difícil"|"","ingredients":[string],"steps":[string],"notes":string}`;
// messages: [{ role: 'user'|'assistant', text, image?: { media, data } }]
// API compatible con OpenAI (Groq y OpenAI)
// Transcribe el audio de un vídeo: primero Groq Whisper y, si falla, Cloudflare Whisper
async function transcribe(buf, type) {
  let last;
  if (GROQ_KEY) try {
    const ext = (type.split('/')[1] || 'mp4').replace('quicktime', 'mov').replace(/[^a-z0-9]/g, '');
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type }), 'video.' + ext);
    fd.append('model', process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo');
    fd.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', body: fd, signal: AbortSignal.timeout(120000), headers: { authorization: `Bearer ${GROQ_KEY}` } });
    if (!r.ok) { const e = new Error('whisper groq ' + r.status + ' ' + (await r.text()).slice(0, 200)); e.status = r.status; throw e; }
    const t = String((await r.json()).text || '').trim(); if (t) return t;
  } catch (e) { console.error(e.message); last = e; }
  if (HAS_CF) try {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/${CF_WHISPER_MODEL}`, {
      method: 'POST', signal: AbortSignal.timeout(120000), headers: { authorization: `Bearer ${CF_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ audio: Buffer.from(buf).toString('base64') }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error('whisper cf ' + r.status + ' ' + JSON.stringify(j.errors || '').slice(0, 200)); e.status = r.status; throw e; }
    const t = String(j.result?.text || '').trim(); if (t) return t;
  } catch (e) { console.error(e.message); last = e; }
  if (last) throw last;
  return '';
}
async function openaiCompat({ url, key, model, system, messages, maxTokens, plain }) {
  const msgs = system ? [{ role: 'system', content: system }] : [];
  for (const m of messages) msgs.push({ role: m.role, content: m.image
    ? [{ type: 'text', text: m.text }, { type: 'image_url', image_url: { url: `data:${m.image.media};base64,${m.image.data}` } }] : m.text });
  const r = await fetch(url, {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(plain
      ? { model, messages: msgs, max_tokens: maxTokens, temperature: 0.6 }
      : { model, messages: msgs, response_format: { type: 'json_object' }, max_completion_tokens: maxTokens + (/gpt-oss/.test(model) ? 2000 : 0), temperature: 0.6, ...(/gpt-oss/.test(model) ? { reasoning_effort: 'low' } : {}) })
  });
  if (!r.ok) { const e = new Error(model + ' ' + r.status + ' ' + (await r.text()).slice(0, 300)); e.status = r.status; throw e; }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}
// Un proveedor que llega a su límite descansa un rato y mientras tanto se usa el siguiente
const aiRest = {};
async function llm(opts) {
  let last;
  const live = PROVIDERS.filter(p => !(aiRest[p] > Date.now()));
  for (const p of live.length ? live : PROVIDERS) {
    try {
      const t = await llmWith(p, opts);
      if (String(t || '').trim()) return t;
      last = new Error(p + ' sin respuesta');
    } catch (e) {
      console.error('IA', p, String(e.message).slice(0, 200));
      if (e.status === 429) aiRest[p] = Date.now() + 90e3;
      last = e;
    }
  }
  throw last || new Error('IA no disponible');
}
async function llmWith(provider, { system = '', messages, maxTokens = 3000 }) {
  if (provider === 'cloudflare') {
    const hasImage = messages.some(m => m.image);
    return await openaiCompat({ url: `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/v1/chat/completions`, key: CF_TOKEN,
      model: hasImage ? CF_VISION_MODEL : CF_MODEL, system: (system ? system + '\n\n' : '') + 'Responde siempre solo con un objeto JSON válido, sin texto antes ni después.', messages, maxTokens, plain: true });
  }
  if (provider === 'groq') {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    const hasImage = messages.some(m => m.image);
    const model = hasImage ? GROQ_VISION_MODEL : GROQ_MODEL;
    try { return await openaiCompat({ url, key: GROQ_KEY, model, system, messages, maxTokens }); }
    catch (e) {
      if (hasImage || e.status === 429 || !GROQ_FALLBACK || GROQ_FALLBACK === model) throw e;
      console.error(e.message, '→ probando', GROQ_FALLBACK);
      return await openaiCompat({ url, key: GROQ_KEY, model: GROQ_FALLBACK, system, messages, maxTokens });
    }
  }
  if (provider === 'openai') {
    const msgs = system ? [{ role: 'system', content: system }] : [];
    for (const m of messages) msgs.push({ role: m.role, content: m.image
      ? [{ type: 'text', text: m.text }, { type: 'image_url', image_url: { url: `data:${m.image.media};base64,${m.image.data}` } }] : m.text });
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(90000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: OPENAI_MODEL, messages: msgs, response_format: { type: 'json_object' }, max_completion_tokens: maxTokens })
    });
    if (!r.ok) { const e = new Error('openai ' + r.status + ' ' + (await r.text()).slice(0, 300)); e.status = r.status; throw e; }
    const j = await r.json();
    return j.choices?.[0]?.message?.content || '';
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, ...(system ? { system } : {}), messages: messages.map(m => ({ role: m.role, content: m.image
      ? [{ type: 'image', source: { type: 'base64', media_type: m.image.media, data: m.image.data } }, { type: 'text', text: m.text }] : m.text })) })
  });
  if (!r.ok) { const e = new Error('claude ' + r.status + ' ' + (await r.text()).slice(0, 300)); e.status = r.status; throw e; }
  const j = await r.json();
  return (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
}
function parseJson(t) { const m = String(t || '').replace(/<think>[\s\S]*?<\/think>/gi, '').match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch { return null; } }
function cleanAi(r) {
  if (!r || r.error || !r.title) return null;
  return { title: String(r.title), servings: String(r.servings || '').match(/\d+/)?.[0] || String(r.servings || ''), time: String(r.time || ''), difficulty: String(r.difficulty || ''),
    ingredients: (r.ingredients || []).map(String).filter(Boolean), steps: (r.steps || []).map(s => String(s).replace(/^\s*\d+[.)]\s*/, '')).filter(Boolean), notes: String(r.notes || '') };
}
async function aiExtract(text) {
  return cleanAi(parseJson(await llm({ messages: [{ role: 'user', text: `Extrae la receta del texto de una página web que va entre las marcas. Devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Reglas: usa solo lo que aparece en el texto, sin inventar nada. Escribe en español (traduce si hace falta). Un ingrediente por elemento, con su cantidad delante. Un paso por elemento, sin numerar. Si alguna palabra o frase está en negrita escríbela como **texto**, y si está en cursiva como *texto*; no añadas formato que no esté. Ignora comentarios, anuncios y menús de la web. Si no hay ninguna receta, devuelve {"error":"no_recipe"}.
<<<TEXTO
${String(text).slice(0, 45000)}
TEXTO>>>` }] })));
}
const noAi = res => res.status(503).json({ error: 'La IA no está activada en este servidor todavía.' });
// Comprobación de la IA: responde un texto mínimo y mira si los modelos existen
let lastAiCheck = 0;
api.get('/ai/check', async (req, res) => {
  if (!PROVIDER) return res.json({ provider: null });
  if (req.query.all) {
    if (Date.now() - lastAiCheck < 20000) return res.status(429).json({ error: 'Espera unos segundos.' });
    lastAiCheck = Date.now();
    const out = { providers: PROVIDERS };
    for (const p of PROVIDERS) {
      try { const t = await llmWith(p, { messages: [{ role: 'user', text: 'Devuelve solo este JSON: {"ok":true}' }], maxTokens: 60 }); out[p] = parseJson(t) ? 'ok' : 'respuesta rara: ' + String(t).slice(0, 80); }
      catch (e) { out[p] = 'error ' + String(e.message).slice(0, 160); }
    }
    return res.json(out);
  }
  if (Date.now() - lastAiCheck < 20000) return res.status(429).json({ error: 'Espera unos segundos.' });
  lastAiCheck = Date.now();
  const out = { provider: PROVIDER };
  try { const t = await llm({ messages: [{ role: 'user', text: 'Devuelve solo este JSON: {"ok":true,"saludo":"hola"}' }], maxTokens: 60 }); out.text = parseJson(t) ? 'ok' : 'respuesta rara'; }
  catch (e) { out.text = 'error ' + (e.status || '') + ' ' + String(e.message).slice(0, 160); }
  if (PROVIDER === 'groq') {
    try { const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { authorization: `Bearer ${GROQ_KEY}` }, signal: AbortSignal.timeout(15000) });
      const ids = ((await r.json()).data || []).map(m => m.id);
      out.models = { chat: ids.includes(GROQ_MODEL), fallback: ids.includes(GROQ_FALLBACK), vision: ids.includes(GROQ_VISION_MODEL) };
      out.visionCandidates = ids.filter(i => /vision|scout|maverick|qwen|vl|llava/i.test(i));
    } catch (e) { out.models = 'error'; }
  }
  res.json(out);
});
api.post('/ai/extract', needProfile, async (req, res) => {
  countAi();
  if (!PROVIDER) return noAi(res);
  try { const r = await aiExtract(req.body.text || ''); if (!r) return res.status(422).json({ error: 'No he encontrado una receta en ese texto. Revisa que hayas copiado la página entera.' }); res.json({ recipe: r }); }
  catch (e) { console.error(e); res.status(502).json({ error: 'No he podido leer el texto. Vuelve a intentarlo.' }); }
});
/* Alérgenos y diabetes de la persona: la IA los tiene siempre en cuenta */
function healthCtx(u) {
  const parts = [];
  const al = (u && u.allergens) || [];
  if (al.length) parts.push(`La persona tiene estas alergias o intolerancias: ${al.join(', ')}. Nunca uses esos ingredientes (tampoco ocultos) y propón sustitutos adecuados.`);
  const dia = u && u.prefs && u.prefs.diabetes;
  if (dia) parts.push(`La persona tiene diabetes (${({ tipo1: 'tipo 1', tipo2: 'tipo 2', gestacional: 'gestacional', prediabetes: 'prediabetes' })[dia] || dia}). Evita azúcares añadidos y harinas refinadas, usa sustitutos apropiados (edulcorantes aptos, harinas integrales o de almendra, más fibra y proteína) y raciones moderadas de hidratos.`);
  if (u && u.prefs && u.prefs.diet) parts.push(`Otras indicaciones de la persona: ${String(u.prefs.diet).slice(0, 300)}.`);
  return parts.join('\n');
}
const CHEF = `Eres el asistente de cocina de Entre Fogones, una app de recetas. Ayudas a crear recetas caseras en español de España.
Responde SIEMPRE con un único objeto JSON con esta forma: {"reply": string, "recipe": ${SCHEMA} o null}.
- "reply": una o dos frases cercanas que digan qué receta propones o qué has cambiado.
- Cuando te pidan una receta, devuelve la receta completa en "recipe".
- Cuando te pidan cambios, devuelve en "recipe" la receta completa ya modificada, no solo lo que cambia.
- Si te preguntan algo que no es una receta, contesta en "reply" y pon "recipe": null.
Usa cantidades métricas (g, ml, cucharadas), un ingrediente por elemento con su cantidad delante, pasos claros sin numerar, y en "notes" un consejo breve de cocinero. Puedes marcar con **texto** lo más importante de un paso.
- La app crea la foto de cada receta con IA. Si te piden una foto, una imagen nueva o cambiar la foto, NUNCA digas que no puedes: pon "newImage": true en el JSON, devuelve la receta completa y di en "reply" que la foto nueva se creará al guardar (puedes describir brevemente cómo será).`;
api.post('/ai/chat', needProfile, async (req, res) => {
  countAi();
  if (!PROVIDER) return noAi(res);
  const msgs = (Array.isArray(req.body.messages) ? req.body.messages : []).slice(-20)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: String(m.content || '').slice(0, 12000) })).filter(m => m.text);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'Escribe qué receta quieres.' });
  try {
    const h = healthCtx(req.user);
    const out = parseJson(await llm({ system: CHEF + (h ? '\n\nMUY IMPORTANTE, ten siempre en cuenta esto:\n' + h : ''), messages: msgs, maxTokens: 3500 }));
    if (!out) return res.status(502).json({ error: 'No he entendido la respuesta. Vuelve a intentarlo.' });
    const wantImg = !!out.newImage || /\b(foto|imagen|picture|image)\b/i.test(msgs[msgs.length - 1].text) && /\b(pon|ponle|cambia|nueva|otra|genera|crea|haz|añade|mejor)\w*/i.test(msgs[msgs.length - 1].text);
    let reply = String(out.reply || '');
    if (wantImg && (/no puedo|no es posible|no tengo la capacidad|lo siento/i.test(reply) || !reply)) reply = 'Hecho: al guardar la receta se creará una foto nueva del plato con IA.';
    res.json({ reply, recipe: cleanAi(out.recipe), newImage: wantImg });
  } catch (e) { console.error(e); res.status(502).json({ error: e.status === 429 ? 'Se ha llegado al límite gratis de la IA por ahora. Prueba dentro de un rato.' : 'No he podido contestar ahora. Vuelve a intentarlo en un momento.' }); }
});
api.post('/ai/photo', needProfile, async (req, res) => {
  countAi();
  if (!PROVIDER) return noAi(res);
  const m = String(req.body.image || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'Esa imagen no se puede leer.' });
  try {
    const r = cleanAi(parseJson(await llm({ messages: [{ role: 'user', image: { media: m[1], data: m[2] }, text: `La imagen es una foto de una receta (de un libro, revista, pantalla o papel escrito a mano). Transcribe la receta completa y devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Reglas: los ingredientes y cantidades, exactamente como se leen, sin inventar. La preparación redáctala tú mejor: pasos claros, completos y bien escritos en español de España, en orden, uno por elemento y sin numerar, sin cambiar lo que se hace ni añadir ingredientes. Corrige faltas y abreviaturas. Si se ve texto en negrita escríbelo como **texto**, y en cursiva como *texto*. Si no hay ninguna receta, devuelve {"error":"no_recipe"}.` }] })));
    if (!r) return res.status(422).json({ error: 'No he encontrado una receta en la foto. Prueba con una foto más nítida, recta y con buena luz.' });
    res.json({ recipe: r });
  } catch (e) { console.error(e); res.status(502).json({ error: e.status === 429 ? 'Se ha llegado al límite gratis de la IA por ahora. Prueba dentro de un rato.' : 'No he podido leer la foto. Vuelve a intentarlo.' }); }
});

/* ---------- Mi cuenta (como Kairos) ---------- */
api.put('/me/profile', needProfile, async (req, res, next) => {
  try {
    const display = String(req.body.display || '').trim().slice(0, 40);
    const username = String(req.body.username || '').trim().toLowerCase().replace(/^@/, '');
    const color = String(req.body.color || req.user.color || '#B5562B').slice(0, 9);
    if (!display) return res.status(400).json({ error: 'Escribe tu nombre.' });
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'El nombre de usuario debe tener de 3 a 20 letras minúsculas, números o _.' });
    if ((await q('SELECT 1 FROM users WHERE username=$1 AND id<>$2', [username, req.user.id])).rows[0]) return res.status(409).json({ error: `@${username} ya está cogido. Prueba con otro.` });
    await q('UPDATE users SET display=$1, username=$2, color=$3 WHERE id=$4', [display, username, color, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.put('/me/email', needProfile, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
    if (!emailOk(email)) return res.status(400).json({ error: 'Escribe un correo válido.' });
    if (req.user.role === 'superadmin') return res.status(400).json({ error: 'El correo del Superadministrador solo se puede cambiar desde el código.' });
    if (!checkPass(String(req.body.password || ''), req.user.pass_hash)) return res.status(401).json({ error: 'La contraseña no es correcta.' });
    if ((await q('SELECT 1 FROM users WHERE lower(email)=$1 AND id<>$2', [email, req.user.id])).rows[0]) return res.status(409).json({ error: 'Ese correo ya lo usa otra cuenta.' });
    await q('UPDATE users SET email=$1 WHERE id=$2', [email, req.user.id]);
    await syncRole(req.user.id, email);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.put('/me/password', needProfile, async (req, res, next) => {
  try {
    if (!checkPass(String(req.body.current || ''), req.user.pass_hash)) return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
    const pw = String(req.body.password || '');
    if (pw.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    await q('UPDATE users SET pass_hash=$1 WHERE id=$2', [hashPass(pw), req.user.id]);
    await q('DELETE FROM sessions WHERE user_id=$1 AND token<>$2', [req.user.id, req.token]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.put('/me/avatar', needProfile, async (req, res, next) => {
  try {
    const img = String(req.body.image || '');
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(img) || img.length > 120000) return res.status(400).json({ error: 'Esa foto no se puede usar. Prueba con otra.' });
    await q('UPDATE users SET avatar=$1 WHERE id=$2', [img, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.delete('/me/avatar', needProfile, async (req, res, next) => {
  try { await q('UPDATE users SET avatar=NULL WHERE id=$1', [req.user.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
api.put('/me/prefs', needProfile, async (req, res, next) => {
  try {
    const b = req.body || {}, cur = req.user.prefs || {};
    const p = { ...cur };
    if ('fontScale' in b) p.fontScale = Math.max(0.8, Math.min(1.6, Number(b.fontScale) || 1));
    if ('diabetes' in b) p.diabetes = ['', 'tipo1', 'tipo2', 'gestacional', 'prediabetes'].includes(b.diabetes) ? b.diabetes : '';
    if ('diet' in b) p.diet = String(b.diet || '').slice(0, 300);
    await q('UPDATE users SET prefs=$1 WHERE id=$2', [p, req.user.id]);
    res.json({ ok: true, prefs: p });
  } catch (e) { next(e); }
});
api.put('/me/allergens', needProfile, async (req, res, next) => {
  try {
    const list = (Array.isArray(req.body.allergens) ? req.body.allergens : []).map(x => String(x).trim().slice(0, 40)).filter(Boolean).slice(0, 30);
    await q('UPDATE users SET allergens=$1 WHERE id=$2', [JSON.stringify([...new Set(list)]), req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.get('/me/export', needProfile, async (req, res, next) => {
  try {
    const me = req.user.id;
    const [f, r, rq, m] = await Promise.all([
      q('SELECT id,name,color,created FROM folders WHERE user_id=$1', [me]),
      q('SELECT * FROM recipes WHERE user_id=$1', [me]),
      q('SELECT * FROM requests WHERE from_id=$1 OR to_id=$1', [me]),
      q('SELECT chat_id, ts, data FROM messages WHERE from_id=$1 ORDER BY ts', [me])
    ]);
    res.json({ exportado: new Date().toISOString(), cuenta: { usuario: req.user.username, nombre: req.user.display, correo: req.user.email, color: req.user.color, alergenos: req.user.allergens || [] },
      recetarios: f.rows, recetas: r.rows.map(recipeOut), amistades: rq.rows, mensajesEnviados: m.rows });
  } catch (e) { next(e); }
});

/* ---------- Sugerencias de recetas famosas ---------- */
const SEED_SUGGESTIONS = [
  ['Arroz con leche de Dabiz Muñoz', 'https://cookpad.com/es/recetas/26663487', 'Punk Cooker'],
  ['Patatas con salsa brava estilo Jordi Cruz', 'https://cookpad.com/es/recetas/26124437', 'Ainoa Doñas'],
  ['Coca de San Juan de Joseba Arguiñano', 'https://cookpad.com/es/recetas/25846893', 'mami.cocinillas'],
  ['Cheesecake viral de TikTok', 'https://cookpad.com/es/recetas/25659519', 'Quiero Cacahuetes'],
  ['Tarta de queso estilo DiverXO', 'https://cookpad.com/es/recetas/25568424', 'Cris Castro'],
  ['Chapata de Ibán Yarza', 'https://cookpad.com/es/recetas/25483853', 'Obrador Cutanda'],
  ['Albóndigas de bonito en salsa de piquillo de Joseba Arguiñano', 'https://cookpad.com/es/recetas/25235730', 'Pedro Barbi Ayucar'],
  ['Tarta de manzana y almendras de Eva Arguiñano', 'https://cookpad.com/es/recetas/25117776', 'mami.cocinillas'],
  ['El famoso bizcocho de yogur', 'https://cookpad.com/es/recetas/24612011', 'jaramillo'],
  ['Café dalgona', 'https://cookpad.com/es/recetas/24522309', 'Quiero Cacahuetes'],
  ['Albóndigas estilo Arguiñano', 'https://cookpad.com/es/recetas/24415525', 'Nekane'],
  ['Risotto de fresas al cava de Karlos Arguiñano', 'https://cookpad.com/es/recetas/24064912', 'La Mélangerie'],
  ['Brigadeiros, las trufas brasileñas más famosas', 'https://cookpad.com/es/recetas/17269523', 'Saalinas'],
  ['Carrot cake con granola de Jordi Cruz', 'https://cookpad.com/es/recetas/17252514', 'Cocina con Albóndiga'],
  ['Pollo rustido al estilo Ruscalleda', 'https://cookpad.com/es/recetas/17251979', 'CocinarParaCuatro'],
  ['Huevos fritos en queso feta, receta viral de TikTok', 'https://cookpad.com/es/recetas/17113916', 'Josemi CilantroYHierbabuena'],
  ['Tiramisú versionado del original de Jamie Oliver', 'https://cookpad.com/es/recetas/17062654', 'Cocina con Celi'],
];
/* ---------- Recetas famosas (sugerencias) ----------
   Se buscan en las búsquedas de recetas famosas, se guardan completas en nuestra base de datos
   y, si hay IA, se reescriben con palabras propias. En la app se abren como cualquier otra receta. */
const SUGG_SEARCHES = (process.env.SUGG_SEARCHES || 'famosas,virales,tiktok,arguiñano,jordi cruz,dabiz muñoz,clásicas,tradicionales,de la abuela').split(',').map(x => x.trim()).filter(Boolean);
const SUGG_TARGET = Number(process.env.SUGG_TARGET || 120);
async function seedSuggestions() {
  const n = (await q('SELECT count(*)::int n FROM suggestions')).rows[0].n;
  if (n) return;
  let i = 0;
  for (const [title, url] of SEED_SUGGESTIONS) await q('INSERT INTO suggestions(id,title,url,image,position,created) VALUES($1,$2,$3,NULL,$4,$5) ON CONFLICT DO NOTHING', [gid(), title, url, i++, now()]);
}
async function crawlSuggestions() {
  const have = (await q('SELECT count(*)::int n FROM suggestions')).rows[0].n;
  if (have >= SUGG_TARGET) return;
  const known = new Set((await q('SELECT url FROM suggestions')).rows.map(r => r.url));
  let pos = (await q('SELECT coalesce(max(position),0) p FROM suggestions')).rows[0].p;
  let added = 0;
  outer: for (const term of SUGG_SEARCHES) for (let page = 1; page <= 3; page++) {
    let html = '';
    try { const r = await safeFetch(`https://cookpad.com/es/buscar/${encodeURIComponent(term)}?page=${page}`); if (!r.ok) break; html = await r.text(); } catch { break; }
    const ids = [...new Set([...html.matchAll(/\/es\/recetas\/(\d{5,})/g)].map(m => m[1]))];
    if (!ids.length) break;
    for (const id of ids) {
      const url = `https://cookpad.com/es/recetas/${id}`;
      if (known.has(url)) continue; known.add(url);
      await q('INSERT INTO suggestions(id,title,url,position,created) VALUES($1,$2,$3,$4,$5)', [gid(), 'Receta', url, ++pos, now()]);
      if (have + ++added >= SUGG_TARGET) break outer;
    }
    await sleep(1500);
  }
  if (added) console.log('Sugerencias nuevas:', added);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* Título limpio y entendible: sin emojis, sin «TikTok trending:», sin la traducción repetida tras «//», sin paréntesis ni etiquetas */
function cleanTitle(t) {
  const orig = String(t || '').trim();
  let s = orig;
  if (/\s(\/\/|\|)\s/.test(s)) {
    const parts = s.split(/\s(?:\/\/|\|)\s/).map(x => x.trim()).filter(Boolean);
    s = parts.find(x => /[áéíóúñ¿¡]|\b(de|del|con|y|al|a la|en|sin|para)\b/i.test(x)) || parts[parts.length - 1];
  }
  s = s.replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}\uFE0F\u200D\u20E3]/gu, ' ')
    .replace(/#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/^\s*(?:(?:tik\s?tok|instagram|insta|youtube|reels?)\s*)?(?:trending|viral|tendencia|famos[oa])\s*[:\-–—|]\s*/iu, '')
    .replace(/\b(?:tik\s?tok|instagram|youtube|trending|viral|virales|del momento)\b/giu, ' ')
    .replace(/[\[(（][^\])）]*[\])）]/g, ' ')
    .replace(/\s*&\s*/g, ' y ')
    .replace(/^\s*(?:la\s+)?receta\s+(?:de\s+|del\s+)?/iu, '')
    .replace(/\s+(?:estilo|al estilo de|de la abuela de|by)\s+[A-ZÁÉÍÓÚÑ][\p{L}.]*(?:\s+[A-ZÁÉÍÓÚÑ][\p{L}.]*)*\s*$/u, '')
    .replace(/[!¡?¿]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s:\-–—|.,·*]+|[\s:\-–—|,·*]+$/g, '')
    .trim();
  if (s.length < 3) s = orig.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
  if (s === s.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{4}/.test(s)) s = s.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const TITLE_RULES = `El título debe ser el nombre del plato en español de España, corto y claro (de 2 a 7 palabras), como aparecería en un recetario de casa. Por ejemplo: "Tarta de queso al horno", "Barritas de chocolate y arándanos", "Pollo al curry con arroz". Nunca pongas emojis, hashtags, signos de exclamación, mayúsculas de grito, ni palabras como TikTok, Instagram, viral, trending, famosa o "la mejor". Nada de nombres de personas, cocineros, restaurantes ni webs, nada entre paréntesis y nunca el mismo nombre repetido en dos idiomas: si viene en inglés, tradúcelo.`;
async function rewriteRecipe(r) {
  if (!PROVIDER) return r;
  try {
    countAi();
    const out = cleanAi(parseJson(await llm({ maxTokens: 3000, messages: [{ role: 'user', text: `Reescribe esta receta con tus propias palabras para un recetario casero en español de España. Mantén los mismos ingredientes y cantidades, y los mismos pasos, pero redactados de nuevo, claros y directos. ${TITLE_RULES} En "notes" pon un consejo breve propio. Devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Receta:
${JSON.stringify({ title: r.title, servings: r.servings, time: r.time, ingredients: r.ingredients, steps: r.steps }).slice(0, 20000)}` }] })));
    return out ? { ...out, title: cleanTitle(out.title), image: r.image } : r;
  } catch (e) { console.error('rewrite', e.message); return r; }
}
let suggBusy = false;
async function processSuggestions() {
  if (suggBusy) return; suggBusy = true;
  try {
    await crawlSuggestions().catch(e => console.error('crawl', e.message));
    const rows = (await q("SELECT id,url FROM suggestions WHERE data IS NULL AND coalesce(tries,0)<3 ORDER BY position LIMIT 200")).rows;
    for (const s of rows) {
      try {
        const r = await safeFetch(s.url); const html = await r.text();
        const ld = parseJsonLd(html);
        if (!ld || !ld.ingredients.length || !ld.steps.length) { await q('UPDATE suggestions SET tries=coalesce(tries,0)+1 WHERE id=$1', [s.id]); continue; }
        ld.image = '';
        const rec = await rewriteRecipe(ld);
        const data = cleanRecipe({ ...rec, source: '' });
        await q('UPDATE suggestions SET data=$1, title=$2, image=NULL, rewritten=$4 WHERE id=$3', [{ ...data, image: '' }, data.title, s.id, rec !== ld]);
      } catch { await q('UPDATE suggestions SET tries=coalesce(tries,0)+1 WHERE id=$1', [s.id]).catch(() => {}); }
      await sleep(PROVIDER ? 2500 : 800);
    }
  } finally { suggBusy = false; }
  processSuggestionArt().catch(e => console.error('art', e.message));
}
/* Tipos de receta para buscar entre las recetas famosas */
const SUGG_CATS = ['Postres', 'Pasta', 'Carne', 'Pescado y marisco', 'Arroces', 'Verduras', 'Ensaladas', 'Sopas y cremas', 'Legumbres', 'Huevos', 'Panes y masas', 'Aperitivos', 'Bebidas', 'Salsas'];
async function categorize(rows) {
  if (!PROVIDER || !rows.length) return {};
  countAi();
  const out = parseJson(await llm({ maxTokens: 1200, messages: [{ role: 'user', text: `Clasifica cada receta en UNO de estos tipos: ${SUGG_CATS.join(', ')}.
Devuelve SOLO un objeto JSON {"tipos": {"<id>": "<tipo>"}}.
${rows.map(r => `${r.id}: ${r.title} (${(r.ingredients || []).slice(0, 6).join(', ')})`).join('\n')}` }] }));
  const m = (out && out.tipos) || {}; const res = {};
  for (const [id, t] of Object.entries(m)) { const c = SUGG_CATS.find(x => x.toLowerCase() === String(t).toLowerCase()); if (c) res[id] = c; }
  return res;
}
/* Foto generada con IA para no usar fotos de otras personas.
   Con CF_ACCOUNT_ID y CF_API_TOKEN usa Cloudflare Workers AI (gratis con cuenta); si no, Pollinations. */
/* La foto tiene que ser de ESE plato: la IA describe en inglés cómo queda el plato terminado a partir de la receta entera */
const IMG_V = 2;
async function dishPrompt(d) {
  const fallback = `${d.title}${(d.ingredients || []).length ? ', made with ' + d.ingredients.slice(0, 6).join(', ') : ''}`;
  if (!PROVIDER) return fallback;
  try {
    countAi();
    const out = parseJson(await llm({ maxTokens: 500, messages: [{ role: 'user', text: `Describe en INGLÉS, para un generador de imágenes, cómo se ve exactamente el plato terminado de esta receta tal y como se sirve: qué es (tipo de plato), forma, colores, textura, ingredientes que se ven, en qué recipiente se sirve (plato, cuenco, vaso, bandeja, molde) y la guarnición si la tiene. Debe ser fiel a la receta: no añadas ingredientes que no lleva ni cambies el tipo de plato (si es una bebida, una bebida; si es un postre, ese postre; si es una salsa, la salsa en un cuenco). Máximo 60 palabras, sin nombres propios.
Devuelve SOLO un objeto JSON: {"prompt": "..."}
Receta: ${String(d.title || '').slice(0, 160)}
Ingredientes: ${(d.ingredients || []).slice(0, 25).join('; ').slice(0, 1500)}
Preparación: ${(d.steps || []).join(' ').slice(0, 1500)}` }] }));
    const p = out && String(out.prompt || '').trim();
    return p && p.length > 15 ? p.slice(0, 600) : fallback;
  } catch { return fallback; }
}
async function aiImage(title, extra = '', described = '') {
  const prompt = `${described ? described : `appetizing homemade food: ${title}${extra ? ' (' + extra + ')' : ''}`}. Realistic food photography, the whole dish centered and fully visible with some margin around it, natural window light, simple rustic wooden table, no text, no people, no hands`;
  if (CF_ACCOUNT && CF_TOKEN) {
    const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
      method: 'POST', signal: AbortSignal.timeout(90000), headers: { authorization: `Bearer ${CF_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, steps: 6 }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.result?.image) return { buf: Buffer.from(j.result.image, 'base64'), type: 'image/jpeg' };
    // sin cuota en Cloudflare: se prueba con Pollinations
    if (r.status !== 429 && r.status !== 402) throw new Error('cf ' + r.status + ' ' + JSON.stringify(j.errors || '').slice(0, 200));
  }
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=480&nologo=true&seed=${Math.floor(Math.random() * 1e6)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(90000), headers: POLL_TOKEN ? { authorization: `Bearer ${POLL_TOKEN}` } : {} });
  if (r.status === 402 || r.status === 429) { const e = new Error('cuota ' + r.status); e.quota = true; throw e; }
  if (!r.ok) throw new Error('img ' + r.status);
  const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
  if (!/^image\//.test(type)) throw new Error('img type ' + type);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 5000 || buf.length > 2e6) throw new Error('img size ' + buf.length);
  return { buf, type };
}
let artBusy = false, nutriBusy = false;
// Tabla nutricional de todas las recomendadas: si la IA está ocupada, espera un minuto y sigue
async function suggNutrition() {
  if (nutriBusy || !PROVIDER) return; nutriBusy = true;
  try {
    for (let fails = 0; fails < 15;) {
      const r = (await q("SELECT id, data FROM suggestions WHERE data IS NOT NULL AND coalesce(data->'nutrition'->>'sig','') <> 'v2' ORDER BY position LIMIT 1")).rows[0];
      if (!r) break;
      try { const n = await aiNutrition(r.data); if (n && n.grams) await q("UPDATE suggestions SET data = data || $1::jsonb WHERE id=$2", [JSON.stringify({ nutrition: { ...n, sig: 'v2' } }), r.id]); else fails++; await sleep(2500); }
      catch (e) { fails++; console.error('nutricion sugerencia', e.message); await sleep(65000); }
    }
  } finally { nutriBusy = false; }
}
async function processSuggestionArt() {
  if (artBusy) return; artBusy = true;
  try {
    // reescribir con palabras propias las que se guardaron cuando la IA fallaba
    if (PROVIDER) for (const r of (await q("SELECT id, data FROM suggestions WHERE data IS NOT NULL AND rewritten IS NOT TRUE ORDER BY position LIMIT 200")).rows) {
      const before = r.data.title;
      const out = await rewriteRecipe({ ...r.data, image: '' });
      if (out !== r.data && out.title && out.title !== before) {
        const data = cleanRecipe({ ...out, source: '' });
        await q('UPDATE suggestions SET data=$1, title=$2, rewritten=true, img=NULL, img_tries=0 WHERE id=$3', [{ ...data, image: '' }, data.title, r.id]);
      } else if (out !== r.data) await q('UPDATE suggestions SET rewritten=true WHERE id=$1', [r.id]);
      else break;
      await sleep(3000);
    }
    // títulos entendibles para todas (una vez), de 20 en 20
    for (let k = 0; k < 20; k++) {
      const rows = (await q("SELECT id, title, data FROM suggestions WHERE data IS NOT NULL AND title_ok IS NOT TRUE ORDER BY position LIMIT 20")).rows;
      if (!rows.length) break;
      let names = {};
      if (PROVIDER) try {
        countAi();
        const out = parseJson(await llm({ maxTokens: 1500, messages: [{ role: 'user', text: `Pon a cada receta un título entendible. ${TITLE_RULES}
Usa los ingredientes para saber qué plato es. Devuelve SOLO un objeto JSON {"titulos": {"<id>": "<título>"}}.
${rows.map(r => `${r.id}: ${r.title} (${(r.data.ingredients || []).slice(0, 6).join(', ')})`).join('\n')}` }] }));
        names = (out && out.titulos) || {};
      } catch (e) { console.error('titulos', e.message); }
      if (PROVIDER && !Object.keys(names).length) {
        // sin IA ahora mismo: se limpian ya los títulos y se vuelve a probar en un minuto
        for (const r of rows) { const t = cleanTitle(r.title); if (t !== r.title) await q("UPDATE suggestions SET title=$1, data=jsonb_set(data, '{title}', to_jsonb($1::text)) WHERE id=$2", [t, r.id]); }
        await sleep(65000); continue;
      }
      for (const r of rows) {
        const t = cleanTitle(names[r.id] || r.title);
        await q("UPDATE suggestions SET title=$1, data=jsonb_set(data, '{title}', to_jsonb($1::text)), title_ok=true WHERE id=$2", [t, r.id]);
      }
      await sleep(2500);
    }
    // tipos que falten, de 20 en 20
    for (let k = 0; k < 20; k++) {
      const rows = (await q("SELECT id, data FROM suggestions WHERE data IS NOT NULL AND category IS NULL LIMIT 10")).rows;
      if (!rows.length || !PROVIDER) break;
      try {
        const cats = await categorize(rows.map(r => ({ id: r.id, title: r.data.title, ingredients: r.data.ingredients })));
        for (const r of rows) if (cats[r.id]) await q('UPDATE suggestions SET category=$1 WHERE id=$2', [cats[r.id], r.id]);
        if (!Object.keys(cats).length) break;
      } catch (e) { console.error('tipos', e.message); break; }
      await sleep(3000);
    }
    suggNutrition().catch(() => {});
    // fotos generadas que falten
    const rows = (await q(`SELECT id, title, data FROM suggestions WHERE data IS NOT NULL AND (img IS NULL OR coalesce(img_v,0) < ${IMG_V}) AND coalesce(img_tries,0)<3 ORDER BY (img IS NULL) DESC, position LIMIT 200`)).rows;
    for (const s of rows) {
      try { const { buf, type } = await aiImage(s.title, '', await dishPrompt({ ...s.data, title: s.title })); await q('UPDATE suggestions SET img=$1, img_type=$2, img_v=$3 WHERE id=$4', [buf, type, IMG_V, s.id]); }
      catch (e) { console.error('foto', s.title, e.message); if (e.quota) break; await q('UPDATE suggestions SET img_tries=coalesce(img_tries,0)+1 WHERE id=$1', [s.id]); }
      await sleep(CF_ACCOUNT ? 2000 : 15000);
    }
  } finally { artBusy = false; }
}
app.get('/img/s/:id', async (req, res) => {
  try {
    const r = (await q('SELECT img, img_type FROM suggestions WHERE id=$1 AND img IS NOT NULL', [req.params.id])).rows[0];
    if (!r) return res.status(404).end();
    res.setHeader('Content-Type', r.img_type || 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=1800');
    res.end(r.img);
  } catch { res.status(500).end(); }
});
const suggImg = s => s.has_img ? `/img/s/${s.id}` : null;
api.get('/suggestions', async (req, res, next) => {
  try {
    const term = String(req.query.q || '').trim().toLowerCase().slice(0, 60);
    const cat = String(req.query.cat || '').slice(0, 40);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 200));
    const rows = (await q(`SELECT id,title,category,data->>'time' t,(img IS NOT NULL) has_img FROM suggestions
      WHERE data IS NOT NULL AND hidden IS NOT TRUE AND ($1='' OR lower(title) LIKE '%'||$1||'%' OR lower(data::text) LIKE '%'||$1||'%') AND ($2='' OR category=$2)
      ORDER BY position, created LIMIT $3`, [term, cat, limit])).rows;
    const cats = (await q("SELECT category, count(*)::int n FROM suggestions WHERE data IS NOT NULL AND hidden IS NOT TRUE AND category IS NOT NULL GROUP BY 1 ORDER BY 2 DESC")).rows;
    res.json({ items: rows.map(x => ({ id: x.id, title: x.title, image: suggImg(x), time: x.t || '', category: x.category })), cats });
  } catch (e) { next(e); }
});
api.get('/suggestions/:id', async (req, res, next) => {
  try {
    const r = (await q('SELECT id,data,(img IS NOT NULL) has_img FROM suggestions WHERE id=$1 AND data IS NOT NULL AND hidden IS NOT TRUE', [req.params.id])).rows[0];
    if (!r) return res.status(404).json({ error: 'Esta receta ya no está disponible.' });
    res.json({ ...r.data, image: suggImg(r) || '', id: 'sg' + r.id.slice(0, 30), suggId: r.id, source: '' });
  } catch (e) { next(e); }
});



/* ---------- Alérgenos: la IA mira si la receta tiene algo que el usuario no puede tomar ---------- */
api.post('/ai/allergens', needProfile, async (req, res) => {
  if (!PROVIDER) return noAi(res);
  const allergens = [...(req.user.allergens || [])];
  const dia = req.user.prefs && req.user.prefs.diabetes;
  if (dia) allergens.push('Diabetes (azúcares y harinas refinadas)');
  if (!allergens.length) return res.json({ issues: [] });
  const r = req.body.recipe || {};
  const ings = (Array.isArray(r.ingredients) ? r.ingredients : []).map(String).slice(0, 80);
  if (!ings.length) return res.json({ issues: [] });
  try {
    countAi();
    const out = parseJson(await llm({ maxTokens: 2000, messages: [{ role: 'user', text: `Eres un cocinero experto en alergias e intolerancias alimentarias. La persona tiene estas alergias o intolerancias: ${allergens.join(', ')}.
Revisa los ingredientes de la receta "${String(r.title || '').slice(0, 160)}" y detecta los que contienen alguna de ellas (también si la contienen de forma oculta, por ejemplo la harina de trigo tiene gluten o la mantequilla tiene lactosa). Si aparece la diabetes, señala el azúcar, la miel, los siropes, las harinas refinadas y otros ingredientes con mucho azúcar, y propón sustitutos aptos para diabéticos.
Devuelve SOLO un objeto JSON con esta forma:
{"issues":[{"index": número del ingrediente empezando en 0, "ingredient": texto del ingrediente, "allergen": cuál de las alergias de la persona, "substitutes": [hasta 3 ingredientes alternativos escritos como línea de ingrediente con su cantidad, que no tengan ninguna de sus alergias], "canRemove": true si la receta sigue funcionando sin él, "note": frase breve}]}
Si no hay ninguno, devuelve {"issues": []}. No inventes problemas.
Ingredientes:
${ings.map((x, i) => i + '. ' + x).join('\n')}` }] }));
    const issues = (out && Array.isArray(out.issues) ? out.issues : []).filter(x => Number.isInteger(x.index) && x.index >= 0 && x.index < ings.length).slice(0, 20)
      .map(x => ({ index: x.index, ingredient: ings[x.index], allergen: String(x.allergen || '').slice(0, 60), substitutes: (x.substitutes || []).map(String).slice(0, 3), canRemove: !!x.canRemove, note: String(x.note || '').slice(0, 200) }));
    res.json({ issues });
  } catch (e) { console.error(e); res.status(502).json({ error: 'No he podido revisar los alérgenos ahora.' }); }
});

/* ---------- Menú semanal: uno distinto cada semana, con desayuno, comida y cena ---------- */
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
async function makeMenu(u, week) {
  const mine = (await q("SELECT id, data->>'title' t FROM recipes WHERE user_id=$1 ORDER BY random() LIMIT 60", [u.id])).rows;
  const sugg = (await q("SELECT id, title t, category FROM suggestions WHERE data IS NOT NULL AND hidden IS NOT TRUE ORDER BY random() LIMIT 120")).rows;
  const prev = (await q('SELECT data FROM menus WHERE user_id=$1 AND week<>$2 ORDER BY week DESC LIMIT 1', [u.id, week])).rows[0];
  const before = prev ? prev.data.days.flatMap(d => ['comida', 'cena'].map(k => d[k] && d[k].name)).filter(Boolean) : [];
  const h = healthCtx(u);
  countAi();
  const out = parseJson(await llm({ maxTokens: 3000, messages: [{ role: 'user', text: `Prepara un menú semanal casero, variado y equilibrado (dieta mediterránea, cocina de España) de lunes a domingo, con comida y cena cada día.
${h ? 'MUY IMPORTANTE: ' + h + '\n' : ''}Usa sobre todo platos de estas listas cuando encajen, indicando su referencia; si no hay uno adecuado, propón un plato sencillo tú (sin referencia). No repitas platos en la semana${before.length ? ' y evita los de la semana pasada: ' + before.slice(0, 14).join(', ') : ''}. Comidas completas y cenas más suaves.
Recetas de la persona (ref r:id): ${mine.map(r => `r:${r.id}=${r.t}`).join('; ') || 'ninguna'}
Recetas recomendadas (ref s:id): ${sugg.map(r => `s:${r.id}=${r.t}`).join('; ')}
Devuelve SOLO un objeto JSON: {"days":[{"comida":{"name":string,"ref":string o null},"cena":{"name":string,"ref":string o null}}, ... 7 días]}` }] }));
  const ok = new Set([...mine.map(r => 'r:' + r.id), ...sugg.map(r => 's:' + r.id)]);
  const names = Object.fromEntries([...mine.map(r => ['r:' + r.id, r.t]), ...sugg.map(r => ['s:' + r.id, r.t])]);
  const days = (out && Array.isArray(out.days) ? out.days : []).slice(0, 7).map((d, i) => {
    const o = { day: DAYS[i] };
    for (const k of ['comida', 'cena']) { const m = d && d[k] || {}; const ref = ok.has(m.ref) ? m.ref : null; o[k] = { name: String((ref && names[ref]) || m.name || '').slice(0, 120), ref }; }
    return o;
  });
  if (days.length < 7) throw new Error('menú incompleto');
  const data = { week, days, created: now() };
  await q('INSERT INTO menus(user_id,week,data,created) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,week) DO UPDATE SET data=$3, created=$4', [u.id, week, data, now()]);
  return data;
}
api.get('/menu', needProfile, async (req, res, next) => {
  try {
    const week = isoWeek();
    const r = (await q('SELECT data FROM menus WHERE user_id=$1 AND week=$2', [req.user.id, week])).rows[0];
    if (r) return res.json(r.data);
    if (!PROVIDER) return noAi(res);
    res.json(await makeMenu(req.user, week));
  } catch (e) { console.error(e); res.status(502).json({ error: e.status === 429 ? 'La IA está ocupada ahora mismo. Prueba en un rato.' : 'No he podido preparar el menú ahora. Vuelve a intentarlo.' }); }
});
api.post('/menu/new', needProfile, async (req, res) => {
  if (!PROVIDER) return noAi(res);
  try { res.json(await makeMenu(req.user, isoWeek())); }
  catch (e) { console.error(e); res.status(502).json({ error: 'No he podido preparar otro menú ahora. Vuelve a intentarlo.' }); }
});

/* ---------- PDF de una receta o de un recetario ---------- */
async function pdfImage(src) {
  try {
    if (!src) return null;
    let m = String(src).match(/^data:image\/(jpeg|png);base64,(.+)$/); if (m) return Buffer.from(m[2], 'base64');
    m = String(src).match(/^\/img\/r\/([A-Za-z0-9]+)/); if (m) { const r = (await q('SELECT img FROM recipe_imgs WHERE recipe_id=$1', [m[1]])).rows[0]; return r ? r.img : null; }
    m = String(src).match(/^\/img\/s\/([A-Za-z0-9]+)/); if (m) { const r = (await q('SELECT img FROM suggestions WHERE id=$1', [m[1]])).rows[0]; return r ? r.img : null; }
    if (/^https?:\/\//.test(src)) { const r = await safeFetch(src, { headers: { Accept: 'image/jpeg,image/png' } }); if (!r.ok || !/jpe?g|png/.test(r.headers.get('content-type') || '')) return null; const b = Buffer.from(await r.arrayBuffer()); return b.length < 6e6 ? b : null; }
  } catch { }
  return null;
}
const plain = t => String(t || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
/* PDF con estética de pergamino antiguo */
const PARCH = { bg: '#F1E2BC', bg2: '#E3CB94', ink: '#3E2A17', red: '#8B2E1A', muted: '#7A5A36', line: '#B8955A' };
function parchmentPage(doc) {
  const W = doc.page.width, H = doc.page.height;
  doc.save();
  const g = doc.radialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.stop(0, PARCH.bg).stop(1, PARCH.bg2);
  doc.rect(0, 0, W, H).fill(g);
  // manchas suaves de papel viejo
  const spots = [[0.15, 0.12, 60], [0.85, 0.2, 45], [0.2, 0.85, 70], [0.8, 0.9, 55], [0.55, 0.5, 90]];
  for (const [x, y, r] of spots) { doc.circle(W * x, H * y, r).fillOpacity(0.05).fill('#8A6A3A'); }
  doc.fillOpacity(1);
  // marco doble con esquinas
  doc.lineWidth(1.6).strokeColor(PARCH.line).rect(24, 24, W - 48, H - 48).stroke();
  doc.lineWidth(0.6).rect(30, 30, W - 60, H - 60).stroke();
  for (const [x, y] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]]) { doc.save().translate(x, y).rotate(45).rect(-4, -4, 8, 8).fill(PARCH.line).restore(); }
  doc.restore();
  doc.fillColor(PARCH.ink);
}
function ornament(doc, y) {
  const W = doc.page.width, cx = W / 2; y = y ?? doc.y;
  doc.save().lineWidth(0.8).strokeColor(PARCH.line).moveTo(cx - 110, y).lineTo(cx - 12, y).stroke().moveTo(cx + 12, y).lineTo(cx + 110, y).stroke();
  doc.translate(cx, y).rotate(45).rect(-4, -4, 8, 8).fill(PARCH.red).restore();
  doc.y = y + 12; doc.x = doc.page.margins.left;
}
function NUTRI_PDF(doc, n) {
  const x0 = doc.page.margins.left, w = doc.page.width - x0 - doc.page.margins.right;
  if (doc.y > doc.page.height - 260) doc.addPage();
  doc.moveDown(0.8).font('Times-Bold').fontSize(14).fillColor(PARCH.red).text('Información nutricional', x0, doc.y, { width: w });
  const per = n.grams ? 100 / n.grams : null;
  const num = v => (Math.round(v * 10) / 10).toLocaleString('es-ES');
  const rows = [['Valor energético', 'kcal', 2000], ['Grasas', 'fat', 70], ['   de las cuales saturadas', 'satfat', 20], ['Hidratos de carbono', 'carbs', 260], ['   de los cuales azúcares', 'sugars', 90], ['Fibra alimentaria', 'fiber', null], ['Proteínas', 'protein', 50], ['Sal', 'salt', 6]];
  const val = (k, f) => k === 'kcal' ? `${Math.round(n.kcal * f * 4.184)} kJ / ${Math.round(n.kcal * f)} kcal` : (n[k] == null ? '–' : num(n[k] * f) + ' g');
  let y = doc.y + 6; const c1 = x0 + w - 330, c2 = x0 + w - 190, c3 = x0 + w - 60;
  doc.font('Times-Italic').fontSize(10).fillColor(PARCH.muted);
  if (per) doc.text('Por 100 g', c1, y, { width: 130, align: 'right' });
  doc.text(`Por ración${n.grams ? ` (${Math.round(n.grams)} g)` : ''}`, c2, y, { width: 130, align: 'right' }).text('% IR*', c3, y, { width: 60, align: 'right' });
  y += 16;
  for (const [label, k, ref] of rows) {
    doc.font(label.startsWith(' ') ? 'Times-Italic' : 'Times-Roman').fontSize(11).fillColor(PARCH.ink).text(label, x0 + 6, y, { width: 170 });
    if (per) doc.text(val(k, per), c1, y, { width: 130, align: 'right' });
    doc.text(val(k, 1), c2, y, { width: 130, align: 'right' });
    doc.text(ref && n[k] != null ? Math.round(n[k] / ref * 100) + ' %' : '', c3, y, { width: 60, align: 'right' });
    y += 16; doc.save().lineWidth(0.4).strokeColor(PARCH.line).moveTo(x0, y - 3).lineTo(x0 + w, y - 3).stroke().restore();
  }
  doc.font('Times-Italic').fontSize(8.5).fillColor(PARCH.muted).text('*Ingesta de referencia de un adulto medio (8.400 kJ / 2.000 kcal). Valores aproximados calculados a partir de los ingredientes.', x0, y + 2, { width: w });
  doc.x = x0;
}
async function buildPdf(title, recipes, res) {
  let PDFDocument;
  try { PDFDocument = require('pdfkit'); } catch { return res.status(503).json({ error: 'La descarga en PDF se está instalando. Prueba en unos minutos.' }); }
  const doc = new PDFDocument({ size: 'A4', margins: { top: 62, bottom: 62, left: 62, right: 62 }, info: { Title: title, Author: 'Entre Fogones' }, bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(title).replace(/%20/g, ' ')}.pdf"; filename*=UTF-8''${encodeURIComponent(title)}.pdf`);
  doc.pipe(res);
  parchmentPage(doc); doc.on('pageAdded', () => parchmentPage(doc));
  const W = doc.page.width, L = 62, CW = W - 124;
  if (recipes.length > 1) {
    doc.y = 230; ornament(doc);
    doc.moveDown(0.6).font('Times-Bold').fontSize(38).fillColor(PARCH.ink).text(title, L, doc.y, { width: CW, align: 'center' });
    doc.moveDown(0.4); ornament(doc);
    doc.moveDown(0.6).font('Times-Italic').fontSize(14).fillColor(PARCH.muted).text(`${recipes.length} recetas · Entre Fogones`, L, doc.y, { width: CW, align: 'center' });
    doc.addPage().font('Times-Bold').fontSize(26).fillColor(PARCH.red).text('Índice', L, doc.y, { width: CW, align: 'center' }); ornament(doc, doc.y + 6); doc.moveDown(0.6);
    recipes.forEach((r, i) => doc.font('Times-Roman').fontSize(13).fillColor(PARCH.ink).text(`${i + 1}.  ${plain(r.title)}`, L + 20, doc.y, { width: CW - 40 }).moveDown(0.25));
  }
  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i];
    if (recipes.length > 1 || i > 0) doc.addPage();
    doc.font('Times-Bold').fontSize(30).fillColor(PARCH.ink).text(plain(r.title || 'Sin título'), L, doc.y, { width: CW, align: 'center' });
    const meta = [r.servings && `${r.servings} ${r.servings === '1' ? 'ración' : 'raciones'}`, r.time, r.difficulty].filter(Boolean).join('   ·   ');
    if (meta) doc.moveDown(0.2).font('Times-Italic').fontSize(12).fillColor(PARCH.muted).text(meta, L, doc.y, { width: CW, align: 'center' });
    doc.moveDown(0.4); ornament(doc); doc.moveDown(0.3);
    const img = await pdfImage(r.image);
    if (img) { try { const y = doc.y, h = 210, w = 300, x = (W - w) / 2;
      doc.save().lineWidth(3).strokeColor('#FFF8E6').rect(x - 4, y - 4, w + 8, h + 8).stroke().restore();
      doc.save().rect(x, y, w, h).clip().image(img, x, y, { cover: [w, h], align: 'center', valign: 'center' }).restore();
      doc.save().lineWidth(0.8).strokeColor(PARCH.line).rect(x - 6, y - 6, w + 12, h + 12).stroke().restore();
      doc.y = y + h + 18; doc.x = L; } catch { } }
    doc.font('Times-Bold').fontSize(16).fillColor(PARCH.red).text('Ingredientes', L, doc.y, { width: CW }).moveDown(0.3);
    (r.ingredients || []).forEach(x => doc.font('Times-Roman').fontSize(12).fillColor(PARCH.ink).text('❧  '.replace('❧', '•') + plain(x), L + 8, doc.y, { width: CW - 8 }).moveDown(0.15));
    doc.moveDown(0.6).font('Times-Bold').fontSize(16).fillColor(PARCH.red).text('Preparación', L, doc.y, { width: CW }).moveDown(0.3);
    (r.steps || []).forEach((x, k) => doc.font('Times-Roman').fontSize(12).fillColor(PARCH.ink).text(`${k + 1}.  ${plain(x)}`, L + 8, doc.y, { width: CW - 8, lineGap: 2, align: 'justify' }).moveDown(0.35));
    if (r.notes) { doc.moveDown(0.4); ornament(doc); doc.font('Times-Italic').fontSize(13).fillColor(PARCH.muted).text(plain(r.notes), L + 20, doc.y, { width: CW - 40, align: 'center' }); }
    if (r.credit) doc.moveDown(0.3).font('Times-Italic').fontSize(10).fillColor(PARCH.muted).text('Receta de ' + r.credit, L, doc.y, { width: CW, align: 'right' });
    if (r.nutrition && r.nutrition.kcal) NUTRI_PDF(doc, r.nutrition);
  }
  // números de página y pie
  const range = doc.bufferedPageRange();
  for (let p = range.start; p < range.start + range.count; p++) {
    doc.switchToPage(p);
    const bm = doc.page.margins.bottom; doc.page.margins.bottom = 0;
    doc.font('Times-Italic').fontSize(9).fillColor(PARCH.muted).text(`Entre Fogones  ·  ${p - range.start + 1}`, 0, doc.page.height - 44, { width: W, align: 'center', lineBreak: false });
    doc.page.margins.bottom = bm;
  }
  doc.end();
}
api.get('/pdf/recipe/:id', async (req, res, next) => {
  try {
    const r = (await q('SELECT * FROM recipes WHERE id=$1', [req.params.id])).rows[0];
    if (!r) return res.status(404).json({ error: 'Esta receta ya no existe.' });
    const d = recipeOut(r); await buildPdf(plain(d.title) || 'Receta', [d], res);
  } catch (e) { next(e); }
});
api.get('/pdf/folder/:id', async (req, res, next) => {
  try {
    const id = req.params.id;
    let name, rows;
    if (id === 'all' || id === 'none') {
      rows = (await q(`SELECT * FROM recipes WHERE user_id=$1 ${id === 'none' ? 'AND (folder_id IS NULL OR folder_id NOT IN (SELECT id FROM folders WHERE user_id=$1))' : ''}`, [req.user.id])).rows; name = id === 'all' ? 'Todas mis recetas' : 'Sin recetario';
    } else {
      const f = (await q('SELECT * FROM folders WHERE id=$1', [id])).rows[0];
      if (!f) return res.status(404).json({ error: 'Este recetario ya no existe.' });
      name = f.name; rows = (await q('SELECT * FROM recipes WHERE folder_id=$1 AND user_id=$2', [f.id, f.user_id])).rows;
    }
    const list = rows.map(recipeOut).sort((a, b) => String(a.title).localeCompare(String(b.title), 'es'));
    if (!list.length) return res.status(400).json({ error: 'Este recetario no tiene recetas.' });
    await buildPdf(name, list, res);
  } catch (e) { next(e); }
});
api.get('/pdf/sugg/:id', async (req, res, next) => {
  try {
    const r = (await q('SELECT id,data FROM suggestions WHERE id=$1 AND data IS NOT NULL', [req.params.id])).rows[0];
    if (!r) return res.status(404).json({ error: 'Esta receta ya no existe.' });
    await buildPdf(plain(r.data.title) || 'Receta', [{ ...r.data, image: `/img/s/${r.id}` }], res);
  } catch (e) { next(e); }
});

/* ---------- Panel de administración ---------- */
const SUPERADMIN_EMAIL = (process.env.SUPERADMIN_EMAIL || 'ainara14cs@hotmail.com').toLowerCase();
async function syncRole(userId, email) {
  const isSuper = String(email || '').toLowerCase() === SUPERADMIN_EMAIL;
  if (isSuper) await q("UPDATE users SET role='superadmin' WHERE id=$1", [userId]);
  else await q("UPDATE users SET role='user' WHERE id=$1 AND role='superadmin'", [userId]);
}
const isAdmin = u => u && (u.role === 'admin' || u.role === 'superadmin') && u.username;
const needAdmin = (req, res, next) => isAdmin(req.user) ? next() : res.status(403).json({ error: 'No tienes acceso al panel de administración.' });
const needSuper = (req, res, next) => req.user.role === 'superadmin' ? next() : res.status(403).json({ error: 'Solo el Superadministrador puede hacer esto.' });
const adm = express.Router();
adm.use(needAdmin);
adm.get('/stats', async (req, res, next) => {
  try {
    const day = 86400e3, t = now();
    const one = async (sql, p = []) => (await q(sql, p)).rows[0];
    const [u, r, f, m, c, ai, contact] = await Promise.all([
      one(`SELECT count(*) FILTER (WHERE username IS NOT NULL)::int cuentas, count(*) FILTER (WHERE username IS NULL)::int anonimos,
           count(*) FILTER (WHERE role IN ('admin','superadmin'))::int admins, count(*) FILTER (WHERE blocked)::int bloqueados,
           count(*) FILTER (WHERE username IS NOT NULL AND accepted_at>$1)::int nuevas7, count(*) FILTER (WHERE last_seen>$2)::int activos7 FROM users`, [t - 7 * day, t - 7 * day]),
      one('SELECT count(*)::int total, count(*) FILTER (WHERE created>$1)::int nuevas7 FROM recipes', [t - 7 * day]),
      one('SELECT count(*)::int total FROM folders'),
      one('SELECT count(*)::int total, count(*) FILTER (WHERE ts>$1)::int nuevos7 FROM messages', [t - 7 * day]),
      one("SELECT count(*) FILTER (WHERE status='accepted')::int amistades FROM requests"),
      one('SELECT coalesce(sum(n) FILTER (WHERE day=$1),0)::int hoy, coalesce(sum(n) FILTER (WHERE day>=$2),0)::int semana FROM ai_usage', [new Date(t).toISOString().slice(0, 10), new Date(t - 6 * day).toISOString().slice(0, 10)]),
      one("SELECT count(*) FILTER (WHERE coalesce(status,'nuevo')='nuevo')::int nuevos FROM contact_messages"),
    ]);
    const since = t - 30 * day;
    const series = async (sql) => { const rows = (await q(sql, [since])).rows; const m = Object.fromEntries(rows.map(x => [x.d, x.n])); return Array.from({ length: 30 }, (_, i) => { const d = new Date(since + (i + 1) * day).toISOString().slice(0, 10); return { d, n: m[d] || 0 }; }); };
    const altas = await series("SELECT to_char(to_timestamp(accepted_at/1000) AT TIME ZONE 'UTC','YYYY-MM-DD') d, count(*)::int n FROM users WHERE accepted_at>$1 GROUP BY 1");
    const recetas = await series("SELECT to_char(to_timestamp(created/1000) AT TIME ZONE 'UTC','YYYY-MM-DD') d, count(*)::int n FROM recipes WHERE created>$1 GROUP BY 1");
    res.json({ usuarios: u, recetas: r, recetarios: f, mensajes: m, amistades: c.amistades, ia: ai, contacto: contact, altas, recetasDia: recetas });
  } catch (e) { next(e); }
});
adm.get('/users', async (req, res, next) => {
  try {
    const term = String(req.query.q || '').trim().toLowerCase().replace(/^@/, '').slice(0, 60);
    const rows = (await q(`SELECT u.id,u.username,u.display,u.email,u.color,u.avatar,u.role,u.blocked,u.blocked_reason,u.delete_suggested,u.accepted_at,u.last_seen,
      (SELECT count(*)::int FROM recipes r WHERE r.user_id=u.id) recetas
      FROM users u WHERE u.username IS NOT NULL AND ($1='' OR u.username LIKE '%'||$1||'%' OR lower(u.display) LIKE '%'||$1||'%' OR lower(u.email) LIKE '%'||$1||'%')
      ORDER BY (u.role='superadmin') DESC, (u.role='admin') DESC, u.accepted_at DESC NULLS LAST LIMIT 200`, [term])).rows;
    res.json(rows.map(x => ({ ...x, accepted_at: Number(x.accepted_at) || null, last_seen: Number(x.last_seen) || null })));
  } catch (e) { next(e); }
});
// Crear una cuenta desde el panel (el correo es opcional)
adm.post('/users', async (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase().replace(/^@/, '');
    const display = String(req.body.display || '').trim().slice(0, 40) || username;
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
    const password = String(req.body.password || '');
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'El usuario debe tener de 3 a 20 letras minúsculas, números o _.' });
    if (email && !emailOk(email)) return res.status(400).json({ error: 'Ese correo no es válido. Puedes dejarlo vacío.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    if ((await q('SELECT 1 FROM users WHERE username=$1', [username])).rows[0]) return res.status(409).json({ error: `@${username} ya existe.` });
    if (email && (await q('SELECT 1 FROM users WHERE lower(email)=$1', [email])).rows[0]) return res.status(409).json({ error: 'Ya hay una cuenta con ese correo.' });
    const id = gid();
    await q('INSERT INTO users(id,created,username,display,color,pass_hash,email,accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$2)', [id, now(), username, display, '#B5562B', hashPass(password), email || null]);
    await q('INSERT INTO folders(id,user_id,name,color,created) VALUES($1,$2,$3,$4,$5)', [gid(), id, 'Mis recetas', '#2F5D46', now()]);
    res.json({ ok: true, id });
  } catch (e) { next(e); }
});
adm.put('/users/:id/role', needSuper, async (req, res, next) => {
  try {
    const role = req.body.role === 'admin' ? 'admin' : 'user';
    const t = (await q('SELECT role FROM users WHERE id=$1 AND username IS NOT NULL', [req.params.id])).rows[0];
    if (!t) return res.status(404).json({ error: 'Esa cuenta no existe.' });
    if (t.role === 'superadmin') return res.status(400).json({ error: 'El Superadministrador no se puede cambiar.' });
    await q('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
async function canModerate(actor, targetId) {
  const t = (await q('SELECT role FROM users WHERE id=$1', [targetId])).rows[0];
  if (!t) return 'Esa cuenta no existe.';
  if (targetId === actor.id) return 'No puedes hacerlo con tu propia cuenta.';
  if (t.role === 'superadmin') return 'El Superadministrador no se puede suspender ni borrar.';
  if (t.role === 'admin' && actor.role !== 'superadmin') return 'Solo el Superadministrador puede hacerlo con otros administradores.';
  return null;
}
adm.put('/users/:id/block', async (req, res, next) => {
  try {
    const err = await canModerate(req.user, req.params.id); if (err) return res.status(400).json({ error: err });
    const blocked = !!req.body.blocked;
    const reason = String(req.body.reason || '').trim().slice(0, 1000);
    if (blocked && !reason) return res.status(400).json({ error: 'Escribe el motivo de la suspensión. La persona lo verá.' });
    await q('UPDATE users SET blocked=$1, blocked_reason=$2, blocked_at=$3 WHERE id=$4', [blocked, blocked ? reason : null, blocked ? now() : null, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
// Los administradores sugieren borrar una cuenta; solo el Superadministrador la borra
adm.put('/users/:id/suggest-delete', async (req, res, next) => {
  try {
    const err = await canModerate(req.user, req.params.id); if (err) return res.status(400).json({ error: err });
    const on = req.body.on !== false;
    await q('UPDATE users SET delete_suggested=$1 WHERE id=$2', [on ? { by: req.user.username, reason: String(req.body.reason || '').slice(0, 500), at: now() } : null, req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
adm.delete('/users/:id', needSuper, async (req, res, next) => {
  try {
    const err = await canModerate(req.user, req.params.id); if (err) return res.status(400).json({ error: err });
    await recipesToSuggestions((await q('SELECT id, data FROM recipes WHERE user_id=$1', [req.params.id])).rows);
    await q('DELETE FROM attachments WHERE owner=$1', [req.params.id]);
    await q('DELETE FROM messages WHERE from_id=$1', [req.params.id]);
    await q('DELETE FROM chats WHERE a=$1 OR b=$1', [req.params.id]);
    await q('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
/* Subida masiva de archivos de cualquier tipo: se saca el texto y la IA encuentra TODAS las recetas que haya */
async function fileText(buf, name, type) {
  const ext = (String(name).toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || '';
  if (ext === 'pdf' || /pdf/.test(type)) {
    try { const pdf = require('pdf-parse/lib/pdf-parse.js'); return (await pdf(buf)).text || ''; }
    catch (e) { console.error('pdf', e.message); return ''; }
  }
  if (ext === 'docx' || /officedocument\.wordprocessingml/.test(type)) {
    try { const mammoth = require('mammoth'); return (await mammoth.extractRawText({ buffer: buf })).value || ''; }
    catch (e) { console.error('docx', e.message); return ''; }
  }
  if (['odt', 'pages', 'epub'].includes(ext)) return '';
  let t = buf.toString('utf8');
  if (ext === 'doc' || /msword/.test(type)) t = buf.toString('latin1').replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]+/g, ' ').replace(/\s{3,}/g, '\n');
  else if (ext === 'rtf' || /rtf/.test(type)) t = t.replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\par[d]?/g, '\n').replace(/\{\\\*[^}]*\}|\\[a-z]+-?\d* ?|[{}]/gi, '');
  else if (['html', 'htm', 'xml'].includes(ext) || /html|xml/.test(type)) t = htmlToText(t);
  return t;
}
function jsonRecipes(t) {
  let j; try { j = JSON.parse(t); } catch { return null; }
  const out = [];
  const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk);
    const ing = o.ingredients || o.ingredientes || o.recipeIngredient, st = o.steps || o.pasos || o.preparacion || o.preparación || o.instructions || o.recipeInstructions;
    if ((o.title || o.titulo || o.título || o.name || o.nombre) && (ing || st)) {
      const arr = v => Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : (x && (x.text || x.name)) || '').filter(Boolean) : String(v || '').split(/\n+/).filter(Boolean);
      out.push(cleanAi({ title: o.title || o.titulo || o.título || o.name || o.nombre, servings: o.servings || o.raciones || o.recipeYield || '', time: o.time || o.tiempo || '', difficulty: o.difficulty || o.dificultad || '', ingredients: arr(ing), steps: arr(st), notes: o.notes || o.notas || '' }));
    } else Object.values(o).forEach(walk); };
  walk(j);
  return out.filter(Boolean);
}
async function extractMany(text) {
  const clean = String(text || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length < 30) return [];
  const chunks = []; let cur = '';
  for (const para of clean.split(/\n(?=\s*\S)/)) { if ((cur + '\n' + para).length > 14000 && cur) { chunks.push(cur); cur = para; } else cur += (cur ? '\n' : '') + para; }
  if (cur) chunks.push(cur);
  const all = [];
  for (const ch of chunks.slice(0, 25)) {
    countAi();
    const out = parseJson(await llm({ maxTokens: 7000, messages: [{ role: 'user', text: `En el texto que va entre las marcas puede haber una o varias recetas. Extrae TODAS, completas, sin inventar nada, en español (traduce si hace falta). Un ingrediente por elemento con su cantidad, un paso por elemento sin numerar. Si una receta queda cortada al principio o al final del texto, inclúyela con lo que haya.
Devuelve SOLO un objeto JSON: {"recipes": [${SCHEMA}, ...]}. Si no hay ninguna receta, {"recipes": []}.
<<<TEXTO
${ch}
TEXTO>>>` }] }));
    for (const r of (out && Array.isArray(out.recipes) ? out.recipes : [])) { const c = cleanAi(r); if (c && (c.ingredients.length || c.steps.length)) all.push(c); }
  }
  // quita repetidas (recetas cortadas entre dos trozos)
  const seen = new Map();
  for (const r of all) { const k = r.title.toLowerCase().trim(); const p = seen.get(k); if (!p || (r.ingredients.length + r.steps.length) > (p.ingredients.length + p.steps.length)) seen.set(k, r); }
  return [...seen.values()];
}
adm.post('/bulk/file', express.raw({ type: () => true, limit: '40mb' }), async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'El archivo está vacío.' });
    const name = String(req.query.name || 'archivo'), type = String(req.query.type || req.headers['content-type'] || '');
    const text = await fileText(req.body, name, type);
    if (/\.json$/i.test(name) || /json/.test(type)) { const js = jsonRecipes(text); if (js && js.length) return res.json({ recipes: js }); }
    if (!text || text.trim().length < 30) return res.status(422).json({ error: /\.pdf$/i.test(name) ? 'Este PDF no tiene texto (parece escaneado). Súbelo como fotos.' : 'No he podido leer texto en este archivo.' });
    if (!PROVIDER) return noAi(res);
    const recipes = await extractMany(text);
    if (!recipes.length) return res.status(422).json({ error: 'No he encontrado recetas en este archivo.' });
    res.json({ recipes });
  } catch (e) { console.error(e); res.status(502).json({ error: e.status === 429 ? 'La IA está ocupada. Prueba en un rato.' : 'No he podido procesar el archivo.' }); }
});
// Subida masiva: cada receta ya leída (de enlace, vídeo, foto o texto) se guarda donde diga el administrador
adm.post('/bulk/save', async (req, res, next) => {
  try {
    const d = cleanRecipe(req.body.recipe || {}), dest = req.body.dest || {};
    if (!d.ingredients.length && !d.steps.length) return res.status(400).json({ error: 'La receta está vacía.' });
    d.credit = String(req.body.credit || d.credit || '').slice(0, 120);
    if (dest.type === 'user') {
      const names = [...new Set(String(dest.username || '').split(/[,;\s]+/).map(x => x.trim().toLowerCase().replace(/^@/, '')).filter(Boolean))].slice(0, 50);
      if (!names.length) return res.status(400).json({ error: 'Escribe al menos un usuario.' });
      const users = (await q('SELECT id, username FROM users WHERE username = ANY($1)', [names])).rows;
      const missing = names.filter(n => !users.some(u => u.username === n));
      if (missing.length) return res.status(404).json({ error: `No existe: ${missing.map(n => '@' + n).join(', ')}.` });
      const fname = String(dest.folder || '').trim().slice(0, 40);
      for (const u of users) {
        let fid = null;
        if (fname) {
          const f = (await q('SELECT id FROM folders WHERE user_id=$1 AND lower(name)=lower($2)', [u.id, fname])).rows[0];
          fid = f ? f.id : gid(); if (!f) await q('INSERT INTO folders(id,user_id,name,color,created) VALUES($1,$2,$3,$4,$5)', [fid, u.id, fname, '#7A2E2E', now()]);
        }
        const id = gid();
        await q('INSERT INTO recipes(id,user_id,folder_id,data,created,updated) VALUES($1,$2,$3,$4,$5,$5)', [id, u.id, fid, { ...d, public: !!dest.public }, now()]);
        queueRecipeWork(id);
      }
      return res.json({ ok: true, n: users.length });
    }
    // por defecto, a Recetas recomendadas (visibles para todo el mundo)
    const id = gid(), pos = (await q('SELECT coalesce(max(position),0)+1 p FROM suggestions')).rows[0].p;
    await q('INSERT INTO suggestions(id,url,title,position,created,data,rewritten,title_ok,credit) VALUES($1,$2,$3,$4,$5,$6,true,true,$7)', [id, d.source || 'manual:' + id, cleanTitle(d.title), pos, now(), { ...d, title: cleanTitle(d.title), image: '' }, d.credit || null]);
    processSuggestionArt().catch(() => {});
    res.json({ ok: true, id });
  } catch (e) { next(e); }
});
adm.get('/recipes', async (req, res, next) => {
  try {
    const term = String(req.query.q || '').trim().toLowerCase().slice(0, 80);
    const rows = (await q(`SELECT r.id, r.data->>'title' title, r.data->>'image' image, r.created, r.updated, u.username, u.display, u.id uid
      FROM recipes r JOIN users u ON u.id=r.user_id WHERE ($1='' OR lower(r.data->>'title') LIKE '%'||$1||'%' OR u.username LIKE '%'||$1||'%')
      ORDER BY r.created DESC LIMIT 120`, [term])).rows;
    res.json(rows.map(x => ({ ...x, image: x.image && x.image.startsWith('http') ? x.image : (x.image ? 'data' : ''), created: Number(x.created) })));
  } catch (e) { next(e); }
});
adm.delete('/recipes/:id', async (req, res, next) => {
  try { await q('DELETE FROM recipes WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
adm.get('/contact', async (req, res, next) => {
  try { res.json((await q("SELECT id,email,subject,message,coalesce(status,'nuevo') status,created FROM contact_messages ORDER BY created DESC LIMIT 200")).rows.map(x => ({ ...x, created: Number(x.created) }))); } catch (e) { next(e); }
});
adm.put('/contact/:id', async (req, res, next) => {
  try { await q('UPDATE contact_messages SET status=$1 WHERE id=$2', [req.body.status === 'respondido' ? 'respondido' : 'nuevo', req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
adm.delete('/contact/:id', async (req, res, next) => {
  try { await q('DELETE FROM contact_messages WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
adm.get('/suggestions', async (req, res, next) => {
  try { res.json((await q('SELECT id,title,url,hidden,position,category,(data IS NOT NULL) lista, coalesce(tries,0) tries,(img IS NOT NULL) has_img FROM suggestions ORDER BY (data IS NOT NULL) DESC, position, created')).rows.map(x => ({ ...x, image: suggImg(x) }))); } catch (e) { next(e); }
});
adm.post('/suggestions', async (req, res, next) => {
  try {
    const url = String(req.body.url || '').trim();
    if (!/^https?:\/\//.test(url)) return res.status(400).json({ error: 'Pega el enlace de la receta.' });
    let title = String(req.body.title || '').trim().slice(0, 160), image = null, author = String(req.body.author || '').trim().slice(0, 80);
    try { const r = await safeFetch(url); const html = await r.text(); const ld = parseJsonLd(html); title = title || (ld && ld.title) || metaTag(html, 'og:title'); image = (ld && ld.image) || metaTag(html, 'og:image') || null; } catch { }
    if (!title) return res.status(422).json({ error: 'No he podido leer esa receta. Escribe el título.' });
    const pos = (await q('SELECT coalesce(max(position),0)+1 p FROM suggestions')).rows[0].p;
    await q('INSERT INTO suggestions(id,title,url,author,image,position,created) VALUES($1,$2,$3,$4,$5,$6,$7)', [gid(), title.slice(0, 160), url, author || null, image, pos, now()]);
    setTimeout(() => processSuggestions().catch(() => {}), 500);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
adm.put('/suggestions/:id', async (req, res, next) => {
  try { await q('UPDATE suggestions SET hidden=$1 WHERE id=$2', [!!req.body.hidden, req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
adm.delete('/suggestions/:id', async (req, res, next) => {
  try { await q('DELETE FROM suggestions WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
/* ---------- Avisos dentro de la app (campanita) ---------- */
function cleanNotice(b) {
  const s = (v, n) => String(v ?? '').trim().slice(0, n);
  let image = s(b.image, 400000);
  if (image && !/^data:image\/(jpeg|png|webp|gif);base64,/.test(image) && !/^https?:\/\//.test(image)) image = '';
  const url = /^https?:\/\//.test(b.url || '') ? s(b.url, 800) : '';
  return { title: s(b.title, 120), body: s(b.body, 2000), image: image || null, url: url || null, url_label: s(b.url_label, 40) || null,
    dismissible: b.dismissible !== false, popup: !!b.popup,
    audience: ['all', 'admins', 'users'].includes(b.audience) ? b.audience : 'all',
    recipients: (Array.isArray(b.recipients) ? b.recipients : []).map(x => s(x, 60)).filter(Boolean).slice(0, 500) };
}
api.get('/notices', async (req, res, next) => {
  try {
    const rows = (await q(`SELECT n.id,n.title,n.body,n.image,n.url,n.url_label,n.dismissible,n.popup,n.created, r.read_at, coalesce(r.dismissed,false) dismissed
      FROM notices n LEFT JOIN notice_reads r ON r.notice_id=n.id AND r.user_id=$1
      WHERE n.active AND NOT (coalesce(r.dismissed,false) AND n.dismissible)
        AND (n.audience='all' OR (n.audience='admins' AND $2) OR (n.audience='users' AND n.recipients ? $1))
      ORDER BY n.created DESC LIMIT 50`, [req.user.id, !!isAdmin(req.user)])).rows;
    res.json(rows.map(n => ({ ...n, created: Number(n.created), read: !!n.read_at, read_at: undefined })));
  } catch (e) { next(e); }
});
api.post('/notices/:id/read', async (req, res, next) => {
  try { await q('INSERT INTO notice_reads(notice_id,user_id,read_at) VALUES($1,$2,$3) ON CONFLICT(notice_id,user_id) DO NOTHING', [req.params.id, req.user.id, now()]); res.json({ ok: true }); } catch (e) { next(e); }
});
api.post('/notices/:id/dismiss', async (req, res, next) => {
  try {
    const n = (await q('SELECT dismissible FROM notices WHERE id=$1', [req.params.id])).rows[0];
    if (!n) return res.status(404).json({ error: 'Ese aviso ya no existe.' });
    if (!n.dismissible) return res.status(400).json({ error: 'Este aviso no se puede quitar.' });
    await q(`INSERT INTO notice_reads(notice_id,user_id,read_at,dismissed) VALUES($1,$2,$3,true)
      ON CONFLICT(notice_id,user_id) DO UPDATE SET dismissed=true`, [req.params.id, req.user.id, now()]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
adm.get('/notices', async (req, res, next) => {
  try {
    const rows = (await q(`SELECT n.*, u.username autor,
      (SELECT count(*)::int FROM notice_reads r JOIN users x ON x.id=r.user_id WHERE r.notice_id=n.id AND x.username IS NOT NULL) leidas_cuentas,
      (SELECT count(*)::int FROM notice_reads r JOIN users x ON x.id=r.user_id WHERE r.notice_id=n.id AND x.username IS NULL) leidas_anonimas,
      (SELECT count(*)::int FROM notice_reads r WHERE r.notice_id=n.id AND r.dismissed) quitadas,
      CASE WHEN n.audience='admins' THEN (SELECT count(*)::int FROM users WHERE role IN ('admin','superadmin') AND username IS NOT NULL)
           WHEN n.audience='users' THEN jsonb_array_length(n.recipients) END destinatarios,
      CASE WHEN n.audience='users' THEN (SELECT string_agg('@'||username, ', ') FROM users WHERE n.recipients ? id) END para,
      CASE WHEN n.audience='users' THEN (SELECT json_agg(json_build_object('id',id,'username',username,'display',display)) FROM users WHERE n.recipients ? id) END para_list
      FROM notices n LEFT JOIN users u ON u.id=n.created_by ORDER BY n.created DESC LIMIT 100`)).rows;
    res.json(rows.map(n => ({ ...n, created: Number(n.created) })));
  } catch (e) { next(e); }
});
adm.post('/notices', async (req, res, next) => {
  try {
    const n = cleanNotice(req.body);
    if (!n.title && !n.body && !n.image) return res.status(400).json({ error: 'Pon al menos un título, un texto o una imagen.' });
    if (n.audience === 'users' && !n.recipients.length) return res.status(400).json({ error: 'Elige al menos una persona.' });
    await q(`INSERT INTO notices(id,title,body,image,url,url_label,dismissible,popup,active,created,created_by,audience,recipients) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,$11,$12)`,
      [gid(), n.title || null, n.body || null, n.image, n.url, n.url_label, n.dismissible, n.popup, now(), req.user.id, n.audience, JSON.stringify(n.audience === 'users' ? n.recipients : [])]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
adm.put('/notices/:id', async (req, res, next) => {
  try {
    if (!req.body.edit) { await q('UPDATE notices SET active=$1 WHERE id=$2', [!!req.body.active, req.params.id]); return res.json({ ok: true }); }
    // editar el aviso entero, incluidos los destinatarios
    const n = cleanNotice(req.body);
    if (!n.title && !n.body && !n.image) return res.status(400).json({ error: 'Pon al menos un título, un texto o una imagen.' });
    if (n.audience === 'users' && !n.recipients.length) return res.status(400).json({ error: 'Elige al menos una persona.' });
    const r = await q(`UPDATE notices SET title=$1, body=$2, image=$3, url=$4, url_label=$5, dismissible=$6, popup=$7, audience=$8, recipients=$9 WHERE id=$10`,
      [n.title || null, n.body || null, n.image, n.url, n.url_label, n.dismissible, n.popup, n.audience, JSON.stringify(n.audience === 'users' ? n.recipients : []), req.params.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Ese aviso ya no existe.' });
    if (req.body.renew) await q('DELETE FROM notice_reads WHERE notice_id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
adm.delete('/notices/:id', async (req, res, next) => {
  try { await q('DELETE FROM notices WHERE id=$1', [req.params.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
adm.get('/notices/:id/reads', async (req, res, next) => {
  try {
    const rows = (await q(`SELECT u.username,u.display,u.color,u.avatar,u.id, r.read_at, r.dismissed FROM notice_reads r JOIN users u ON u.id=r.user_id
      WHERE r.notice_id=$1 AND u.username IS NOT NULL ORDER BY r.read_at DESC`, [req.params.id])).rows;
    const anon = (await q('SELECT count(*)::int n FROM notice_reads r JOIN users u ON u.id=r.user_id WHERE r.notice_id=$1 AND u.username IS NULL', [req.params.id])).rows[0].n;
    res.json({ cuentas: rows.map(x => ({ ...x, read_at: Number(x.read_at) })), anonimas: anon });
  } catch (e) { next(e); }
});

api.use('/admin', adm);

function countAi() { const d = new Date().toISOString().slice(0, 10); q('INSERT INTO ai_usage(day,n) VALUES($1,1) ON CONFLICT(day) DO UPDATE SET n=ai_usage.n+1', [d]).catch(() => {}); }

app.use('/api', api);
app.get('/legal/:page', (req, res, next) => {
  const html = legalHtml(req.params.page, { name: process.env.LEGAL_NAME || 'Ainara Castillón', email: process.env.LEGAL_EMAIL || '', host: req.get('host') });
  if (!html) return next();
  res.type('html').send(html);
});
app.get('*', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Algo ha fallado en el servidor. Vuelve a intentarlo.' }); });

migrate().then(seedSuggestions).then(() => { app.listen(PORT, () => console.log('Entre Fogones en el puerto ' + PORT)); setTimeout(() => processSuggestions().catch(e => console.error(e)), 5000); setInterval(() => processSuggestions().catch(e => console.error(e)), 30 * 60e3); setTimeout(backfillRecipes, 20000); setTimeout(() => suggNutrition().catch(() => {}), 40000); setInterval(backfillRecipes, 3 * 3600e3); })
  .catch(e => { console.error('No se pudo preparar la base de datos', e); process.exit(1); });
