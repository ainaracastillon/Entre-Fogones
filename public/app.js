'use strict';
/* ===== Entre Fogones · cliente ===== */
const MORE_CLOTHS = [['#1F3B2D','Verde botella'],['#4F7942','Helecho'],['#6B8E23','Oliva'],['#8A9A5B','Salvia'],['#2E8B57','Esmeralda'],['#0F6E6E','Petróleo'],['#2A7F9E','Turquesa'],['#4682B4','Acero'],['#1E2F4D','Medianoche'],['#5470A8','Lavanda azul'],['#7B68EE','Violeta'],['#4B2E5A','Berenjena'],['#8E4585','Malva'],['#C71585','Fucsia'],['#D46A84','Rosa palo'],['#E8A0A0','Rosa empolvado'],['#9B1B30','Burdeos'],['#C0392B','Tomate'],['#D35400','Calabaza'],['#E67E22','Naranja'],['#CC8899','Frambuesa'],['#D4A017','Oro viejo'],['#E1C16E','Trigo'],['#C2B280','Arena'],['#A0522D','Siena'],['#6F4E37','Café'],['#4A2C2A','Chocolate'],['#8B8589','Topo'],['#708090','Pizarra'],['#1C1C1C','Negro']];
const CLOTHS = [['#2F5D46','Bosque'],['#7A2E2E','Granate'],['#26405F','Marino'],['#B2861E','Mostaza'],['#5B3E63','Ciruela'],['#B5562B','Canela'],['#3D3D3D','Carbón']];
const AVCOLORS = ['#B5562B','#2F5D46','#26405F','#7A2E2E','#5B3E63','#B2861E','#2F7D85'];

const S = {
  me:null, uid:null, profile:null, ai:false, booted:false,
  profiles:{}, folders:[], recipes:[], reqIn:[], reqOut:[], chats:[],
  view:'library', book:null, page:0, chatWith:null, msgs:[], scale:{}, prevView:'library',
  search:'', searchRes:[]
};

/* ===== Utilidades ===== */
const $ = (s,r=document)=>r.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const gid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,10);
const now = () => Date.now();
const pairKey = (a,b) => [a,b].sort().join('+');
const narrow = () => matchMedia('(max-width: 760px)').matches;
const lsGet = k => { try{ return JSON.parse(localStorage.getItem(k)) }catch{ return null } };
const lsSet = (k,v) => { try{ localStorage.setItem(k, JSON.stringify(v)) }catch{} };
async function api(method, path, body){
  const r = await fetch('/api'+path, {method, credentials:'same-origin', headers: body?{'content-type':'application/json'}:{}, body: body?JSON.stringify(body):undefined});
  let j=null; try{ j=await r.json(); }catch{}
  if(!r.ok) throw {status:r.status, error:(j&&j.error)||'Algo ha fallado. Vuelve a intentarlo.', ...(j||{})};
  return j;
}
const ICONS = {
  plus:'<path d="M12 5v14M5 12h14"/>', back:'<path d="M15 18l-6-6 6-6"/>', next:'<path d="M9 18l6-6-6-6"/>',
  share:'<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>', trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  move:'<path d="M3 7h6l2 2h10v10H3z"/>', link:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>', send:'<path d="M4 12l16-8-6 16-3-7z"/>', save:'<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>', book:'<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  hand:'<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>', user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
  bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  pin:'<path d="M9 4h6l-1 6 3 3H7l3-3zM12 13v7"/>',
  down:'<path d="M6 9l6 6 6-6"/>',
  shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/>',
  doc:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  calendar:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>',
  scale:'<path d="M12 4v16M5 20h14M6 8h12M6 8l-3 6a3 3 0 0 0 6 0zM18 8l-3 6a3 3 0 0 0 6 0z"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  pdf:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/><path d="M9 15h1.5a1.5 1.5 0 0 0 0-3H9v5M14 12v5h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2z"/>',
  clip:'<path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0M9 9.5h.01M15 9.5h.01"/>',
  reply:'<path d="M10 8L5 12l5 4"/><path d="M5 12h9a5 5 0 0 1 5 5v1"/>',
  image:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  download:'<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.6c2 .8 3.2 2.6 3.5 5.4"/>',
  expand:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  play:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
  upload:'<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>'
};
const ico = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;
function spoon(h=40, fill='var(--accent)', hole='var(--bg)'){
  const w = Math.round(h*110/250);
  return `<svg width="${w}" height="${h}" viewBox="0 0 110 250" aria-hidden="true"><path d="M55 6 C78 40 98 64 90 100 C85 124 70 136 55 136 C40 136 25 124 20 100 C14 72 34 58 40 38 C44 56 54 60 56 46 C58 32 50 22 55 6 Z" fill="${fill}"/><path d="M55 70 C64 86 70 98 66 112 C63 122 47 122 44 112 C41 102 48 94 50 84 C52 90 56 90 55 70 Z" fill="${hole}"/><rect x="48" y="132" width="14" height="112" rx="7" fill="${fill}"/><circle cx="55" cy="228" r="3.5" fill="${hole}"/></svg>`;
}
function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove('on'),2600)}
function avatar(id, cls=''){
  const p = S.profiles[id]||{};
  const name = p.display||p.username||'?';
  const ini = name.trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase()||'?';
  if(p.avatar) return `<span class="av ${cls} has-photo"><img src="${esc(p.avatar)}" alt=""></span>`;
  return `<span class="av ${cls}" style="background:${esc(p.color||'#7A5C4C')};color:${inkOn(p.color||'#7A5C4C')}">${esc(ini)}</span>`;
}
const pname = id => S.profiles[id]?.display || (S.profiles[id]?.username ? '@'+S.profiles[id].username : 'Alguien');
const puser = id => S.profiles[id]?.username ? '@'+S.profiles[id].username : '';
function fmtTime(ts){const d=new Date(ts);const t=new Date();return d.toDateString()===t.toDateString()?d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('es-ES',{day:'numeric',month:'short'})}

/* ===== Cantidades ===== */
const FRAC = {'½':.5,'¼':.25,'¾':.75,'⅓':1/3,'⅔':2/3};
function fmtNum(n){
  const whole=Math.floor(n), f=n-whole, near=a=>Math.abs(f-a)<0.04;
  let fs=''; if(near(.5))fs='½';else if(near(.25))fs='¼';else if(near(.75))fs='¾';else if(near(1/3))fs='⅓';else if(near(2/3))fs='⅔';
  if(fs) return (whole?whole:'')+fs;
  return (Math.round(n*10)/10).toLocaleString('es-ES');
}
/* ===== Negritas y cursivas =====
   Se guardan como **negrita** y *cursiva* (o _cursiva_) y se pintan con <strong>/<em>. */
function fmt(s, opts={}){
  let h=esc(s);
  // enlaces escritos como [texto](https://…) o [texto](#r~id)
  h=h.replace(/\[([^\]\n]{1,200})\]\(((?:https?:\/\/|#[rf]~)[^\s)]{1,600})\)/g,(_,t,u)=>u.startsWith('#')?`<a href="${u}" class="rlink">${t}</a>`:`<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
  if(opts.link) h=linkRecipes(h, opts.self);
  h=h.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/__(?=\S)([\s\S]*?\S)__/g,'<strong>$1</strong>');
  h=h.replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?![*\w])/g,'$1<em>$2</em>');
  h=h.replace(/(^|[^_\w])_(?=\S)([^_]*?\S)_(?![_\w])/g,'$1<em>$2</em>');
  return h;
}
/* Si el texto nombra otra receta tuya, se enlaza sola */
function linkRecipes(h, selfId){
  const list=(S.recipes||[]).filter(r=>r.id!==selfId && (r.title||'').trim().length>=4).sort((a,b)=>b.title.length-a.title.length).slice(0,300);
  if(!list.length) return h;
  const parts=h.split(/(<a\b[^>]*>.*?<\/a>|<[^>]+>)/);
  const done=new Set();
  for(let i=0;i<parts.length;i++){
    if(parts[i].startsWith('<')) continue;
    for(const r of list){
      if(done.has(r.id)) continue;
      const t=esc(r.title.trim()).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const re=new RegExp(`(^|[^\\p{L}])(${t})(?![\\p{L}])`,'iu');
      if(re.test(parts[i])){ parts[i]=parts[i].replace(re,(_,a,b)=>`${a}<a href="#r~${r.id}" class="rlink">${b}</a>`); done.add(r.id); break; }
    }
  }
  return parts.join('');
}
/* Convierte HTML pegado (de una web, Word, Google Docs…) en texto con ** y * */
function htmlToMd(html){
  let doc; try{ doc=new DOMParser().parseFromString(html,'text/html'); }catch{ return null; }
  const BLOCK=/^(P|DIV|LI|H[1-6]|TR|BR|UL|OL|SECTION|ARTICLE|BLOCKQUOTE)$/;
  const walk=(n,b,i)=>{
    if(n.nodeType===3) return n.nodeValue.replace(/\s+/g,' ');
    if(n.nodeType!==1) return '';
    const t=n.tagName; if(/^(SCRIPT|STYLE|META|TITLE)$/.test(t)) return '';
    if(t==='BR') return '\n';
    const st=n.getAttribute('style')||'';
    const fw=(st.match(/font-weight\s*:\s*(\w+)/i)||[])[1];
    const isB=!b && (t==='B'||t==='STRONG'||(fw&&(fw==='bold'||+fw>=600)));
    const isI=!i && (t==='I'||t==='EM'||/font-style\s*:\s*italic/i.test(st));
    let inner=[...n.childNodes].map(c=>walk(c,b||isB,i||isI)).join('');
    if(isB||isI){
      const m=inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if(m[2] && !/\n/.test(m[2])){ const mk=(isB?'**':'')+(isI?'*':''); inner=m[1]+mk+m[2]+[...mk].reverse().join('')+m[3]; }
    }
    if(t==='LI') inner='\n'+inner.trim()+'\n';
    else if(BLOCK.test(t)) inner='\n'+inner+'\n';
    return inner;
  };
  return walk(doc.body,false,false).split('\n').map(l=>l.trim()).filter((l,k,a)=>l||(a[k-1]&&a[k-1].trim())).join('\n').trim();
}
function enableRichPaste(ta){
  ta.addEventListener('paste',e=>{
    const html=e.clipboardData?.getData('text/html'); if(!html) return;
    const md=htmlToMd(html); if(md==null) return;
    e.preventDefault(); ta.setRangeText(md, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input'));
  });
  ta.addEventListener('keydown',e=>{
    if(!(e.ctrlKey||e.metaKey)) return;
    const k=e.key.toLowerCase();
    if(k==='b'||k==='n'){ e.preventDefault(); wrapSel(ta,'**'); }
    else if(k==='i'||k==='k'){ e.preventDefault(); wrapSel(ta,'*'); }
  });
}
function wrapSel(ta,mk){
  let a=ta.selectionStart, b=ta.selectionEnd, v=ta.value;
  while(a<b && /\s/.test(v[a])) a++; while(b>a && /\s/.test(v[b-1])) b--;
  const sel=v.slice(a,b);
  if(sel.startsWith(mk) && sel.endsWith(mk) && sel.length>=2*mk.length){ ta.setRangeText(sel.slice(mk.length,-mk.length),a,b,'select'); }
  else if(v.slice(a-mk.length,a)===mk && v.slice(b,b+mk.length)===mk){ ta.setRangeText(sel,a-mk.length,b+mk.length,'select'); }
  else { ta.setRangeText(mk+(sel||'texto')+mk,a,b,'select'); }
  ta.focus(); ta.dispatchEvent(new Event('input'));
}
const fmtBar = id => `<span class="fmtbar"><button type="button" data-fmt="**" data-for="${id}" aria-label="Negrita" title="Negrita (Ctrl+B)"><b>N</b></button><button type="button" data-fmt="*" data-for="${id}" aria-label="Cursiva" title="Cursiva (Ctrl+I)"><i>C</i></button><button type="button" data-fmt="link" data-for="${id}" aria-label="Enlace" title="Poner un enlace en las palabras seleccionadas">${ico('link')}</button></span>`;
// se guarda la selección de cada cuadro de texto para no perderla al tocar los botones (en el móvil se pierde)
['select','keyup','mouseup','touchend','input','focus'].forEach(t=>document.addEventListener(t,e=>{ const ta=e.target; if(ta && ta.tagName==='TEXTAREA') setTimeout(()=>{ ta._sel=[ta.selectionStart,ta.selectionEnd]; },0); },true));
document.addEventListener('mousedown',e=>{ if(e.target.closest('[data-fmt]')) e.preventDefault(); });
document.addEventListener('click',e=>{ const b=e.target.closest('[data-fmt]'); if(!b) return; e.preventDefault(); const ta=document.getElementById(b.dataset.for); if(!ta) return;
  if(document.activeElement!==ta && ta._sel){ ta.focus({preventScroll:true}); ta.setSelectionRange(ta._sel[0],ta._sel[1]); }
  if(b.dataset.fmt==='link') linkSel(ta); else wrapSel(ta,b.dataset.fmt); });
/* Enlace dentro de las palabras: a una web o a otra receta tuya */
function linkSel(ta){
  document.querySelectorAll('.linkpop').forEach(x=>x.remove());
  let a=ta.selectionStart, b=ta.selectionEnd;
  if(a===b){ // sin selección: la palabra donde está el cursor
    const v=ta.value; while(a>0 && /[\p{L}\p{N}]/u.test(v[a-1])) a--; while(b<v.length && /[\p{L}\p{N}]/u.test(v[b])) b++; }
  const sel=ta.value.slice(a,b).trim();
  const box=document.createElement('div'); box.className='linkpop';
  box.innerHTML=`<div class="lp-h"><b>Enlace en «${esc(sel||'texto')}»</b><button type="button" class="x" id="lpNo" aria-label="Cerrar">${ico('x')}</button></div>
    <p class="muted" style="margin:0;font-size:13px">Toca una de tus recetas para enlazarla, o pega la dirección de una web.</p>
    <input class="inp" id="lpUrl" placeholder="Buscar receta o pegar https://…" autocomplete="off" enterkeyhint="done">
    <div class="pick lp-res" id="lpRes"></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn sm pri" id="lpOk">${ico('link')}Poner enlace web</button></div>`;
  (ta.closest('.field')||ta.parentNode).after(box);
  const inp=$('#lpUrl',box), res=$('#lpRes',box), ok=$('#lpOk',box);
  const put=u=>{ const txt=sel||'texto'; ta.focus({preventScroll:true}); ta.setRangeText(`[${txt}](${u})`,a,b,'end'); ta.dispatchEvent(new Event('input')); box.remove(); toast('Enlace puesto'); };
  const draw=()=>{ const q=inp.value.trim().toLowerCase(); const isUrl=/^(https?:\/\/|www\.)/.test(q);
    ok.hidden=!isUrl;
    if(isUrl){ res.innerHTML=''; return; }
    const list=S.recipes.filter(r=>(r.title||'').toLowerCase().includes(q||(sel||'').toLowerCase())||!q).sort(byTitle).slice(0,30);
    res.innerHTML=list.length?list.map(r=>`<button type="button" class="btn sm" data-rid="${esc(r.id)}">${ico('book')}${esc(r.title||'Sin título')}</button>`).join(''):'<p class="muted" style="margin:0">No tienes recetas con ese nombre.</p>'; };
  inp.oninput=draw;
  inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); const q=inp.value.trim(); if(/^(https?:\/\/|www\.)/i.test(q)) put(/^https?:/i.test(q)?q:'https://'+q); else { const f=res.querySelector('[data-rid]'); if(f) put('#r~'+f.dataset.rid); } } else if(e.key==='Escape'){ e.stopPropagation(); box.remove(); } };
  res.onclick=e=>{ const x=e.target.closest('[data-rid]'); if(x) put('#r~'+x.dataset.rid); };
  $('#lpNo',box).onclick=()=>box.remove();
  ok.onclick=()=>{ const q=inp.value.trim(); if(q) put(/^https?:/i.test(q)?q:'https://'+q); };
  draw(); box.scrollIntoView({block:'nearest',behavior:'smooth'});
}

function scaleLine(line,f){
  if(f===1) return line;
  const m = line.match(/^[\s*_]*(\d+\s+\d+\/\d+|\d+\/\d+|\d+[.,]\d+|\d+\s*[½¼¾⅓⅔]|\d+|[½¼¾⅓⅔])/);
  if(!m) return line;
  let s=m[1].trim(), v=0;
  if(/^\d+\s+\d+\/\d+$/.test(s)){const [a,b]=s.split(/\s+/);const [n,d]=b.split('/');v=+a+n/d}
  else if(/^\d+\/\d+$/.test(s)){const [n,d]=s.split('/');v=n/d}
  else if(/^\d+\s*[½¼¾⅓⅔]$/.test(s)){v=parseInt(s)+FRAC[s.slice(-1)]}
  else if(FRAC[s]) v=FRAC[s];
  else v=parseFloat(s.replace(',','.'));
  if(!isFinite(v)||!v) return line;
  return line.replace(m[1], fmtNum(v*f)+(/\s$/.test(m[1])?' ':''));
}

/* ===== Datos ===== */
async function loadState(){
  const st = await api('GET','/state');
  S.me = st.me; S.uid = st.me.id; S.profile = st.me.username ? st.me : null;
  S.profiles = {...st.profiles, [st.me.id]: st.me};
  S.folders = st.folders; S.recipes = st.recipes;
  S.reqIn = st.requests.filter(r=>r.to===S.uid); S.reqOut = st.requests.filter(r=>r.from===S.uid);
  S.chats = st.chats;
  document.documentElement.style.setProperty('--rfs', String(S.me?.prefs?.fontScale||1));
  refresh();
}
const store = {
  async saveRecipe(r,{check=true}={}){ if(check && !S.recipes.some(x=>x.id===r.id)) r=await allergenReview(r); const {id,...body}=r; await api('PUT','/recipes/'+id, body); await loadState(); return r; },
  async deleteRecipe(id){ await api('DELETE','/recipes/'+id); await loadState(); },
  async saveFolder(f){ const {id,...body}=f; await api('PUT','/folders/'+id, body); await loadState(); },
  async deleteFolder(id){ await api('DELETE','/folders/'+id); await loadState(); }
};

async function boot(){
  $('#splashLogo').innerHTML = spoon(70);
  renderTop();
  try{
    const [cfg] = await Promise.all([api('GET','/config'), loadState()]);
    S.ai = !!cfg.ai; S.aiName = cfg.aiName || 'la IA';
  }catch(e){
    $('#main').innerHTML = `<div class="splash"><div>${spoon(60)}<p>No se ha podido conectar con el servidor. Recarga la página en unos segundos.</p></div></div>`;
    return;
  }
  S.booted = true;
  window.addEventListener('hashchange', routeHash);
  const later=restoreFromUrl();
  // tras recargar se conserva la posición en el historial (para atrás y adelante)
  const hs=history.state&&history.state.ef; if(typeof hs==='number'){ NAV.i=NAV.top=hs; }
  render(); later?.(); routeHash(); loadNotices();
  setInterval(()=>{ if(document.visibilityState==='visible') loadState().catch(()=>{}); }, 8000);
  setInterval(()=>{ if(document.visibilityState==='visible') loadNotices(); }, 60000);
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') loadState().catch(()=>{}); });
}

/* ===== Derivados ===== */
function friends(){
  const set=new Set();
  [...S.reqIn,...S.reqOut].forEach(r=>{ if(r.status==='accepted') set.add(r.from===S.uid?r.to:r.from); });
  return [...set];
}
function unreadCount(){
  const lr = S.me?.lastRead||{};
  return S.chats.filter(c=>c.last && c.last.from!==S.uid && (c.ts||0)>(lr[c.id]||0)).length;
}
const pendingIn = () => S.reqIn.filter(r=>r.status==='pending');
const canSocial = () => !!S.profile;

/* ===== Render general ===== */
const isAdminMe = () => !!S.profile && (S.me?.role==='admin' || S.me?.role==='superadmin');
function renderTop(){
  const unread = S.booted && canSocial() ? unreadCount() : 0;
  const pend = S.booted && canSocial() ? pendingIn().length : 0;
  const cur = ['book','famous'].includes(S.view) ? 'library' : S.view;
  const userBox = !S.booted ? '' : canSocial() ? `
      <div class="userbox">
        <button class="user-btn ${['account','admin'].includes(cur)?'active':''}" id="userBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="userMenu" title="Tu cuenta">
          ${avatar(S.uid)}<span class="nl uname">${esc(S.profile.display||S.profile.username)}</span>${ico('down')}
        </button>
        <div class="user-menu" id="userMenu" role="menu" hidden>
          <div class="um-head"><b>${esc(S.profile.display||'')}</b><small>@${esc(S.profile.username)}${S.me.email?' · '+esc(S.me.email):''}</small></div>
          <button role="menuitem" data-act="go" data-v="account" class="${cur==='account'?'active':''}">${ico('user')}Mi cuenta</button>
          ${isAdminMe()?`<button role="menuitem" data-act="go" data-v="admin" class="${cur==='admin'?'active':''}">${ico('shield')}Panel de administración</button>`:''}
          <button role="menuitem" data-act="go" data-v="help">${ico('help')}Manual de uso</button>
          <button role="menuitem" data-act="go" data-v="equiv">${ico('scale')}Equivalencias de medidas</button>
          <a role="menuitem" class="um-link" href="/legal/contacto" target="_blank" rel="noopener">${ico('mail')}Contacto</a>
          <hr>
          <button role="menuitem" class="danger" data-act="logout">${ico('out')}Cerrar sesión</button>
        </div>
      </div>` : `<button class="login" data-act="login">${ico('user')}<span class="nl"><span class="long">Iniciar sesión</span><span class="short">Entrar</span></span></button>`;
  $('#topbar').innerHTML = `
    <button class="brand" data-act="go" data-v="library" aria-label="Entre Fogones, ir a la biblioteca">${spoon(38)}<span class="w"><span class="w1">entre</span><span class="w2">fogones</span></span></button>
    <nav class="nav" aria-label="Secciones">
      <button data-act="go" data-v="library" ${cur==='library'?'aria-current="page"':''}>${ico('book')}<span class="nl">Biblioteca</span></button>
      <button data-act="go" data-v="menu" ${cur==='menu'?'aria-current="page"':''}>${ico('calendar')}<span class="nl">Menú</span></button>
      <button data-act="go" data-v="chat" ${cur==='chat'?'aria-current="page"':''}>${ico('chat')}<span class="nl">Chat</span>${unread?`<span class="badge">${unread}</span>`:''}</button>
      <button data-act="go" data-v="friends" ${cur==='friends'?'aria-current="page"':''}>${ico('users')}<span class="nl">Amigos</span>${pend?`<span class="badge">${pend}</span>`:''}</button>
      ${S.booted?bellHtml():''}${userBox}
    </nav>`;
  const btn=$('#userBtn'), menu=$('#userMenu');
  if(btn) btn.onclick=e=>{ e.stopPropagation(); const open=menu.hidden; menu.hidden=!open; btn.setAttribute('aria-expanded',String(open)); const bp=$('#bellPanel'); if(bp) bp.hidden=true; };
  bindBell();
}
document.addEventListener('click',e=>{ const m=$('#userMenu'); if(m && !m.hidden && (!e.target.closest('.userbox') || e.target.closest('[role=menuitem]'))){ m.hidden=true; $('#userBtn')?.setAttribute('aria-expanded','false'); } });
document.addEventListener('keydown',e=>{ const m=$('#userMenu'); if(e.key==='Escape' && m && !m.hidden){ m.hidden=true; $('#userBtn')?.focus(); } });
function render(){
  if(S.me?.suspended){ renderTop(); $('#main').innerHTML=viewSuspended(); return; }
  document.body.classList.toggle('in-book', S.view==='book');
  document.documentElement.classList.toggle('in-chat', S.view==='chat');
  document.documentElement.classList.toggle('in-menu', S.view==='menu');
  if(['account','admin'].includes(S.view) && !S.profile) S.view='library';
  if(['admin','admuser'].includes(S.view) && !isAdminMe()) S.view='library';
  renderTop();
  const m=$('#main');
  if(S.view!=='famous') S.suggView=null;
  if(S.view==='library'){ m.innerHTML = viewLibrary(); fitSpines(); loadSuggestions(); bindLibSearch(); }
  else if(S.view==='book'){ renderBook(); }
  else if(S.view==='chat'){ m.innerHTML = viewChat(); afterChat(); }
  else if(S.view==='friends'){ m.innerHTML = viewFriends(); afterFriends(); }
  else if(S.view==='account'){ m.innerHTML = viewAccount(); bindAccount(m); }
  else if(S.view==='admin'){ m.innerHTML = viewAdmin(); adminLoad(); }
  else if(S.view==='famous'){ m.innerHTML = viewFamous(); afterFamous(); }
  else if(S.view==='community'){ m.innerHTML = viewCommunity(); afterCommunity(); }
  else if(S.view==='menu'){ m.innerHTML = viewMenu(); afterMenu(); }
  else if(S.view==='help'){ m.innerHTML = viewHelp(); }
  else if(S.view==='admuser'){ m.innerHTML = viewAdmUser(); loadAdmUser(); }
  else if(S.view==='equiv'){ m.innerHTML = viewEquiv(); bindEquiv(); }
  const top=$('.top'); if(top) document.documentElement.style.setProperty('--toph', top.offsetHeight+'px');
  navTrack();
}
let refreshQueued=false;
function refresh(){
  if(!S.booted || refreshQueued) return; refreshQueued=true;
  requestAnimationFrame(()=>{ refreshQueued=false;
    const menuOpen = ($('#userMenu') && !$('#userMenu').hidden) || ($('#bellPanel') && !$('#bellPanel').hidden);
    if(!menuOpen) renderTop();
    if(S.view==='library'){
      if(['libQ','libF'].includes(document.activeElement?.id)){ const b=$('#libRes'); if(b) b.innerHTML=libResultsHtml(); }
      else { const keep=window.scrollY; $('#main').innerHTML=viewLibrary(); fitSpines(); drawSuggestions(); bindLibSearch(); window.scrollTo(0,keep); } }
    else if(S.view==='book'){ if(!S.book.visiting) syncOwnBook(); if(S.view==='book') renderBook(); else render(); }
    else if(S.view==='chat'){ const l=$('#convList'); if(l) l.innerHTML=convListHtml(); else render(); updateConvHeader(); }
    else if(S.view==='friends'){ const l=$('#fside'); if(l) l.innerHTML=friendsSide(); drawSearch(); }
    else if(S.view==='famous') drawSuggestions();
    /* Mi cuenta y el panel no se repintan solos para no perder lo que se está escribiendo */
  });
}
/* ===== Historial: atrás y adelante (botón del móvil, navegador y deslizar desde los bordes) ===== */
const NAV={i:0, top:0, snaps:[], restoring:false, lastPop:0};
const navKey=s=>s.view+'|'+(s.view==='book'?(s.book?.id||''):'')+'|'+(s.view==='chat'?(s.chatWith||''):'')+(s.view==='admuser'?(S.admUserId||''):'');
const navSnap=()=>({view:S.view, book:S.book, page:S.page, chatWith:S.chatWith, key:navKey(S)});
/* La página actual va en la dirección (?v=…) para que al recargar se abra la misma */
function navUrl(){
  const p=new URLSearchParams();
  if(S.view && S.view!=='library') p.set('v',S.view);
  if(S.view==='book' && S.book){ p.set('b',S.book.id); if(S.page) p.set('p',S.page); }
  if(S.view==='chat' && S.chatWith) p.set('c',S.chatWith);
  if(S.view==='admin' && S.admTab && S.admTab!=='resumen') p.set('t',S.admTab);
  if(S.view==='admuser' && S.admUserId) p.set('u',S.admUserId);
  const q=p.toString(); return location.pathname+(q?'?'+q:'');
}
function navTrack(){
  if(NAV.restoring || !S.booted) return;
  const cur=NAV.snaps[NAV.i], s=navSnap();
  if(!cur){ NAV.snaps[NAV.i]=s; try{ history.replaceState({ef:NAV.i},'',navUrl()); }catch{} return; }
  if(cur.key===s.key){ NAV.snaps[NAV.i]=s; try{ history.replaceState({ef:NAV.i},'',navUrl()); }catch{} return; }
  NAV.i++; NAV.top=NAV.i; NAV.snaps.length=NAV.i; NAV.snaps[NAV.i]=s;
  try{ history.pushState({ef:NAV.i},'',navUrl()); }catch{}
}
/* Al recargar: se vuelve a abrir la página en la que estabas */
function restoreFromUrl(){
  const p=new URLSearchParams(location.search), v=p.get('v');
  const ok=['book','chat','friends','account','admin','famous','community','menu','help','equiv','admuser'];
  if(v==='admuser'){ S.admUserId=p.get('u'); S.admUser=null; }
  if(!v || !ok.includes(v)) return null;
  if(v==='admin' && p.get('t')) S.admTab=p.get('t');
  if(v==='chat'){ S.chatWith=p.get('c')||null; S.view='chat'; return null; }
  if(v==='book'){
    const id=p.get('b')||'', page=Math.max(0,parseInt(p.get('p'))||0);
    const own=ownBook(id);
    if(own){ S.book=own; S.page=Math.min(page, Math.max(0,pages().length-2)); S.view='book'; return null; }
    // libros que no son tuyos: se vuelven a pedir al servidor
    if(id.startsWith('au-')){ S.view='admin'; S.admTab='usuarios'; return null; }
    if(id.startsWith('sg-')) return ()=>openSuggestion(id.slice(3));
    if(id.startsWith('v-')||id.startsWith('c-')) return ()=>openShared({kind:'r', id:id.slice(2)});
    if(id) return ()=>openShared({kind:'f', id});
    return null;
  }
  S.view=v; return null;
}
function navRestore(s){
  closeModal();
  if(S.view==='chat') stopChat();
  let view=s.view, book=s.book;
  if(view==='book' && book && !book.visiting){ book=ownBook(book.id); if(!book) view='library'; }
  if(view==='book' && !book) view='library';
  const prev=NAV.snaps[NAV.i-1];
  S.prevView = prev && prev.view!=='book' ? prev.view : 'library';
  S.book = view==='book' ? book : null;
  if(view==='book') S.page=Math.max(0, Math.min(s.page||0, pages().length-2));
  if(view==='chat'){ S.chatWith=s.chatWith; S.msgs=[]; S.askMode=false; }
  NAV.restoring=true; S.view=view;
  try{ render(); } finally { NAV.restoring=false; }
  window.scrollTo(0,0);
}
addEventListener('popstate',e=>{
  const i=e.state && e.state.ef;
  if(typeof i!=='number' || !NAV.snaps[i]){
    // páginas de antes de recargar: se abren según la dirección
    if(location.hash) return;
    NAV.lastPop=Date.now(); closeModal(); if(S.view==='chat') stopChat();
    S.view='library'; S.book=null;
    const later=restoreFromUrl();
    NAV.restoring=true; try{ render(); } finally { NAV.restoring=false; }
    if(typeof i==='number'){ NAV.i=i; NAV.top=Math.max(NAV.top,i); }
    NAV.snaps[NAV.i]=navSnap(); later?.(); window.scrollTo(0,0); return;
  }
  NAV.lastPop=Date.now();
  const cur=NAV.snaps[NAV.i]; if(cur && cur.key===navKey(S)) NAV.snaps[NAV.i]=navSnap();
  NAV.i=i; navRestore(NAV.snaps[i]);
});
/* Deslizar desde el borde izquierdo hacia el centro: página anterior. Desde el derecho: la siguiente. */
(()=>{
  let sx=0, sy=0, edge=0, t0=0, hint=null;
  const EDGE=28;
  const showHint=(dir,dx)=>{
    if(!hint){ hint=document.createElement('div'); hint.className='swipe-hint'; document.body.appendChild(hint); }
    const p=Math.min(1, Math.abs(dx)/90);
    hint.className='swipe-hint '+(dir===1?'l':'r')+(p>=1?' go':'');
    hint.innerHTML=dir===1?'&#8249;':'&#8250;';
    hint.style.opacity=String(p);
    hint.style.transform=`translate(${dir===1?Math.min(dx,90)-50:Math.max(dx,-90)+50}px,-50%)`;
  };
  const hideHint=()=>{ if(hint){ hint.remove(); hint=null; } };
  addEventListener('touchstart',e=>{
    edge=0; if(e.touches.length!==1 || $('#modal-root')?.children.length) return;
    const t=e.touches[0]; sx=t.clientX; sy=t.clientY; t0=Date.now();
    if(sx<=EDGE && NAV.i>0) edge=1; else if(sx>=innerWidth-EDGE && NAV.i<NAV.top) edge=-1;
  },{passive:true});
  addEventListener('touchmove',e=>{
    if(!edge || e.touches.length!==1) return;
    const t=e.touches[0], dx=t.clientX-sx, dy=t.clientY-sy;
    if(Math.abs(dy)>40 && Math.abs(dy)>Math.abs(dx)){ edge=0; hideHint(); return; }
    if(dx*edge>8) showHint(edge,dx);
  },{passive:true});
  addEventListener('touchcancel',()=>{ edge=0; hideHint(); },{passive:true});
  addEventListener('touchend',e=>{
    const dir=edge; edge=0; hideHint(); if(!dir) return;
    const t=e.changedTouches[0], dx=t.clientX-sx, dy=t.clientY-sy;
    if(dx*dir<70 || Math.abs(dy)>Math.abs(dx)*0.8 || Date.now()-t0>1200) return;
    const start=t0;
    // si el navegador ya ha hecho su propio gesto de volver, no se repite
    setTimeout(()=>{ if(NAV.lastPop>=start) return; if(dir===1) history.back(); else history.forward(); },350);
  },{passive:true});
})();
function go(v){
  if(S.view==='chat' && v!=='chat') stopChat();
  if(S.view!=='book') S.prevView=S.view;
  S.view=v; render(); window.scrollTo(0,0);
}

/* ===== Biblioteca ===== */
function spineH(id,name=''){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return Math.min(268,178+(h%34)+Math.max(0,String(name).length-12)*5)}
/* Ajusta el título de cada lomo para que se vea entero: mide el texto y lo reparte en líneas */
function fitSpines(){
  const ctx=(fitSpines.c ||= document.createElement('canvas').getContext('2d'));
  document.querySelectorAll('.spine .st').forEach(st=>{
    const words=st.textContent.trim().split(/\s+/).filter(Boolean);
    const L=st.clientHeight-6, W=st.clientWidth-8;
    if(L<20||W<10) return;
    for(let fs=16; fs>=7.5; fs-=.5){
      ctx.font=`${fs}px "Young Serif", Georgia, serif`;
      const maxLines=Math.max(1, Math.floor(W/(fs*1.12)));
      const sp=ctx.measureText(' ').width; let lines=1, cur=0, ok=true;
      for(const w of words){ const ww=ctx.measureText(w).width; if(ww>L){ ok=false; break; }
        if(!cur) cur=ww; else if(cur+sp+ww<=L) cur+=sp+ww; else { lines++; cur=ww; } }
      if(ok && lines<=maxLines){ st.style.fontSize=fs+'px'; return; }
    }
    st.style.fontSize='7.5px';
  });
}
function viewLibrary(){
  const none = S.recipes.filter(r=>!r.folderId || !S.folders.some(f=>f.id===r.folderId));
  const banner = !S.profile && !lsGet('ef_hide_banner') ? `<div class="banner">${ico('chat')}<span style="flex:1;min-width:200px">Puedes usar la app sin cuenta: tus recetas se guardan en este dispositivo. Inicia sesión o crea una cuenta para tenerlas en todos tus dispositivos, usar la IA, añadir amigos y chatear.</span><button class="btn sm" data-act="login">Iniciar sesión</button><button class="x" data-act="hideBanner" aria-label="Cerrar aviso" title="No volver a mostrar">${ico('x')}</button></div>` : '';
  const slot = b => `<div class="slot">${b}</div>`;
  const books = [
    slot(`<button class="spine all" style="--cloth:#6E4429;height:226px" data-act="openBook" data-id="all" aria-label="Todas las recetas, ${S.recipes.length}"><span class="st">Todas</span><span class="sc">${S.recipes.length}</span></button>`),
    ...S.folders.map(f=>{const n=S.recipes.filter(r=>r.folderId===f.id).length;return slot(`<button class="spine" style="--cloth:${esc(f.color)};color:${inkOn(f.color)};height:${spineH(f.id,f.name)}px" data-act="openBook" data-id="${esc(f.id)}" aria-label="${esc(f.name)}, ${n} recetas"><span class="st">${esc(f.name)}</span><span class="sc">${n}</span></button>`)}),
    none.length?slot(`<button class="spine" style="--cloth:#7A6A5C;height:190px" data-act="openBook" data-id="none" aria-label="Sin recetario, ${none.length}"><span class="st">Sin recetario</span><span class="sc">${none.length}</span></button>`):'',
    slot(`<button class="spine add" style="height:200px" data-act="newFolder" aria-label="Nuevo recetario">${ico('plus')}<span class="st">Nuevo recetario</span></button>`)
  ].join('');
  const recent = S.recipes.slice(0,3);
  return `${banner}
  <div class="lib-head lib-actions">
    <div class="row nowrap">
      <button class="btn pri" data-act="newRecipe">${ico('plus')}Nueva receta</button>
      <button class="btn" data-act="openLink" title="Abre una receta o un recetario que alguien te ha compartido con un enlace">${ico('link')}<span class="lbl-long">Abrir enlace compartido</span><span class="lbl-short">Abrir enlace</span></button>
    </div>
  </div>
  <div class="fam-tools lib-search">
    <input id="libQ" class="inp" type="search" placeholder="Buscar en tus recetas: nombre o ingrediente" value="${esc(S.libQ||'')}" aria-label="Buscar en tus recetas">
    <select id="libF" class="inp" aria-label="Tipo de receta">${libTypeOptions()}</select>
  </div>
  <section class="lib-res" id="libRes">${libResultsHtml()}</section>
  <div class="shelf-wrap"><div class="shelves">${books}</div></div>
  <section class="recent">
    <h2>Últimas recetas</h2>
    ${recent.length?`<div class="cards fam-grid">${recent.map(libCard).join('')}</div>`:
      `<div class="empty">${spoon(54,'var(--muted)','var(--bg)')}<p style="margin:0">Aquí aparecerán tus recetas. Pega un enlace de una web de cocina o de un vídeo, haz una foto a una receta, pídesela a ${esc(aiName())} o escríbela tú.</p><button class="btn pri" data-act="newRecipe">${ico('plus')}Añadir la primera receta</button></div>`}
  </section>
  <section class="recent sugg">
    <div class="sugg-h"><h2>Recetas recomendadas</h2><p class="muted">Cambian cada día. Ábrelas y guarda las que te gusten en tus recetarios.</p></div>
    <div class="cards" id="suggList">${suggHtml(6)}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="go" data-v="famous">Ver todas las recetas recomendadas ${ico('next')}</button></div>
  </section>
  <section class="recent sugg">
    <div class="sugg-h"><h2>Recetas preferidas por los usuarios</h2><p class="muted">Las que otras personas han creado y compartido con todo el mundo.</p></div>
    <div class="cards" id="comPrev">${communityPreviewHtml()}</div>
    <div class="row" style="margin-top:12px"><button class="btn" data-act="go" data-v="community">Ver todas las recetas preferidas por los usuarios ${ico('next')}</button></div>
  </section>`;
}
/* Buscador de la biblioteca */
/* Tipos de receta, como en las recomendadas: Postres (26), Huevos (18)… */
function libTypeOptions(){
  const counts={}; S.recipes.forEach(r=>{ if(r.category) counts[r.category]=(counts[r.category]||0)+1; });
  const cats=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return `<option value="">Todos los tipos</option>${cats.map(([c,n])=>`<option value="${esc(c)}" ${S.libF===c?'selected':''}>${esc(c)} (${n})</option>`).join('')}`;
}
function libCard(r){
  return `<div class="rcard sg"><button class="sg-open" data-act="openRecipe" data-id="${esc(r.id)}">
    <span class="thumb">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(34,'var(--accent)','var(--accent-soft)')}</span>
    <span style="min-width:0;flex:1"><span class="tt">${esc(r.title||'Sin título')}</span><span class="mm">${esc([r.category,r.time].filter(Boolean).join(' · ')||S.folders.find(f=>f.id===r.folderId)?.name||'')}</span></span></button>
    <button class="btn sm tbtn" data-act="shareRecipe" data-id="${esc(r.id)}" aria-label="Compartir" title="Compartir">${ico('share')}<span class="lbl">Compartir</span></button></div>`;
}
function libResultsHtml(){
  const q=(S.libQ||'').trim().toLowerCase(), f=S.libF||'';
  if(!q && !f) return '';
  const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const nq=norm(q);
  const list=S.recipes.filter(r=>{
    if(f && r.category!==f) return false;
    if(!nq) return true;
    return norm(r.title).includes(nq) || (r.ingredients||[]).some(i=>norm(i).includes(nq)) || norm(r.notes).includes(nq);
  }).sort(byTitle);
  return `<div class="lr-h"><p class="muted" style="margin:0;font-size:14px">${list.length} ${list.length===1?'receta':'recetas'}</p><button class="btn ghost sm" data-act="libClear">${ico('x')}Quitar búsqueda</button></div>
    ${list.length?`<div class="cards fam-grid">${list.slice(0,60).map(libCard).join('')}</div>`:'<p class="muted" style="margin:0">No tienes recetas con esa búsqueda.</p>'}`;
}
let libT=null;
function bindLibSearch(){
  const i=$('#libQ'), f=$('#libF'); if(!i) return;
  i.oninput=()=>{ S.libQ=i.value; clearTimeout(libT); libT=setTimeout(()=>{ const b=$('#libRes'); if(b) b.innerHTML=libResultsHtml(); },150); };
  f.onchange=()=>{ S.libF=f.value; $('#libRes').innerHTML=libResultsHtml(); };
}
function cardHtml(r){
  const f=S.folders.find(f=>f.id===r.folderId);
  return `<button class="rcard" data-act="openRecipe" data-id="${esc(r.id)}">
    <span class="thumb">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(34,'var(--accent)','var(--accent-soft)')}</span>
    <span style="min-width:0"><span class="tt">${esc(r.title||'Sin título')}</span><span class="mm">${esc([f?.name, r.time].filter(Boolean).join(' · ')||'Sin recetario')}</span></span>
  </button>`;
}
/* Recetas recomendadas */
function suggHtml(max){
  const list=S.suggView || S.sugg;
  if(!list) return `<p class="muted" style="margin:0">Cargando ideas…</p>`;
  if(!list.length) return `<p class="muted" style="margin:0">${S.suggView?'No hay recetas con esa búsqueda.':'Estamos preparando las recetas. Vuelve en un rato.'}</p>`;
  const saved=new Set(S.recipes.map(r=>r.fromSugg).filter(Boolean));
  let shown=list;
  if(max){
    // en la biblioteca: 5 distintas cada día, sin las que ya tienes guardadas
    const day=new Date().toLocaleDateString('sv-SE');
    const h=t=>{ let x=2166136261; for(const c of t){ x^=c.charCodeAt(0); x=Math.imul(x,16777619)>>>0; } return x; };
    const pool=list.filter(s=>!saved.has(s.id));
    shown=pool.map(s=>({s,k:(s.image?0:2**32)+h(day+s.id)})).sort((a,b)=>a.k-b.k).slice(0,max).map(x=>x.s);
    if(!shown.length) return `<p class="muted" style="margin:0">Ya tienes guardadas todas las recetas recomendadas. ¡Qué cocinillas!</p>`;
  }
  return shown.map(s=>`<div class="rcard sg">
    <button class="sg-open" data-act="openSugg" data-id="${esc(s.id)}">
      <span class="thumb">${s.image?`<img src="${esc(s.image)}" alt="" loading="lazy">`:spoon(34,'var(--accent)','var(--accent-soft)')}</span>
      <span style="min-width:0;flex:1"><span class="tt">${esc(s.title)}</span><span class="mm">${esc([s.category,s.time].filter(Boolean).join(' · '))}</span></span></button>
    ${saved.has(s.id)?`<span class="saved" title="Ya está en tus recetarios">${ico('check')}</span>`:`<button class="btn sm tbtn" data-act="addSugg" data-id="${esc(s.id)}" aria-label="Añadir a un recetario" title="Añadir a un recetario">${ico('plus')}<span class="lbl">Añadir</span></button>`}
  </div>`).join('');
}
function drawSuggestions(){ const el=$('#suggList'); if(el) el.innerHTML=suggHtml(S.view==='library'?6:0); }
let suggLoaded=0;
async function loadSuggestions(){
  if(S.sugg && Date.now()-suggLoaded<5*60e3){ drawSuggestions(); return; }
  try{ const d=await api('GET','/suggestions'); S.sugg=d.items; S.suggCats=d.cats; suggLoaded=Date.now(); }catch{ S.sugg=S.sugg||[]; }
  drawSuggestions();
}
/* Todas las recetas famosas, con buscador y tipos */
function viewFamous(){
  const cats=S.suggCats||[];
  return `<div class="book-head"><button class="btn ghost sm tbtn" data-act="go" data-v="library" aria-label="Biblioteca">${ico('back')}<span class="lbl">Biblioteca</span></button><h1>Recetas recomendadas</h1></div>
    <div class="fam-tools">
      <input id="famQ" class="inp" type="search" placeholder="Buscar: tarta de queso, croquetas, pollo…" value="${esc(S.famQ||'')}" aria-label="Buscar recetas recomendadas">
      <select id="famCat" class="inp" aria-label="Tipo de receta"><option value="">Todos los tipos</option>${cats.map(c=>`<option value="${esc(c.category)}" ${S.famCat===c.category?'selected':''}>${esc(c.category)} (${c.n})</option>`).join('')}</select>
    </div>
    <p class="muted" id="famCount" style="margin:0 0 10px;font-size:14px"></p>
    <div class="cards fam-grid" id="suggList">${suggHtml(0)}</div>`;
}
let famT=null;
async function famSearch(){
  try{ const d=await api('GET',`/suggestions?q=${encodeURIComponent(S.famQ||'')}&cat=${encodeURIComponent(S.famCat||'')}`);
    S.suggView=d.items; S.suggCats=d.cats; drawSuggestions();
    const c=$('#famCount'); if(c) c.textContent=`${d.items.length} ${d.items.length===1?'receta':'recetas'}`; }catch{}
}
function afterFamous(){
  const q=$('#famQ'), c=$('#famCat');
  q.oninput=()=>{ S.famQ=q.value; clearTimeout(famT); famT=setTimeout(famSearch,250); };
  c.onchange=()=>{ S.famCat=c.value; famSearch(); };
  famSearch();
}
async function addSuggestion(id){
  folderPicker('Guardar en…', async fid=>{
    try{
      const r=await api('GET','/suggestions/'+id);
      const {suggId, ...rest}=r;
      await store.saveRecipe({...rest, id:gid(), folderId:fid, fromSugg:suggId, source:'', created:now()});
      toast('Guardada en tu recetario');
    }catch(err){ toast(err.error||'No se ha podido guardar esa receta'); }
  });
}
async function openSuggestion(id){
  try{ const r=await api('GET','/suggestions/'+id);
    showVisiting({id:'sg-'+id, name:r.title, color:'#6E4429', owner:null, ownerName:'', visiting:true, recipes:[r]}, 2);
  }catch(err){ toast(err.error||'No se ha podido abrir'); }
}

/* ===== Libro =====
   El libro es decorativo: muestra la portada, el índice o la receta a doble página.
   Debajo va lo que se lee y se usa: el listado de recetas o la receta completa. */
const byTitle = (a,b)=>(a.title||'').localeCompare(b.title||'','es');
function ownBook(id){
  if(id==='all') return {id:'all', name:'Todas mis recetas', color:'#6E4429', owner:S.uid, recipes:[...S.recipes].sort(byTitle)};
  if(id==='none') return {id:'none', name:'Sin recetario', color:'#7A6A5C', owner:S.uid, recipes:S.recipes.filter(r=>!r.folderId||!S.folders.some(f=>f.id===r.folderId)).sort(byTitle)};
  const f=S.folders.find(f=>f.id===id); if(!f) return null;
  return {id:f.id, name:f.name, color:f.color, owner:S.uid, folder:true, recipes:S.recipes.filter(r=>r.folderId===f.id).sort(byTitle)};
}
function syncOwnBook(){
  const b = ownBook(S.book.id);
  if(!b){ S.view='library'; S.book=null; return; }
  const curR = currentRecipe();
  S.book = b;
  const focusId = S.pendingFocus || curR?.id;
  if(focusId){ const i=b.recipes.findIndex(r=>r.id===focusId); if(i>=0){ S.page = pageOfRecipe(i); if(S.pendingFocus===focusId) S.pendingFocus=null; } }
  S.page = Math.max(0, Math.min(S.page, pages().length-2));
}
function pages(){
  const p=[{k:'title'},{k:'index'}];
  S.book.recipes.forEach(r=>{p.push({k:'rl',r});p.push({k:'rr',r});});
  if(p.length%2) p.push({k:'end'});
  return p;
}
const pageOfRecipe = i => 2+2*i;
function currentRecipe(){ if(!S.book) return null; const p=pages(); return p[S.page]?.r || p[S.page+1]?.r || null; }
function openBook(id, recipeId){
  const b=ownBook(id); if(!b) return;
  S.book=b; S.page=0;
  if(recipeId){ const i=b.recipes.findIndex(r=>r.id===recipeId); if(i>=0) S.page=pageOfRecipe(i); }
  if(S.view!=='book') S.prevView=S.view;
  if(S.view==='chat') stopChat();
  S.view='book'; render(); window.scrollTo(0,0);
}
const tbBtn=(act,attrs,icon,label,cls='')=>`<button class="btn sm tbtn ${cls}" data-act="${act}"${attrs} aria-label="${label}" title="${label}">${ico(icon)}<span class="lbl">${label}</span></button>`;
function bookTools(){
  const b=S.book, cur=currentRecipe();
  if(b.visiting){
    let t = cur ? tbBtn('saveCopy','','save','Guardar en mi recetario','pri')+tbBtn('pdfRecipe',` data-id="${esc(cur.suggId?'sg:'+cur.suggId:cur.id)}"`,'pdf','PDF') : '';
    if(b.folder && b.recipes.length) t += tbBtn('saveFolderCopy','','book','Guardar el recetario entero');
    return t;
  }
  if(cur){ const a=` data-id="${esc(cur.id)}"`; return tbBtn('shareRecipe',a,'share','Compartir')+tbBtn('pdfRecipe',a,'pdf','PDF')+tbBtn('moveRecipe',a,'move','Mover')+tbBtn('delRecipe',a,'trash','Borrar','danger'); }
  const pdfF = b.recipes.length ? tbBtn('pdfFolder',` data-id="${esc(b.id)}"`,'pdf','PDF') : '';
  if(b.folder) return tbBtn('shareFolder','','share','Compartir recetario')+pdfF+tbBtn('editFolder','','edit','Renombrar o color')+tbBtn('delFolder','','trash','Borrar recetario','danger');
  return pdfF;
}
function servSelect(r, cls=''){
  const base=parseInt(r.servings)||0; if(!base) return r.servings?`<span>${esc(r.servings)}</span>`:'';
  const shown=S.scale[r.id]||base, max=Math.max(24, base*3);
  return `<label class="servsel ${cls}"><select data-serv="${esc(r.id)}" aria-label="Raciones">${Array.from({length:max},(_,i)=>i+1).map(n=>`<option value="${n}" ${n===shown?'selected':''}>${n}</option>`).join('')}</select><span>${shown===1?'ración':'raciones'}</span></label>`;
}
const scaleOf = r => { const base=parseInt(r.servings)||0; return base ? (S.scale[r.id]||base)/base : 1; };
function viewBook(){
  const b=S.book, p=pages(), total=p.length;
  if(S.page%2) S.page--;
  const anim = k => S.turn==='next' ? (k===1?'leaf-in-r':'') : S.turn==='prev' ? (k===0?'leaf-in-l':'') : '';
  const pagesHtml = [S.page,S.page+1].map((i,k)=>`<article class="page ${k?'r':'l'} ${anim(k)}" data-pi="${i}">${pageHtml(p[i],i+1)}</article>`).join('');
  const label = `Páginas ${S.page+1}–${S.page+2} de ${total}`;
  const ownerLabel = b.visiting ? `de ${esc(b.ownerName||'')}` : '';
  return `<div class="book-head">
      <button class="btn ghost sm tbtn" data-act="closeBook" aria-label="${b.visiting?'Volver':'Estantería'}">${ico('back')}<span class="lbl">${b.visiting?'Volver':'Estantería'}</span></button>
      <h1>${esc(b.name)} <span class="muted" style="font-weight:500;font-size:15px">${ownerLabel}</span></h1>
      <span class="sp"></span>
      <div class="row nowrap">${bookTools()}</div>
    </div>
    <div class="book-stage" id="stage"><div class="book" id="book" style="--cloth:${esc(b.color||'#2F5D46')}"><div class="spread">${pagesHtml}</div></div></div>
    <div class="book-foot">
      <div class="pager"><button class="btn" data-act="prevPage" aria-label="Página anterior" ${S.page<=0?'disabled':''}>${ico('back')}</button><span class="muted">${label}</span><button class="btn" data-act="nextPage" aria-label="Página siguiente" ${S.page+2>=total?'disabled':''}>${ico('next')}</button></div>
      ${b.visiting?'':currentRecipe()?`<button class="btn pri sm tbtn" data-act="editRecipe" data-id="${esc(currentRecipe().id)}" aria-label="Editar receta">${ico('edit')}<span class="lbl">Editar</span></button>`:`<button class="btn pri sm tbtn" data-act="newRecipe" data-folder="${b.folder?esc(b.id):''}" aria-label="Añadir receta aquí">${ico('plus')}<span class="lbl">Añadir receta aquí</span></button>`}
    </div>
    <section class="below" id="below">${belowHtml()}</section>`;
}
/* Lo que va debajo del libro */
function belowHtml(){
  const b=S.book, r=currentRecipe();
  if(!r){
    if(!b.recipes.length) return `<div class="empty">${spoon(46,'var(--muted)','var(--bg)')}<p style="margin:0">Este recetario todavía está vacío.</p>${b.visiting?'':`<button class="btn pri" data-act="newRecipe" data-folder="${b.folder?esc(b.id):''}">${ico('plus')}Añadir una receta</button>`}</div>`;
    return `<h2 class="below-h">${b.recipes.length} ${b.recipes.length===1?'receta':'recetas'}</h2>
      <div class="rlist">${b.recipes.map((x,i)=>`<button class="rrow" data-act="goPage" data-p="${pageOfRecipe(i)}">
        <span class="thumb sm">${x.image?`<img src="${esc(x.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(26,'var(--accent)','var(--accent-soft)')}</span>
        <span class="rr-t">${esc(x.title||'Sin título')}</span><span class="rr-m">${esc([x.time,x.difficulty].filter(Boolean).join(' · '))}</span>${ico('next')}</button>`).join('')}</div>`;
  }
  const f=scaleOf(r);
  const from = r.fromUid && r.fromUid!==S.uid && S.profiles[r.fromUid] ? `<p class="src">Compartida por ${esc(pname(r.fromUid))}</p>`:'';
  return `<article class="recipe-read">
    <header><h2>${esc(r.title||'Sin título')}</h2>
      <div class="meta">${servSelect(r)}${r.time?`<span>${ico('clock')}${esc(r.time)}</span>`:''}${r.difficulty?`<span>${esc(r.difficulty)}</span>`:''}</div></header>
    <div class="rr-cols">
      <section><h3>Ingredientes</h3>${(r.ingredients||[]).length?`<ul class="ing">${r.ingredients.map(i=>`<li>${fmt(scaleLine(i,f))}</li>`).join('')}</ul>`:'<p class="muted">Sin ingredientes apuntados.</p>'}</section>
      <section><h3>Preparación</h3>${(r.steps||[]).length?`<ol class="steps">${r.steps.map(s=>`<li><span>${fmt(s,{link:!b.visiting,self:r.id})}</span></li>`).join('')}</ol>`:'<p class="muted">Sin pasos apuntados.</p>'}
        ${r.notes?`<p class="note">${fmt(r.notes,{link:!b.visiting,self:r.id})}</p>`:''}
        ${r.credit?`<p class="src">Receta de ${esc(r.credit)}</p>`:''}
        ${r.source?`<p class="src">Fuente: <a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(r.source)}</a></p>`:''}${from}</section>
    </div>${nutritionHtml(r)}</article>`;
}
/* Tabla nutricional por ración (la calcula la IA al guardar la receta) */
/* Información nutricional como en las etiquetas (Reglamento UE 1169/2011): por 100 g, por ración y % de la ingesta de referencia */
const NUTRI_ROWS=[['Valor energético','kcal',1,2000],['Grasas','fat',1,70],['de las cuales saturadas','satfat',0,20],['Hidratos de carbono','carbs',1,260],['de los cuales azúcares','sugars',0,90],['Fibra alimentaria','fiber',1,null],['Proteínas','protein',1,50],['Sal','salt',1,6]];
function nutritionHtml(r){
  const n=r.nutrition;
  if(!n||!n.kcal) return (S.recipes.some(x=>x.id===r.id) && S.ai) ? `<section class="nutri"><h3>Información nutricional</h3><p class="muted" style="margin:0">Calculándola… aparecerá en unos segundos.</p></section>` : '';
  const per=n.grams?100/n.grams:null;
  const num=v=>(Math.round(v*10)/10).toLocaleString('es-ES');
  const val=(k,f)=>{ if(k==='kcal'){ const kc=n.kcal*f; return `${Math.round(kc*4.184).toLocaleString('es-ES')} kJ<br>${Math.round(kc).toLocaleString('es-ES')} kcal`; } return n[k]==null?'—':num(n[k]*f)+' g'; };
  const ir=(k,ref)=>{ if(!ref||n[k]==null) return ''; return Math.round(n[k]/ref*100)+' %'; };
  return `<section class="nutri"><h3>Información nutricional</h3>
    <div class="nutri-w"><table class="nutri-t"><thead><tr><th></th>${per?'<th>Por 100 g</th>':''}<th>Por ración${n.grams?`<small>${Math.round(n.grams)} g</small>`:''}</th><th>% IR*<small>por ración</small></th></tr></thead>
    <tbody>${NUTRI_ROWS.map(([a,k,main,ref])=>`<tr class="${main?'':'sub'}"><th scope="row">${a}</th>${per?`<td>${val(k,per)}</td>`:''}<td>${val(k,1)}</td><td>${ir(k,ref)}</td></tr>`).join('')}</tbody></table></div>
    <p class="nutri-note">*Ingesta de referencia de un adulto medio (8.400 kJ / 2.000 kcal). Valores aproximados: los calcula la IA a partir de los ingredientes y las cantidades de la receta, con tablas de composición de alimentos; no son un análisis de laboratorio.</p></section>`;
}
function pageHtml(p,num){
  const b=S.book; if(!p) return '';
  const pn=`<span class="pn">${num}</span>`;
  const wrap = h => `<div class="pc">${h}</div><span class="more" aria-hidden="true">Sigue abajo ↓</span>${pn}`;
  if(p.k==='title'){
    const who = b.visiting ? (b.ownerName||'') : (S.profile?.display||'');
    return wrap(`<div class="title-page">${spoon(64,'var(--paper-ink)','var(--paper)')}<div class="orn"></div><h2>${esc(b.name)}</h2><div class="orn"></div>
      <p style="margin:0;color:var(--paper-muted)">${b.recipes.length} ${b.recipes.length===1?'receta':'recetas'}</p>
      ${who?`<p class="by" style="margin:0">de la cocina de ${esc(who)}</p>`:''}</div>`);
  }
  if(p.k==='index'){
    if(!b.recipes.length) return wrap(`<h2>Índice</h2><p style="color:var(--paper-muted)">Este recetario todavía está en blanco.</p>`);
    return wrap(`<h2>Índice</h2><ol class="toc">${b.recipes.map((r,i)=>`<li><button data-act="goPage" data-p="${pageOfRecipe(i)}"><span class="tn">${esc(r.title||'Sin título')}</span><span class="dots"></span><span class="tp">${pageOfRecipe(i)+1}</span></button></li>`).join('')}</ol>`);
  }
  if(p.k==='end') return wrap(`<div class="title-page"><div class="orn"></div><p class="by">Fin</p><div class="orn"></div></div>`);
  const r=p.r, f=scaleOf(r);
  if(p.k==='rl'){
    return wrap(`<h2>${esc(r.title||'Sin título')}</h2>
      <div class="meta">${(()=>{ const n=parseInt(r.servings)?(S.scale[r.id]||parseInt(r.servings)):0; return n?`<span>${n} ${n===1?'ración':'raciones'}</span>`:(r.servings?`<span>${esc(r.servings)}</span>`:''); })()}${r.time?`<span>${esc(r.time)}</span>`:''}${r.difficulty?`<span>${esc(r.difficulty)}</span>`:''}</div>
      ${r.image?`<figure class="pimgw"><img class="pimg" src="${esc(r.image)}" alt="${esc(r.title||'')}" referrerpolicy="no-referrer" onload="fitPages()" onerror="this.parentNode.remove();fitPages()"></figure>`:''}
      <h3>Ingredientes</h3>
      ${(r.ingredients||[]).length?`<ul class="ing">${r.ingredients.map(i=>`<li>${fmt(scaleLine(i,f))}</li>`).join('')}</ul>`:'<p style="color:var(--paper-muted)">Sin ingredientes apuntados.</p>'}`);
  }
  if(p.k==='rr'){
    return wrap(`<h3 style="margin-top:0">Preparación</h3>
      ${(r.steps||[]).length?`<ol class="steps">${r.steps.map(s=>`<li><span>${fmt(s)}</span></li>`).join('')}</ol>`:'<p style="color:var(--paper-muted)">Sin pasos apuntados.</p>'}
      ${r.notes?`<p class="note">${fmt(r.notes)}</p>`:''}`);
  }
  return pn;
}
function renderBook(){
  document.body.classList.add('in-book');
  $('#main').innerHTML=viewBook();
  layoutBook();
  navTrack();
}
/* Tamaño del libro: cabe en la pantalla y deja ver lo de debajo */
function layoutBook(){
  const stage=$('#stage'), book=$('#book'); if(!stage||!book) return;
  const W=stage.clientWidth;
  const top=stage.getBoundingClientRect().top + window.scrollY;
  const foot=$('.book-foot'); const fh=foot?foot.offsetHeight+16:60;
  let H=Math.min(window.innerHeight - top - fh - 14, window.innerHeight*0.62);
  H=Math.max(H, 240);
  const bp=Math.round(Math.max(6, Math.min(16, W*0.012)));
  const AR=0.72;
  const ph=Math.max(150, Math.min(H-2*bp, (W-2*bp-8)/(AR*2)));
  book.style.setProperty('--bp', bp+'px');
  book.style.width=Math.round(ph*AR*2+2*bp)+'px';
  book.style.height=Math.round(ph+2*bp)+'px';
  fitPages();
}
/* El texto de cada página se ajusta para verse entero; en una receta, las dos páginas usan el mismo tamaño */
function fitPages(){
  const pgs=[...document.querySelectorAll('#book .page')]; let sizes=[];
  pgs.forEach(pg=>{
    const pc=pg.querySelector('.pc'); if(!pc) return;
    const fits=()=>pc.scrollHeight<=pc.clientHeight+1 && pc.scrollWidth<=pc.clientWidth+1;
    let hi=Math.max(6, pg.clientHeight/27), lo=3;
    pg.style.fontSize=hi+'px';
    if(!fits()){ for(let k=0;k<14;k++){ const mid=(lo+hi)/2; pg.style.fontSize=mid+'px'; if(fits()) lo=mid; else hi=mid; } hi=lo; }
    sizes.push(hi);
  });
  const isRecipe = pgs.length===2 && pgs.every(pg=>/rl|rr/.test(String(pages()[+pg.dataset.pi]?.k)));
  pgs.forEach((pg,i)=>{
    const pc=pg.querySelector('.pc'); if(!pc) return;
    const fs = isRecipe ? Math.min(...sizes) : sizes[i];
    pg.style.fontSize=fs+'px';
    pg.classList.toggle('cut', pc.scrollHeight>pc.clientHeight+1);
  });
}
function turn(dir){
  const total=pages().length;
  const np=S.page+(dir==='next'?2:-2); if(np<0||np>=total) return; S.page=np;
  S.turn=dir; renderBook(); S.turn=null;
}
document.addEventListener('keydown',e=>{
  if(S.view!=='book' || $('#modal-root').children.length || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  if(e.key==='ArrowRight') turn('next'); else if(e.key==='ArrowLeft') turn('prev');
});
document.addEventListener('change',e=>{
  const sel=e.target.closest('select[data-serv]'); if(!sel) return;
  S.scale[sel.dataset.serv]=+sel.value;
  if(S.view==='book') renderBook();
});
let resizeT=null;
addEventListener('resize',()=>{ clearTimeout(resizeT); resizeT=setTimeout(()=>{ if(S.view==='book') layoutBook(); },80); });
if(document.fonts?.ready) document.fonts.ready.then(()=>{ if(S.view==='book') layoutBook(); if(S.view==='library') fitSpines(); });

/* ===== Modales ===== */
function openModal(html,{wide=false,onClose}={}){
  const root=$('#modal-root');
  root.innerHTML=`<div class="scrim" data-scrim><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div></div>`;
  root._onClose=onClose;
  document.documentElement.classList.add('modal-open');
  setTimeout(()=>root.querySelector('input:not([readonly]),textarea,select')?.focus(),30);
  return root.querySelector('.modal');
}
function closeModal(){ const root=$('#modal-root'); const cb=root._onClose; root.innerHTML=''; root._onClose=null; document.documentElement.classList.remove('modal-open'); cb?.(); }
function promptBox(title, label, {ok='Aceptar', value='', required=true, hint=''}={}){
  return new Promise(res=>{
    const m=openModal(`${mHead(title)}<form id="pbF" style="display:grid;gap:12px"><div class="field"><label for="pbT">${esc(label)}</label><textarea id="pbT" class="inp" rows="4" maxlength="1000">${esc(value)}</textarea>${hint?`<span class="muted" style="font-size:13px">${esc(hint)}</span>`:''}</div>
      <div id="pbS"></div><div class="row" style="justify-content:flex-end"><button type="button" class="btn" id="pbNo">Cancelar</button><button class="btn pri">${esc(ok)}</button></div></form>`,{onClose:()=>res(null)});
    $('#pbNo',m).onclick=()=>closeModal();
    $('#pbF',m).onsubmit=e=>{ e.preventDefault(); const v=$('#pbT',m).value.trim(); if(required&&!v){ $('#pbS',m).innerHTML='<p class="err">Escribe algo para seguir.</p>'; return; } $('#modal-root')._onClose=null; closeModal(); res(v); };
  });
}
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && $('#modal-root').children.length) closeModal(); });
document.addEventListener('mousedown',e=>{ if(e.target.matches?.('[data-scrim]')) closeModal(); });
const mHead = t => `<div class="modal-h"><h2>${esc(t)}</h2><button class="x" data-act="closeModal" aria-label="Cerrar">${ico('x')}</button></div>`;
function confirmBox(text, ok='Borrar'){
  return new Promise(res=>{
    const m=openModal(`${mHead('¿Seguro?')}<p style="margin:0">${esc(text)}</p><div class="row" style="justify-content:flex-end"><button class="btn" id="cfNo">Cancelar</button><button class="btn pri" id="cfYes">${esc(ok)}</button></div>`,{onClose:()=>res(false)});
    $('#cfNo',m).onclick=()=>closeModal();
    $('#cfYes',m).onclick=()=>{ $('#modal-root')._onClose=null; closeModal(); res(true); };
  });
}
function folderPicker(title, cb, {allowNone=true}={}){
  const m=openModal(`${mHead(title)}<div class="pick">
    ${S.folders.map(f=>`<button class="btn" data-fid="${esc(f.id)}"><span style="width:14px;height:20px;border-radius:2px;background:${esc(f.color)};display:inline-block"></span>${esc(f.name)}</button>`).join('')}
    ${allowNone?`<button class="btn" data-fid="">Sin recetario</button>`:''}
    <button class="btn pri" data-newf>${ico('plus')}Nuevo recetario</button>
  </div>`);
  m.querySelectorAll('[data-fid]').forEach(b=>b.onclick=()=>{closeModal();cb(b.dataset.fid||null)});
  $('[data-newf]',m).onclick=()=>{ closeModal(); folderModal(null,{onCreated:id=>cb(id), simple:true}); };
}
/* Desplegable de recetarios con la opción de crear uno nuevo */
const folderOptions = sel => `${S.folders.map(f=>`<option value="${esc(f.id)}" ${f.id===sel?'selected':''}>${esc(f.name)}</option>`).join('')}<option value="" ${!sel?'selected':''}>Sin recetario</option><option value="__new">＋ Nuevo recetario…</option>`;
function bindFolderSelect(select, onPick){
  let last=select.value;
  select.addEventListener('change',()=>{
    if(select.value!=='__new'){ last=select.value; onPick?.(last); return; }
    select.value=last;
    const name=prompt('Nombre del nuevo recetario'); if(!name||!name.trim()) return;
    const f={id:gid(), name:name.trim().slice(0,40), color:CLOTHS[S.folders.length%CLOTHS.length][0], created:now()};
    store.saveFolder(f).then(()=>{ select.innerHTML=folderOptions(f.id); last=f.id; onPick?.(f.id); toast('Recetario creado'); }).catch(err=>toast(err.error||'No se pudo crear'));
  });
}

/* ===== Recetario ===== */
function folderModal(f,{onCreated,simple}={}){
  const isNew=!f; f=f||{id:gid(),name:'',color:CLOTHS[(S.folders.length)%CLOTHS.length][0],created:now()};
  let color=f.color; const pickMine=new Set(), pickSugg=new Set();
  const bulk = isNew && !simple;
  const m=openModal(`${mHead(isNew?'Nuevo recetario':'Editar recetario')}
    <form id="ff" style="display:grid;gap:16px">
      <div class="field"><label for="fname">Nombre</label><input id="fname" class="inp" required maxlength="40" value="${esc(f.name)}" placeholder="Postres, Cenas rápidas, De la abuela…"></div>
      <div class="field"><label>Color de la tela</label>${colorField('fcolor', color, CLOTHS, MORE_CLOTHS)}</div>
      ${bulk?`<div class="field"><label>Añadir recetas que ya tienes (opcional)</label>
        <div class="tabs" role="tablist"><button type="button" role="tab" data-bt="mine" aria-selected="true">Subidas por ti</button><button type="button" role="tab" data-bt="sugg" aria-selected="false">Recomendadas</button></div>
        <input id="bq" class="inp" type="search" placeholder="Buscar" aria-label="Buscar recetas">
        <div class="pick bulk-pick" id="bpick"></div><p class="muted" id="bcount" style="margin:0;font-size:13px"></p></div>`:''}
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="fgo">${isNew?'Crear recetario':'Guardar'}</button></div>
    </form>`,{wide:bulk});
  initColorField(m,'fcolor',c=>{color=c});
  let tab='mine';
  const drawPick=()=>{ if(!bulk) return; const q=($('#bq',m).value||'').trim().toLowerCase();
    const list = tab==='mine' ? S.recipes.map(r=>({id:r.id,title:r.title,image:r.image,sub:S.folders.find(x=>x.id===r.folderId)?.name||'Sin recetario'})) : (S.sugg||[]).map(x=>({id:x.id,title:x.title,image:x.image,sub:x.category||''}));
    const set = tab==='mine'?pickMine:pickSugg;
    const rows=list.filter(r=>(r.title||'').toLowerCase().includes(q));
    $('#bpick',m).innerHTML=rows.length?rows.map(r=>`<label class="bp-row"><input type="checkbox" data-bid="${esc(r.id)}" ${set.has(r.id)?'checked':''}><span class="thumb sm">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(22,'var(--accent)','var(--accent-soft)')}</span><span class="bp-t">${esc(r.title||'Sin título')}<small>${esc(r.sub)}</small></span></label>`).join('')
      :`<p class="muted" style="margin:0">${tab==='mine'?'Todavía no tienes recetas.':'No hay recetas recomendadas con esa búsqueda.'}</p>`;
    const n=pickMine.size+pickSugg.size; $('#bcount',m).textContent=n?`${n} ${n===1?'receta elegida':'recetas elegidas'}`:'';
  };
  if(bulk){
    if(!S.sugg) loadSuggestions().then(drawPick);
    m.querySelectorAll('[data-bt]').forEach(b=>b.onclick=()=>{ tab=b.dataset.bt; m.querySelectorAll('[data-bt]').forEach(x=>x.setAttribute('aria-selected',String(x===b))); drawPick(); });
    $('#bq',m).oninput=drawPick;
    $('#bpick',m).onchange=e=>{ const c=e.target.closest('[data-bid]'); if(!c) return; const set=tab==='mine'?pickMine:pickSugg; c.checked?set.add(c.dataset.bid):set.delete(c.dataset.bid); drawPick(); };
    drawPick();
  }
  $('#ff',m).onsubmit=async e=>{e.preventDefault();const name=$('#fname',m).value.trim();if(!name)return; const b=$('#fgo',m); b.disabled=true;
    try{
      await api('PUT','/folders/'+f.id,{name,color,created:f.created});
      for(const id of pickMine){ const r=S.recipes.find(x=>x.id===id); if(r){ const {id:rid,...body}=r; await api('PUT','/recipes/'+rid,{...body, folderId:f.id}); } }
      for(const id of pickSugg){ try{ const r=await api('GET','/suggestions/'+id); const {id:_i,suggId,...rest}=r; await api('PUT','/recipes/'+gid(),{...rest, folderId:f.id, fromSugg:id, source:'', created:now()}); }catch{} }
      await loadState(); closeModal();
      const n=pickMine.size+pickSugg.size;
      toast(isNew?(n?`Recetario creado con ${n} ${n===1?'receta':'recetas'}`:'Recetario creado'):'Recetario guardado');
      onCreated?.(f.id);
    }catch(err){ b.disabled=false; toast(err.error||'No se pudo guardar el recetario'); }};
}

/* ===== Nueva receta ===== */
const aiName = () => S.aiName || 'la IA';
const noAiHtml = what => `<div class="empty" style="padding:22px">${ico('sparkle')}<p style="margin:0;max-width:440px">${what} usa inteligencia artificial y todavía no está activada en el servidor. Mientras tanto puedes importar desde un enlace o escribir la receta a mano.</p></div>`;
function newRecipeModal(folderId){
  const OPTS=[['url','link','Desde enlace','La dirección de una web de recetas'],['video','play','Desde vídeo','TikTok, Instagram, Facebook o YouTube'],
    ['photo','camera','Desde foto','De un libro, una revista o un papel'],['ai','sparkle','Con '+aiName(),'Pídela y ajústala hablando'],['hand','edit','A mano','Escríbela tú']];
  const m=openModal(`${mHead('Nueva receta')}
    <div class="opts" id="opts">${OPTS.map(([k,i,t,d])=>`<button type="button" class="opt" data-tab="${k}">${ico(i)}<span class="ot">${esc(t)}</span><span class="od">${esc(d)}</span>${['photo','ai'].includes(k)&&!S.profile?`<span class="lockb">${ico('lock')}Con cuenta</span>`:''}</button>`).join('')}</div>
    <div id="tabWrap" hidden><button type="button" class="btn ghost sm" id="optBack">${ico('back')}Otras formas</button><h3 class="opt-h" id="optTitle"></h3><div id="tabBody"></div></div>`,{wide:true});
  const body=$('#tabBody',m);
  const busy=(el,t)=>el.innerHTML=`<div class="status"><span class="spin"></span>${esc(t)}</div>`;
  const tabs={
    url:()=>{
      body.innerHTML=`<form id="fu" style="display:grid;gap:12px">
        <div class="field"><label for="uurl">Enlace de la receta</label><input id="uurl" class="inp" type="url" required placeholder="https://www.ejemplo.com/receta-de-croquetas"></div>
        <div id="pasteWrap" hidden class="field"><label for="upaste">Texto de la receta</label>
          <p class="muted" style="margin:0;font-size:14px" id="pasteMsg"></p>
          <textarea id="upaste" class="inp" rows="7"></textarea></div>
        <div id="ustatus"></div>
        <div class="row" style="justify-content:flex-end"><button class="btn pri" id="ugo">Importar receta</button></div></form>`;
      enableRichPaste($('#upaste',m));
      $('#fu',m).onsubmit=async e=>{e.preventDefault();
        const url=$('#uurl',m).value.trim(); const pasted=$('#upaste',m).value.trim();
        const st=$('#ustatus',m), btn=$('#ugo',m); btn.disabled=true;
        try{
          if(pasted){
            if(S.ai && S.profile){ busy(st,'Leyendo la receta…'); const {recipe}=await api('POST','/ai/extract',{text:pasted}); closeModal(); editorModal({...recipe, source:url, folderId}); }
            else { closeModal(); editorModal({...roughParse(pasted), source:url, folderId}); }
            return;
          }
          busy(st,'Leyendo la página…');
          const {recipe}=await api('POST','/import',{url});
          closeModal(); editorModal({...recipe, folderId});
        }catch(err){
          st.innerHTML='';
          if(err.needText){
            $('#pasteWrap',m).hidden=false;
            $('#pasteMsg',m).textContent = err.error + (S.ai?'':' Después podrás repasarla antes de guardarla.');
            if(err.text) $('#upaste',m).value=err.text;
            $('#upaste',m).focus(); btn.textContent='Sacar la receta del texto';
          } else st.innerHTML=`<p class="err">${esc(err.error)}</p>`;
        } finally{ btn.disabled=false; }
      };
    },
    video:()=>{
      body.innerHTML=`<div style="display:grid;gap:16px">
        <form id="fv" style="display:grid;gap:12px">
          <div class="field"><label for="vurl">Enlace del vídeo</label><input id="vurl" class="inp" type="url" required placeholder="Enlace de TikTok, Instagram, Facebook o YouTube"></div>
          <div class="field"><label for="vnote">¿Qué receta es? (opcional)</label><textarea id="vnote" class="inp" rows="2" maxlength="2000" placeholder="Por ejemplo: tarta de queso al horno, para 8; las cantidades se dicen al final"></textarea></div>
          <p class="muted" style="margin:0;font-size:14px">Se lee la descripción, los subtítulos y, si hace falta, se escucha el vídeo.</p>
          <div id="vpasteWrap" hidden class="field"><label for="vpaste">Texto del vídeo</label><p class="muted" style="margin:0;font-size:14px" id="vpasteMsg"></p><textarea id="vpaste" class="inp" rows="6"></textarea></div>
          <div id="vstatus"></div>
          <div class="row" style="justify-content:flex-end"><button class="btn pri" id="vgo">${ico('play')}Sacar la receta</button></div>
        </form>
        <div style="border-top:1px solid var(--line);padding-top:14px;display:grid;gap:10px">
          <p style="margin:0"><strong>¿Lo tienes guardado en el móvil?</strong> Súbelo y se escucha lo que dicen para sacar la receta (máximo 25 MB). Lo que escribas arriba en «¿Qué receta es?» también se usa.</p>
          <div class="row"><label class="btn" for="vfile">${ico('upload')}Subir vídeo</label><input id="vfile" type="file" accept="video/*,audio/*" hidden></div>
          <div id="vfstatus"></div>
        </div>
      </div>`;
      enableRichPaste($('#vpaste',m));
      $('#fv',m).onsubmit=async e=>{e.preventDefault();
        const url=$('#vurl',m).value.trim(), pasted=$('#vpaste',m).value.trim(), st=$('#vstatus',m), btn=$('#vgo',m); btn.disabled=true;
        try{
          if(pasted){
            if(S.ai && S.profile){ busy(st,'Leyendo la receta…'); const {recipe}=await api('POST','/ai/extract',{text:pasted}); closeModal(); aiChatModal({folderId, seed:{recipe:{...recipe, source:url}, reply:'He sacado la receta del vídeo. Revísala: apruébala o pídeme cambios.'}}); }
            else { closeModal(); editorModal({...roughParse(pasted), source:url, folderId}); }
            return;
          }
          busy(st,'Mirando el vídeo…');
          const {recipe}=await api('POST','/import',{url, note:$('#vnote',m).value.trim()});
          closeModal();
          if(S.ai && S.profile) aiChatModal({folderId, seed:{recipe, reply:'He sacado la receta del vídeo. Revísala: si está bien, apruébala; si falta algo, pídemelo.'}});
          else editorModal({...recipe, folderId});
        }catch(err){
          st.innerHTML='';
          if(err.needText){ $('#vpasteWrap',m).hidden=false; $('#vpasteMsg',m).textContent=err.error; if(err.text) $('#vpaste',m).value=err.text; $('#vpaste',m).focus(); btn.innerHTML=`${ico('play')}Sacar la receta del texto`; }
          else st.innerHTML=`<p class="err">${esc(err.error)}</p>`;
        } finally{ btn.disabled=false; }
      };
      $('#vfile',m).onchange=async e=>{
        const f=e.target.files[0]; if(!f) return; const st=$('#vfstatus',m);
        if(!S.profile){ st.innerHTML=`<p class="err">Escuchar vídeos usa la IA, que es para quien tiene cuenta. Inicia sesión para usarlo.</p>`; return; }
        if(!S.ai){ st.innerHTML=`<p class="err">Para escuchar vídeos hace falta la IA, que todavía no está activada.</p>`; return; }
        if(f.size>25*1024*1024){ st.innerHTML=`<p class="err">El vídeo pesa más de 25 MB. Prueba con uno más corto o con el enlace.</p>`; return; }
        busy(st,'Escuchando el vídeo… puede tardar un minuto');
        try{
          const r=await fetch('/api/import/video-file?note='+encodeURIComponent($('#vnote',m).value.trim()),{method:'POST',credentials:'same-origin',headers:{'content-type':f.type||'video/mp4'},body:f});
          const j=await r.json().catch(()=>({})); if(!r.ok) throw {error:j.error||'No he podido procesar el vídeo.'};
          closeModal(); aiChatModal({folderId, seed:{recipe:j.recipe, reply:'He escuchado el vídeo y he sacado la receta. Revísala: apruébala o pídeme cambios.'}});
        }catch(err){ st.innerHTML=`<p class="err">${esc(err.error)}</p>`; }
      };
    },
    photo:()=>{
      if(!S.ai){ body.innerHTML=noAiHtml('Leer recetas de fotos'); return; }
      body.innerHTML=`<div style="display:grid;gap:14px">
        <p style="margin:0">Haz una foto a la receta de un libro, una revista, una pantalla o un papel escrito a mano. Se lee entera y después la apruebas o pides cambios.</p>
        <div class="row">
          <label class="btn pri" for="pcam">${ico('camera')}Hacer una foto</label><input id="pcam" type="file" accept="image/*" capture="environment" hidden>
          <label class="btn" for="pgal">${ico('book')}Elegir de la galería</label><input id="pgal" type="file" accept="image/*" hidden>
        </div>
        <label class="row" style="font-size:14px"><input type="checkbox" id="puse"> Usar también la foto como imagen del plato</label>
        <div id="pstatus"></div>
      </div>`;
      const go=async file=>{ if(!file) return;
        const st=$('#pstatus',m); busy(st,'Leyendo la receta de la foto…');
        try{ const big=await toDataUrl(file,1600,.85,2600000); const {recipe}=await api('POST','/ai/photo',{image:big});
          let image=''; if($('#puse',m).checked) image=await compressImage(file);
          closeModal(); aiChatModal({folderId, seed:{recipe:{...recipe, image}, reply:'He leído la receta de la foto. Revísala: si está bien, apruébala; si quieres, pídeme cambios.'}});
        }catch(err){ st.innerHTML=`<p class="err">${esc(err.error||'No se pudo leer la foto.')}</p>`; }
      };
      $('#pcam',m).onchange=e=>go(e.target.files[0]);
      $('#pgal',m).onchange=e=>go(e.target.files[0]);
    },
    ai:()=>{
      if(!S.ai){ body.innerHTML=noAiHtml(`Pedir recetas a ${esc(aiName())}`); return; }
      closeModal(); aiChatModal({folderId});
    },
    hand:()=>{ closeModal(); editorModal({folderId}); }
  };
  const show=k=>{
    if(['photo','ai'].includes(k) && !S.profile){ $('#opts',m).hidden=true; $('#tabWrap',m).hidden=false; $('#optTitle',m).textContent=OPTS.find(o=>o[0]===k)[2];
      $('#tabBody',m).innerHTML=`<div class="empty" style="padding:22px">${ico('lock')}<p style="margin:0;max-width:420px">Las funciones con inteligencia artificial son para quien tiene cuenta. Inicia sesión o crea una cuenta gratis para usarlas.</p><div class="row" style="justify-content:center"><button class="btn pri" data-act="login">Iniciar sesión</button><button class="btn" data-act="register">Crear cuenta</button></div></div>`; return; }
    if(k==='ai'&&S.ai){ tabs.ai(); return; } if(k==='hand'){ tabs.hand(); return; }
    $('#opts',m).hidden=true; $('#tabWrap',m).hidden=false; $('#optTitle',m).textContent=OPTS.find(o=>o[0]===k)[2]; tabs[k](); m.querySelector('#tabBody input:not([hidden]),#tabBody textarea')?.focus(); };
  m.querySelectorAll('[data-tab]').forEach(t=>t.onclick=()=>show(t.dataset.tab));
  $('#optBack',m).onclick=()=>{ $('#tabWrap',m).hidden=true; $('#opts',m).hidden=false; $('#tabBody',m).innerHTML=''; };
}
function recipePreview(r){
  return `<div class="rprev"><div class="rp-col">
      <div class="rp-t">${esc(r.title)}</div>
      <div class="rp-m">${esc([r.servings?r.servings+' raciones':'', r.time, r.difficulty].filter(Boolean).join(' · '))}</div>
      ${r.image?`<img src="${esc(r.image)}" alt="" class="rp-img">`:''}
      <div class="rp-h">Ingredientes</div><ul class="ing">${(r.ingredients||[]).map(i=>`<li>${fmt(i)}</li>`).join('')}</ul>
    </div><div class="rp-col">
      <div class="rp-h">Preparación</div><ol class="steps">${(r.steps||[]).map(s=>`<li><span>${fmt(s)}</span></li>`).join('')}</ol>
      ${r.notes?`<p class="note">${fmt(r.notes)}</p>`:''}
    </div></div>`;
}
/* Chat con la IA: pides una receta, la revisas, pides cambios y la apruebas */
function aiChatModal({folderId, seed, edit=false, prompt=''}={}){
  const st={msgs:[], recipe:null, busy:false, newImage:false};
  if(folderId===undefined||folderId==='') folderId = S.book && !S.book.visiting && S.book.folder ? S.book.id : (S.folders[0]?.id||'');
  if(seed){ st.recipe=seed.recipe; st.msgs.push({role:'assistant', text:seed.reply, raw:JSON.stringify({reply:seed.reply, recipe:seed.recipe})}); }
  const m=openModal(`${mHead(edit?'Pedir cambios':seed?'Revisa la receta':'Receta con '+aiName())}
    <div class="aichat" id="aichat"></div>
    <div id="aiprev"></div>
    <form id="aiform" class="aiform">
      <textarea id="aiin" class="inp" rows="3" aria-label="Mensaje"></textarea>
      <div class="row" style="justify-content:flex-end"><button class="btn" id="aigo"></button></div>
    </form>
    <div id="aierr"></div>
    <div id="aiapprove"></div>`,{wide:true});
  const log=$('#aichat',m), prev=$('#aiprev',m), inp=$('#aiin',m), go=$('#aigo',m);
  const drawLog=()=>{
    log.innerHTML = (st.msgs.length?'':`<p class="muted" style="margin:0">Dile a ${esc(aiName())} qué te apetece y te propone una receta. Luego puedes pedirle cambios hasta que te guste.</p>`)
      + st.msgs.map(x=>`<div class="aimsg ${x.role}">${fmt(x.text)}</div>`).join('')
      + (st.busy?`<div class="aimsg assistant"><span class="spin"></span> Pensando…</div>`:'');
    log.scrollTop=log.scrollHeight;
    inp.placeholder = st.recipe ? '¿Quieres cambiar algo? Por ejemplo: sin lactosa, para 6, más picante, otra foto' : 'Por ejemplo: una lasaña de verduras para 4, fácil';
    go.innerHTML = `${ico('send')}${st.recipe?'Pedir cambios':'Pedir receta'}`;
    go.disabled = st.busy;
  };
  const drawPrev=()=>{
    const ap=$('#aiapprove',m);
    if(!st.recipe){ prev.innerHTML=''; ap.innerHTML=''; return; }
    prev.innerHTML = recipePreview(st.newImage?{...st.recipe,image:''}:st.recipe) + (st.newImage||!st.recipe.image?`<p class="muted" style="margin:6px 0 0;font-size:13px">${ico('camera')} La foto ${st.newImage?'nueva ':''}del plato se creará con IA al guardar.</p>`:'');
    ap.innerHTML = `<div class="approve">
      <div class="field"><label for="aifold">Guardar en</label>
        <select id="aifold" class="inp">${folderOptions(folderId)}</select></div>
      <div class="approve-btns">
        <button type="button" class="btn" id="aiedit">${ico('edit')}Retocar a mano</button>
        <button type="button" class="btn pri" id="aiok">${ico('save')}Aprobar</button>
      </div>
    </div>`;
    bindFolderSelect($('#aifold',m), v=>{folderId=v});
    $('#aiedit',m).onclick=()=>{ const r={...st.recipe, ...(st.newImage?{image:''}:{})}; closeModal(); editorModal({...r, folderId:folderId||null}); };
    $('#aiok',m).onclick=async()=>{
      const b=$('#aiok',m); b.disabled=true;
      const base=st.recipe;
      const r={...base, ...(st.newImage?{image:''}:{}), id:edit&&base.id?base.id:gid(), folderId:folderId||null, created:edit&&base.created?base.created:now()};
      try{ S.pendingFocus=r.id; await store.saveRecipe(r); closeModal(); toast(edit?'Cambios guardados':'Receta aprobada y guardada'); openBook(r.folderId&&S.folders.some(f=>f.id===r.folderId)?r.folderId:'none', r.id); }
      catch(err){ b.disabled=false; $('#aierr',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
    };
  };
  const send=async()=>{
    const t=inp.value.trim(); if(!t||st.busy) return;
    inp.value=''; $('#aierr',m).innerHTML='';
    st.msgs.push({role:'user', text:t, raw:t}); st.busy=true; drawLog();
    try{
      const out=await api('POST','/ai/chat',{messages:st.msgs.map(x=>({role:x.role, content:x.raw}))});
      if(out.recipe){ const prevR=st.recipe||{}; st.recipe={...prevR, ...out.recipe, image:prevR.image||'', id:prevR.id, created:prevR.created, public:prevR.public, source:prevR.source||out.recipe.source||''}; if(!st.recipe.id) delete st.recipe.id; if(!st.recipe.created) delete st.recipe.created; }
      if(out.newImage) st.newImage=true;
      st.msgs.push({role:'assistant', text:out.reply||(out.recipe?'Aquí la tienes.':''), raw:JSON.stringify({reply:out.reply, recipe:out.recipe})});
    }catch(err){ st.msgs.pop(); inp.value=t; $('#aierr',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
    st.busy=false; drawLog(); drawPrev();
  };
  $('#aiform',m).onsubmit=e=>{e.preventDefault(); send();};
  // Intro hace salto de línea; para enviar, el botón (o Ctrl/Cmd + Intro)
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); send(); } });
  if(prompt) inp.value=prompt;
  drawLog(); drawPrev();
}

/* ===== Color: muestras rápidas y ruleta para cualquier color ===== */
function hexToRgb(h){h=String(h||'#000').replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const n=parseInt(h,16)||0;return [n>>16&255,n>>8&255,n&255]}
function rgbToHex(r,g,b){return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('').toUpperCase()}
function hsvToRgb(h,s,v){const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return [f(5)*255,f(3)*255,f(1)*255]}
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return [h,mx?d/mx:0,mx]}
function inkOn(hex){ const [r,g,b]=hexToRgb(hex).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4}); return (.2126*r+.7152*g+.0722*b)>.42?'#2E1A11':'#FBF3E8'; }
function colorField(id, value, presets, more){
  return `<div class="cfield" id="${id}" data-value="${esc(value)}">
    <div class="swatches">${presets.map(([c,n])=>`<button type="button" class="sw" style="background:${c}" data-c="${c}" aria-label="${esc(n)}"></button>`).join('')}
      <button type="button" class="sw wheelbtn" aria-label="Elegir otro color con la ruleta" aria-expanded="false"></button></div>
    ${more?`<div class="cmore-w"><button type="button" class="btn sm cmore-btn" aria-expanded="false" aria-haspopup="listbox"><span class="cm-dot"></span><span class="cm-name">Más colores</span>${ico('down')}</button>
      <div class="cmore-list" role="listbox" hidden>${more.map(([c,n])=>`<button type="button" role="option" class="cm-opt" data-mc="${c}"><span class="cm-dot" style="background:${c}"></span>${esc(n)}</button>`).join('')}</div></div>`:''}
    <div class="wheelbox" hidden>
      <div class="wheel"><canvas width="360" height="360" aria-label="Ruleta de color"></canvas><span class="knob"></span></div>
      <div class="wheelside">
        <label class="field"><span class="muted" style="font-size:13px">Brillo</span><input type="range" min="12" max="100" class="vslider" aria-label="Brillo"></label>
        <div class="row"><span class="cprev"></span><input class="inp hexin" maxlength="7" aria-label="Código del color" style="width:110px"></div>
      </div>
    </div></div>`;
}
function initColorField(root, id, onChange){
  const el=root.querySelector('#'+id); let [h,s,v]=rgbToHsv(...hexToRgb(el.dataset.value));
  const cv=el.querySelector('canvas'), ctx=cv.getContext('2d'), knob=el.querySelector('.knob'), sl=el.querySelector('.vslider'),
        hex=el.querySelector('.hexin'), prev=el.querySelector('.cprev'), box=el.querySelector('.wheelbox'), wb=el.querySelector('.wheelbtn');
  const R=180;
  const draw=()=>{ const img=ctx.createImageData(360,360), d=img.data;
    for(let y=0;y<360;y++) for(let x=0;x<360;x++){ const dx=x-R+.5, dy=y-R+.5, r=Math.hypot(dx,dy), i=(y*360+x)*4;
      if(r>R){ d[i+3]=0; continue; }
      const [cr,cg,cb]=hsvToRgb((Math.atan2(dy,dx)*180/Math.PI+360)%360, r/R, v);
      d[i]=cr; d[i+1]=cg; d[i+2]=cb; d[i+3]=r>R-1.5?Math.round(Math.max(0,(R-r)/1.5)*255):255; }
    ctx.putImageData(img,0,0); };
  const sync=from=>{ const c=rgbToHex(...hsvToRgb(h,s,v)); el.dataset.value=c; prev.style.background=c; if(from!=='hex') hex.value=c; sl.value=Math.round(v*100);
    const a=h*Math.PI/180; knob.style.left=(50+Math.cos(a)*s*50)+'%'; knob.style.top=(50+Math.sin(a)*s*50)+'%'; knob.style.background=c;
    let preset=false; el.querySelectorAll('.sw[data-c]').forEach(b=>{ const on=b.dataset.c.toUpperCase()===c; preset=preset||on; b.setAttribute('aria-pressed',on); });
    const cmb=el.querySelector('.cmore-btn'); if(cmb){ const o=[...el.querySelectorAll('.cm-opt')].find(x=>x.dataset.mc.toUpperCase()===c);
      el.querySelectorAll('.cm-opt').forEach(x=>x.setAttribute('aria-selected',String(x===o)));
      cmb.querySelector('.cm-dot').style.background=o?c:''; cmb.querySelector('.cm-name').textContent=o?o.textContent.trim():'Más colores'; cmb.classList.toggle('on',!!o); if(o) preset=true; }
    wb.setAttribute('aria-pressed',!preset); onChange?.(c); };
  const cmb=el.querySelector('.cmore-btn'), cml=el.querySelector('.cmore-list');
  if(cmb){ cmb.onclick=()=>{ cml.hidden=!cml.hidden; cmb.setAttribute('aria-expanded',String(!cml.hidden)); };
    cml.onclick=e=>{ const o=e.target.closest('[data-mc]'); if(!o) return; [h,s,v]=rgbToHsv(...hexToRgb(o.dataset.mc)); if(!box.hidden) draw(); sync(); cml.hidden=true; cmb.setAttribute('aria-expanded','false'); }; }
  el.querySelectorAll('.sw[data-c]').forEach(b=>b.onclick=()=>{ [h,s,v]=rgbToHsv(...hexToRgb(b.dataset.c)); if(!box.hidden) draw(); sync(); });
  wb.onclick=()=>{ box.hidden=!box.hidden; wb.setAttribute('aria-expanded',!box.hidden); if(!box.hidden){ if(v<.75) v=.85; draw(); sync(); } };
  const pick=e=>{ const r=cv.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width*2-1, y=(e.clientY-r.top)/r.height*2-1;
    h=(Math.atan2(y,x)*180/Math.PI+360)%360; s=Math.min(1,Math.hypot(x,y)); if(v<.15) v=.85; sync(); };
  cv.addEventListener('pointerdown',e=>{ cv.setPointerCapture(e.pointerId); pick(e); cv.onpointermove=pick; });
  cv.addEventListener('pointerup',()=>{ cv.onpointermove=null; });
  sl.oninput=()=>{ v=sl.value/100; draw(); sync(); };
  hex.oninput=()=>{ const t=hex.value.trim(); if(/^#?[0-9a-f]{6}$/i.test(t)){ [h,s,v]=rgbToHsv(...hexToRgb(t)); if(!box.hidden) draw(); sync('hex'); } };
  sync();
}

function roughParse(text){
  const lines=text.split('\n').map(s=>s.trim()).filter(Boolean);
  const title=lines.shift()||'';
  const ing=[], steps=[]; let mode='';
  for(const l of lines){
    if(/^ingredientes?\b/i.test(l)){mode='i';continue}
    if(/^(preparaci[oó]n|elaboraci[oó]n|instrucciones|pasos|modo de preparaci[oó]n)\b/i.test(l)){mode='s';continue}
    if(mode==='i') ing.push(l); else if(mode==='s') steps.push(l);
    else if(/^\d|^[-•*]/.test(l) && l.length<90) ing.push(l); else steps.push(l);
  }
  return {title, ingredients:ing, steps};
}

/* ===== Imágenes ===== */
function loadImg(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file);const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=u;})}
async function toDataUrl(file,max,q,limit){
  const img=await loadImg(file); let out='';
  for(let k=0;k<7;k++){
    const sc=Math.min(1,max/Math.max(img.width,img.height)); const c=document.createElement('canvas');
    c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc); c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    out=c.toDataURL('image/jpeg',q); if(out.length<limit) break; max*=.8; q=Math.max(.5,q-.06);
  }
  return out;
}
const compressImage = file => toDataUrl(file,1000,.78,180000);

/* ===== Editor ===== */
const servOptions = cur => { const n=parseInt(cur)||0; const max=Math.max(24,n); return `<option value="" ${n?'':'selected'}>—</option>`+Array.from({length:max},(_,i)=>i+1).map(i=>`<option value="${i}" ${i===n?'selected':''}>${i} ${i===1?'ración':'raciones'}</option>`).join(''); };
function editorModal(d){
  const isNew=!d.id; const r={id:d.id||gid(), title:'', image:'', servings:'', time:'', difficulty:'', ingredients:[], steps:[], notes:'', source:'', folderId:null, created:now(), ...d};
  if(r.folderId===undefined||r.folderId==='') r.folderId = S.book && !S.book.visiting && S.book.folder ? S.book.id : (S.folders[0]?.id||null);
  let image=r.image||'';
  const m=openModal(`${mHead(isNew?'Revisa y guarda la receta':'Editar receta')}
  ${d.byClaude?'<p class="muted" style="margin:0;font-size:14px">Receta escrita por Claude. Cambia lo que quieras antes de guardarla.</p>':''}
  <form id="fe" style="display:grid;gap:14px">
    <div class="field"><label for="etitle">Título</label><input id="etitle" class="inp" required maxlength="120" value="${esc(r.title)}"></div>
    <div class="field"><label>Foto del plato</label><div class="imgbox"><span id="eimgPrev">${image?`<img src="${esc(image)}" alt="" referrerpolicy="no-referrer">`:''}</span>
      <label class="btn sm" for="eimg">${ico('camera')}${image?'Cambiar foto':'Añadir foto'}</label><input id="eimg" type="file" accept="image/*" hidden>
      <button type="button" class="btn sm ghost" id="eimgDel" ${image?'':'hidden'}>Quitar</button></div>
      <span class="muted" style="font-size:13px">Si no pones ninguna, la IA crea una foto del plato al guardar.</span></div>
    <div class="grid2">
      <div class="field"><label for="eserv">Raciones</label><select id="eserv" class="inp">${servOptions(r.servings)}</select></div>
      <div class="field"><label for="etime">Tiempo</label><input id="etime" class="inp" value="${esc(r.time)}" placeholder="45 min"></div>
      <div class="field"><label for="ediff">Dificultad</label><select id="ediff" class="inp">${['','Fácil','Media','Difícil'].map(x=>`<option ${x===r.difficulty?'selected':''} value="${x}">${x||'—'}</option>`).join('')}</select></div>
      <div class="field"><label for="efold">Recetario</label><select id="efold" class="inp">${folderOptions(r.folderId)}</select></div>
    </div>
    <div class="field"><div class="lblrow"><label for="eing">Ingredientes, uno por línea</label>${fmtBar('eing')}</div><textarea id="eing" class="inp" rows="7" placeholder="200 g de harina&#10;2 huevos&#10;1 pizca de sal">${esc((r.ingredients||[]).join('\n'))}</textarea></div>
    <div class="field"><div class="lblrow"><label for="esteps">Preparación, un paso por línea</label>${fmtBar('esteps')}</div><textarea id="esteps" class="inp" rows="7">${esc((r.steps||[]).join('\n'))}</textarea></div>
    <div class="field"><div class="lblrow"><label for="enotes">Notas (salen escritas a mano en el libro)</label>${fmtBar('enotes')}</div><textarea id="enotes" class="inp" rows="2">${esc(r.notes)}</textarea></div>
    <div class="field"><label for="esrc">Enlace de origen (opcional)</label><input id="esrc" class="inp" type="url" value="${esc(r.source)}"></div>
    ${S.profile?`<fieldset class="nt-opts"><legend>¿Quién puede verla?</legend>
      <label class="opt-line"><input type="radio" name="epub" value="0" ${r.public?'':'checked'}> Privada: solo tú y a quien se la mandes</label>
      <label class="opt-line"><input type="radio" name="epub" value="1" ${r.public?'checked':''}> Pública: sale en «Recetas preferidas por los usuarios» para todo el mundo</label></fieldset>`:''}
    <p class="muted" style="margin:0;font-size:13px">Selecciona palabras y pulsa N (negrita), C (cursiva) o el enlace. Si nombras otra receta tuya, se enlaza sola. También puedes dictar con el micrófono del teclado.</p>
    <div id="estatus"></div>
    <div class="row" style="justify-content:space-between">${S.ai&&S.profile?`<button type="button" class="btn" id="eask">${ico('sparkle')}Pedir cambios a ${esc(aiName())}</button>`:'<span></span>'}<div class="row"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="esave">${ico('save')}Guardar</button></div></div>
  </form>`,{wide:true});
  ['eing','esteps','enotes'].forEach(id=>enableRichPaste($('#'+id,m)));
  $('#eimg',m).onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#eimgPrev',m).innerHTML='<span class="spin"></span>';
    try{ image=await compressImage(f); $('#eimgPrev',m).innerHTML=`<img src="${image}" alt="">`; $('#eimgDel',m).hidden=false; }catch{ $('#eimgPrev',m).innerHTML=''; toast('No se pudo leer esa imagen'); }};
  $('#eimgDel',m).onclick=()=>{image='';$('#eimgPrev',m).innerHTML='';$('#eimgDel',m).hidden=true};
  bindFolderSelect($('#efold',m));
  const collect=()=>{
    const lines=v=>v.split('\n').map(s=>s.replace(/^\s*[-•*]\s*/,'').trim()).filter(Boolean);
    const out={...r, title:$('#etitle',m).value.trim(), image, servings:$('#eserv',m).value.trim(), time:$('#etime',m).value.trim(), difficulty:$('#ediff',m).value,
      folderId:($('#efold',m).value==='__new'?'':$('#efold',m).value)||null, ingredients:lines($('#eing',m).value), steps:lines($('#esteps',m).value).map(s=>s.replace(/^\d+[.)]\s*/,'')), notes:$('#enotes',m).value.trim(), source:$('#esrc',m).value.trim(),
      public: m.querySelector('input[name=epub]:checked')?.value==='1'};
    delete out.byClaude; return out; };
  const ask=$('#eask',m); if(ask) ask.onclick=()=>{ const cur=collect(); closeModal(); aiChatModal({folderId:cur.folderId||'', edit:!isNew, seed:{recipe:cur, reply:`¿Qué quieres cambiar de «${cur.title||'esta receta'}»? Por ejemplo: para 6 personas, sin lactosa, más fácil o una foto nueva.`}}); };
  $('#fe',m).onsubmit=async e=>{e.preventDefault();
    const out=collect();
    const btn=$('#esave',m); btn.disabled=true;
    try{ S.pendingFocus=out.id; await store.saveRecipe(out); closeModal(); toast(isNew?'Receta guardada':'Cambios guardados');
      if(isNew && (S.view!=='book' || S.book.visiting || (S.book.folder && S.book.id!==out.folderId))) openBook(out.folderId||'none', out.id);
    }catch(err){ btn.disabled=false; $('#estatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
  };
}

/* ===== Compartir ===== */
const linkFor = (kind,id) => `${location.origin}/#${kind}~${id}`;
async function copyText(t, input){
  try{ await navigator.clipboard.writeText(t); toast('Enlace copiado'); }catch{ if(input){input.focus();input.select();} toast('Selecciona el enlace y cópialo'); }
}
function shareModal(kind, item){
  const link=linkFor(kind==='recipe'?'r':'f', item.id);
  const toHtml = !S.profile
    ? `<div class="banner" style="margin:0">${ico('user')}<span style="flex:1;min-width:180px">Inicia sesión para enviarlo por el chat.</span><button class="btn sm" data-act="login">Iniciar sesión</button></div>`
    : `<div class="to-wrap"><input id="shto" class="inp" placeholder="Escribe un nombre; varias personas separadas con comas" autocomplete="off" aria-label="Para" aria-autocomplete="list" aria-controls="shsug">
        <div id="shsug" class="to-sug" role="listbox" hidden></div></div>
       <input id="shmsg" class="inp" maxlength="300" placeholder="Mensaje (opcional)" aria-label="Mensaje">
       <div class="row" style="justify-content:space-between;align-items:center"><span id="shst" class="muted" style="font-size:13px"></span><button class="btn pri" id="shsend">${ico('send')}Enviar por el chat</button></div>`;
  const m=openModal(`${mHead(kind==='recipe'?'Compartir receta':'Compartir recetario')}
    <p style="margin:0;font-family:var(--f-book);font-size:20px">${esc(item.title||item.name)}</p>
    <div class="field"><label for="shto">Enviar por el chat a…</label>${toHtml}</div>
    <div class="field"><label for="shlink">O compartir el enlace</label><div class="linkbox"><input id="shlink" class="inp" readonly value="${esc(link)}"><button class="btn" id="shcopy">${ico('copy')}Copiar</button></div>
    <p class="muted" style="margin:0;font-size:13px">Cualquiera con el enlace puede verla y guardarse una copia, aunque no tenga cuenta.</p></div>`);
  $('#shcopy',m).onclick=()=>copyText(link,$('#shlink',m));
  if(!S.profile) return;
  const inp=$('#shto',m), sug=$('#shsug',m); let opts=[], act=0, remote=[], rt=null;
  const norm=x=>String(x||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/^@/,'').trim();
  const tokens=()=>inp.value.split(',').map(t=>t.trim());
  const current=()=>{ const t=tokens(); return t[t.length-1]||''; };
  const people=()=>{ const ids=new Set(friends()); remote.forEach(p=>ids.add(p.id)); return [...ids].filter(id=>id!==S.uid); };
  const draw=()=>{
    const q=norm(current()); const chosen=new Set(tokens().slice(0,-1).map(norm));
    opts=people().filter(id=>{ const n=norm(pname(id)), u=norm(puser(id)); if(chosen.has(n)||chosen.has(u)) return false; return !q || n.includes(q) || u.includes(q); })
      .sort((a,b)=>(friends().includes(b)-friends().includes(a)) || pname(a).localeCompare(pname(b),'es')).slice(0,6);
    if(!opts.length || (!q && document.activeElement!==inp)){ sug.hidden=true; return; }
    act=Math.min(act,opts.length-1);
    sug.innerHTML=opts.map((id,i)=>`<button type="button" role="option" class="person sopt" aria-selected="${i===act}" data-id="${esc(id)}">${avatar(id)}<span class="pb"><span class="pn">${esc(pname(id))}</span><span class="pu">${esc(puser(id))}${friends().includes(id)?'':' · no sois amigos'}</span></span></button>`).join('');
    sug.hidden=false;
  };
  const pick=id=>{ const t=tokens(); t[t.length-1]=pname(id); inp.value=t.filter(Boolean).join(', ')+', '; act=0; inp.focus(); draw(); };
  inp.addEventListener('input',()=>{ act=0; draw(); clearTimeout(rt); const q=norm(current()); if(q.length>=2) rt=setTimeout(async()=>{ try{ const r=await api('GET','/users?q='+encodeURIComponent(current().replace(/^@/,''))); r.forEach(p=>S.profiles[p.id]=S.profiles[p.id]||p); remote=r; draw(); }catch{} },250); });
  inp.addEventListener('focus',draw);
  inp.addEventListener('keydown',e=>{
    if(sug.hidden) return;
    if(e.key==='ArrowDown'){ e.preventDefault(); act=(act+1)%opts.length; draw(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); act=(act-1+opts.length)%opts.length; draw(); }
    else if((e.key==='Enter'||e.key==='Tab') && current()){ e.preventDefault(); pick(opts[act]); }
    else if(e.key==='Escape'){ e.stopPropagation(); sug.hidden=true; }
  });
  sug.addEventListener('mousedown',e=>e.preventDefault());
  sug.addEventListener('click',e=>{ const b=e.target.closest('[data-id]'); if(b) pick(b.dataset.id); });
  m.addEventListener('click',e=>{ if(!e.target.closest('.to-wrap')) sug.hidden=true; });
  const resolve=async name=>{
    const q=norm(name); if(!q) return null;
    const find=list=>list.find(id=>norm(puser(id))===q) || list.find(id=>norm(pname(id))===q);
    let id=find(people()); if(id) return id;
    try{ const r=await api('GET','/users?q='+encodeURIComponent(name.trim().replace(/^@/,''))); r.forEach(p=>S.profiles[p.id]=S.profiles[p.id]||p); id=find(r.map(p=>p.id)); }catch{}
    return id||null;
  };
  $('#shsend',m).onclick=async()=>{
    const names=tokens().filter(Boolean); const st=$('#shst',m), b=$('#shsend',m);
    if(!names.length){ st.innerHTML='<span class="err">Escribe a quién se lo mandas.</span>'; inp.focus(); return; }
    b.disabled=true; st.textContent='Enviando…';
    const ids=[], unknown=[];
    for(const n of names){ const id=await resolve(n); if(id){ if(!ids.includes(id)) ids.push(id); } else unknown.push(n); }
    if(unknown.length){ b.disabled=false; st.innerHTML=`<span class="err">No encuentro a: ${esc(unknown.join(', '))}</span>`; return; }
    let ok=0; for(const id of ids){ try{ await sendShare(id, kind, item, 'share', $('#shmsg',m).value.trim()); ok++; }catch{} }
    b.disabled=false;
    if(ok===ids.length){ closeModal(); toast(ok===1?`Enviado a ${pname(ids[0])}`:`Enviado a ${ok} personas`); }
    else st.innerHTML=`<span class="err">Solo se ha podido enviar a ${ok} de ${ids.length}.</span>`;
  };
  setTimeout(()=>inp.focus(),60);
}
function snapOf(kind,item){
  if(kind==='recipe') return {title:item.title||'Sin título', time:item.time||'', servings:item.servings||'', n:(item.ingredients||[]).length};
  return {title:item.name, n:S.recipes.filter(r=>r.folderId===item.id).length};
}
async function sendShare(to, kind, item, purpose, text=''){
  await sendMsg(to, {type:kind, purpose, text, ref:{owner:S.uid, id:item.id}, snap:snapOf(kind,item)});
}

/* ===== Recetas y carpetas compartidas ===== */
function parseCode(s){ const m=String(s||'').match(/([rf])~([A-Za-z0-9]{6,40})/); return m?{kind:m[1],id:m[2]}:null; }
function routeHash(){ const pg=location.hash.match(/^#(ayuda|equivalencias|menu)$/); if(pg){ try{history.replaceState(history.state,'',location.pathname+location.search)}catch{} go({ayuda:'help',equivalencias:'equiv',menu:'menu'}[pg[1]]); return; } const rm=location.hash.match(/^#reset~([a-f0-9]{64})$/); if(rm){ try{history.replaceState(history.state,'',location.pathname+location.search)}catch{} resetModal(rm[1]); return; } const c=parseCode(location.hash); if(c){ try{history.replaceState(history.state,'',location.pathname+location.search)}catch{} openShared(c); } }
async function openShared(c){
  if(c.kind==='r'){ const mine=S.recipes.find(x=>x.id===c.id); if(mine){ openBook(mine.folderId&&S.folders.some(f=>f.id===mine.folderId)?mine.folderId:'none', mine.id); return; } }
  else if(S.folders.some(f=>f.id===c.id)){ openBook(c.id); return; }
  try{
    if(c.kind==='r'){
      const d=await api('GET','/public/recipe/'+c.id);
      S.profiles[d.owner.id]=S.profiles[d.owner.id]||d.owner;
      showVisiting({id:'v-'+c.id, name:d.recipe.title, color:'#6E4429', owner:d.owner.id, ownerName:d.owner.display||('@'+d.owner.username)||'', visiting:true, recipes:[d.recipe]}, 2);
    } else {
      const d=await api('GET','/public/folder/'+c.id);
      S.profiles[d.owner.id]=S.profiles[d.owner.id]||d.owner;
      showVisiting({id:c.id, name:d.folder.name, color:d.folder.color, owner:d.owner.id, ownerName:d.owner.display||('@'+d.owner.username)||'', visiting:true, folder:true, recipes:d.recipes.sort(byTitle)}, 0);
    }
  }catch(err){ toast(err.error||'No se pudo abrir'); }
}
function showVisiting(book, page){
  if(S.view==='chat'){ S.returnChat=S.chatWith; stopChat(); }
  if(S.view!=='book') S.prevView=S.view;
  S.book=book; S.page=page; S.view='book'; render(); window.scrollTo(0,0);
}
function copyToMine(r, folderId, check=true){
  const {id, folderId:_f, ...rest} = r;
  const {suggId, ...clean} = rest;
  return store.saveRecipe({...clean, id:gid(), folderId, fromUid:r.fromUid||null, fromSugg:suggId||r.fromSugg||null, created:now()}, {check});
}

/* ===== Cuenta: iniciar sesión, crear cuenta, recuperar contraseña ===== */
function authModal(mode='login'){
  const m=openModal(`${mHead('Tu cuenta')}
    <div class="tabs" role="tablist">
      <button role="tab" data-mode="login" aria-selected="${mode==='login'}">Iniciar sesión</button>
      <button role="tab" data-mode="signup" aria-selected="${mode==='signup'}">Crear cuenta</button>
    </div>
    <div id="authBody"></div>`);
  const body=$('#authBody',m);
  const views={
    login:()=>{
      body.innerHTML=`<form id="fl" style="display:grid;gap:14px">
        <div class="field"><label for="luser">Usuario o correo</label><input id="luser" class="inp" required autocomplete="username" placeholder="@user983 o tu correo"></div>
        <div class="field"><label for="lpass">Contraseña</label><input id="lpass" class="inp" type="password" required autocomplete="current-password"></div>
        <p class="muted" style="margin:0;font-size:13px">Las recetas que hayas guardado sin cuenta en este dispositivo pasarán a tu cuenta.</p>
        <div id="lstatus"></div>
        <div class="row" style="justify-content:space-between"><button type="button" class="btn ghost sm" id="lforgot">He olvidado la contraseña</button><button class="btn pri" id="lgo">Entrar</button></div>
      </form>`;
      $('#lforgot',m).onclick=()=>views.forgot();
      $('#fl',m).onsubmit=async e=>{e.preventDefault(); $('#lgo',m).disabled=true;
        try{ await api('POST','/login',{username:$('#luser',m).value.trim(), password:$('#lpass',m).value}); await afterAuth('Hola de nuevo'); }
        catch(err){ $('#lgo',m).disabled=false; $('#lstatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
      };
    },
    signup:()=>{
      let color=AVCOLORS[Math.floor(Math.random()*AVCOLORS.length)];
      body.innerHTML=`<form id="fr" style="display:grid;gap:14px">
        <p class="muted" style="margin:0">Con una cuenta tienes tus recetas en todos tus dispositivos, y tus amigos pueden encontrarte, mandarte recetas y chatear contigo. Las recetas que ya tienes se quedan.</p>
        <div class="field"><label for="rname">Tu nombre</label><input id="rname" class="inp" required maxlength="40" autocomplete="name"></div>
        <div class="field"><label for="ruser">Nombre de usuario</label><input id="ruser" class="inp" required maxlength="20" placeholder="@user983" autocomplete="username">
          <span class="muted" style="font-size:13px">De 3 a 20 letras minúsculas, números o _. Tus amigos te buscan por este nombre.</span></div>
        <div class="field"><label for="rmail">Correo electrónico</label><input id="rmail" class="inp" type="email" required maxlength="254" autocomplete="email">
          <span class="muted" style="font-size:13px">Te enviaremos un código para comprobar que es tuyo. Sirve también para recuperar la contraseña. Nadie más lo ve.</span></div>
        <div class="field"><label for="rpass">Contraseña</label><input id="rpass" class="inp" type="password" required minlength="6" autocomplete="new-password">
          <span class="muted" style="font-size:13px">Al menos 6 caracteres.</span></div>
        <div class="field"><label>Tu color</label>${colorField('pcolor', color, AVCOLORS.map(c=>[c,'Color '+c]))}</div>
        <label class="row" style="font-size:14px;align-items:flex-start;flex-wrap:nowrap"><input type="checkbox" id="racc" required style="margin-top:4px">
          <span>He leído y acepto los <a href="/legal/aviso-legal" target="_blank">Términos de uso</a> y la <a href="/legal/privacidad" target="_blank">Política de privacidad</a>.</span></label>
        <div id="rstatus"></div>
        <div class="row" style="justify-content:flex-end"><button class="btn pri" id="rgo">Crear cuenta</button></div>
      </form>`;
      $('#ruser',m).oninput=e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')};
      initColorField(m,'pcolor',c=>{color=c});
      $('#fr',m).onsubmit=async e=>{e.preventDefault(); $('#rgo',m).disabled=true;
        try{ const r=await api('POST','/register',{display:$('#rname',m).value.trim(), username:$('#ruser',m).value.trim(), email:$('#rmail',m).value.trim(), password:$('#rpass',m).value, color, accept:$('#racc',m).checked});
          if(r.verify){ verifyModal(r.email); return; }
          await afterAuth('Cuenta creada. Ya puedes añadir amigos'); }
        catch(err){ $('#rgo',m).disabled=false; $('#rstatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
      };
    },
    forgot:()=>{
      m.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-selected','false'));
      body.innerHTML=`<form id="ffg" style="display:grid;gap:14px">
        <p style="margin:0">Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
        <div class="field"><label for="fmail">Correo electrónico</label><input id="fmail" class="inp" type="email" required autocomplete="email"></div>
        <div id="fstatus"></div>
        <div class="row" style="justify-content:space-between"><button type="button" class="btn ghost sm" id="fback">${ico('back')}Volver</button><button class="btn pri" id="fgo">Enviar enlace</button></div>
      </form>`;
      $('#fback',m).onclick=()=>{ m.querySelector('[data-mode=login]').setAttribute('aria-selected','true'); views.login(); };
      $('#ffg',m).onsubmit=async e=>{e.preventDefault(); const b=$('#fgo',m); b.disabled=true;
        try{ await api('POST','/password/forgot',{email:$('#fmail',m).value.trim()});
          $('#fstatus',m).innerHTML=`<p style="margin:0">Si hay una cuenta con ese correo, te acabamos de enviar el enlace. Mira también en la carpeta de spam.</p>`; }
        catch(err){ b.disabled=false; $('#fstatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
      };
    }
  };
  m.querySelectorAll('[data-mode]').forEach(t=>t.onclick=()=>{ m.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-selected',x===t)); views[t.dataset.mode](); });
  views[mode]();
}
/* Código de verificación: la cuenta solo se crea al escribir el código que llega al correo */
function verifyModal(email){
  const m=openModal(`${mHead('Comprueba tu correo')}
    <form id="vf" style="display:grid;gap:14px">
      <p style="margin:0">Te hemos enviado un código de 6 cifras a <b>${esc(email)}</b>. Escríbelo aquí para crear la cuenta. Mira también en la carpeta de spam.</p>
      <input id="vcode" class="inp code-inp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="Código de verificación" required>
      <div id="vst"></div>
      <div class="row" style="justify-content:space-between"><button type="button" class="btn ghost sm" id="vres">Enviar otro código</button><button class="btn pri" id="vgo">Crear cuenta</button></div>
      <p class="muted" style="margin:0;font-size:13px">Si cierras esta ventana sin escribir el código, la cuenta no se crea.</p>
    </form>`);
  const c=$('#vcode',m);
  c.oninput=()=>{ c.value=c.value.replace(/\D/g,'').slice(0,6); if(c.value.length===6) $('#vf',m).requestSubmit(); };
  $('#vres',m).onclick=async()=>{ try{ await api('POST','/register/resend',{email}); $('#vst',m).innerHTML='<p style="margin:0">Te hemos enviado un código nuevo.</p>'; }catch(err){ $('#vst',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; } };
  $('#vf',m).onsubmit=async e=>{ e.preventDefault(); const b=$('#vgo',m); if(b.disabled) return; b.disabled=true;
    try{ await api('POST','/register/verify',{email, code:c.value}); await afterAuth('Cuenta creada. Ya puedes añadir amigos'); }
    catch(err){ b.disabled=false; $('#vst',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; c.select(); }
  };
}
async function afterAuth(msg){ stopChat(); S.view='library'; await loadState(); closeModal(); render(); toast(msg); }
function resetModal(token){
  const m=openModal(`${mHead('Elige una contraseña nueva')}
    <form id="frs" style="display:grid;gap:14px">
      <div class="field"><label for="npass">Contraseña nueva</label><input id="npass" class="inp" type="password" required minlength="6" autocomplete="new-password"></div>
      <div id="nstatus"></div>
      <div class="row" style="justify-content:flex-end"><button class="btn pri" id="ngo">Guardar y entrar</button></div>
    </form>`);
  $('#frs',m).onsubmit=async e=>{e.preventDefault(); $('#ngo',m).disabled=true;
    try{ await api('POST','/password/reset',{token, password:$('#npass',m).value}); await afterAuth('Contraseña cambiada'); }
    catch(err){ $('#ngo',m).disabled=false; $('#nstatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
  };
}
/* ===== Mi cuenta (igual que en Kairos, adaptada a Entre Fogones) ===== */
const ALLERGENS = ['Gluten','Lactosa','Huevo','Frutos secos','Marisco','Pescado','Cacahuete','Soja'];
function viewAccount(){
  const p=S.profile, me=S.me, mine=new Set(me.allergens||[]);
  const custom=(me.allergens||[]).filter(a=>!ALLERGENS.includes(a));
  return `<div class="settings">
    <section class="card account-head">
      <div class="photo-pick">${avatar(S.uid,'big')}
        <label class="photo-edit" title="Cambiar foto" aria-label="Cambiar foto de perfil">${ico('edit')}<input type="file" id="avFile" accept="image/*" hidden></label></div>
      <div class="head-info"><h2>${esc(p.display||'')}</h2><p class="muted" style="margin:2px 0 8px">@${esc(p.username)}${me.email?' · '+esc(me.email):''}</p>
        <div class="row"><label class="btn sm" for="avFile">${p.avatar?'Cambiar foto':'Añadir foto'}</label>${p.avatar?'<button class="btn sm ghost" id="avDel">Quitar</button>':''}</div></div>
    </section>

    <section class="card">
      <h2>Perfil</h2>
      <p class="muted">Tu nombre y tu usuario son lo que ven tus amigos. Te buscan por el usuario.</p>
      <form id="fProfile" class="form-grid">
        <div class="grid2">
          <div class="field"><label for="acName">Nombre</label><input id="acName" class="inp" required maxlength="40" value="${esc(p.display||'')}"></div>
          <div class="field"><label for="acUser">Nombre de usuario</label><input id="acUser" class="inp" required maxlength="20" value="${esc(p.username||'')}" autocomplete="username"></div>
        </div>
        <div class="field"><label>Tu color</label>${colorField('pcolor', p.color||AVCOLORS[0], AVCOLORS.map(c=>[c,'Color '+c]))}</div>
        <div><button class="btn">Guardar perfil</button></div>
      </form>
    </section>

    <section class="card">
      <h2>Alérgenos e intolerancias</h2>
      <p class="muted">Escribe lo que no puedes tomar y pulsa Añadir. Cuando añadas una receta, la IA te avisará si lo lleva y te propondrá sustituirlo o quitarlo.</p>
      <form id="fAlgAdd" class="inline-form"><div class="field" style="flex:1"><label for="algOther">Alergia o intolerancia</label><input id="algOther" class="inp" maxlength="40" placeholder="Por ejemplo: melocotón, sésamo, sulfitos…"></div><button class="btn">${ico('plus')}Añadir</button></form>
      <p class="muted" style="font-size:13px;margin:0">Las más comunes, con un toque:</p>
      <div class="chips" id="algChips">${ALLERGENS.map(a=>`<button type="button" class="chip" aria-pressed="${mine.has(a)}" data-alg="${esc(a)}">${esc(a)}</button>`).join('')}${custom.map(a=>`<button type="button" class="chip" aria-pressed="true" data-alg="${esc(a)}">${esc(a)}</button>`).join('')}</div>
      <div><button class="btn pri" id="algSave">Guardar alérgenos</button></div>
    </section>

    <section class="card">
      <h2>Diabetes</h2>
      <p class="muted">Si lo indicas, la IA te propondrá sustitutos apropiados (sin azúcares añadidos, harinas integrales, raciones de hidratos moderadas) en las recetas que añadas, en el chat de recetas y en tu menú semanal.</p>
      <div class="grid2"><div class="field"><label for="diaType">¿Tienes diabetes?</label><select id="diaType" class="inp">
        ${[['','No'],['tipo1','Sí, tipo 1'],['tipo2','Sí, tipo 2'],['gestacional','Sí, gestacional'],['prediabetes','Prediabetes']].map(([v,l])=>`<option value="${v}" ${(me.prefs?.diabetes||'')===v?'selected':''}>${l}</option>`).join('')}</select></div></div>
      <div class="field"><label for="diaNote">Otras indicaciones para la IA (opcional)</label><input id="diaNote" class="inp" maxlength="300" placeholder="Por ejemplo: poca sal, vegetariana, sin picante…" value="${esc(me.prefs?.diet||'')}"></div>
      <div><button class="btn pri" id="diaSave">Guardar</button></div>
    </section>

    <section class="card" id="pushCard">
      <h2>Notificaciones en el móvil</h2>
      <p class="muted">Si quieres, te avisamos en el móvil (o en el ordenador) aunque tengas la app cerrada.</p>
      <div id="pushState"></div>
      <div class="chips" id="notifyChips">${[['messages','Mensajes del chat'],['shares','Recetas que te mandan'],['friends','Solicitudes de amistad'],['notices','Avisos de Entre Fogones']].map(([k,l])=>`<button type="button" class="chip" data-nt="${k}" aria-pressed="${(me.prefs?.notify||{})[k]!==false}">${l}</button>`).join('')}</div>
    </section>

    <section class="card">
      <h2>Tamaño de la letra de las recetas</h2>
      <p class="muted">Cambia el tamaño del texto de los ingredientes y la preparación cuando abres una receta.</p>
      <div class="chips" id="fsChips">${[[0.9,'Pequeña'],[1,'Normal'],[1.15,'Grande'],[1.3,'Muy grande'],[1.5,'Enorme']].map(([v,l])=>`<button type="button" class="chip" data-fs="${v}" aria-pressed="${Math.abs((me.prefs?.fontScale||1)-v)<.01}">${l}</button>`).join('')}</div>
      <p class="fs-sample" id="fsSample">200 g de harina de trigo · Mezcla la harina con los huevos hasta que quede una masa lisa.</p>
    </section>

    <section class="card">
      <h2>Correo electrónico</h2>
      <p class="muted">Es con el que puedes entrar y donde te llega el enlace si olvidas la contraseña. Para cambiarlo, confirma tu contraseña.</p>
      <form id="fEmail" class="form-grid"><div class="form-grid">
        <div class="field"><label for="emNew">Correo</label><input id="emNew" class="inp" type="email" required autocomplete="email" value="${esc(me.email||'')}"></div>
        <div class="field"><label for="emPass">Contraseña</label><input id="emPass" class="inp" type="password" required autocomplete="current-password"></div>
      </div><div><button class="btn">Cambiar correo</button></div></form>
    </section>

    <section class="card">
      <h2>Contraseña</h2>
      <form id="fPass" class="form-grid"><div class="form-grid">
        <div class="field"><label for="pwCur">Contraseña actual</label><input id="pwCur" class="inp" type="password" required autocomplete="current-password"></div>
        <div class="field"><label for="pwNew">Nueva contraseña</label><input id="pwNew" class="inp" type="password" required minlength="6" autocomplete="new-password"></div>
      </div><div><button class="btn">Cambiar contraseña</button></div></form>
    </section>

    <section class="card">
      <h2>Tus datos</h2>
      <p class="muted">Descarga una copia de todo lo que Entre Fogones guarda de ti: cuenta, recetarios, recetas, amistades y mensajes que has enviado.</p>
      <button class="btn" id="expData">${ico('download')}Descargar mis datos</button>
    </section>

    <section class="card">
      <h2>Ayuda</h2>
      <ul class="legal-list">
        <li><a href="#" data-act="go" data-v="help">${ico('help')}Manual de uso</a></li>
        <li><a href="#" data-act="go" data-v="equiv">${ico('scale')}Tabla de equivalencias de medidas</a></li>
      </ul>
    </section>

    <section class="card">
      <h2>Textos legales</h2>
      <ul class="legal-list">
        <li><a href="/legal/aviso-legal" target="_blank" rel="noopener">${ico('doc')}Aviso legal y términos de uso</a></li>
        <li><a href="/legal/privacidad" target="_blank" rel="noopener">${ico('shield')}Política de privacidad</a></li>
        <li><a href="/legal/cookies" target="_blank" rel="noopener">${ico('doc')}Política de cookies</a></li>
        <li><a href="/legal/contacto" target="_blank" rel="noopener">${ico('mail')}Contacto</a></li>
      </ul>
    </section>

    ${me.role==='superadmin'?'':`<section class="card danger-zone">
      <h2>Eliminar cuenta</h2>
      <p class="muted">Se borrarán para siempre tu cuenta, tus recetarios, tus recetas, tus amistades y los mensajes que has enviado. No se puede deshacer.</p>
      <button class="btn danger" id="accDel">${ico('trash')}Eliminar mi cuenta</button>
    </section>`}

    <button class="btn ghost logout-line" data-act="logout">${ico('out')}Cerrar sesión</button>
  </div>`;
}
function bindAccount(root){
  let color=S.profile.color||AVCOLORS[0];
  initColorField(root,'pcolor',c=>{color=c});
  const ok = async (fn, msg) => { try{ await fn(); await loadState(); toast(msg); return true; }catch(err){ toast(err.error||'No se ha podido guardar'); return false; } };
  $('#acUser',root).oninput=e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')};
  $('#fProfile',root).onsubmit=async e=>{ e.preventDefault(); if(await ok(()=>api('PUT','/me/profile',{display:$('#acName',root).value.trim(), username:$('#acUser',root).value.trim(), color}),'Perfil guardado')) render(); };
  $('#fEmail',root).onsubmit=async e=>{ e.preventDefault(); if(await ok(()=>api('PUT','/me/email',{email:$('#emNew',root).value.trim(), password:$('#emPass',root).value}),'Correo cambiado')) render(); };
  $('#fPass',root).onsubmit=async e=>{ e.preventDefault(); if(await ok(()=>api('PUT','/me/password',{current:$('#pwCur',root).value, password:$('#pwNew',root).value}),'Contraseña cambiada')) e.target.reset(); };
  $('#algChips',root).onclick=e=>{ const c=e.target.closest('.chip'); if(c) c.setAttribute('aria-pressed', c.getAttribute('aria-pressed')!=='true'); };
  $('#fAlgAdd',root).onsubmit=e=>{ e.preventDefault(); const v=$('#algOther',root).value.trim(); if(!v) return;
    const ex=[...root.querySelectorAll('.chip')].find(c=>c.dataset.alg.toLowerCase()===v.toLowerCase()); if(ex){ ex.setAttribute('aria-pressed','true'); $('#algOther',root).value=''; return; }
    const b=document.createElement('button'); b.type='button'; b.className='chip'; b.dataset.alg=v; b.textContent=v; b.setAttribute('aria-pressed','true'); $('#algChips',root).append(b); $('#algOther',root).value=''; };
  $('#algSave',root).onclick=()=>ok(()=>api('PUT','/me/allergens',{allergens:[...root.querySelectorAll('.chip[aria-pressed=true]')].map(c=>c.dataset.alg)}),'Alérgenos guardados');
  $('#avFile',root).onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    try{ const img=await squarePhoto(f); if(await ok(()=>api('PUT','/me/avatar',{image:img}),'Foto de perfil actualizada')) render(); }catch{ toast('No se ha podido leer esa foto. Prueba con otra.'); } };
  const del=$('#avDel',root); if(del) del.onclick=async()=>{ if(await ok(()=>api('DELETE','/me/avatar'),'Foto quitada')) render(); };
  $('#expData',root).onclick=async e=>{ const b=e.currentTarget; b.disabled=true;
    try{ const data=await api('GET','/me/export'); const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`entre-fogones-mis-datos-${new Date().toISOString().slice(0,10)}.json`; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); toast('Datos descargados'); }
    catch(err){ toast(err.error||'No se han podido descargar'); } b.disabled=false; };
  const ad=$('#accDel',root); if(ad) ad.onclick=()=>deleteAccountModal();
  drawPushState();
  $('#notifyChips',root).onclick=async e=>{ const c=e.target.closest('[data-nt]'); if(!c) return; c.setAttribute('aria-pressed', c.getAttribute('aria-pressed')!=='true');
    const notify=Object.fromEntries([...root.querySelectorAll('[data-nt]')].map(x=>[x.dataset.nt, x.getAttribute('aria-pressed')==='true']));
    try{ await api('PUT','/me/prefs',{notify}); S.me.prefs={...(S.me.prefs||{}),notify}; toast('Guardado'); }catch(err){ toast(err.error||'No se ha podido guardar'); } };
  $('#diaSave',root).onclick=()=>ok(()=>api('PUT','/me/prefs',{diabetes:$('#diaType',root).value, diet:$('#diaNote',root).value.trim()}),'Guardado. La IA lo tendrá en cuenta');
  $('#fsChips',root).onclick=async e=>{ const c=e.target.closest('[data-fs]'); if(!c) return; root.querySelectorAll('[data-fs]').forEach(x=>x.setAttribute('aria-pressed',String(x===c)));
    document.documentElement.style.setProperty('--rfs', c.dataset.fs); await ok(()=>api('PUT','/me/prefs',{fontScale:+c.dataset.fs}),'Tamaño de letra guardado'); };
}
/* ===== Notificaciones en el móvil ===== */
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone===true;
async function pushSub(){ try{ const reg=await navigator.serviceWorker.getRegistration('/'); return reg ? await reg.pushManager.getSubscription() : null; }catch{ return null; } }
const b64ToU8 = b => { const p='='.repeat((4-b.length%4)%4); const s=atob((b+p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from([...s].map(c=>c.charCodeAt(0))); };
async function drawPushState(){
  const box=$('#pushState'); if(!box) return;
  if(!pushSupported()){
    box.innerHTML = isIOS() && !isStandalone()
      ? `<div class="banner" style="margin:0">${ico('bell')}<span style="flex:1;min-width:200px">En iPhone y iPad las notificaciones solo funcionan con la app instalada: en Safari pulsa <b>Compartir</b> › <b>Añadir a pantalla de inicio</b>, abre Entre Fogones desde el icono y vuelve aquí.</span></div>`
      : `<p class="muted" style="margin:0">Este navegador no permite notificaciones. Prueba con Chrome, Edge, Firefox o Safari actualizados.</p>`;
    return;
  }
  const sub=await pushSub(), perm=Notification.permission;
  if(perm==='denied'){ box.innerHTML=`<p class="err" style="margin:0">Tienes las notificaciones bloqueadas para Entre Fogones. Actívalas en los ajustes del navegador o del móvil y vuelve aquí.</p>`; return; }
  box.innerHTML = sub
    ? `<div class="row"><span class="push-on">${ico('check')}Activadas en este dispositivo</span><button class="btn sm" id="pushTest">Probar</button><button class="btn sm ghost" id="pushOff">Desactivar</button></div>`
    : `<div class="row"><button class="btn pri" id="pushOn">${ico('bell')}Activar notificaciones</button></div>`;
  $('#pushOn')?.addEventListener('click',enablePush);
  $('#pushOff')?.addEventListener('click',disablePush);
  $('#pushTest')?.addEventListener('click',async()=>{ try{ await api('POST','/push/test'); toast('Enviada. Te llegará en unos segundos'); }catch(err){ toast(err.error||'No se ha podido enviar'); } });
}
async function enablePush(){
  try{
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){ toast('No has dado permiso para las notificaciones'); drawPushState(); return; }
    const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'}); await navigator.serviceWorker.ready;
    const {key}=await api('GET','/push/key');
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64ToU8(key)});
    await api('POST','/push/subscribe',{subscription:sub.toJSON()});
    toast('Notificaciones activadas'); drawPushState();
  }catch(err){ toast(err.error||'No se han podido activar las notificaciones'); drawPushState(); }
}
async function disablePush(){
  try{ const sub=await pushSub(); if(sub){ await api('POST','/push/unsubscribe',{endpoint:sub.endpoint}).catch(()=>{}); await sub.unsubscribe(); } toast('Notificaciones desactivadas'); }catch{}
  drawPushState();
}
/* Recorta la foto en cuadrado y la reduce a 320 px */
async function squarePhoto(file){
  const img=await loadImg(file); const side=Math.min(img.width,img.height), size=Math.min(320,side);
  const c=document.createElement('canvas'); c.width=c.height=size; const ctx=c.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,size,size);
  ctx.drawImage(img,(img.width-side)/2,(img.height-side)/2,side,side,0,0,size,size);
  let q=.85, out=c.toDataURL('image/jpeg',q); while(out.length>110000 && q>.4){ q-=.1; out=c.toDataURL('image/jpeg',q); }
  return out;
}
function accountModal(){ go('account'); }
function deleteAccountModal(){
  const m=openModal(`${mHead('Eliminar tu cuenta')}
    <form id="fd" style="display:grid;gap:14px">
      <p style="margin:0">Se borrarán para siempre tu cuenta, tus recetarios, tus recetas, tus amistades y los mensajes que has enviado. Si quieres conservarlos, descárgalos antes desde «Tus datos».</p>
      <div class="field"><label for="dpass">Escribe tu contraseña para confirmarlo</label><input id="dpass" class="inp" type="password" required autocomplete="current-password"></div>
      <div id="dstatus"></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="dgo">${ico('trash')}Eliminar definitivamente</button></div>
    </form>`);
  $('#fd',m).onsubmit=async e=>{e.preventDefault(); $('#dgo',m).disabled=true;
    try{ await api('DELETE','/me',{password:$('#dpass',m).value}); stopChat(); closeModal(); S.view='library'; await loadState(); render(); toast('Tu cuenta se ha eliminado'); }
    catch(err){ $('#dgo',m).disabled=false; $('#dstatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
  };
}

/* ===== Alérgenos: al añadir una receta, la IA avisa y tú eliges qué hacer ===== */
const wantsAllergenCheck = () => S.profile && S.ai && ((S.me.allergens||[]).length || S.me.prefs?.diabetes);
async function allergenReview(r){
  if(!wantsAllergenCheck() || !(r.ingredients||[]).length) return r;
  let issues=[];
  try{ toast('Revisando tus alérgenos…'); issues=(await api('POST','/ai/allergens',{recipe:{title:r.title, ingredients:r.ingredients}})).issues||[]; }catch{ return r; }
  if(!issues.length) return r;
  return await new Promise(res=>{
    const m=openModal(`${mHead(S.me.prefs?.diabetes&&!(S.me.allergens||[]).length?'Adaptar a tu diabetes':'Atención a tus alérgenos')}
      <p style="margin:0">«${esc(r.title)}» lleva ${issues.length===1?'un ingrediente':'ingredientes'} con ${esc([...new Set(issues.map(i=>i.allergen))].join(', '))}. Elige qué hacer con cada uno:</p>
      <div class="alg-list">${issues.map((it,k)=>`<fieldset class="alg-item"><legend><strong>${fmt(it.ingredient)}</strong> <span class="alg-tag">${esc(it.allergen)}</span></legend>
        ${it.note?`<p class="muted" style="margin:0 0 6px;font-size:14px">${esc(it.note)}</p>`:''}
        ${it.substitutes.map((s,j)=>`<label class="opt-line"><input type="radio" name="a${k}" value="s${j}" ${j===0?'checked':''}> Sustituir por <strong>${fmt(s)}</strong></label>`).join('')}
        ${it.canRemove?`<label class="opt-line"><input type="radio" name="a${k}" value="del" ${it.substitutes.length?'':'checked'}> Quitarlo de la receta</label>`:''}
        <label class="opt-line"><input type="radio" name="a${k}" value="keep" ${!it.substitutes.length&&!it.canRemove?'checked':''}> Dejarlo como está</label>
      </fieldset>`).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" id="algKeep">Guardar sin cambios</button><button type="button" class="btn pri" id="algApply">${ico('save')}Aplicar y guardar</button></div>`,{wide:true, onClose:()=>res(r)});
    $('#algKeep',m).onclick=()=>{ $('#modal-root')._onClose=null; closeModal(); res(r); };
    $('#algApply',m).onclick=()=>{
      const ing=[...r.ingredients], changes=[], drop=new Set();
      issues.forEach((it,k)=>{ const v=m.querySelector(`input[name=a${k}]:checked`)?.value||'keep';
        if(v==='del'){ drop.add(it.index); changes.push(`sin ${it.ingredient.replace(/\*/g,'')}`); }
        else if(v[0]==='s'){ const sub=it.substitutes[+v.slice(1)]; ing[it.index]=sub; changes.push(`${it.ingredient.replace(/\*/g,'')} → ${sub.replace(/\*/g,'')}`); } });
      const out={...r, ingredients:ing.filter((_,i)=>!drop.has(i))};
      if(changes.length) out.notes=[r.notes, `Adaptada a tus alérgenos y necesidades: ${changes.join('; ')}.`].filter(Boolean).join('\n');
      $('#modal-root')._onClose=null; closeModal(); res(out);
    };
  });
}

function needProfileView(what){
  return `<div class="empty" style="margin-top:20px">${spoon(54,'var(--muted)','var(--bg)')}<h2 style="font-size:22px;color:var(--ink)">${what}</h2><p style="margin:0;max-width:440px">Inicia sesión o crea una cuenta para encontrar a tus amigos, mandaros recetas y pediros ideas. Tus recetas siguen funcionando sin cuenta.</p><div class="row" style="justify-content:center"><button class="btn pri" data-act="login">${ico('user')}Iniciar sesión</button><button class="btn" data-act="register">Crear cuenta</button></div></div>`;
}

/* ===== Amigos ===== */
function viewFriends(){
  if(!canSocial()) return needProfileView('Amigos');
  return `<div class="lib-head"><div><p class="eyebrow">Amigos</p><h1>Tu gente de cocina</h1></div></div>
  <div class="fgrid">
    <section class="panel">
      <div class="panel-h"><h2>Buscar personas</h2></div>
      <div class="fsec">
        <input id="fsearch" class="inp" placeholder="Busca por @usuario o nombre" value="${esc(S.search)}" autocomplete="off" aria-label="Buscar personas">
        <div id="fres"></div>
      </div>
    </section>
    <div style="display:grid;gap:16px" id="fside">${friendsSide()}</div>
  </div>`;
}
const personRow=(id,act)=>`<div class="person">${avatar(id)}<div class="pb"><div class="pn">${esc(pname(id))}</div><div class="pu">${esc(puser(id))}</div></div>${act}</div>`;
function friendState(id){
  const fr=friends(), pin=pendingIn(), pout=S.reqOut.filter(r=>r.status==='pending');
  if(fr.includes(id)) return `<button class="btn sm" data-act="chatWith" data-id="${esc(id)}">${ico('chat')}Escribir</button>`;
  if(pout.some(r=>r.to===id)) return `<span class="muted" style="font-size:13px">Solicitud enviada</span>`;
  if(pin.some(r=>r.from===id)) return `<button class="btn sm pri" data-act="addFriend" data-id="${esc(id)}">Aceptar</button>`;
  return `<button class="btn sm" data-act="addFriend" data-id="${esc(id)}">${ico('plus')}Añadir</button>`;
}
function friendsSide(){
  const fr=friends(), pin=pendingIn(), pout=S.reqOut.filter(r=>r.status==='pending');
  return `${pin.length?`<section class="panel"><div class="panel-h"><h2>Solicitudes recibidas</h2><span class="badge">${pin.length}</span></div><div class="fsec">${pin.map(r=>personRow(r.from,`<div class="row"><button class="btn sm pri" data-act="addFriend" data-id="${esc(r.from)}">Aceptar</button><button class="btn sm ghost" data-act="dropFriend" data-id="${esc(r.from)}">Rechazar</button></div>`)).join('')}</div></section>`:''}
    <section class="panel"><div class="panel-h"><h2>Tus amigos</h2><span class="muted" style="font-variant-numeric:tabular-nums">${fr.length}</span></div>
      <div class="fsec">${fr.length?fr.map(id=>personRow(id,`<div class="row"><button class="btn sm" data-act="chatWith" data-id="${esc(id)}">${ico('chat')}Escribir</button><button class="btn sm ghost" data-act="unfriend" data-id="${esc(id)}" aria-label="Quitar amigo">${ico('x')}</button></div>`)).join(''):'<p class="muted" style="margin:0">Busca a tus amigos por su @usuario y mándales una solicitud.</p>'}</div></section>
    ${pout.length?`<section class="panel"><div class="panel-h"><h2>Solicitudes enviadas</h2></div><div class="fsec">${pout.map(r=>personRow(r.to,`<button class="btn sm ghost" data-act="dropFriend" data-id="${esc(r.to)}">Cancelar</button>`)).join('')}</div></section>`:''}`;
}
function drawSearch(){
  const box=$('#fres'); if(!box) return;
  if(!S.search){ box.innerHTML=`<p class="muted" style="margin:0">Escribe el @usuario o el nombre de quien buscas.</p>`; return; }
  box.innerHTML = S.searchRes.length ? S.searchRes.map(p=>personRow(p.id, friendState(p.id))).join('')
    : `<p class="muted" style="margin:0">${S.search?'Nadie con ese nombre todavía.':'Todavía no hay más personas en Entre Fogones. Pásales el enlace de la app a tus amigos para que se creen su cuenta.'}</p>`;
}
let searchT=null;
async function runSearch(){
  if(!S.search){ S.searchRes=[]; drawSearch(); return; }
  try{ const res=await api('GET','/users?q='+encodeURIComponent(S.search)); res.forEach(p=>S.profiles[p.id]=S.profiles[p.id]||p); S.searchRes=res; drawSearch(); }catch{}
}
function afterFriends(){
  const i=$('#fsearch'); if(!i) return;
  i.addEventListener('input',()=>{ S.search=i.value.trim(); clearTimeout(searchT); searchT=setTimeout(runSearch,250); });
  drawSearch(); runSearch();
}
async function unfriend(id){
  if(!await confirmBox(`¿Quitar a ${pname(id)} de tus amigos? Las conversaciones se mantienen.`,'Quitar')) return;
  await api('DELETE','/friends/'+id); await loadState();
}

/* ===== Chat ===== */
let msgTimer=null;
const EMOJIS='😀 😂 🥹 😊 😍 🥰 😘 😋 😜 🤤 😎 🤩 🥳 😅 😉 🙃 🤔 🤗 😮 😢 😭 😡 🙈 🙏 👏 👍 👎 👌 💪 🤝 ✌️ 🫶 ❤️ 🧡 💛 💚 💙 💜 🤍 💯 ✨ 🔥 🎉 ⭐ 🍳 🥘 🍲 🍝 🍕 🍔 🌮 🥗 🍰 🎂 🧁 🍪 🍫 🍩 🍓 🍋 🥑 🍅 🧄 🧅 🌶️ 🥖 🧀 🥚 🍷 ☕ 🍽️'.split(' ');
const isOnlyEmoji = t => { const x=String(t||'').trim(); return !!x && x.length<=24 && /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\uFE0F|\u200D|\s)+$/u.test(x) && !/^[\d#*\s]+$/.test(x); };
const fmtSize = n => n>=1048576 ? (n/1048576).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(n/1024))+' KB';
const fileUrl = (f,dl) => `/api/files/${encodeURIComponent(f.id)}${dl?'?dl=1':''}`;
/* Fotos: se reducen antes de enviarlas para que vayan rápido */
async function shrinkImage(file){
  if(file.type==='image/gif' || file.size<300000 && /jpeg|png|webp/.test(file.type)){ try{ const im=await loadImg(file); return {blob:file, w:im.width, h:im.height, type:file.type}; }catch{ return {blob:file, type:file.type}; } }
  const img=await loadImg(file); const sc=Math.min(1,1600/Math.max(img.width,img.height));
  const c=document.createElement('canvas'); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
  c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.84));
  return {blob, w:c.width, h:c.height, type:'image/jpeg', name:file.name.replace(/\.[^.]+$/,'')+'.jpg'};
}
async function sendAttach(to, file){
  if(file.size>10*1048576){ toast(`«${file.name}» ocupa más de 10 MB y no se puede enviar`); return; }
  let body=file, type=file.type||'application/octet-stream', name=file.name||'archivo', w=0, h=0;
  if(/^image\/(jpeg|png|webp|gif|heic|heif)/.test(file.type)){ try{ const x=await shrinkImage(file); body=x.blob; type=x.type; w=x.w||0; h=x.h||0; if(x.name) name=x.name; }catch{} }
  const qs=new URLSearchParams({name}); if(w) { qs.set('w',w); qs.set('h',h); } if(S.replyTo) qs.set('reply',S.replyTo.id);
  const r=await fetch(`/api/chats/${encodeURIComponent(to)}/attach?${qs}`,{method:'POST',credentials:'same-origin',headers:{'content-type':type},body});
  let j=null; try{ j=await r.json(); }catch{}
  if(!r.ok) throw {error:(j&&j.error)||'No se ha podido enviar el archivo.'};
  setReply(null);
  if(S.chatWith===to) await pollMsgs();
  loadState().catch(()=>{});
}
async function sendFiles(files){
  const to=S.chatWith; if(!to||!files.length) return;
  toast(files.length>1?`Enviando ${files.length} archivos…`:'Enviando…');
  for(const f of files){ try{ await sendAttach(to,f); }catch(err){ toast(err.error||'No se ha podido enviar'); } }
}
function setReply(m){
  S.replyTo = m ? {id:m.id, from:m.from, text:msgText(m)} : null;
  const bar=$('#replyBar'); if(!bar) return;
  bar.hidden=!S.replyTo;
  bar.innerHTML = S.replyTo ? `<div class="rq"><b>${esc(S.replyTo.from===S.uid?'Tú':pname(S.replyTo.from))}</b><span>${esc(S.replyTo.text)}</span></div><button type="button" class="x" data-act="cancelReply" aria-label="No responder">${ico('x')}</button>` : '';
  if(S.replyTo) $('#ctext')?.focus();
}
function msgText(m){
  if(m.type==='recipe') return 'Receta: '+(m.snap?.title||'');
  if(m.type==='folder') return 'Recetario: '+(m.snap?.title||'');
  if(m.type==='image') return '📷 Foto'+(m.text?': '+m.text:'');
  if(m.type==='file') return '📎 '+(m.file?.name||'Archivo');
  return String(m.text||'').replace(/\*\*?/g,'').slice(0,160);
}
function stopChat(){ clearInterval(msgTimer); msgTimer=null; S.chatWith=null; S.msgs=[]; S.replyTo=null; }
function convPeople(){
  const fr=friends(); const lr=S.me?.lastRead||{};
  const ids=new Set([...fr, ...S.chats.map(c=>c.members.find(x=>x!==S.uid)).filter(Boolean)]);
  return [...ids].map(id=>{const c=S.chats.find(c=>c.id===pairKey(S.uid,id));return {id,c,unread:c&&c.last&&c.last.from!==S.uid&&(c.ts||0)>(lr[c.id]||0)}})
    .sort((a,b)=>(b.c?.ts||0)-(a.c?.ts||0));
}
function convListHtml(){
  const list=convPeople();
  if(!list.length) return `<p class="muted" style="padding:16px;margin:0">Cuando tengas amigos aparecerán aquí. Añádelos desde la pestaña Amigos.</p>`;
  return list.map(({id,c,unread})=>`<button class="conv" data-act="chatWith" data-id="${esc(id)}" aria-current="${id===S.chatWith}">${avatar(id)}<span class="cb"><span class="cn"><span>${esc(pname(id))}</span>${unread?'<span class="badge">nuevo</span>':`<span class="muted" style="font-weight:400;font-size:12px">${c?.ts?esc(fmtTime(c.ts)):''}</span>`}</span><span class="cl">${esc(c?.last?.text||'Di hola y comparte una receta')}</span></span></button>`).join('');
}
function viewChat(){
  if(!canSocial()) return needProfileView('Chat');
  const w=S.chatWith;
  return `<div class="chat ${w?'open':''}">
    <section class="panel list-pane"><div class="panel-h"><h2>Conversaciones</h2></div><div class="convs" id="convList">${convListHtml()}</div></section>
    <section class="panel conv-pane">${w?`
      <div class="panel-h" id="convHead"></div>
      <div class="msgs" id="msgs" aria-live="polite"><div class="chat-empty"><span class="spin"></span></div></div>
      <div class="composer">
        <div class="tools">
          <button class="btn sm tbtn " data-act="chatShareRecipe" aria-label="Compartir receta" title="Compartir receta">${ico('book')}<span class="lbl">Compartir receta</span></button>
          <button class="btn sm tbtn " data-act="chatShareFolder" aria-label="Compartir recetario" title="Compartir recetario">${ico('move')}<span class="lbl">Compartir recetario</span></button>
          <button class="btn sm tbtn " data-act="chatAsk" aria-label="Pedir receta" title="Pedir receta">${ico('hand')}<span class="lbl">Pedir receta</span></button>
          <button class="btn sm tbtn " data-act="chatSuggest" aria-label="Sugerir receta" title="Sugerir receta">${ico('sparkle')}<span class="lbl">Sugerir receta</span></button>
        </div>
        <div id="replyBar" class="replybar" hidden></div>
        <div id="emojiPanel" class="emoji-panel" hidden role="dialog" aria-label="Emojis">${EMOJIS.map(e=>`<button type="button" data-emo="${e}" aria-label="${e}">${e}</button>`).join('')}</div>
        <form id="cform">
          <div class="cbtns"><button type="button" class="ibtn" id="emoBtn" aria-label="Emojis" title="Emojis" aria-expanded="false">${ico('smile')}</button>
          <label class="ibtn" for="cphoto" title="Enviar fotos" aria-label="Enviar fotos">${ico('image')}</label><input id="cphoto" type="file" accept="image/*" multiple hidden>
          <label class="ibtn" for="cfile" title="Enviar un archivo" aria-label="Enviar un archivo">${ico('clip')}</label><input id="cfile" type="file" multiple hidden></div>
          <textarea id="ctext" rows="1" placeholder="Mensaje" aria-label="Mensaje"></textarea><button class="btn pri" aria-label="Enviar">${ico('send')}</button></form>
      </div>`:`<div class="chat-empty"><div>${spoon(54,'var(--muted)','var(--surface)')}<p>Elige una conversación para chatear, pedir recetas o sugerir alguna.</p></div></div>`}
    </section></div>`;
}
function updateConvHeader(){
  const h=$('#convHead'); if(!h||!S.chatWith) return;
  h.innerHTML=`<button class="x" data-act="chatBack" aria-label="Volver a conversaciones">${ico('back')}</button>${avatar(S.chatWith)}<div style="min-width:0"><h2>${esc(pname(S.chatWith))}</h2><div class="muted" style="font-size:13px">${esc(puser(S.chatWith))}${friends().includes(S.chatWith)?'':' · no sois amigos'}</div></div>`;
}
async function pollMsgs(){
  const w=S.chatWith; if(!w) return;
  const after=S.msgs.length?S.msgs[S.msgs.length-1].ts:0;
  try{
    const got=await api('GET',`/chats/${w}/messages${after?'?after='+after:''}`);
    if(w!==S.chatWith) return;
    if(!after){ S.msgs=got; renderMsgs(true); } else if(got.length){ S.msgs.push(...got); renderMsgs(); }
    const last=S.msgs[S.msgs.length-1];
    const key=pairKey(S.uid,w);
    if(last && last.ts>(S.me.lastRead?.[key]||0)){ S.me.lastRead={...(S.me.lastRead||{}),[key]:last.ts}; api('POST',`/chats/${w}/read`,{ts:last.ts}).catch(()=>{}); renderTop(); const l=$('#convList'); if(l) l.innerHTML=convListHtml(); }
  }catch{}
}
function afterChat(){
  updateConvHeader();
  const f=$('#cform'); if(!f) return;
  const ta=$('#ctext');
  const draft=lsGet('ef_draft_'+S.chatWith); if(draft) ta.value=draft;
  const fit=()=>{ta.style.height='auto';ta.style.height=Math.min(Math.max(ta.scrollHeight+2,42),130)+'px';};
  ta.addEventListener('input',()=>{fit();lsSet('ef_draft_'+S.chatWith,ta.value)}); setTimeout(fit,0);
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit()}});
  f.onsubmit=async e=>{e.preventDefault();const t=ta.value.trim();if(!t)return;ta.value='';ta.style.height='auto';lsSet('ef_draft_'+S.chatWith,'');
    const type=S.askMode?'ask':'text'; S.askMode=false; ta.placeholder='Mensaje';
    const reply=S.replyTo; setReply(null); $('#emojiPanel').hidden=true;
    try{ await sendMsg(S.chatWith,{type,text:t,...(reply?{reply:{id:reply.id}}:{})}); }catch(err){ ta.value=t; if(reply) setReply(S.msgs.find(x=>x.id===reply.id)||null); toast(err.error||'No se pudo enviar'); }};
  const ep=$('#emojiPanel'), eb=$('#emoBtn');
  eb.onclick=()=>{ ep.hidden=!ep.hidden; eb.setAttribute('aria-expanded',String(!ep.hidden)); };
  ep.onclick=e=>{ const b=e.target.closest('[data-emo]'); if(!b) return; const p=ta.selectionStart??ta.value.length, q=ta.selectionEnd??p;
    ta.value=ta.value.slice(0,p)+b.dataset.emo+ta.value.slice(q); const np=p+b.dataset.emo.length; ta.setSelectionRange(np,np); ta.dispatchEvent(new Event('input')); };
  $('#cphoto').onchange=e=>{ const fl=[...e.target.files]; e.target.value=''; sendFiles(fl); };
  $('#cfile').onchange=e=>{ const fl=[...e.target.files]; e.target.value=''; sendFiles(fl); };
  ta.addEventListener('paste',e=>{ const fl=[...(e.clipboardData?.files||[])]; if(fl.length){ e.preventDefault(); sendFiles(fl); } });
  const pane=$('.conv-pane');
  pane.addEventListener('dragover',e=>{ if([...(e.dataTransfer?.types||[])].includes('Files')){ e.preventDefault(); pane.classList.add('drop'); } });
  pane.addEventListener('dragleave',e=>{ if(!pane.contains(e.relatedTarget)) pane.classList.remove('drop'); });
  pane.addEventListener('drop',e=>{ pane.classList.remove('drop'); const fl=[...(e.dataTransfer?.files||[])]; if(fl.length){ e.preventDefault(); sendFiles(fl); } });
  bindMsgGestures($('#msgs'));
  setReply(null);
  S.msgs=[]; pollMsgs();
  clearInterval(msgTimer); msgTimer=setInterval(()=>{ if(document.visibilityState==='visible') pollMsgs(); },3000);
}
function openChat(id){
  clearInterval(msgTimer); S.msgs=[]; S.chatWith=id; S.askMode=false;
  if(S.view!=='chat'){ if(S.view!=='book') S.prevView=S.view; S.view='chat'; }
  render();
  setTimeout(()=>$('#ctext')?.focus(),50);
}
function renderMsgs(forceBottom){
  const box=$('#msgs'); if(!box) return;
  if(!S.msgs.length){ box.innerHTML=`<div class="chat-empty"><p>Todavía no habéis hablado. Pídele una receta o mándale una de las tuyas.</p></div>`; return; }
  const atBottom = forceBottom || box.scrollHeight-box.scrollTop-box.clientHeight<80;
  let lastDay='';
  box.innerHTML=S.msgs.map(m=>{
    const day=new Date(m.ts).toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
    const sep = day!==lastDay ? `<div class="daysep">${esc(day)}</div>` : ''; lastDay=day;
    const mine=m.from===S.uid;
    let inner='';
    if(m.type==='recipe'||m.type==='folder'){
      const sn=m.snap||{}; const tag = m.purpose==='suggest'?'Te sugiero':(m.purpose==='answer'?'Aquí tienes':(m.type==='recipe'?'Receta':'Recetario'));
      const meta = m.type==='recipe' ? [sn.time, sn.servings?sn.servings+' raciones':'', sn.n?sn.n+' ingredientes':''].filter(Boolean).join(' · ') : `${sn.n||0} recetas`;
      const k=m.type==='recipe'?'r':'f';
      inner=`<span class="tag">${esc(tag)}</span>${m.text?esc(m.text):''}<div class="mcard"><div class="mt">${esc(sn.title||'')}</div><div style="font-size:13px;color:var(--paper-muted)">${esc(meta)}</div>
        <div class="row"><button class="btn sm" data-act="openRef" data-k="${k}" data-i="${esc(m.ref?.id)}">${ico('book')}Abrir</button>
        ${mine?'':`<button class="btn sm" data-act="saveRef" data-k="${k}" data-i="${esc(m.ref?.id)}">${ico('save')}Guardar en mi recetario</button>`}</div></div>`;
    } else if(m.type==='ask'){
      inner=`<span class="tag">Pide una receta</span>${esc(m.text)}${mine?'':`<div class="row" style="margin-top:8px"><button class="btn sm" data-act="answerAsk">${ico('send')}Enviarle una receta</button></div>`}`;
    } else if(m.type==='image' && m.file){
      const ar=m.file.w&&m.file.h?`style="aspect-ratio:${m.file.w}/${m.file.h}"`:'';
      inner=`<button class="mimg" data-act="viewImg" data-id="${esc(m.file.id)}" aria-label="Ver la foto"><img src="${fileUrl(m.file)}" alt="Foto" loading="lazy" ${ar}></button>${m.text?`<div>${fmt(m.text)}</div>`:''}`;
    } else if(m.type==='file' && m.file){
      inner=`<a class="mfile" href="${fileUrl(m.file,true)}" download="${esc(m.file.name)}">${ico('doc')}<span class="mf-b"><span class="mf-n">${esc(m.file.name)}</span><span class="mf-s">${esc(fmtSize(m.file.size||0))} · Descargar</span></span>${ico('download')}</a>${m.text?`<div>${fmt(m.text)}</div>`:''}`;
    } else inner=fmt(m.text);
    const rq = m.reply ? `<button class="mquote" data-act="gotoMsg" data-id="${esc(m.reply.id)}"><b>${esc(m.reply.from===S.uid?'Tú':pname(m.reply.from))}</b><span>${esc(m.reply.text||'')}</span></button>` : '';
    const emo = m.type==='text' && !m.reply && isOnlyEmoji(m.text);
    return `${sep}<div class="msg ${mine?'mine':''} ${m.type==='ask'?'ask':''} ${m.type==='image'?'pic':''} ${emo?'emo':''}" data-mid="${esc(m.id)}">${rq}${inner}<span class="when">${esc(new Date(m.ts).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}))}</span><button class="mreply" data-act="replyMsg" data-id="${esc(m.id)}" aria-label="Responder" title="Responder">${ico('reply')}</button></div>`;
  }).join('');
  if(atBottom) box.scrollTop=box.scrollHeight;
}
/* Responder como en WhatsApp: deslizar el mensaje hacia la derecha, o el botón de responder */
function bindMsgGestures(box){
  if(!box) return; let el=null, sx=0, sy=0, dx=0, on=false;
  box.addEventListener('touchstart',e=>{ const m=e.target.closest('.msg[data-mid]'); if(!m||e.touches.length!==1) return; el=m; sx=e.touches[0].clientX; sy=e.touches[0].clientY; dx=0; on=false; },{passive:true});
  box.addEventListener('touchmove',e=>{ if(!el) return; const x=e.touches[0].clientX-sx, y=e.touches[0].clientY-sy;
    if(!on){ if(Math.abs(y)>12 && Math.abs(y)>Math.abs(x)){ el=null; return; } if(x>12) on=true; else return; }
    dx=Math.max(0,Math.min(90,x)); el.style.transform=`translateX(${dx}px)`; el.classList.toggle('swiping', dx>=60); },{passive:true});
  const end=()=>{ if(!el) return; const m=el; el.style.transform=''; m.classList.remove('swiping'); if(on && dx>=60){ const msg=S.msgs.find(x=>x.id===m.dataset.mid); if(msg){ setReply(msg); navigator.vibrate?.(15); } } el=null; on=false; dx=0; };
  box.addEventListener('touchend',end,{passive:true}); box.addEventListener('touchcancel',end,{passive:true});
  // tocar un mensaje muestra el botón de responder
  box.addEventListener('click',e=>{ if(e.target.closest('button,a')) return; const m=e.target.closest('.msg[data-mid]'); box.querySelectorAll('.msg.sel').forEach(x=>{ if(x!==m) x.classList.remove('sel'); }); if(m) m.classList.toggle('sel'); });
}
async function sendMsg(to, m){
  await api('POST',`/chats/${to}/messages`, m);
  if(S.chatWith===to) await pollMsgs();
  loadState().catch(()=>{});
}
function recipePicker(title, cb){
  if(!S.recipes.length){ openModal(`${mHead(title)}<p style="margin:0">Aún no tienes recetas guardadas.</p><div class="row"><button class="btn pri" data-act="newRecipe">${ico('plus')}Añadir receta</button></div>`); return; }
  const m=openModal(`${mHead(title)}<input id="rpq" class="inp" placeholder="Buscar en tus recetas" aria-label="Buscar en tus recetas"><div class="pick" id="rpl"></div>
    <div class="field" style="gap:4px"><label for="rpmsg">Mensaje (opcional)</label><input id="rpmsg" class="inp" maxlength="300"></div>`,{wide:true});
  const draw=q=>{ q=q.toLowerCase(); $('#rpl',m).innerHTML=S.recipes.filter(r=>(r.title||'').toLowerCase().includes(q)).slice(0,60).map(r=>`<button class="rcard" data-rid="${esc(r.id)}"><span class="thumb">${r.image?`<img src="${esc(r.image)}" alt="" referrerpolicy="no-referrer">`:spoon(30,'var(--accent)','var(--accent-soft)')}</span><span class="tt">${esc(r.title||'Sin título')}</span></button>`).join('')||'<p class="muted">Nada con ese nombre.</p>';
    $('#rpl',m).querySelectorAll('[data-rid]').forEach(b=>b.onclick=()=>{const r=S.recipes.find(x=>x.id===b.dataset.rid);const t=$('#rpmsg',m).value.trim();closeModal();cb(r,t)}); };
  $('#rpq',m).oninput=e=>draw(e.target.value); draw('');
}

/* ===== Panel de administración ===== */
const ADM_TABS=[['resumen','chart','Resumen'],['avisos','bell','Avisos'],['usuarios','users','Usuarios'],['recetas','book','Recetas'],['mensajes','mail','Mensajes'],['sugerencias','sparkle','Recomendadas']];
const isSuper = () => S.me?.role==='superadmin';
function viewAdmin(){
  S.admTab=S.admTab||'resumen';
  return `<div class="admin">
    <div class="lib-head"><div><p class="eyebrow">${isSuper()?'Superadministrador':'Administración'}</p><h1>Panel de administración</h1></div></div>
    <div class="adm-tabs" role="tablist">${ADM_TABS.map(([k,i,t])=>`<button role="tab" data-adm="${k}" aria-selected="${S.admTab===k}">${ico(i)}<span>${t}</span></button>`).join('')}</div>
    <div id="admBody" class="adm-body"><div class="status"><span class="spin"></span>Cargando…</div></div>
  </div>`;
}
document.addEventListener('click',e=>{ const t=e.target.closest('[data-adm]'); if(!t||S.view!=='admin') return; S.admTab=t.dataset.adm; document.querySelectorAll('[data-adm]').forEach(x=>x.setAttribute('aria-selected',x===t)); adminLoad(); });
const fmtDate = ts => ts ? new Date(ts).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'}) : '—';
const fmtAgo = ts => { if(!ts) return 'nunca'; const d=(Date.now()-ts)/864e5; return d<1?'hoy':d<2?'ayer':`hace ${Math.floor(d)} días`; };
async function adminLoad(){
  const box=$('#admBody'); if(!box) return; const tab=S.admTab;
  try{ history.replaceState(history.state,'',navUrl()); }catch{}
  box.innerHTML='<div class="status"><span class="spin"></span>Cargando…</div>';
  try{
    if(tab==='resumen') box.innerHTML=admResumen(await api('GET','/admin/stats'));
    else if(tab==='usuarios'){ box.innerHTML=`<div class="adm-tools"><input id="admQ" class="inp" placeholder="Buscar por nombre, usuario o correo" value="${esc(S.admQ||'')}" aria-label="Buscar usuarios"><button class="btn pri" data-act="admNewUser">${ico('plus')}Crear cuenta</button></div><div id="admList"></div>`; bindAdmSearch('usuarios'); await admUsers(); }
    else if(tab==='recetas'){ box.innerHTML=`${admBulkHtml()}<h2 class="below-h">Recetas de las cuentas</h2><div class="adm-tools"><input id="admQ" class="inp" placeholder="Buscar por título o usuario" value="${esc(S.admQ||'')}" aria-label="Buscar recetas"></div><div id="admList"></div>`; bindAdmSearch('recetas'); bindAdmBulk(); await admRecipes(); }
    else if(tab==='mensajes') box.innerHTML=admContact(await api('GET','/admin/contact'));
    else if(tab==='avisos'){ box.innerHTML=admNotices(await api('GET','/admin/notices')); bindAdmNotices(); }
    else if(tab==='sugerencias'){ box.innerHTML=admSugg(await api('GET','/admin/suggestions')); bindAdmSugg(); }
  }catch(err){ box.innerHTML=`<p class="err">${esc(err.error||'No se ha podido cargar.')}</p>`; }
}
let admT=null;
function bindAdmSearch(kind){ const i=$('#admQ'); i.oninput=()=>{ S.admQ=i.value; clearTimeout(admT); admT=setTimeout(()=>kind==='usuarios'?admUsers():admRecipes(),250); }; }
function admResumen(d){
  const kpi=(n,l,sub='')=>`<div class="kpi"><b>${n.toLocaleString('es-ES')}</b><span>${l}</span>${sub?`<small>${sub}</small>`:''}</div>`;
  const bars=(rows,label)=>{ const max=Math.max(1,...rows.map(r=>r.n)); return `<figure class="bars" aria-label="${label}"><figcaption>${label}</figcaption><div class="bw">${rows.map(r=>`<span title="${new Date(r.d).toLocaleDateString('es-ES',{day:'numeric',month:'short'})}: ${r.n}" style="height:${Math.max(2,r.n/max*100)}%"></span>`).join('')}</div><div class="bx"><span>hace 30 días</span><span>hoy</span></div></figure>`; };
  return `<div class="kpis">
      ${kpi(d.usuarios.cuentas,'cuentas',`+${d.usuarios.nuevas7} esta semana`)}
      ${kpi(d.usuarios.activos7,'activas en 7 días')}
      ${kpi(d.recetas.total,'recetas',`+${d.recetas.nuevas7} esta semana`)}
      ${kpi(d.recetarios.total,'recetarios')}
      ${kpi(d.amistades,'amistades')}
      ${kpi(d.mensajes.total,'mensajes de chat',`+${d.mensajes.nuevos7} esta semana`)}
      ${kpi(d.ia.hoy,'usos de IA hoy',`${d.ia.semana} en 7 días`)}
      ${kpi(d.usuarios.anonimos,'estanterías sin cuenta')}
    </div>
    ${d.contacto.nuevos?`<div class="banner">${ico('mail')}<span style="flex:1">Tienes ${d.contacto.nuevos} ${d.contacto.nuevos===1?'mensaje nuevo':'mensajes nuevos'} de contacto.</span><button class="btn sm" data-adm="mensajes">Ver mensajes</button></div>`:''}
    <div class="charts">${bars(d.altas,'Cuentas nuevas por día')}${bars(d.recetasDia,'Recetas nuevas por día')}</div>
    <p class="muted" style="font-size:13px">${d.usuarios.admins} ${d.usuarios.admins===1?'persona administra':'personas administran'} la app${d.usuarios.bloqueados?` · ${d.usuarios.bloqueados} ${d.usuarios.bloqueados===1?'cuenta suspendida':'cuentas suspendidas'}`:''}.</p>`;
}
async function admUsers(){
  const list=await api('GET','/admin/users?q='+encodeURIComponent(S.admQ||'')); const box=$('#admList'); if(!box) return;
  if(!list.length){ box.innerHTML='<p class="muted">No hay cuentas con esa búsqueda.</p>'; return; }
  const roleLbl={superadmin:'Superadministrador',admin:'Administrador',user:'Usuario'};
  box.innerHTML=`<div class="adm-rows">${list.map(u=>{
    S.profiles[u.id]=S.profiles[u.id]||{id:u.id,username:u.username,display:u.display,color:u.color,avatar:u.avatar};
    const me=u.id===S.uid, target=u.role;
    const canMod = !me && target!=='superadmin' && (target!=='admin' || isSuper());
    return `<div class="adm-row ${u.blocked?'blocked':''}">
      ${avatar(u.id)}
      <div class="ar-main"><div class="ar-t">${esc(u.display||'')} <span class="muted">@${esc(u.username)}</span> <span class="role r-${target}">${roleLbl[target]||'Usuario'}</span>${u.blocked?'<span class="role r-blocked">Suspendida</span>':''}${u.delete_suggested?'<span class="role r-blocked">Se sugiere borrar</span>':''}</div>
        <div class="ar-s">${esc(u.email||'sin correo')} · ${u.recetas} recetas · alta ${fmtDate(u.accepted_at)} · última vez ${fmtAgo(u.last_seen)}</div>
        ${u.blocked&&u.blocked_reason?`<div class="ar-s">Motivo de la suspensión: ${esc(u.blocked_reason)}</div>`:''}
        ${u.delete_suggested?`<div class="ar-s">@${esc(u.delete_suggested.by||'')} sugiere borrarla${u.delete_suggested.reason?': '+esc(u.delete_suggested.reason):''}</div>`:''}</div>
      <div class="ar-act">
        <button class="btn sm" data-act="admViewUser" data-id="${esc(u.id)}">${ico('book')}Ver perfil y biblioteca</button>
        ${isSuper() && target!=='superadmin' ? `<button class="btn sm" data-act="admRole" data-id="${esc(u.id)}" data-role="${target==='admin'?'user':'admin'}">${target==='admin'?'Quitar administrador':'Hacer administrador'}</button>`:''}
        ${canMod?`<button class="btn sm" data-act="admBlock" data-id="${esc(u.id)}" data-b="${u.blocked?0:1}">${u.blocked?'Quitar suspensión':'Suspender'}</button>
          ${isSuper()?`<button class="btn sm danger" data-act="admDelUser" data-id="${esc(u.id)}" data-n="${esc(u.username)}">Borrar</button>`
            :`<button class="btn sm ${u.delete_suggested?'':'danger'}" data-act="admSuggestDel" data-id="${esc(u.id)}" data-on="${u.delete_suggested?0:1}">${u.delete_suggested?'Retirar sugerencia de borrar':'Sugerir borrar'}</button>`}`:''}
      </div></div>`; }).join('')}</div>`;
}
async function admRecipes(){
  const list=await api('GET','/admin/recipes?q='+encodeURIComponent(S.admQ||'')); const box=$('#admList'); if(!box) return;
  if(!list.length){ box.innerHTML='<p class="muted">No hay recetas con esa búsqueda.</p>'; return; }
  box.innerHTML=`<div class="adm-rows">${list.map(r=>`<div class="adm-row">
      <span class="thumb sm">${r.image&&r.image!=='data'?`<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(24,'var(--accent)','var(--accent-soft)')}</span>
      <div class="ar-main"><div class="ar-t">${esc(r.title||'Sin título')}</div><div class="ar-s">@${esc(r.username)} · ${fmtDate(r.created)}</div></div>
      <div class="ar-act"><button class="btn sm" data-act="openRef" data-k="r" data-i="${esc(r.id)}">Ver</button><button class="btn sm danger" data-act="admDelRecipe" data-id="${esc(r.id)}" data-n="${esc(r.title||'')}">Borrar</button></div></div>`).join('')}</div>`;
}
function admContact(list){
  if(!list.length) return '<p class="muted">No hay mensajes de contacto.</p>';
  return `<div class="adm-rows">${list.map(c=>`<div class="adm-row msg-row ${c.status==='nuevo'?'is-new':''}">
      <div class="ar-main"><div class="ar-t">${esc(c.subject||'Contacto')} ${c.status==='nuevo'?'<span class="role r-admin">Nuevo</span>':'<span class="role">Respondido</span>'}</div>
        <div class="ar-s">${esc(c.email)} · ${fmtDate(c.created)}</div>
        <p class="ar-msg">${esc(c.message)}</p></div>
      <div class="ar-act"><button class="btn sm" data-act="admCopy" data-v="${esc(c.email)}">${ico('copy')}Copiar correo</button>
        <button class="btn sm" data-act="admMsg" data-id="${esc(c.id)}" data-s="${c.status==='nuevo'?'respondido':'nuevo'}">${c.status==='nuevo'?'Marcar respondido':'Marcar como nuevo'}</button>
        <button class="btn sm danger" data-act="admDelMsg" data-id="${esc(c.id)}">Borrar</button></div></div>`).join('')}</div>`;
}
function admSugg(list){
  const ready=list.filter(s=>s.lista).length;
  return `<p class="muted" style="margin-top:0">Las recetas que aparecen en «Recetas recomendadas» en la biblioteca de todo el mundo. ${ready} listas de ${list.length}; las demás se van preparando solas cada media hora.</p>
    <form id="admSuggForm" class="inline-form"><div class="field" style="flex:1"><label for="sgUrl">Enlace de la receta</label><input id="sgUrl" class="inp" type="url" required placeholder="https://cookpad.com/es/recetas/…"></div><button class="btn pri">${ico('plus')}Añadir sugerencia</button></form>
    <div class="adm-rows">${list.map(s=>`<div class="adm-row ${s.hidden?'blocked':''}">
      <span class="thumb sm">${s.image?`<img src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(24,'var(--accent)','var(--accent-soft)')}</span>
      <div class="ar-main"><div class="ar-t">${esc(s.title)} ${s.lista?'':`<span class="role">${s.tries>=3?'No se pudo leer':'Preparando'}</span>`} ${s.hidden?'<span class="role">Oculta</span>':''}</div><div class="ar-s"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.url)}</a></div></div>
      <div class="ar-act"><button class="btn sm" data-act="admSuggHide" data-id="${esc(s.id)}" data-h="${s.hidden?0:1}">${s.hidden?'Mostrar':'Ocultar'}</button><button class="btn sm danger" data-act="admSuggDel" data-id="${esc(s.id)}">Borrar</button></div></div>`).join('')}</div>`;
}
function bindAdmSugg(){ const f=$('#admSuggForm'); if(!f) return; f.onsubmit=async e=>{ e.preventDefault(); const b=f.querySelector('button'); b.disabled=true;
  try{ await api('POST','/admin/suggestions',{url:$('#sgUrl').value.trim()}); S.sugg=null; toast('Sugerencia añadida'); adminLoad(); }catch(err){ toast(err.error); b.disabled=false; } }; }
/* Sugiere usuarios al escribir en un campo de varios @usuario separados por comas (panel) */
function userAutocomplete(inp, sug){
  let opts=[], act=0, t=null, seq=0;
  const tokens=()=>inp.value.split(',').map(x=>x.trim());
  const current=()=>{ const tk=tokens(); return (tk[tk.length-1]||'').replace(/^@/,''); };
  const close=()=>{ sug.hidden=true; inp.setAttribute('aria-expanded','false'); };
  const draw=()=>{ if(!opts.length){ sug.innerHTML='<p class="muted" style="margin:6px 8px;font-size:14px">Nadie con ese nombre.</p>'; sug.hidden=false; return; }
    act=Math.min(act,opts.length-1);
    sug.innerHTML=opts.map((u,i)=>{ S.profiles[u.id]=S.profiles[u.id]||u; return `<button type="button" role="option" class="person sopt" aria-selected="${i===act}" data-u="${esc(u.username)}">${avatar(u.id)}<span class="pb"><span class="pn">${esc(u.display||u.username)}</span><span class="pu">@${esc(u.username)}${u.email?' · '+esc(u.email):''}</span></span></button>`; }).join('');
    sug.hidden=false; inp.setAttribute('aria-expanded','true'); };
  const search=async()=>{ const q=current(); const my=++seq;
    try{ const chosen=new Set(tokens().slice(0,-1).map(x=>x.replace(/^@/,'').toLowerCase()));
      const list=(await api('GET','/admin/users?q='+encodeURIComponent(q))).filter(u=>!chosen.has(u.username)).slice(0,8);
      if(my!==seq) return; opts=list; act=0; draw(); }catch{} };
  const pick=u=>{ const tk=tokens(); tk[tk.length-1]='@'+u; inp.value=tk.filter(Boolean).join(', ')+', '; inp.focus(); search(); };
  inp.addEventListener('input',()=>{ clearTimeout(t); t=setTimeout(search,200); });
  inp.addEventListener('focus',search);
  inp.addEventListener('keydown',e=>{ if(sug.hidden||!opts.length) return;
    if(e.key==='ArrowDown'){ e.preventDefault(); act=(act+1)%opts.length; draw(); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); act=(act-1+opts.length)%opts.length; draw(); }
    else if(e.key==='Enter'||e.key==='Tab'){ if(current()||e.key==='Enter'){ e.preventDefault(); pick(opts[act].username); } }
    else if(e.key==='Escape'){ e.stopPropagation(); close(); } });
  sug.addEventListener('mousedown',e=>e.preventDefault());
  sug.addEventListener('click',e=>{ const b=e.target.closest('[data-u]'); if(b) pick(b.dataset.u); });
  inp.addEventListener('blur',()=>setTimeout(close,150));
}
/* Perfil y biblioteca de una cuenta, visto desde el panel (solo lectura) */
function viewAdmUser(){
  return `<div class="book-head"><button class="btn ghost sm tbtn" data-act="admBackUsers" aria-label="Usuarios">${ico('back')}<span class="lbl">Usuarios</span></button><h1>Perfil</h1></div><div id="admUserBox"><div class="status"><span class="spin"></span>Cargando…</div></div>`;
}
async function loadAdmUser(){
  const box=$('#admUserBox'); if(!box) return;
  try{
    const d=S.admUser && S.admUser.user.id===S.admUserId ? S.admUser : await api('GET',`/admin/users/${encodeURIComponent(S.admUserId)}/library`);
    S.admUser=d; const u=d.user; S.profiles[u.id]={id:u.id,username:u.username,display:u.display,color:u.color,avatar:u.avatar};
    const roleLbl={superadmin:'Superadministrador',admin:'Administrador',user:'Usuario'};
    const none=d.recipes.filter(r=>!r.folderId||!d.folders.some(f=>f.id===r.folderId));
    const slot=b=>`<div class="slot">${b}</div>`;
    const books=[
      slot(`<button class="spine all" style="--cloth:#6E4429;height:226px" data-act="admOpenBook" data-id="all"><span class="st">Todas</span><span class="sc">${d.recipes.length}</span></button>`),
      ...d.folders.map(f=>{ const n=d.recipes.filter(r=>r.folderId===f.id).length; return slot(`<button class="spine" style="--cloth:${esc(f.color)};color:${inkOn(f.color)};height:${spineH(f.id,f.name)}px" data-act="admOpenBook" data-id="${esc(f.id)}"><span class="st">${esc(f.name)}</span><span class="sc">${n}</span></button>`); }),
      none.length?slot(`<button class="spine" style="--cloth:#7A6A5C;height:190px" data-act="admOpenBook" data-id="none"><span class="st">Sin recetario</span><span class="sc">${none.length}</span></button>`):''
    ].join('');
    box.innerHTML=`<section class="card account-head">${avatar(u.id,'big')}
        <div class="head-info"><h2>${esc(u.display||u.username)}</h2><p class="muted" style="margin:2px 0 6px">@${esc(u.username)}${u.email?' · '+esc(u.email):' · sin correo'}</p>
          <div class="row" style="gap:6px"><span class="role r-${u.role}">${roleLbl[u.role]||'Usuario'}</span>${u.blocked?'<span class="role r-blocked">Suspendida</span>':''}</div></div></section>
      <div class="kpis" style="margin-top:14px">
        <div class="kpi"><b>${d.recipes.length}</b><span>recetas</span></div><div class="kpi"><b>${d.folders.length}</b><span>recetarios</span></div>
        <div class="kpi"><b>${d.recipes.filter(r=>r.public).length}</b><span>públicas</span></div><div class="kpi"><b>${u.friends}</b><span>amistades</span></div>
        <div class="kpi"><b style="font-size:18px">${fmtDate(u.accepted_at)}</b><span>alta</span></div><div class="kpi"><b style="font-size:18px">${fmtAgo(u.last_seen)}</b><span>última vez</span></div></div>
      ${(u.allergens||[]).length||u.prefs?.diabetes?`<p class="muted" style="margin:10px 0 0">Alérgenos: ${esc((u.allergens||[]).join(', ')||'ninguno')}${u.prefs?.diabetes?' · Diabetes: '+esc(u.prefs.diabetes):''}</p>`:''}
      ${u.blocked&&u.blocked_reason?`<p class="muted" style="margin:6px 0 0">Motivo de la suspensión: ${esc(u.blocked_reason)}</p>`:''}
      <h2 class="below-h">Biblioteca</h2>
      ${d.recipes.length||d.folders.length?`<div class="shelf-wrap"><div class="shelves">${books}</div></div>`:'<p class="muted">Todavía no tiene recetas.</p>'}
      ${d.recipes.length?`<h2 class="below-h">Últimas recetas</h2><div class="cards fam-grid">${d.recipes.slice(0,6).map(r=>`<div class="rcard sg"><button class="sg-open" data-act="admOpenRecipe" data-id="${esc(r.id)}"><span class="thumb">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(34,'var(--accent)','var(--accent-soft)')}</span><span style="min-width:0;flex:1"><span class="tt">${esc(r.title||'Sin título')}</span><span class="mm">${esc([r.category,r.public?'Pública':'Privada'].filter(Boolean).join(' · '))}</span></span></button></div>`).join('')}</div>`:''}`;
    fitSpines();
  }catch(err){ box.innerHTML=`<p class="err">${esc(err.error||'No se ha podido cargar.')}</p>`; }
}
function admUserBook(id){
  const d=S.admUser; if(!d) return null; const u=d.user;
  const base={owner:u.id, ownerName:u.display||('@'+u.username), visiting:true, adminView:true};
  if(id==='all') return {...base, id:'au-all-'+u.id, name:'Todas', color:'#6E4429', recipes:[...d.recipes].sort(byTitle)};
  if(id==='none') return {...base, id:'au-none-'+u.id, name:'Sin recetario', color:'#7A6A5C', recipes:d.recipes.filter(r=>!r.folderId||!d.folders.some(f=>f.id===r.folderId)).sort(byTitle)};
  const f=d.folders.find(x=>x.id===id); if(!f) return null;
  return {...base, id:f.id, name:f.name, color:f.color, folder:true, recipes:d.recipes.filter(r=>r.folderId===f.id).sort(byTitle)};
}
/* Subida masiva de recetas desde el panel */
function admBulkHtml(){
  return `<details class="card bulk" ${S.bulkOpen?'open':''}><summary><h2 style="display:inline">${ico('upload')}Subida masiva</h2></summary>
    <form id="bkF" style="display:grid;gap:14px;margin-top:12px">
      <div class="field"><label for="bkUrls">Enlaces, uno por línea (webs de recetas, TikTok, Instagram, Facebook, YouTube…)</label><textarea id="bkUrls" class="inp" rows="4" placeholder="https://…"></textarea></div>
      <div class="field"><label>Archivos de cualquier tipo: PDF, Word, TXT, JSON, HTML, fotos, vídeos o audios</label><div class="row"><label class="btn" for="bkFiles">${ico('upload')}Elegir archivos</label><input id="bkFiles" type="file" multiple hidden><span class="muted" id="bkFn" style="font-size:13px"></span></div>
        <span class="muted" style="font-size:13px">Si un archivo tiene varias recetas (un recetario en PDF o Word, por ejemplo), se sacan todas.</span></div>
      <div class="field"><label for="bkText">Recetas en texto (pega una o varias; se separan solas)</label><textarea id="bkText" class="inp" rows="4"></textarea></div>
      <fieldset class="nt-opts"><legend>Dónde salen</legend>
        <label class="opt-line"><input type="radio" name="bkDest" value="sugg" checked> En «Recetas recomendadas», para todo el mundo</label>
        <label class="opt-line"><input type="radio" name="bkDest" value="user"> En el recetario de una o varias personas</label>
        <div class="grid2" id="bkUser" hidden><div class="field to-wrap"><label for="bkU">Usuarios (varios separados por comas)</label><input id="bkU" class="inp" placeholder="Escribe un nombre o @usuario" autocomplete="off" role="combobox" aria-controls="bkSug" aria-expanded="false"><div id="bkSug" class="to-sug" role="listbox" hidden></div></div><div class="field"><label for="bkFo">Recetario (se crea si no existe)</label><input id="bkFo" class="inp" placeholder="Por ejemplo: Postres"></div>
          <label class="opt-line"><input type="checkbox" id="bkPub"> Hacerlas públicas (Recetas preferidas por los usuarios)</label></div></fieldset>
      <div class="field"><label for="bkCredit">Atribuir a (autor o fuente que se muestra, opcional)</label><input id="bkCredit" class="inp" maxlength="120" placeholder="Por ejemplo: la abuela Carmen"></div>
      <div class="row"><button class="btn pri" id="bkGo">${ico('upload')}Subir recetas</button><button type="button" class="btn danger" id="bkStop" hidden>${ico('x')}Cancelar</button><span class="muted" id="bkProg" style="font-size:13px"></span></div>
      <ol class="bk-log" id="bkLog"></ol>
    </form></details>`;
}
function bindAdmBulk(){
  const f=$('#bkF'); if(!f) return;
  f.closest('details').ontoggle=e=>{ S.bulkOpen=e.target.open; };
  f.querySelectorAll('input[name=bkDest]').forEach(r=>r.onchange=()=>{ $('#bkUser').hidden=f.querySelector('input[name=bkDest]:checked').value!=='user'; });
  userAutocomplete($('#bkU'), $('#bkSug'));
  $('#bkFiles').onchange=e=>{ const n=e.target.files.length; $('#bkFn').textContent=n?`${n} ${n===1?'archivo':'archivos'}`:''; };
  f.onsubmit=async e=>{ e.preventDefault();
    const urls=$('#bkUrls').value.split('\n').map(x=>x.trim()).filter(x=>/^https?:\/\//.test(x));
    const files=[...$('#bkFiles').files];
    const textAll=$('#bkText').value.trim();
    const kindOf=x=>/^image\//.test(x.type)||/\.(jpe?g|png|webp|heic|gif)$/i.test(x.name)?'photo':/^(video|audio)\//.test(x.type)||/\.(mp4|mov|m4v|webm|mp3|m4a|wav|ogg)$/i.test(x.name)?'video':'file';
    const jobs=[...urls.map(u=>({k:'url',v:u,l:u})), ...files.map(x=>({k:kindOf(x),v:x,l:x.name})), ...(textAll.length>20?[{k:'text',v:textAll,l:'Texto pegado'}]:[])];
    if(!jobs.length){ toast('Añade enlaces, archivos o texto'); return; }
    const dest=f.querySelector('input[name=bkDest]:checked').value==='user'?{type:'user', username:$('#bkU').value.trim(), folder:$('#bkFo').value.trim(), public:$('#bkPub').checked}:{type:'sugg'};
    if(dest.type==='user' && !dest.username.replace(/[,\s@]/g,'')){ toast('Escribe al menos un usuario'); return; }
    const credit=$('#bkCredit').value.trim(), log=$('#bkLog'), b=$('#bkGo'); b.disabled=true; log.innerHTML='';
    // se puede cancelar en cualquier momento: corta lo que se esté leyendo y no sigue
    let ctl=new AbortController(), stopped=false;
    const stop=$('#bkStop'), prog=$('#bkProg'); stop.hidden=false;
    stop.onclick=()=>{ stopped=true; ctl.abort(); stop.disabled=true; prog.textContent='Cancelando…'; };
    const call=async(path,opts)=>{ const r=await fetch(path,{credentials:'same-origin',signal:ctl.signal,...opts}); const jj=await r.json().catch(()=>({})); if(!r.ok) throw {error:jj.error}; return jj; };
    const raw=(path,blob)=>call(path,{method:'POST',headers:{'content-type':'application/octet-stream'},body:blob});
    const post=(path,body)=>call('/api'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
    let ok=0, done=0;
    for(const j of jobs){
      if(stopped) break;
      prog.textContent=`${done+1} de ${jobs.length}`;
      const li=document.createElement('li'); li.innerHTML=`<span class="spin"></span> ${esc(j.l)} — leyendo…`; log.append(li);
      try{
        let out;
        if(j.k==='url') out=await post('/admin/bulk/url',{url:j.v});
        else if(j.k==='photo'){ const big=await toDataUrl(j.v,1800,.85,3000000); out=await post('/admin/bulk/photo',{image:big}); }
        else if(j.k==='video') out=await raw('/api/admin/bulk/video?type='+encodeURIComponent(j.v.type||'video/mp4')+'&title='+encodeURIComponent(j.v.name.replace(/\.[^.]+$/,'')), j.v);
        else if(j.k==='text') out=await raw('/api/admin/bulk/file?name=texto.txt&type=text/plain', new Blob([j.v],{type:'text/plain'}));
        else out=await raw('/api/admin/bulk/file?name='+encodeURIComponent(j.v.name)+'&type='+encodeURIComponent(j.v.type||''), j.v);
        const recs=out.recipes||[]; let n=0;
        li.innerHTML=`<span class="spin"></span> ${esc(j.l)} — ${recs.length} ${recs.length===1?'receta encontrada':'recetas encontradas'}, guardando…`;
        for(const rec of recs){ if(stopped) break; try{ await post('/admin/bulk/save',{recipe:rec, dest, credit}); n++; ok++; }catch(e){ if(stopped) break; } }
        li.innerHTML=`${ico('check')} ${esc(j.l)} — ${n} ${n===1?'receta':'recetas'}: ${esc(recs.slice(0,8).map(x=>x.title).join(', '))}${recs.length>8?'…':''}${stopped&&n<recs.length?' (cancelado)':''}`; li.className='ok';
      }catch(err){ li.innerHTML=stopped?`${ico('x')} ${esc(j.l)} — cancelado`:`${ico('x')} ${esc(j.l)} — ${esc(err.error||'no se ha podido leer')}`; li.className='bad'; }
      done++;
    }
    if(stopped){ jobs.slice(done).forEach(j=>{ const li=document.createElement('li'); li.className='bad'; li.innerHTML=`${ico('x')} ${esc(j.l)} — cancelado`; log.append(li); }); }
    stop.hidden=true; stop.disabled=false; prog.textContent=stopped?'Subida cancelada':'';
    b.disabled=false; toast(`${stopped?'Cancelado. ':''}${ok} ${ok===1?'receta subida':'recetas subidas'}`); S.sugg=null;
  };
}
const admDo = async (fn,msg) => { try{ await fn(); toast(msg); adminLoad(); }catch(err){ toast(err.error||'No se ha podido hacer'); } };
const ADM_ACT = {
  admRole:el=>admDo(()=>api('PUT',`/admin/users/${el.dataset.id}/role`,{role:el.dataset.role}), el.dataset.role==='admin'?'Ahora es administrador':'Ya no es administrador'),
  admBlock:async el=>{
    if(el.dataset.b!=='1') return admDo(()=>api('PUT',`/admin/users/${el.dataset.id}/block`,{blocked:false}),'Suspensión quitada');
    const reason=await promptBox('Suspender cuenta','Motivo de la suspensión',{ok:'Suspender',hint:'La persona lo verá al entrar, junto con dónde puede reclamar.'});
    if(reason) admDo(()=>api('PUT',`/admin/users/${el.dataset.id}/block`,{blocked:true, reason}),'Cuenta suspendida');
  },
  admSuggestDel:async el=>{
    if(el.dataset.on!=='1') return admDo(()=>api('PUT',`/admin/users/${el.dataset.id}/suggest-delete`,{on:false}),'Sugerencia retirada');
    const reason=await promptBox('Sugerir borrar la cuenta','¿Por qué se debería borrar?',{ok:'Sugerir',hint:'El Superadministrador lo verá y decidirá.'});
    if(reason) admDo(()=>api('PUT',`/admin/users/${el.dataset.id}/suggest-delete`,{on:true, reason}),'Sugerencia enviada al Superadministrador');
  },
  admViewUser:el=>{ S.admUserId=el.dataset.id; S.admUser=null; go('admuser'); },
  admBackUsers:()=>{ S.admTab='usuarios'; go('admin'); },
  admOpenBook:el=>{ const b=admUserBook(el.dataset.id); if(b) showVisiting(b,0); },
  admOpenRecipe:el=>{ const d=S.admUser; const r=d&&d.recipes.find(x=>x.id===el.dataset.id); if(!r) return; const b={...admUserBook('all')}; const i=b.recipes.findIndex(x=>x.id===r.id); showVisiting(b, i>=0?pageOfRecipe(i):0); },
  admNewUser:async()=>{
    const m=openModal(`${mHead('Crear cuenta')}<form id="nuF" style="display:grid;gap:12px">
      <div class="field"><label for="nuU">Usuario</label><input id="nuU" class="inp" required maxlength="20" placeholder="@user983"></div>
      <div class="field"><label for="nuD">Nombre</label><input id="nuD" class="inp" maxlength="40"></div>
      <div class="field"><label for="nuE">Correo (opcional)</label><input id="nuE" class="inp" type="email" maxlength="254"></div>
      <div class="field"><label for="nuP">Contraseña</label><input id="nuP" class="inp" type="password" required minlength="6"></div>
      <div id="nuS"></div><div class="row" style="justify-content:flex-end"><button class="btn pri">${ico('plus')}Crear cuenta</button></div></form>`);
    $('#nuU',m).oninput=e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')};
    $('#nuF',m).onsubmit=async e=>{ e.preventDefault(); try{ await api('POST','/admin/users',{username:$('#nuU',m).value,display:$('#nuD',m).value,email:$('#nuE',m).value,password:$('#nuP',m).value}); closeModal(); toast('Cuenta creada'); adminLoad(); }catch(err){ $('#nuS',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; } };
  },
  admDelUser:async el=>{ if(await confirmBox(`Se borrará la cuenta @${el.dataset.n} con todas sus recetas y mensajes. No se puede deshacer.`)) admDo(()=>api('DELETE','/admin/users/'+el.dataset.id),'Cuenta borrada'); },
  admDelRecipe:async el=>{ if(await confirmBox(`Se borrará la receta «${el.dataset.n}» de su recetario.`)) admDo(()=>api('DELETE','/admin/recipes/'+el.dataset.id),'Receta borrada'); },
  admMsg:el=>admDo(()=>api('PUT','/admin/contact/'+el.dataset.id,{status:el.dataset.s}),'Mensaje actualizado'),
  admDelMsg:async el=>{ if(await confirmBox('Se borrará este mensaje de contacto.')) admDo(()=>api('DELETE','/admin/contact/'+el.dataset.id),'Mensaje borrado'); },
  admCopy:el=>copyText(el.dataset.v),
  admSuggHide:el=>admDo(()=>api('PUT','/admin/suggestions/'+el.dataset.id,{hidden:el.dataset.h==='1'}),el.dataset.h==='1'?'Sugerencia oculta':'Sugerencia visible').then(()=>{S.sugg=null}),
  admSuggDel:async el=>{ if(await confirmBox('Se quitará esta sugerencia.')) admDo(()=>api('DELETE','/admin/suggestions/'+el.dataset.id),'Sugerencia borrada').then(()=>{S.sugg=null}); },
};

/* ===== Avisos (campanita) ===== */
S.notices=[];
async function loadNotices(){
  try{ S.notices=await api('GET','/notices'); }catch{ return; }
  drawBell();
  const pop=S.notices.find(n=>n.popup && !n.read && !S.shownPop?.has(n.id));
  if(pop && !$('#modal-root').children.length) showNoticePopup(pop);
}
const unreadNotices = () => S.notices.filter(n=>!n.read).length;
function bellHtml(){
  const n=unreadNotices();
  return `<div class="bellbox">
    <button class="bell" id="bellBtn" aria-haspopup="dialog" aria-expanded="false" aria-label="Avisos${n?`, ${n} sin leer`:''}" title="Avisos">${ico('bell')}${n?`<span class="badge">${n}</span>`:''}</button>
    <div class="bell-panel" id="bellPanel" hidden role="dialog" aria-label="Avisos"></div></div>`;
}
function drawBell(){
  const box=$('.bellbox'); if(!box) return;
  const open=!$('#bellPanel').hidden; box.outerHTML=bellHtml(); bindBell();
  if(open){ $('#bellPanel').hidden=false; drawBellPanel(); }
}
function noticeHtml(n, inPanel=true){
  return `<article class="notice ${n.read?'':'unread'}">
    ${n.image?`<img src="${esc(n.image)}" alt="" class="n-img" loading="lazy" referrerpolicy="no-referrer">`:''}
    <div class="n-body">
      ${n.title?`<h3>${esc(n.title)}</h3>`:''}
      ${n.body?`<p>${fmt(n.body)}</p>`:''}
      <div class="n-foot">
        ${n.url?`<a class="btn sm pri" href="${esc(n.url)}" target="_blank" rel="noopener">${esc(n.url_label||'Abrir enlace')}</a>`:''}
        <span class="n-date">${esc(new Date(n.created).toLocaleDateString('es-ES',{day:'numeric',month:'short'}))}</span>
        ${inPanel?(n.dismissible?`<button class="btn sm ghost" data-ndis="${esc(n.id)}">${ico('x')}Quitar</button>`:`<span class="n-fixed" title="Este aviso se queda fijo">${ico('pin')}Fijo</span>`):''}
      </div>
    </div></article>`;
}
function drawBellPanel(){
  const p=$('#bellPanel'); if(!p) return;
  p.innerHTML=`<div class="bp-head"><b>Avisos</b></div>`+(S.notices.length?S.notices.map(n=>noticeHtml(n)).join(''):`<p class="muted bp-empty">No tienes avisos.</p>`);
  p.querySelectorAll('[data-ndis]').forEach(b=>b.onclick=async e=>{ e.stopPropagation();
    try{ await api('POST',`/notices/${b.dataset.ndis}/dismiss`); S.notices=S.notices.filter(n=>n.id!==b.dataset.ndis); drawBellPanel(); drawBell(); }catch(err){ toast(err.error||'No se ha podido quitar'); } });
}
function markNoticesRead(list){
  list.filter(n=>!n.read).forEach(n=>{ n.read=true; api('POST',`/notices/${n.id}/read`).catch(()=>{}); });
}
function bindBell(){
  const b=$('#bellBtn'), p=$('#bellPanel'); if(!b) return;
  b.onclick=e=>{ e.stopPropagation(); const open=p.hidden; p.hidden=!open; b.setAttribute('aria-expanded',String(open));
    if(open){ drawBellPanel(); const um=$('#userMenu'); if(um) um.hidden=true; setTimeout(()=>{ markNoticesRead(S.notices); const badge=b.querySelector('.badge'); if(badge) badge.remove(); },600); } };
}
document.addEventListener('click',e=>{ const p=$('#bellPanel'); if(p && !p.hidden && !e.target.closest('.bellbox')){ p.hidden=true; $('#bellBtn')?.setAttribute('aria-expanded','false'); drawBell(); } });
document.addEventListener('keydown',e=>{ const p=$('#bellPanel'); if(e.key==='Escape' && p && !p.hidden){ p.hidden=true; $('#bellBtn')?.focus(); } });
function showNoticePopup(n){
  S.shownPop=S.shownPop||new Set(); S.shownPop.add(n.id);
  openModal(`${mHead(n.title||'Aviso')}${noticeHtml({...n,title:''},false)}<div class="row" style="justify-content:flex-end"><button class="btn pri" data-act="closeModal">Entendido</button></div>`,{onClose:()=>{ drawBell(); setTimeout(loadNotices,300); }});
  markNoticesRead([n]);
}

/* Avisos en el panel de administración */
function admNotices(list){
  S.admNtList=list;
  return `<form id="ntForm" class="card nt-form">
      <h2 id="ntH">Nuevo aviso</h2>
      <div class="field"><label for="ntTitle">Título</label><input id="ntTitle" class="inp" maxlength="120" placeholder="Por ejemplo: ¡Ya podéis subir recetas desde vídeos!"></div>
      <div class="field"><div class="lblrow"><label for="ntBody">Texto</label>${fmtBar('ntBody')}</div><textarea id="ntBody" class="inp" rows="4" maxlength="2000"></textarea></div>
      <div class="field"><label>Imagen (opcional)</label><div class="imgbox"><span id="ntPrev"></span><label class="btn sm" for="ntFile">${ico('camera')}Subir imagen</label><input id="ntFile" type="file" accept="image/*" hidden><button type="button" class="btn sm ghost" id="ntImgDel" hidden>Quitar</button></div>
        <input id="ntImgUrl" class="inp" type="url" placeholder="o pega el enlace de una imagen"></div>
      <div class="grid2"><div class="field"><label for="ntUrl">Enlace (opcional)</label><input id="ntUrl" class="inp" type="url" placeholder="https://…"></div>
        <div class="field"><label for="ntUrlLbl">Texto del botón</label><input id="ntUrlLbl" class="inp" maxlength="40" placeholder="Abrir enlace"></div></div>
      <fieldset class="nt-opts"><legend>A quién</legend>
        <label class="opt-line"><input type="radio" name="ntWho" value="all" checked> A todo el mundo</label>
        <label class="opt-line"><input type="radio" name="ntWho" value="admins"> Solo a administradores</label>
        <label class="opt-line"><input type="radio" name="ntWho" value="users"> A personas concretas</label>
        <div id="ntPeople" hidden class="nt-people">
          <input id="ntPQ" class="inp" placeholder="Busca por nombre, usuario o correo" autocomplete="off" aria-label="Buscar personas">
          <div id="ntPRes" class="pick"></div>
          <div class="chips" id="ntPSel"></div>
        </div></fieldset>
      <fieldset class="nt-opts"><legend>Dónde se ve</legend>
        <label class="opt-line"><input type="radio" name="ntWhere" value="bell" checked> Solo en la campanita</label>
        <label class="opt-line"><input type="radio" name="ntWhere" value="popup"> En la campanita y en una ventana al abrir la app</label></fieldset>
      <fieldset class="nt-opts"><legend>En la campanita</legend>
        <label class="opt-line"><input type="radio" name="ntKeep" value="dis" checked> Cada persona lo puede quitar</label>
        <label class="opt-line"><input type="radio" name="ntKeep" value="fix"> Se queda fijo, no se puede quitar</label></fieldset>
      <label class="opt-line" id="ntRenewL" hidden><input type="checkbox" id="ntRenew"> Volver a mostrarlo como nuevo a todo el mundo (se borra quién lo ha leído)</label>
      <div id="ntSt"></div>
      <div class="row"><button class="btn pri" id="ntGo">${ico('send')}Enviar aviso</button><button type="button" class="btn ghost" id="ntCancel" hidden>Cancelar</button></div>
    </form>
    <h2 class="below-h">Avisos enviados</h2>
    ${list.length?`<div class="adm-rows">${list.map(n=>`<div class="adm-row ${n.active?'':'blocked'}">
      ${n.image?`<span class="thumb sm"><img src="${esc(n.image)}" alt="" referrerpolicy="no-referrer"></span>`:''}
      <div class="ar-main"><div class="ar-t">${esc(n.title||(n.body||'').slice(0,60)||'Aviso con imagen')} ${n.popup?'<span class="role r-admin">Ventana al abrir</span>':''} ${n.dismissible?'':'<span class="role">Fijo</span>'} ${n.active?'':'<span class="role">Desactivado</span>'}</div>
        <div class="ar-s">Para ${n.audience==='admins'?'administradores':n.audience==='users'?esc(n.para||'personas concretas'):'todo el mundo'} · ${fmtDate(n.created)}${n.autor?' · por @'+esc(n.autor):''}</div>
        <div class="ar-s">Leído por <b>${n.leidas_cuentas}</b>${n.destinatarios!=null?` de ${n.destinatarios}`:''} ${(n.destinatarios??n.leidas_cuentas)===1?'cuenta':'cuentas'}${n.audience==='all'?` y ${n.leidas_anonimas} sin cuenta`:''}${n.quitadas?` · ${n.quitadas} lo quitaron`:''}</div></div>
      <div class="ar-act"><button class="btn sm" data-act="admNtEdit" data-id="${esc(n.id)}">${ico('edit')}Editar</button><button class="btn sm" data-act="admNtReads" data-id="${esc(n.id)}">${ico('users')}Quién lo ha leído</button>
        <button class="btn sm" data-act="admNtToggle" data-id="${esc(n.id)}" data-a="${n.active?0:1}">${n.active?'Desactivar':'Activar'}</button>
        <button class="btn sm danger" data-act="admNtDel" data-id="${esc(n.id)}">Borrar</button></div></div>`).join('')}</div>`:'<p class="muted">Todavía no has enviado avisos.</p>'}`;
}
function bindAdmNotices(){
  const f=$('#ntForm'); if(!f) return; let image=''; const sel=new Map();
  const drawSel=()=>{ $('#ntPSel').innerHTML=[...sel.values()].map(u=>`<button type="button" class="chip" aria-pressed="true" data-rm="${esc(u.id)}">${esc(u.display||u.username)} <span class="muted">@${esc(u.username)}</span> ✕</button>`).join(''); };
  f.querySelectorAll('input[name=ntWho]').forEach(r=>r.onchange=()=>{ $('#ntPeople').hidden=f.querySelector('input[name=ntWho]:checked').value!=='users'; if(!$('#ntPeople').hidden) searchP(); });
  let pt=null; const searchP=async()=>{ try{ const list=await api('GET','/admin/users?q='+encodeURIComponent($('#ntPQ').value.trim()));
    $('#ntPRes').innerHTML=list.slice(0,8).map(u=>{ S.profiles[u.id]=S.profiles[u.id]||u; return `<div class="person">${avatar(u.id)}<div class="pb"><div class="pn">${esc(u.display||'')}</div><div class="pu">@${esc(u.username)}</div></div>${sel.has(u.id)?'<span class="muted" style="font-size:13px">Elegida</span>':`<button type="button" class="btn sm" data-pick="${esc(u.id)}">${ico('plus')}Elegir</button>`}</div>`; }).join('')||'<p class="muted" style="margin:0">Nadie con esa búsqueda.</p>';
    $('#ntPRes').querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{ const u=list.find(x=>x.id===b.dataset.pick); sel.set(u.id,u); drawSel(); searchP(); }); }catch{} };
  $('#ntPQ').oninput=()=>{ clearTimeout(pt); pt=setTimeout(searchP,250); };
  $('#ntPSel').onclick=e=>{ const b=e.target.closest('[data-rm]'); if(b){ sel.delete(b.dataset.rm); drawSel(); searchP(); } };
  enableRichPaste($('#ntBody'));
  $('#ntFile').onchange=async e=>{ const file=e.target.files[0]; if(!file) return; try{ image=await toDataUrl(file,1200,.82,290000); $('#ntPrev').innerHTML=`<img src="${image}" alt="">`; $('#ntImgDel').hidden=false; $('#ntImgUrl').value=''; }catch{ toast('No se ha podido leer esa imagen'); } };
  $('#ntImgDel').onclick=()=>{ image=''; $('#ntPrev').innerHTML=''; $('#ntImgDel').hidden=true; };
  let editId=null;
  const setRadio=(name,val)=>{ const r=f.querySelector(`input[name=${name}][value="${val}"]`); if(r) r.checked=true; };
  // Editar un aviso ya enviado: se cargan todos sus datos en el formulario
  f._load=n=>{
    editId=n.id; $('#ntH').textContent='Editar aviso';
    $('#ntTitle').value=n.title||''; $('#ntBody').value=n.body||''; $('#ntUrl').value=n.url||''; $('#ntUrlLbl').value=n.url_label||'';
    image=''; $('#ntImgUrl').value=''; $('#ntPrev').innerHTML=''; $('#ntImgDel').hidden=true;
    if(n.image){ if(/^data:/.test(n.image)){ image=n.image; $('#ntPrev').innerHTML=`<img src="${esc(n.image)}" alt="">`; $('#ntImgDel').hidden=false; } else $('#ntImgUrl').value=n.image; }
    setRadio('ntWho',n.audience||'all'); setRadio('ntWhere',n.popup?'popup':'bell'); setRadio('ntKeep',n.dismissible?'dis':'fix');
    sel.clear(); (n.para_list||[]).forEach(u=>{ sel.set(u.id,u); S.profiles[u.id]=S.profiles[u.id]||u; }); drawSel();
    $('#ntPeople').hidden=n.audience!=='users'; if(!$('#ntPeople').hidden) searchP();
    $('#ntGo').innerHTML=`${ico('save')}Guardar cambios`; $('#ntCancel').hidden=false; $('#ntRenewL').hidden=false; $('#ntRenew').checked=false; $('#ntSt').innerHTML='';
    f.scrollIntoView({behavior:'smooth',block:'start'}); $('#ntTitle').focus({preventScroll:true});
  };
  $('#ntCancel').onclick=()=>adminLoad();
  f.onsubmit=async e=>{ e.preventDefault(); const b=$('#ntGo'); b.disabled=true;
    try{
      const body={ title:$('#ntTitle').value, body:$('#ntBody').value, image:image||$('#ntImgUrl').value.trim(), url:$('#ntUrl').value.trim(), url_label:$('#ntUrlLbl').value,
        popup:f.querySelector('input[name=ntWhere]:checked').value==='popup', dismissible:f.querySelector('input[name=ntKeep]:checked').value==='dis',
        audience:f.querySelector('input[name=ntWho]:checked').value, recipients:[...sel.keys()] };
      if(editId) await api('PUT','/admin/notices/'+editId,{...body, edit:true, renew:$('#ntRenew').checked});
      else await api('POST','/admin/notices',body);
      toast(editId?'Aviso guardado':'Aviso enviado'); adminLoad(); loadNotices();
    }catch(err){ b.disabled=false; $('#ntSt').innerHTML=`<p class="err">${esc(err.error)}</p>`; }
  };
}
Object.assign(ADM_ACT,{
  admNtEdit:el=>{ const n=(S.admNtList||[]).find(x=>x.id===el.dataset.id); const f=$('#ntForm'); if(n&&f&&f._load) f._load(n); },
  admNtToggle:el=>admDo(()=>api('PUT','/admin/notices/'+el.dataset.id,{active:el.dataset.a==='1'}), el.dataset.a==='1'?'Aviso activado':'Aviso desactivado'),
  admNtDel:async el=>{ if(await confirmBox('Se borrará el aviso para todo el mundo, con su registro de lecturas.')) admDo(()=>api('DELETE','/admin/notices/'+el.dataset.id),'Aviso borrado'); },
  admNtReads:async el=>{
    try{ const d=await api('GET',`/admin/notices/${el.dataset.id}/reads`);
      d.cuentas.forEach(u=>{ S.profiles[u.id]=S.profiles[u.id]||u; });
      openModal(`${mHead('Quién lo ha leído')}
        <p class="muted" style="margin:0">${d.cuentas.length} ${d.cuentas.length===1?'cuenta':'cuentas'}${d.anonimas?` y ${d.anonimas} ${d.anonimas===1?'persona':'personas'} sin cuenta`:''}.</p>
        <div class="pick">${d.cuentas.length?d.cuentas.map(u=>`<div class="person">${avatar(u.id)}<div class="pb"><div class="pn">${esc(u.display||'')}</div><div class="pu">@${esc(u.username)}</div></div><span class="muted" style="font-size:13px">${esc(new Date(u.read_at).toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}${u.dismissed?' · lo quitó':''}</span></div>`).join(''):'<p class="muted">Todavía no lo ha leído ninguna cuenta.</p>'}</div>`);
    }catch(err){ toast(err.error||'No se ha podido cargar'); }
  }
});

async function downloadPdf(url){
  toast('Preparando el PDF…');
  try{ const r=await fetch(url,{credentials:'same-origin'}); if(!r.ok){ const j=await r.json().catch(()=>({})); throw {error:j.error}; }
    const blob=await r.blob(); const cd=r.headers.get('content-disposition')||''; const m=cd.match(/filename\*=UTF-8''([^;]+)/);
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=m?decodeURIComponent(m[1]):'receta.pdf'; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); toast('PDF descargado'); }
  catch(err){ toast(err.error||'No se ha podido crear el PDF'); }
}
/* ===== Cuenta suspendida ===== */
function viewSuspended(){
  const s=S.me.suspended||{};
  return `<div class="empty suspended" style="margin-top:20px">${ico('lock')}
    <h2 style="font-size:24px;color:var(--ink);margin:0">Tu cuenta está suspendida</h2>
    ${s.at?`<p class="muted" style="margin:0">Desde el ${esc(new Date(s.at).toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'}))}</p>`:''}
    <div class="card" style="text-align:left;max-width:520px;width:100%"><b>Motivo</b><p style="margin:6px 0 0;white-space:pre-wrap">${esc(s.reason||'No se ha indicado un motivo.')}</p></div>
    <p style="margin:0;max-width:520px">Si crees que es un error o quieres reclamar, escríbenos desde el formulario de contacto contando tu usuario (@${esc(S.profile?.username||'')}). Revisaremos tu caso y te responderemos por correo.</p>
    <div class="row" style="justify-content:center"><a class="btn pri" href="/legal/contacto">${ico('mail')}Reclamar en Contacto</a><button class="btn" data-act="logout">${ico('out')}Cerrar sesión</button></div>
  </div>`;
}

/* ===== Recetas preferidas por los usuarios (las que la gente hace públicas) ===== */
function communityCard(r){
  return `<div class="rcard sg"><button class="sg-open" data-act="openCommunity" data-id="${esc(r.id)}">
      <span class="thumb">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(34,'var(--accent)','var(--accent-soft)')}</span>
      <span style="min-width:0;flex:1"><span class="tt">${esc(r.title||'Sin título')}</span><span class="mm">de ${esc(r.owner.display||'@'+r.owner.username)}${r.time?' · '+esc(r.time):''}</span></span></button>
    <button class="btn sm tbtn" data-act="saveCommunity" data-id="${esc(r.id)}" aria-label="Añadir a un recetario" title="Añadir a un recetario">${ico('plus')}<span class="lbl">Añadir</span></button></div>`;
}
let comPrevLoaded=0;
function communityPreviewHtml(){
  if(!S.communityAll || Date.now()-comPrevLoaded>5*60e3){ comPrevLoaded=Date.now(); api('GET','/community').then(l=>{ S.communityAll=l; l.forEach(r=>{ S.profiles[r.owner.id]=S.profiles[r.owner.id]||r.owner; }); const b=$('#comPrev'); if(b) b.innerHTML=communityPreviewHtml(); }).catch(()=>{}); }
  const l=S.communityAll; if(!l) return '<p class="muted" style="margin:0">Cargando…</p>';
  if(!l.length) return '<p class="muted" style="margin:0">Todavía nadie ha compartido recetas públicas. Al crear o editar una receta puedes marcarla como pública.</p>';
  return l.slice(0,6).map(communityCard).join('');
}
function viewCommunity(){
  return `<div class="book-head"><button class="btn ghost sm tbtn" data-act="go" data-v="library" aria-label="Biblioteca">${ico('back')}<span class="lbl">Biblioteca</span></button><h1>Recetas preferidas por los usuarios</h1></div>
    <p class="muted" style="margin:0 0 12px">Recetas que otras personas han creado y han querido compartir con todo el mundo. Ábrelas y guárdate las que te gusten.</p>
    ${S.profile?`<div class="fam-tools"><input id="comQ" class="inp" type="search" placeholder="Buscar en las recetas preferidas por los usuarios" value="${esc(S.comQ||'')}" aria-label="Buscar"></div>`
      :`<div class="banner">${ico('lock')}<span style="flex:1;min-width:200px">Sin cuenta solo se ven las 6 últimas recetas publicadas. Inicia sesión o crea una cuenta gratis para verlas todas y buscar entre ellas.</span><button class="btn sm pri" data-act="login">Iniciar sesión</button></div>`}
    <div class="cards fam-grid" id="comList"><p class="muted">Cargando…</p></div>`;
}
let comT=null;
async function loadCommunity(){
  const box=$('#comList'); if(!box) return;
  try{ const list=await api('GET','/community?q='+encodeURIComponent(S.comQ||'')); S.community=list;
    list.forEach(r=>{ S.profiles[r.owner.id]=S.profiles[r.owner.id]||r.owner; });
    box.innerHTML=list.length?list.map(communityCard).join('')
      :`<p class="muted" style="margin:0">${S.comQ?'No hay recetas con esa búsqueda.':'Todavía nadie ha compartido recetas públicas. Al crear o editar una receta puedes marcarla como pública.'}</p>`;
  }catch(err){ box.innerHTML=`<p class="err">${esc(err.error||'No se han podido cargar.')}</p>`; }
}
function afterCommunity(){ const i=$('#comQ'); if(i) i.oninput=()=>{ S.comQ=i.value.trim(); clearTimeout(comT); comT=setTimeout(loadCommunity,250); }; loadCommunity(); }

/* ===== Menú semanal ===== */
function viewMenu(){
  if(!S.profile) return needProfileView('Menú semanal');
  const mon=new Date(); mon.setDate(mon.getDate()-((mon.getDay()+6)%7)); const sun=new Date(mon); sun.setDate(mon.getDate()+6);
  const f=d=>d.toLocaleDateString('es-ES',{day:'numeric',month:'long'});
  return `<div class="menu-page">
    <div class="menu-head"><div><p class="eyebrow">Semana del ${f(mon)} al ${f(sun)}</p><h1>Menú semanal</h1>
      <p class="muted">Un menú distinto cada semana${(S.me.allergens||[]).length||S.me.prefs?.diabetes?', pensado para tus alérgenos y necesidades':''}. Toca un plato para ver la receta.</p></div>
      <button class="btn" data-act="menuNew">${ico('sparkle')}Proponer otro</button></div>
    <div id="menuBox" class="menu-box"><div class="status"><span class="spin"></span>Preparando tu menú…</div></div></div>`;
}
const MEALS=[['comida','Comida','🍲'],['cena','Cena','🌙']];
function menuHtml(m){
  const today=(new Date().getDay()+6)%7;
  const mon=new Date(); mon.setDate(mon.getDate()-today);
  const cell=(x,k,l)=>{ const lab=`<span class="pl-lab">${l}</span>`; if(!x||!x.name) return `<div class="pl-cell">${lab}<span class="muted">—</span></div>`;
    const [t,id]=String(x.ref||'').split(':');
    const inner=`${lab}<span class="pl-dish">${esc(x.name)}</span><span class="pl-tag">${x.ref?ico('book')+'Receta':ico('sparkle')+'Pedir a la IA'}</span>`;
    return x.ref?`<button class="pl-cell pl-${k}" data-act="menuOpen" data-t="${esc(t)}" data-id="${esc(id)}">${inner}</button>`
      :`<button class="pl-cell pl-${k} free" data-act="menuAsk" data-n="${esc(x.name)}">${inner}</button>`; };
  return `<div class="plan">
    <div class="pl-head"><span></span>${MEALS.map(([k,l,e])=>`<span class="pl-h pl-${k}"><span aria-hidden="true">${e}</span>${l}</span>`).join('')}</div>
    ${m.days.map((d,i)=>{ const dt=new Date(mon); dt.setDate(mon.getDate()+i);
      return `<div class="pl-row ${i===today?'today':''}"><div class="pl-day"><span class="pl-dn">${esc(d.day)}</span><span class="pl-dd">${dt.getDate()} ${dt.toLocaleDateString('es-ES',{month:'short'}).replace('.','')}</span>${i===today?'<span class="pl-today">Hoy</span>':''}</div>
        ${MEALS.map(([k,l])=>cell(d[k],k,l)).join('')}</div>`; }).join('')}
  </div>`;
}
async function afterMenu(force){
  const box=$('#menuBox'); if(!box) return;
  if(force) box.innerHTML='<div class="status"><span class="spin"></span>Preparando otro menú…</div>';
  try{ S.menu=await api(force?'POST':'GET', force?'/menu/new':'/menu'); box.innerHTML=menuHtml(S.menu); }
  catch(err){ box.innerHTML=`<p class="err">${esc(err.error||'No se ha podido preparar el menú.')}</p><button class="btn" data-act="menuRetry">Volver a intentarlo</button>`; }
}

/* ===== Ayuda: manual de uso ===== */
function viewHelp(){
  const sec=(t,ic,body)=>`<section class="card help-sec"><h2>${ico(ic)}${t}</h2>${body}</section>`;
  return `<div class="lib-head"><div><p class="eyebrow">Ayuda</p><h1>Manual de uso</h1></div></div>
  <div class="help">
    ${sec('La biblioteca','book',`<p>Cada recetario es un libro de tu estantería. Ábrelo para ver el índice y pasa las páginas como en un libro de verdad. Debajo del libro tienes la lista de recetas y, cuando abres una, los ingredientes y la preparación en grande.</p><ul><li>Usa el buscador de arriba para encontrar cualquier receta tuya.</li><li>«Todas» reúne todas tus recetas; «Sin recetario», las que aún no has guardado en ninguno.</li><li>Las <b>Recetas recomendadas</b> cambian cada día; las que ya has guardado no vuelven a salir.</li><li>En <b>Recetas preferidas por los usuarios</b> están las que otras personas han hecho públicas.</li></ul>`)}
    ${sec('Añadir recetas','plus',`<p>Pulsa <b>Nueva receta</b> y elige cómo:</p><ul><li><b>Desde un enlace</b>: pega el enlace de una web de cocina.</li><li><b>Desde un vídeo</b>: pega el enlace de TikTok, Instagram, Facebook o YouTube, o sube el vídeo. Puedes escribir qué receta es o algún detalle para ayudar a la IA.</li><li><b>Desde una foto</b>: hazle una foto a una receta de un libro, una revista o un papel; la IA la copia y redacta bien los pasos.</li><li><b>Con IA</b>: pide la receta que quieras y pide cambios hasta que te guste; luego apruébala.</li><li><b>A mano</b>: escríbela tú.</li></ul><p>Todas las recetas tienen foto: si no le pones una, la IA crea una. También se calcula sola su tabla nutricional.</p>`)}
    ${sec('Dictar en vez de escribir','mic',`<p>Puedes dictar las recetas: toca cualquier casilla de texto, pulsa el <b>micrófono del teclado</b> del móvil y habla. Por ejemplo: «doscientos gramos de harina, tres huevos…». Sirve para escribir la receta a mano, para el chat de la IA, para pedir cambios y para el chat con tus amigos.</p>`)}
    ${sec('Editar, pedir cambios y compartir','edit',`<ul><li>Dentro de una receta, pulsa <b>Editar</b> para cambiar lo que quieras o <b>Pedir cambios</b> para que la IA la adapte (más raciones, sin gluten, otra foto…).</li><li>Puedes poner enlaces en el texto: selecciona las palabras y pulsa el botón de enlace. Si nombras otra receta tuya, se enlaza sola.</li><li>Marca la receta como <b>pública</b> para que salga en Recetas preferidas por los usuarios, o déjala privada.</li><li><b>Compartir</b>: envíala por el chat a una o varias personas (separadas por comas; al escribir te sugiere a tus amigos) o copia el enlace.</li><li><b>PDF</b>: descarga una receta o un recetario entero en PDF.</li></ul>`)}
    ${sec('Raciones, letra y alérgenos','user',`<ul><li>Cambia las raciones con el desplegable y las cantidades se recalculan.</li><li>En <b>Mi cuenta</b> eliges el tamaño de la letra de las recetas.</li><li>Apunta tus <b>alérgenos</b> y si tienes <b>diabetes</b>: la IA te avisará y te propondrá sustitutos al añadir recetas, en el chat de recetas y en el menú semanal.</li></ul>`)}
    ${sec('Menú semanal','calendar',`<p>Cada semana tienes un menú distinto con comida y cena, hecho con tus recetas y las recomendadas. Toca un plato para abrir la receta, o pulsa «Proponer otro» si quieres cambiarlo.</p>`)}
    ${sec('Amigos y chat','chat',`<ul><li>Busca a tus amigos por su @usuario y mándales una solicitud.</li><li>En el chat puedes mandar recetas, recetarios, fotos, emojis y archivos (se pueden descargar), pedir y sugerir recetas.</li><li>Para responder a un mensaje concreto, deslízalo hacia la derecha o tócalo y pulsa responder.</li><li>En <b>Mi cuenta › Notificaciones en el móvil</b> puedes activar que te lleguen avisos de mensajes, recetas que te mandan, solicitudes de amistad y avisos de la app. En iPhone, primero añade la app a la pantalla de inicio.</li></ul>`)}
    ${sec('Moverte por la app','next',`<p>Desliza desde el borde izquierdo de la pantalla hacia el centro para volver a la página anterior, y desde el borde derecho para ir a la siguiente. El botón de atrás del móvil también funciona.</p>`)}
    ${sec('¿Más dudas?','mail',`<p>Escríbenos desde <a href="/legal/contacto">Contacto</a>.</p>`)}
  </div>`;
}

/* ===== Equivalencias de medidas =====
   Sólidos en gramos (cucharadas rasas y colmadas, tazas y vasos); líquidos en mililitros. Valores aproximados de cocina casera en España:
   cucharada sopera 15 ml, cucharadita 5 ml, cucharada de postre 10 ml, taza de desayuno 250 ml, taza de café 100 ml, vaso de agua 200 ml. */
const EQ_SOLID=[ // nombre, cucharada rasa, cucharada colmada, cucharadita rasa, taza de desayuno, vaso de agua (gramos)
  ['Harina de trigo',10,20,3,140,110],['Harina integral',9,18,3,130,105],['Harina de maíz (maicena)',10,20,3,135,110],
  ['Azúcar blanco',12,25,4,210,170],['Azúcar moreno',12,24,4,220,175],['Azúcar glas',8,16,3,125,100],
  ['Sal fina',15,25,5,300,240],['Sal gruesa',12,20,4,250,200],['Arroz',13,20,4,210,170],
  ['Cacao puro en polvo',7,14,2,105,85],['Levadura química (polvo de hornear)',9,15,3,null,null],['Bicarbonato',9,15,3,null,null],
  ['Pan rallado',7,14,2,110,90],['Copos de avena',6,12,2,95,75],['Almendra molida',7,14,2,100,80],['Coco rallado',5,10,2,85,70],
  ['Queso rallado',6,12,2,90,70],['Mantequilla',14,30,5,225,180],['Café molido',6,10,2,null,null],
  ['Lentejas o garbanzos secos',null,null,null,200,160],['Pasta corta (macarrones)',null,null,null,100,80]
];
const EQ_LIQ=[ // recipiente, mililitros
  ['Cucharadita',5],['Cucharada de postre',10],['Cucharada sopera',15],['Chorrito',15],['Chupito',40],['Taza de café',100],['Vaso de vino',100],
  ['Copa',150],['Vaso de agua',200],['Taza de desayuno',250],['Taza americana (cup)',240],['Tazón',350],['Lata de refresco',330],['Litro',1000]
];
const EQ_DENS=[['Agua',1],['Leche',1.03],['Caldo',1],['Nata',1],['Zumo',1.04],['Vino',0.99],['Cerveza',1.01],['Aceite de oliva',0.92],['Aceite de girasol',0.92],['Vinagre',1.01],['Salsa de soja',1.15],['Miel',1.42],['Sirope o jarabe',1.33],['Leche condensada',1.3],['Yogur líquido',1.05],['Licor',0.95]];
const EQ_PIECES=[['Huevo pequeño (S) sin cáscara','43 g'],['Huevo mediano (M) sin cáscara','53 g'],['Huevo grande (L) sin cáscara','63 g'],['Huevo extragrande (XL) sin cáscara','73 g'],
  ['Yema de huevo','18 g'],['Clara de huevo','33 g'],['Diente de ajo','5 g'],['Cebolla mediana','150 g'],['Patata mediana','200 g'],['Tomate mediano','150 g'],
  ['Zanahoria mediana','80 g'],['Pimiento rojo mediano','200 g'],['Zumo de un limón','40 ml'],['Zumo de una naranja','80 ml'],['Ralladura de un limón','1 cucharadita (3 g)'],
  ['Sobre de levadura química','16 g'],['Sobre de levadura de panadero seca','5,5 g = 15 g de fresca'],['Dado de levadura fresca','25 g'],['Hoja de gelatina','2 g'],
  ['Pastilla de caldo','10 g'],['Nuez de mantequilla','15–20 g'],['Pizca','menos de 1 g (lo que se coge con dos dedos)'],['Punta de cuchillo','1–2 g'],['Puñado de pasta o arroz','unos 40 g']];
const EQ_SWAP=[['25 g de levadura fresca','8 g de levadura seca de panadero'],['100 g de mantequilla','80 ml de aceite (en bizcochos)'],['100 g de azúcar','75 g de miel (y 20 ml menos de líquido)'],
  ['1 huevo (en repostería)','60 g de yogur o 50 g de plátano chafado'],['100 ml de nata para cocinar','100 ml de leche evaporada'],['1 cucharada de maicena','2 cucharadas de harina (para espesar)'],
  ['100 ml de buttermilk','100 ml de leche + 1 cucharada de zumo de limón (10 min)']];
const EQ_OVEN=[['Muy suave','120–140','250–275','1'],['Suave','150–160','300–325','2–3'],['Medio','170–180','350','4'],['Medio alto','190–200','375–400','5–6'],['Fuerte','210–220','425','7'],['Muy fuerte','230–250','450–475','8–9']];
const EQ_IMP=[['1 onza (oz)','28 g'],['1 libra (lb)','454 g'],['1 onza líquida (fl oz)','30 ml'],['1 cup (EE. UU.)','240 ml'],['1 pinta (EE. UU.)','473 ml'],['1 pinta (Reino Unido)','568 ml'],['1 quart (EE. UU.)','946 ml'],['1 stick de mantequilla','113 g'],['1 tablespoon (tbsp)','15 ml'],['1 teaspoon (tsp)','5 ml']];
function eqTable(head, rows){
  return `<div class="eq-tw"><table class="eq-tbl"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>`<td data-l="${esc(head[i])}">${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function viewEquiv(){
  const g=v=>v==null?'—':fmtNum(v)+' g';
  return `<div class="lib-head"><div><p class="eyebrow">Ayuda</p><h1>Equivalencias de medidas</h1></div></div>
  <div class="eq-page">
  <p class="muted eq-intro">Los <b>sólidos</b> se miden en gramos y los <b>líquidos</b> en mililitros. Las cantidades son aproximadas, tal como se mide en casa: cucharada sopera = 15 ml, cucharadita = 5 ml, vaso de agua = 200 ml y taza de desayuno = 250 ml.</p>
  <section class="card eq-card"><h2>${ico('scale')}Calculadora</h2>
    <div class="eq-calc">
      <div class="field eq-combo"><label for="eqQ">Ingrediente</label><input id="eqQ" class="inp" autocomplete="off" placeholder="Escribe: harina, leche, huevo…" value="Harina de trigo" role="combobox" aria-expanded="false" aria-controls="eqList"><input type="hidden" id="eqI" value="s0">
        <div class="eq-list" id="eqList" role="listbox" hidden></div></div>
      <div class="eq-row2"><div class="field"><label for="eqN">Cantidad</label><input id="eqN" class="inp" type="number" min="0" step="0.25" value="1" inputmode="decimal"></div>
      <div class="field"><label for="eqU">Medida</label><select id="eqU" class="inp"></select></div></div>
    </div>
    <div class="eq-out" id="eqOut" aria-live="polite"></div></section>
  <section class="card eq-card"><h2>Sólidos: cuánto pesa cada medida</h2>
    ${eqTable(['Ingrediente','Cucharada rasa','Cucharada colmada','Cucharadita rasa','Taza de desayuno','Vaso de agua'], EQ_SOLID.map(e=>[esc(e[0]),g(e[1]),g(e[2]),g(e[3]),g(e[4]),g(e[5])]))}</section>
  <section class="card eq-card"><h2>Líquidos: recipientes y medidas</h2>
    ${eqTable(['Medida','Mililitros','Agua o leche','Aceite','Miel'], EQ_LIQ.map(([n,ml])=>[esc(n),fmtNum(ml)+' ml',fmtNum(Math.round(ml))+' g',fmtNum(Math.round(ml*0.92))+' g',fmtNum(Math.round(ml*1.42))+' g']))}
    <p class="muted" style="margin:0;font-size:13px">El aceite pesa menos que el agua y la miel bastante más: 100 ml de aceite son unos 92 g y 100 ml de miel, unos 142 g.</p></section>
  <section class="card eq-card"><h2>Piezas y medidas caseras</h2>${eqTable(['Qué','Equivale a'], EQ_PIECES.map(r=>r.map(esc)))}</section>
  <section class="card eq-card"><h2>Sustituciones</h2>${eqTable(['Si no tienes…','Usa…'], EQ_SWAP.map(r=>r.map(esc)))}</section>
  <section class="card eq-card"><h2>Temperatura del horno</h2>${eqTable(['Horno','°C','°F','Gas'], EQ_OVEN.map(r=>r.map(esc)))}
    <p class="muted" style="margin:0;font-size:13px">Con ventilador, pon unos 20 °C menos de lo que diga la receta.</p></section>
  <section class="card eq-card"><h2>Medidas inglesas y americanas</h2>${eqTable(['Medida','Equivale a'], EQ_IMP.map(r=>r.map(esc)))}</section>
  </div>`;
}
const EQ_ALL=()=>[...EQ_SOLID.map((e,i)=>({id:'s'+i,n:e[0],t:'Sólido'})),...EQ_DENS.map((e,i)=>({id:'l'+i,n:e[0],t:'Líquido'})),...EQ_PIECES.map((e,i)=>({id:'p'+i,n:e[0],t:'Pieza'}))];
function bindEquiv(){
  const n=$('#eqN'), u=$('#eqU'), i=$('#eqI'), o=$('#eqOut'), qi=$('#eqQ'), list=$('#eqList'); if(!n) return;
  const r=x=>fmtNum(Math.round(x*10)/10);
  const pl=(x,a,b)=>`${r(x)} ${Math.abs(x-1)<0.01?a:b}`;
  const norm=t=>String(t||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  let act=0, opts=[];
  const drawList=()=>{ const q=norm(qi.value.trim()); const all=EQ_ALL();
    opts=(q?all.filter(x=>norm(x.n).includes(q)).sort((a,b)=>norm(a.n).indexOf(q)-norm(b.n).indexOf(q)):all);
    if(!opts.length){ list.innerHTML='<p class="muted" style="margin:6px 8px">No está en las tablas. Prueba con otro nombre.</p>'; list.hidden=false; return; }
    act=Math.min(act,opts.length-1);
    list.innerHTML=opts.map((x,k)=>`<button type="button" role="option" class="eq-opt" aria-selected="${k===act}" data-id="${x.id}"><span>${esc(x.n)}</span><small>${x.t}</small></button>`).join('');
    list.hidden=false; qi.setAttribute('aria-expanded','true'); };
  const choose=id=>{ const x=EQ_ALL().find(y=>y.id===id); if(!x) return; i.value=id; qi.value=x.n; list.hidden=true; qi.setAttribute('aria-expanded','false'); units(); calc(); };
  qi.addEventListener('focus',()=>{ qi.select(); act=0; drawList(); });
  qi.addEventListener('input',()=>{ act=0; drawList(); });
  qi.addEventListener('keydown',e=>{ if(list.hidden) return;
    if(e.key==='ArrowDown'){ e.preventDefault(); act=(act+1)%opts.length; drawList(); list.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'}); }
    else if(e.key==='ArrowUp'){ e.preventDefault(); act=(act-1+opts.length)%opts.length; drawList(); list.querySelector('[aria-selected=true]')?.scrollIntoView({block:'nearest'}); }
    else if(e.key==='Enter'){ e.preventDefault(); if(opts[act]) choose(opts[act].id); }
    else if(e.key==='Escape'){ list.hidden=true; } });
  list.addEventListener('mousedown',e=>e.preventDefault());
  list.addEventListener('click',e=>{ const b=e.target.closest('[data-id]'); if(b) choose(b.dataset.id); });
  document.addEventListener('click',e=>{ if(!e.target.closest('.eq-combo') && list) list.hidden=true; });
  const units=()=>{ const v=i.value, k=v[0];
    let opts;
    if(k==='s'){ const e=EQ_SOLID[+v.slice(1)]; opts=[['g','gramos'],...(e[1]?[['cs','cucharadas rasas'],['csc','cucharadas colmadas'],['cc','cucharaditas rasas']]:[]),...(e[4]?[['taza','tazas de desayuno'],['vaso','vasos de agua']]:[])]; }
    else if(k==='l') opts=[['ml','mililitros'],['g','gramos'],['cc','cucharaditas'],['cs','cucharadas soperas'],['cafe','tazas de café'],['vaso','vasos de agua'],['taza','tazas de desayuno']];
    else opts=[['ud','unidades']];
    const keep=u.value; u.innerHTML=opts.map(([a,b])=>`<option value="${a}">${b}</option>`).join(''); if(opts.some(x=>x[0]===keep)) u.value=keep; };
  const calc=()=>{
    const v=i.value, k=v[0], q=parseFloat(String(n.value).replace(',','.'))||0;
    let parts;
    if(k==='s'){ const e=EQ_SOLID[+v.slice(1)]; const per={g:1,cs:e[1],csc:e[2],cc:e[3],taza:e[4],vaso:e[5]}; const gr=q*(per[u.value]||1);
      parts=[`<b>${r(gr)} g</b>`]; if(e[1]) parts.push(pl(gr/e[1],'cucharada rasa','cucharadas rasas'),pl(gr/e[2],'colmada','colmadas'),pl(gr/e[3],'cucharadita','cucharaditas')); if(e[4]) parts.push(pl(gr/e[4],'taza de desayuno','tazas de desayuno'),pl(gr/e[5],'vaso','vasos')); }
    else if(k==='l'){ const d=EQ_DENS[+v.slice(1)][1]; const per={ml:1,g:1/d,cc:5,cs:15,cafe:100,vaso:200,taza:250}; const ml=q*(per[u.value]||1);
      parts=[`<b>${r(ml)} ml</b>`,`${r(ml*d)} g`,pl(ml/15,'cucharada','cucharadas'),pl(ml/5,'cucharadita','cucharaditas'),pl(ml/200,'vaso','vasos'),pl(ml/250,'taza de desayuno','tazas de desayuno')]; }
    else { const e=EQ_PIECES[+v.slice(1)]; const m=String(e[1]).match(/^([\d,.]+)\s*(g|ml)\b/);
      parts = m ? [`<b>${r(parseFloat(m[1].replace(',','.'))*q)} ${m[2]}</b>`, `${r(q)} × ${esc(e[0].toLowerCase())}`] : [`<b>${esc(e[1])}</b>`]; }
    o.innerHTML=parts.map(x=>`<span>${x}</span>`).join('');
  };
  [n,u].forEach(x=>x.addEventListener('input',calc)); u.addEventListener('change',calc);
  units(); calc();
}
/* ===== Acciones ===== */
const fail = err => toast(err?.error||'No se pudo completar');
const ACT = {
  addSugg:el=>addSuggestion(el.dataset.id),
  menuNew:()=>afterMenu(true), menuRetry:()=>afterMenu(),
  pdfRecipe:el=>{ const id=el.dataset.id; downloadPdf(id.startsWith('sg:')?'/api/pdf/sugg/'+id.slice(3):'/api/pdf/recipe/'+id); },
  pdfFolder:el=>downloadPdf('/api/pdf/folder/'+el.dataset.id),
  menuOpen:el=>{ if(el.dataset.t==='r') ACT.openRecipe(el); else openSuggestion(el.dataset.id); },
  menuAsk:el=>{ if(!S.ai) return toast('La IA no está disponible ahora'); aiChatModal({prompt:'Dame la receta de '+el.dataset.n}); },
  saveCommunity:el=>{ const r=[...(S.community||[]),...(S.communityAll||[])].find(x=>x.id===el.dataset.id); if(!r) return; folderPicker('Guardar en…', async fid=>{ try{ const {owner,id,folderId,public:_p,...rest}=r; await store.saveRecipe({...rest, id:gid(), folderId:fid, fromUid:owner.id, created:now()}); toast('Guardada en tu recetario'); }catch(e){ fail(e); } }); },
  openCommunity:el=>{ const r=[...(S.community||[]),...(S.communityAll||[])].find(x=>x.id===el.dataset.id); if(r) showVisiting({id:'c-'+r.id, name:r.title, color:'#6E4429', owner:r.owner.id, ownerName:r.owner.display||('@'+r.owner.username), visiting:true, recipes:[r]}, 2); },
  openSugg:el=>openSuggestion(el.dataset.id),
  logout:async()=>{ await api('POST','/logout').catch(()=>{}); stopChat(); S.view='library'; await loadState(); render(); toast('Sesión cerrada'); },
  hideBanner:()=>{ lsSet('ef_hide_banner',true); refresh(); },
  libClear:()=>{ S.libQ=''; S.libF=''; const i=$('#libQ'); if(i) i.value=''; const f=$('#libF'); if(f) f.value=''; $('#libRes').innerHTML=''; },
  go:el=>go(el.dataset.v),
  closeModal:()=>closeModal(),
  register:()=>{ closeModal(); authModal('signup'); },
  login:()=>{ closeModal(); authModal('login'); },
  account:()=>go('account'),
  newRecipe:el=>{ closeModal(); newRecipeModal(el.dataset.folder||undefined); },
  newFolder:()=>folderModal(),
  openBook:el=>openBook(el.dataset.id),
  openRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(!r) return; openBook(r.folderId&&S.folders.some(f=>f.id===r.folderId)?r.folderId:'none', r.id); },
  closeBook:()=>{ const back=S.prevView||'library'; S.book=null; if(back==='chat'&&S.returnChat){ const id=S.returnChat; S.returnChat=null; openChat(id); } else { S.view='library'; go(back==='book'?'library':back); } },
  prevPage:()=>turn('prev'), nextPage:()=>turn('next'),
  goPage:el=>{ let p=+el.dataset.p; if(p%2)p--; S.turn=p>S.page?'next':'prev'; S.page=p; renderBook(); S.turn=null; window.scrollTo({top:0,behavior:'smooth'}); },
  editRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(r) editorModal({...r}); },
  shareRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(r) shareModal('recipe',r); },
  moveRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(!r) return; folderPicker('Mover a…', async fid=>{ try{ await store.saveRecipe({...r,folderId:fid}); toast('Receta movida'); }catch(e){fail(e)} }); },
  delRecipe:async el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(!r) return; if(await confirmBox(`Se borrará «${r.title}» de tu libro.`)){ try{ await store.deleteRecipe(r.id); toast('Receta borrada'); }catch(e){fail(e)} } },
  shareFolder:()=>{ const f=S.folders.find(x=>x.id===S.book.id); if(f) shareModal('folder',f); },
  editFolder:()=>{ const f=S.folders.find(x=>x.id===S.book.id); if(f) folderModal({...f}); },
  delFolder:async()=>{ const f=S.folders.find(x=>x.id===S.book.id); if(!f) return; if(await confirmBox(`Se borrará el recetario «${f.name}». Sus recetas no se pierden: pasan a «Sin recetario».`)){ try{ await store.deleteFolder(f.id); go('library'); toast('Recetario borrado'); }catch(e){fail(e)} } },
  saveCopy:()=>{ const r=currentRecipe(); if(!r) return; folderPicker('Guardar en…', async fid=>{ try{ await copyToMine({...r, fromUid:S.book.owner}, fid); await loadState(); toast('Guardada en tu libro'); }catch(e){ fail(e); } }); },
  saveFolderCopy:async()=>{ const b=S.book; try{ const fid=gid(); await api('PUT','/folders/'+fid,{name:b.name,color:b.color||CLOTHS[0][0],created:now()}); for(const r of b.recipes) await copyToMine({...r, fromUid:b.owner}, fid, false); await loadState(); toast(`«${b.name}» guardado en tu estantería`); }catch(e){ fail(e); } },
  openLink:()=>{ const m=openModal(`${mHead('Abrir un enlace')}<form id="fl" style="display:grid;gap:12px"><div class="field"><label for="lk">Pega el enlace que te han pasado</label><input id="lk" class="inp" required></div><div id="lkst"></div><div class="row" style="justify-content:flex-end"><button class="btn pri">Abrir</button></div></form>`);
    $('#fl',m).onsubmit=e=>{e.preventDefault();const c=parseCode($('#lk',m).value);if(!c){$('#lkst',m).innerHTML='<p class="err">Ese enlace no es de una receta o un recetario de Entre Fogones.</p>';return}closeModal();openShared(c)}; },
  addFriend:async el=>{ try{ const r=await api('POST','/friends/'+el.dataset.id); await loadState(); drawSearch(); toast(r.status==='accepted'?`Ahora ${pname(el.dataset.id)} y tú sois amigos`:'Solicitud enviada'); }catch(e){ fail(e); } },
  dropFriend:async el=>{ try{ await api('DELETE','/friends/'+el.dataset.id); await loadState(); drawSearch(); }catch(e){ fail(e); } },
  unfriend:el=>unfriend(el.dataset.id).catch(fail),
  chatWith:el=>openChat(el.dataset.id),
  chatBack:()=>{ stopChat(); render(); },
  replyMsg:el=>{ const m=S.msgs.find(x=>x.id===el.dataset.id); if(m) setReply(m); },
  cancelReply:()=>setReply(null),
  gotoMsg:el=>{ const t=document.querySelector(`.msg[data-mid="${CSS.escape(el.dataset.id)}"]`); if(!t){ toast('Ese mensaje es muy antiguo y ya no está aquí'); return; } t.scrollIntoView({behavior:'smooth',block:'center'}); t.classList.remove('flash'); void t.offsetWidth; t.classList.add('flash'); },
  viewImg:el=>{ const u=fileUrl({id:el.dataset.id}); openModal(`<div class="imgview"><img src="${u}" alt="Foto"><div class="row" style="justify-content:space-between"><a class="btn" href="${fileUrl({id:el.dataset.id},true)}" download>${ico('download')}Descargar</a><button class="btn pri" data-act="closeModal">Cerrar</button></div></div>`,{wide:true}); },
  chatShareRecipe:()=>recipePicker('Compartir una receta', (r,t)=>sendShare(S.chatWith,'recipe',r,'share',t).catch(fail)),
  chatSuggest:()=>recipePicker('Sugerir una receta', (r,t)=>sendShare(S.chatWith,'recipe',r,'suggest',t).catch(fail)),
  answerAsk:()=>recipePicker('Enviarle una receta', (r,t)=>sendShare(S.chatWith,'recipe',r,'answer',t).catch(fail)),
  chatShareFolder:()=>{ if(!S.folders.length) return; folderPicker('Compartir un recetario', fid=>{ const f=S.folders.find(x=>x.id===fid); if(f) sendShare(S.chatWith,'folder',f,'share').catch(fail); },{allowNone:false}); },
  chatAsk:()=>{ S.askMode=true; const ta=$('#ctext'); ta.placeholder='¿Qué receta le pides?'; ta.focus(); toast('Escribe qué receta le pides'); },
  openRef:el=>openShared({kind:el.dataset.k, id:el.dataset.i}),
  saveRef:async el=>{
    const {k,i}=el.dataset;
    try{
      if(k==='r'){ const d=await api('GET','/public/recipe/'+i);
        folderPicker('Guardar en…', async fid=>{ try{ await copyToMine({...d.recipe, fromUid:d.owner.id}, fid); await loadState(); toast('Guardada en tu libro'); }catch(e){fail(e)} }); }
      else { const d=await api('GET','/public/folder/'+i); const fid=gid();
        await api('PUT','/folders/'+fid,{name:d.folder.name,color:d.folder.color||CLOTHS[0][0],created:now()});
        for(const r of d.recipes) await copyToMine({...r,fromUid:d.owner.id}, fid, false);
        await loadState(); toast(`«${d.folder.name}» guardado en tu estantería`); }
    }catch(e){ fail(e); }
  }
};
document.addEventListener('click',e=>{ const el=e.target.closest('[data-act]'); if(!el) return; const f=ACT[el.dataset.act]||ADM_ACT[el.dataset.act]; if(f){ e.preventDefault(); f(el,e); } });

boot();

/* Sin zoom: la app no se amplía con gestos de pellizco, doble toque ni Ctrl + rueda */
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
document.addEventListener('touchmove',e=>{ if(e.touches && e.touches.length>1) e.preventDefault(); },{passive:false});
document.addEventListener('wheel',e=>{ if(e.ctrlKey) e.preventDefault(); },{passive:false});
document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey) && ['+','-','=','0'].includes(e.key)) e.preventDefault(); });

/* Contraseñas: botón con ojo para verla u ocultarla */
const EYE='<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF='<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function enhancePasswords(root=document){
  root.querySelectorAll('input[type=password]:not([data-pw])').forEach(inp=>{
    inp.dataset.pw='1';
    const wrap=document.createElement('span'); wrap.className='pw'; inp.parentNode.insertBefore(wrap,inp); wrap.append(inp);
    const b=document.createElement('button'); b.type='button'; b.className='pw-eye'; b.setAttribute('aria-label','Mostrar contraseña'); b.innerHTML=EYE;
    b.onclick=()=>{ const show=inp.type==='password'; inp.type=show?'text':'password'; b.innerHTML=show?EYE_OFF:EYE; b.setAttribute('aria-label',show?'Ocultar contraseña':'Mostrar contraseña'); inp.focus(); };
    wrap.append(b);
  });
}
new MutationObserver(()=>enhancePasswords()).observe(document.body,{childList:true,subtree:true});
