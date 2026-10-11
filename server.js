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
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_FALLBACK = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-120b';
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';
const PROVIDER = GROQ_KEY ? 'groq' : OPENAI_KEY ? 'openai' : (AI_KEY ? 'claude' : null);
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
// HTML, JS y manifiesto se revalidan siempre para que se vea la última versión al momento
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', setHeaders(res, file) {
  if (/\.(html|js|css|webmanifest)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
  else res.setHeader('Cache-Control', 'public, max-age=86400');
} }));

const api = express.Router();
api.use(auth);

api.get('/config', (req, res) => res.json({ mail: mailReady(), ai: !!PROVIDER, aiName: PROVIDER === 'claude' ? 'Claude' : PROVIDER === 'openai' ? 'ChatGPT' : 'la IA' }));

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
      me: { ...pub(req.user), email: req.user.email || null, lastRead: req.user.last_read || {} }, profiles,
      folders: folders.rows.map(f => ({ id: f.id, name: f.name, color: f.color, created: Number(f.created) })),
      recipes: recipes.rows.map(recipeOut),
      requests: reqs.rows.map(r => ({ from: r.from_id, to: r.to_id, status: r.status, ts: Number(r.ts) })),
      chats: chats.rows.map(c => ({ id: c.id, members: [c.a, c.b], ts: Number(c.ts), last: c.last }))
    });
  } catch (e) { next(e); }
});

/* Cuenta */
const emailOk = e => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(e);
api.post('/register', async (req, res, next) => {
  try {
    if (req.user.username) return res.status(400).json({ error: 'Ya tienes una cuenta abierta.' });
    const username = String(req.body.username || '').toLowerCase();
    const display = String(req.body.display || '').trim().slice(0, 40);
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
    const password = String(req.body.password || '');
    if (!display) return res.status(400).json({ error: 'Escribe tu nombre.' });
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return res.status(400).json({ error: 'El nombre de usuario debe tener de 3 a 20 letras minúsculas, números o _.' });
    if (!emailOk(email)) return res.status(400).json({ error: 'Escribe un correo válido. Lo necesitarás si olvidas la contraseña.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    if (!req.body.accept) return res.status(400).json({ error: 'Para crear la cuenta tienes que aceptar las condiciones y la política de privacidad.' });
    if ((await q('SELECT 1 FROM users WHERE username=$1', [username])).rows[0]) return res.status(409).json({ error: `@${username} ya está cogido. Prueba con otro.` });
    if ((await q('SELECT 1 FROM users WHERE lower(email)=$1', [email])).rows[0]) return res.status(409).json({ error: 'Ya hay una cuenta con ese correo. Inicia sesión o recupera la contraseña.' });
    await q('UPDATE users SET username=$1, display=$2, color=$3, pass_hash=$4, email=$5, accepted_at=$6 WHERE id=$7',
      [username, display, String(req.body.color || '#B5562B').slice(0, 9), hashPass(password), email, now(), req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.put('/me', needProfile, async (req, res, next) => {
  try {
    const display = String(req.body.display || '').trim().slice(0, 40);
    const email = String(req.body.email || '').trim().toLowerCase().slice(0, 254);
    if (!display) return res.status(400).json({ error: 'Escribe tu nombre.' });
    if (!emailOk(email)) return res.status(400).json({ error: 'Escribe un correo válido.' });
    if ((await q('SELECT 1 FROM users WHERE lower(email)=$1 AND id<>$2', [email, req.user.id])).rows[0]) return res.status(409).json({ error: 'Ese correo ya lo usa otra cuenta.' });
    await q('UPDATE users SET display=$1, color=$2, email=$3 WHERE id=$4', [display, String(req.body.color || '#B5562B').slice(0, 9), email, req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
api.post('/login', async (req, res, next) => {
  try {
    const who = String(req.body.username || '').trim().toLowerCase().replace(/^@/, '');
    const r = await q('SELECT * FROM users WHERE username=$1 OR (email IS NOT NULL AND lower(email)=$1) LIMIT 1', [who]);
    const u = r.rows[0];
    if (!u || !checkPass(String(req.body.password || ''), u.pass_hash)) return res.status(401).json({ error: 'Usuario, correo o contraseña incorrectos.' });
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
    if (!checkPass(String(req.body.password || ''), req.user.pass_hash)) return res.status(401).json({ error: 'La contraseña no es correcta.' });
    const me = req.user.id;
    await q('DELETE FROM messages WHERE from_id=$1', [me]);
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
    try { const j = JSON.parse(await getText('https://www.tiktok.com/oembed?url=' + encodeURIComponent(url)));
      out.title = j.title || ''; out.text = j.title || ''; out.image = j.thumbnail_url || ''; } catch { }
    if (!out.text) { const html = await getText(url, { 'User-Agent': BOT_UA }); out.text = metaTag(html, 'og:description') || metaTag(html, 'description'); out.title = metaTag(html, 'og:title'); out.image = metaTag(html, 'og:image'); }
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
async function importVideo(url, res) {
  let v;
  try { v = await videoText(url); }
  catch (e) { return res.status(422).json({ error: 'No he podido abrir ese vídeo. Si es privado no se puede leer; pega aquí la descripción o lo que dicen en el vídeo.', needText: true }); }
  if (v.text && PROVIDER) {
    try { const r = await aiFromVideo(v.title, v.text); if (r) return res.json({ recipe: { ...r, image: v.image || '', source: url }, fromVideo: true }); } catch (e) { console.error(e); }
  }
  res.status(422).json({ needText: true, text: v.text || '', error: v.text
    ? 'El vídeo no trae la receta completa por escrito. Te dejo lo que he encontrado: completa lo que falte o sube el vídeo para que se escuche.'
    : 'Ese vídeo no trae texto que se pueda leer. Pega la descripción o lo que dicen, o sube el vídeo para que se escuche.' });
}
// Subir el vídeo: se transcribe lo que se dice (Groq Whisper) y se saca la receta
api.post('/import/video-file', express.raw({ type: () => true, limit: '25mb' }), async (req, res) => {
  if (PROVIDER !== 'groq') return noAi(res);
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'No ha llegado el vídeo. Vuelve a intentarlo.' });
  try {
    const type = String(req.headers['content-type'] || 'video/mp4').split(';')[0];
    const ext = (type.split('/')[1] || 'mp4').replace('quicktime', 'mov').replace(/[^a-z0-9]/g, '');
    const fd = new FormData();
    fd.append('file', new Blob([req.body], { type }), 'video.' + ext);
    fd.append('model', process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo');
    fd.append('response_format', 'json');
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', { method: 'POST', body: fd, signal: AbortSignal.timeout(120000), headers: { authorization: `Bearer ${GROQ_KEY}` } });
    if (!r.ok) { const t = await r.text(); console.error('whisper', r.status, t.slice(0, 300)); return res.status(502).json({ error: r.status === 429 ? 'Se ha llegado al límite gratis de la IA por ahora. Prueba dentro de un rato.' : 'No he podido escuchar el vídeo. Prueba con otro formato o un vídeo más corto.' }); }
    const text = String((await r.json()).text || '').trim();
    if (!text) return res.status(422).json({ error: 'En el vídeo no se dice nada que se pueda transcribir.' });
    const rec = await aiFromVideo(String(req.query.title || ''), 'Lo que se dice en el vídeo: ' + text);
    if (!rec) return res.status(422).json({ error: 'He escuchado el vídeo pero no he encontrado una receta.', needText: true, text });
    res.json({ recipe: rec });
  } catch (e) { console.error(e); res.status(502).json({ error: 'No he podido procesar el vídeo. Vuelve a intentarlo.' }); }
});

api.post('/import', async (req, res) => {
  if (isVideoUrl(String(req.body.url || '').trim())) return importVideo(String(req.body.url).trim(), res);
  const url = String(req.body.url || '').trim();
  let html;
  try { const r = await safeFetch(url); if (!r.ok) throw new Error('status ' + r.status); html = await r.text(); }
  catch (e) { return res.status(422).json({ error: 'No he podido abrir esa web. Pega el texto de la receta y la saco de ahí.', needText: true }); }
  const ld = parseJsonLd(html);
  if (ld && ld.ingredients.length) return res.json({ recipe: { ...ld, source: url } });
  if (PROVIDER) {
    try { const r = await aiExtract(htmlToText(html)); if (r) return res.json({ recipe: { ...r, image: ogImage(html), source: url } }); } catch (e) { console.error(e); }
  }
  res.status(422).json({ error: 'No he encontrado la receta en esa página. Pega el texto de la receta y la saco de ahí.', needText: true });
});

/* ---------- IA (opcional): Groq (GROQ_API_KEY, gratis), ChatGPT (OPENAI_API_KEY) o Claude (ANTHROPIC_API_KEY) ---------- */
const SCHEMA = `{"title":string,"servings":string (solo el número de raciones),"time":string (p. ej. "45 min"),"difficulty":"Fácil"|"Media"|"Difícil"|"","ingredients":[string],"steps":[string],"notes":string}`;
// messages: [{ role: 'user'|'assistant', text, image?: { media, data } }]
// API compatible con OpenAI (Groq y OpenAI)
async function openaiCompat({ url, key, model, system, messages, maxTokens }) {
  const msgs = system ? [{ role: 'system', content: system }] : [];
  for (const m of messages) msgs.push({ role: m.role, content: m.image
    ? [{ type: 'text', text: m.text }, { type: 'image_url', image_url: { url: `data:${m.image.media};base64,${m.image.data}` } }] : m.text });
  const r = await fetch(url, {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: msgs, response_format: { type: 'json_object' }, max_completion_tokens: maxTokens, temperature: 0.6 })
  });
  if (!r.ok) { const e = new Error(model + ' ' + r.status + ' ' + (await r.text()).slice(0, 300)); e.status = r.status; throw e; }
  const j = await r.json();
  return j.choices?.[0]?.message?.content || '';
}
async function llm({ system = '', messages, maxTokens = 3000 }) {
  if (PROVIDER === 'groq') {
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
  if (PROVIDER === 'openai') {
    const msgs = system ? [{ role: 'system', content: system }] : [];
    for (const m of messages) msgs.push({ role: m.role, content: m.image
      ? [{ type: 'text', text: m.text }, { type: 'image_url', image_url: { url: `data:${m.image.media};base64,${m.image.data}` } }] : m.text });
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(90000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({ model: OPENAI_MODEL, messages: msgs, response_format: { type: 'json_object' }, max_completion_tokens: maxTokens })
    });
    if (!r.ok) throw new Error('openai ' + r.status + ' ' + (await r.text()).slice(0, 300));
    const j = await r.json();
    return j.choices?.[0]?.message?.content || '';
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'content-type': 'application/json', 'x-api-key': AI_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: maxTokens, ...(system ? { system } : {}), messages: messages.map(m => ({ role: m.role, content: m.image
      ? [{ type: 'image', source: { type: 'base64', media_type: m.image.media, data: m.image.data } }, { type: 'text', text: m.text }] : m.text })) })
  });
  if (!r.ok) throw new Error('claude ' + r.status + ' ' + (await r.text()).slice(0, 300));
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
api.post('/ai/extract', async (req, res) => {
  if (!PROVIDER) return noAi(res);
  try { const r = await aiExtract(req.body.text || ''); if (!r) return res.status(422).json({ error: 'No he encontrado una receta en ese texto. Revisa que hayas copiado la página entera.' }); res.json({ recipe: r }); }
  catch (e) { console.error(e); res.status(502).json({ error: 'No he podido leer el texto. Vuelve a intentarlo.' }); }
});
const CHEF = `Eres el asistente de cocina de Entre Fogones, una app de recetas. Ayudas a crear recetas caseras en español de España.
Responde SIEMPRE con un único objeto JSON con esta forma: {"reply": string, "recipe": ${SCHEMA} o null}.
- "reply": una o dos frases cercanas que digan qué receta propones o qué has cambiado.
- Cuando te pidan una receta, devuelve la receta completa en "recipe".
- Cuando te pidan cambios, devuelve en "recipe" la receta completa ya modificada, no solo lo que cambia.
- Si te preguntan algo que no es una receta, contesta en "reply" y pon "recipe": null.
Usa cantidades métricas (g, ml, cucharadas), un ingrediente por elemento con su cantidad delante, pasos claros sin numerar, y en "notes" un consejo breve de cocinero. Puedes marcar con **texto** lo más importante de un paso.`;
api.post('/ai/chat', async (req, res) => {
  if (!PROVIDER) return noAi(res);
  const msgs = (Array.isArray(req.body.messages) ? req.body.messages : []).slice(-20)
    .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: String(m.content || '').slice(0, 12000) })).filter(m => m.text);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return res.status(400).json({ error: 'Escribe qué receta quieres.' });
  try {
    const out = parseJson(await llm({ system: CHEF, messages: msgs, maxTokens: 3500 }));
    if (!out) return res.status(502).json({ error: 'No he entendido la respuesta. Vuelve a intentarlo.' });
    res.json({ reply: String(out.reply || ''), recipe: cleanAi(out.recipe) });
  } catch (e) { console.error(e); res.status(502).json({ error: e.status === 429 ? 'Se ha llegado al límite gratis de la IA por ahora. Prueba dentro de un rato.' : 'No he podido contestar ahora. Vuelve a intentarlo en un momento.' }); }
});
api.post('/ai/photo', async (req, res) => {
  if (!PROVIDER) return noAi(res);
  const m = String(req.body.image || '').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'Esa imagen no se puede leer.' });
  try {
    const r = cleanAi(parseJson(await llm({ messages: [{ role: 'user', image: { media: m[1], data: m[2] }, text: `La imagen es una foto de una receta (de un libro, revista, pantalla o papel escrito a mano). Transcribe la receta completa y devuelve SOLO un objeto JSON con esta forma:
${SCHEMA}
Reglas: usa solo lo que se lee en la foto, sin inventar. Escribe en español. Un ingrediente por elemento con su cantidad, un paso por elemento sin numerar. Si se ve texto en negrita escríbelo como **texto**, y en cursiva como *texto*. Si no hay ninguna receta, devuelve {"error":"no_recipe"}.` }] })));
    if (!r) return res.status(422).json({ error: 'No he encontrado una receta en la foto. Prueba con una foto más nítida, recta y con buena luz.' });
    res.json({ recipe: r });
  } catch (e) { console.error(e); res.status(502).json({ error: e.status === 429 ? 'Se ha llegado al límite gratis de la IA por ahora. Prueba dentro de un rato.' : 'No he podido leer la foto. Vuelve a intentarlo.' }); }
});

app.use('/api', api);
app.get('/legal/:page', (req, res, next) => {
  const html = legalHtml(req.params.page, { name: process.env.LEGAL_NAME || 'Ainara Castillón', email: process.env.LEGAL_EMAIL || '', host: req.get('host') });
  if (!html) return next();
  res.type('html').send(html);
});
app.get('*', (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Algo ha fallado en el servidor. Vuelve a intentarlo.' }); });

migrate().then(() => app.listen(PORT, () => console.log('Entre Fogones en el puerto ' + PORT)))
  .catch(e => { console.error('No se pudo preparar la base de datos', e); process.exit(1); });
