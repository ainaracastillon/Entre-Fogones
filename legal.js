'use strict';
// Textos legales de Entre Fogones (España / UE: RGPD, LOPDGDD y LSSI-CE)
const UPDATED = '11 de octubre de 2026';

function legalPages({ name, email, host }) {
  const contact = email
    ? `escribiendo a <a href="mailto:${email}">${email}</a> o usando el <a href="/legal/contacto">formulario de contacto</a>`
    : `usando el <a href="/legal/contacto">formulario de contacto</a>`;
  const who = name ? `${name}, persona física` : 'la persona titular de Entre Fogones';
  return {
    'aviso-legal': {
      title: 'Aviso legal y términos de uso',
      body: `
<h2>1. Quién está detrás de Entre Fogones</h2>
<p>Entre Fogones (${host}) es una aplicación web gratuita y sin ánimo de lucro para guardar, organizar en recetarios y compartir recetas de cocina. Su titular es ${who} (en adelante, «nosotros»). Puedes contactar con nosotros ${contact}.</p>

<h2>2. Aceptación</h2>
<p>Al usar Entre Fogones aceptas estas condiciones. Si creas una cuenta, además declaras haber leído la <a href="/legal/privacidad">política de privacidad</a>. Si no estás de acuerdo, no uses la aplicación.</p>

<h2>3. Edad mínima</h2>
<p>Para crear una cuenta tienes que tener al menos 14 años; al aceptar estos términos confirmas que los tienes. Si eres menor de 14 años necesitas el consentimiento de tu madre, padre o tutor legal, que será responsable de tu uso de la aplicación.</p>

<h2>4. Uso sin cuenta y con cuenta</h2>
<p>Puedes guardar recetas sin crear una cuenta: quedan asociadas a este navegador mediante una cookie técnica y se pierden si la borras. Con una cuenta (nombre de usuario, correo y contraseña) tus recetas están en todos tus dispositivos y puedes tener amigos y usar el chat. Eres responsable de guardar tu contraseña en secreto y de lo que se haga con tu cuenta.</p>

<h2>5. Lo que publicas</h2>
<p>Las recetas, recetarios, fotos, notas y mensajes que subes son tuyos y sigues siendo su titular. Para que la aplicación funcione nos das permiso para guardarlos, mostrarlos y enviarlos a las personas con quien decidas compartirlos, solo con esa finalidad y mientras no los borres.</p>
<p>Al subir contenido garantizas que tienes derecho a hacerlo. Las recetas importadas de webs, vídeos o fotos de libros pueden tener autor: guárdalas para tu uso personal y, si las compartes, respeta los derechos de sus autores e indica la fuente. Nos reservamos el derecho a retirar contenido ilícito, ofensivo o que infrinja derechos de terceros, y a cerrar cuentas que incumplan estas condiciones.</p>
<p>Está prohibido usar Entre Fogones para acosar a otras personas, enviar publicidad no deseada, suplantar a nadie o intentar acceder a datos ajenos o dañar el servicio.</p>

<h2>6. Enlaces compartidos</h2>
<p>Cuando compartes una receta o un recetario con un enlace, cualquier persona que tenga ese enlace puede verla y guardarse una copia. No compartas por enlace nada que quieras mantener privado.</p>

<h2>7. Funciones con inteligencia artificial</h2>
<p>Las funciones de crear recetas en el chat, leer fotos, leer vídeos y leer webs usan un servicio externo de inteligencia artificial. Sus respuestas pueden contener errores: revisa siempre ingredientes, cantidades, tiempos, temperaturas y alérgenos antes de cocinar. Entre Fogones no da consejos médicos ni nutricionales.</p>

<h2>8. Responsabilidad</h2>
<p>Ofrecemos Entre Fogones gratis, tal cual y según disponibilidad. Intentamos que funcione bien y que tus datos estén seguros, pero no podemos garantizar que el servicio no se interrumpa ni que no se pierda información, así que te recomendamos guardar aparte las recetas que no quieras perder. No respondemos del contenido que suben los usuarios ni de las webs externas enlazadas, ni de los daños derivados de seguir una receta.</p>

<h2>9. Propiedad intelectual de la aplicación</h2>
<p>El diseño, el logotipo, el nombre y el código de Entre Fogones son de su titular. No puedes copiarlos ni usarlos con fines comerciales sin permiso.</p>

<h2>10. Darte de baja</h2>
<p>Puedes borrar tu cuenta cuando quieras desde «Tu cuenta › Borrar mi cuenta». Se borran tu perfil, tus recetas, tus recetarios, tus amistades y los mensajes que has enviado.</p>

<h2>11. Cambios</h2>
<p>Podemos actualizar estas condiciones. Si el cambio es importante te avisaremos en la aplicación. La fecha de la última actualización aparece al final de esta página.</p>

<h2>12. Ley aplicable</h2>
<p>Estas condiciones se rigen por la ley española. Si eres consumidor, para cualquier conflicto serán competentes los juzgados de tu domicilio.</p>`
    },
    privacidad: {
      title: 'Política de privacidad',
      body: `
<h2>Responsable del tratamiento</h2>
<p>${name ? name : 'La persona titular de Entre Fogones'}. Contacto para cualquier cuestión de privacidad: ${contact}.</p>

<h2>Qué datos tratamos</h2>
<ul>
<li><strong>Si usas la app sin cuenta:</strong> un identificador anónimo guardado en una cookie técnica, y las recetas y recetarios que crees.</li>
<li><strong>Si creas una cuenta:</strong> tu nombre, tu nombre de usuario, tu correo electrónico, tu contraseña (guardada cifrada, nunca en claro) y el color que eliges.</li>
<li><strong>Tu contenido:</strong> recetas, fotos, notas, recetarios, amistades y mensajes del chat.</li>
<li><strong>Datos técnicos:</strong> la dirección IP y datos de la conexión que registran los servidores por seguridad.</li>
</ul>
<p>No pedimos datos especialmente sensibles. No metas en las recetas ni en el chat información de salud u otros datos personales que no quieras compartir.</p>

<h2>Para qué y con qué base legal</h2>
<ul>
<li><strong>Prestarte el servicio</strong> (guardar tus recetas, mostrarlas, compartirlas, el chat y los amigos): es necesario para cumplir las condiciones de uso que aceptas (art. 6.1.b del RGPD).</li>
<li><strong>Recuperar tu contraseña</strong> enviándote un correo: misma base, a petición tuya.</li>
<li><strong>Seguridad</strong> del servicio y prevención de abusos: interés legítimo (art. 6.1.f del RGPD).</li>
</ul>
<p>No vendemos tus datos, no hacemos publicidad ni perfiles comerciales, y no enviamos boletines.</p>

<h2>Quién más ve tus datos</h2>
<p>Las personas con quien compartes recetas, recetarios o mensajes, y cualquiera que tenga un enlace que hayas compartido. Tus amigos ven tu nombre, tu usuario y tu color; tu correo no se muestra a nadie.</p>
<p>Además usamos estos proveedores, que tratan los datos solo por cuenta nuestra:</p>
<ul>
<li><strong>Render</strong> (Render Services, Inc., EE. UU.): alojamiento de la aplicación, en su región de Fráncfort (UE).</li>
<li><strong>Neon</strong> (Databricks, Inc., EE. UU.): base de datos, en Fráncfort (UE), sobre Amazon Web Services.</li>
<li><strong>Groq</strong> (Groq, Inc., EE. UU.): inteligencia artificial. Solo recibe lo que envías al usar esas funciones: el texto que escribes en el chat de recetas, las fotos o vídeos que subes para leerlos y el texto de las webs o vídeos que importas. No le enviamos tu nombre, tu correo ni tu identificador.</li>
<li><strong>Servicio de correo</strong>: solo para enviarte el enlace de recuperar la contraseña.</li>
</ul>
<p>Algunos de estos proveedores son de EE. UU. Las transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en las cláusulas contractuales tipo aprobadas por la Comisión Europea.</p>

<h2>Cuánto tiempo los guardamos</h2>
<p>Mientras tengas la cuenta. Si la borras, eliminamos tu perfil y tu contenido de inmediato; puede quedar una copia en las copias de seguridad del proveedor durante un máximo de unos días. Las estanterías creadas sin cuenta se pueden borrar tras un año sin usarse. Los enlaces de recuperar contraseña caducan en una hora.</p>

<h2>Tus derechos</h2>
<p>Puedes acceder a tus datos, rectificarlos, borrarlos, oponerte a su tratamiento, limitarlo y pedir su portabilidad. Muchos los puedes ejercer tú mismo desde la app (editar tu cuenta, borrar recetas, borrar la cuenta). Para el resto, contacta ${contact}, indicando tu nombre de usuario. Te responderemos en un mes como máximo.</p>
<p>Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" target="_blank" rel="noopener">www.aepd.es</a>).</p>

<h2>Seguridad</h2>
<p>Las conexiones van cifradas (HTTPS), las contraseñas se guardan con un cifrado de un solo sentido (scrypt) y la base de datos solo admite conexiones cifradas.</p>

<h2>Menores</h2>
<p>Las personas menores de 14 años necesitan el consentimiento de sus padres o tutores para crear una cuenta.</p>`
    },
    cookies: {
      title: 'Política de cookies',
      body: `
<h2>Qué usamos</h2>
<p>Entre Fogones solo usa lo imprescindible para funcionar. No usamos cookies de publicidad, de analítica ni de redes sociales, así que no te pedimos consentimiento (art. 22.2 de la LSSI-CE).</p>
<table class="ck">
<thead><tr><th>Nombre</th><th>Tipo</th><th>Para qué</th><th>Duración</th></tr></thead>
<tbody>
<tr><td data-l="Nombre"><code>ef</code></td><td data-l="Tipo">Cookie técnica propia</td><td data-l="Para qué">Mantener tu sesión y saber qué estantería es la tuya, con o sin cuenta.</td><td data-l="Duración">Hasta 400 días o hasta que cierres sesión</td></tr>
<tr><td data-l="Nombre"><code>ef_hide_banner</code></td><td data-l="Tipo">Almacenamiento local</td><td data-l="Para qué">Recordar que cerraste el aviso de usar la app sin cuenta.</td><td data-l="Duración">Hasta que lo borres</td></tr>
<tr><td data-l="Nombre"><code>ef_draft_…</code></td><td data-l="Tipo">Almacenamiento local</td><td data-l="Para qué">Guardar el mensaje del chat que estabas escribiendo.</td><td data-l="Duración">Hasta que lo envíes o lo borres</td></tr>
</tbody></table>
<p>Las tipografías se sirven desde nuestro propio servidor: no se conecta con Google ni con otros terceros para mostrarlas.</p>
<h2>Cómo borrarlas</h2>
<p>Puedes borrar las cookies y el almacenamiento local desde los ajustes de tu navegador. Si borras la cookie <code>ef</code> sin tener cuenta, perderás el acceso a las recetas que guardaste sin cuenta.</p>`
    },
    contacto: {
      title: 'Contacto',
      body: `
<p>Escríbenos para cualquier duda, para avisar de un contenido que no debería estar o para ejercer tus derechos de privacidad. ${email ? `También puedes escribir a <a href="mailto:${email}">${email}</a>.` : ''}</p>
<form id="cf" class="cf">
  <label>Tu correo, para poder responderte<input id="cfmail" type="email" required maxlength="254" autocomplete="email"></label>
  <label>Asunto<select id="cfsub"><option>Duda o sugerencia</option><option>Privacidad y mis datos</option><option>Contenido que no debería estar</option><option>Otra cosa</option></select></label>
  <label>Mensaje<textarea id="cfmsg" rows="6" required maxlength="4000"></textarea></label>
  <button>Enviar</button>
  <p id="cfst" role="status"></p>
</form>
<script>
document.getElementById('cf').onsubmit=async e=>{e.preventDefault();const st=document.getElementById('cfst');const b=e.target.querySelector('button');b.disabled=true;st.textContent='Enviando…';
try{const r=await fetch('/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:cfmail.value,subject:cfsub.value,message:cfmsg.value})});const j=await r.json().catch(()=>({}));
if(!r.ok) throw j; e.target.reset(); st.textContent='Mensaje enviado. Te responderemos a ese correo.';}catch(err){st.textContent=(err&&err.error)||'No se ha podido enviar. Vuelve a intentarlo.';}b.disabled=false;};
</script>`
    }
  };
}

function legalHtml(page, opts) {
  const pages = legalPages(opts); const p = pages[page]; if (!p) return null;
  const nav = [['aviso-legal', 'Términos'], ['privacidad', 'Privacidad'], ['cookies', 'Cookies'], ['contacto', 'Contacto']]
    .map(([k, t]) => `<a href="/legal/${k}"${k === page ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p.title} · Entre Fogones</title><link rel="icon" href="/icon.svg" type="image/svg+xml"><meta name="robots" content="noindex">
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
:root{--bg:#F6EEE6;--fg:#3B2116;--muted:#7A5C4C;--line:#E7D5C5;--accent:#B5562B;--card:#FFFAF5}
@media (prefers-color-scheme:dark){:root{--bg:#1C1310;--fg:#F3E6DA;--muted:#BFA391;--line:#3B2B23;--accent:#E8834F;--card:#271B16;color-scheme:dark}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 'Bricolage Grotesque',system-ui,sans-serif}
.w{max-width:760px;margin:0 auto;padding:24px 16px 64px}
header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:20px}
header a.home{color:var(--fg);text-decoration:none;font-weight:800;font-size:20px}
nav{display:flex;gap:2px;flex-wrap:nowrap;max-width:100%}nav a{color:var(--muted);text-decoration:none;padding:5px 10px;border-radius:999px;border:1px solid transparent;font-size:14px;white-space:nowrap}
@media (max-width:480px){nav a{padding:4px 7px;font-size:13px}}
nav a[aria-current]{border-color:var(--line);background:var(--card);color:var(--fg)}
h1{font-size:32px;line-height:1.15;margin:0 0 6px}h2{font-size:19px;margin:28px 0 6px}
a{color:var(--accent)}.upd{color:var(--muted);font-size:14px;margin-top:32px}
ul{padding-left:20px}li{margin:4px 0}code{font-size:.9em}
.ck{border-collapse:collapse;width:100%;font-size:14px;table-layout:fixed}
.ck th,.ck td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left;vertical-align:top;overflow-wrap:anywhere}
.ck th:nth-child(1){width:22%}.ck th:nth-child(2){width:20%}.ck th:nth-child(4){width:22%}
@media (max-width:640px){.ck,.ck thead,.ck tbody,.ck tr,.ck td{display:block;width:auto}.ck thead{display:none}
.ck tr{border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:10px;background:var(--card)}
.ck td{border:0;padding:4px 0}.ck td::before{content:attr(data-l);display:block;font-size:12px;color:var(--muted)}}
.cf{display:grid;gap:14px;max-width:520px}.cf label{display:grid;gap:4px;font-size:14px;color:var(--muted)}
.cf input,.cf select,.cf textarea{font:inherit;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.cf button{justify-self:start;font:inherit;font-weight:700;background:var(--accent);color:#fff;border:0;border-radius:999px;padding:10px 20px;cursor:pointer}
</style></head><body><div class="w">
<header><a class="home" href="/">← Entre Fogones</a><nav>${nav}</nav></header>
<h1>${p.title}</h1>${p.body}
<p class="upd">Última actualización: ${UPDATED}.</p>
</div></body></html>`;
}
module.exports = { legalHtml };
