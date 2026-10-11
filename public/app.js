'use strict';
/* ===== Entre Fogones · cliente ===== */
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
function fmt(s){
  let h=esc(s);
  h=h.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/__(?=\S)([\s\S]*?\S)__/g,'<strong>$1</strong>');
  h=h.replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?![*\w])/g,'$1<em>$2</em>');
  h=h.replace(/(^|[^_\w])_(?=\S)([^_]*?\S)_(?![_\w])/g,'$1<em>$2</em>');
  return h;
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
const fmtBar = id => `<span class="fmtbar"><button type="button" data-fmt="**" data-for="${id}" aria-label="Negrita" title="Negrita (Ctrl+B)"><b>N</b></button><button type="button" data-fmt="*" data-for="${id}" aria-label="Cursiva" title="Cursiva (Ctrl+I)"><i>C</i></button></span>`;
document.addEventListener('mousedown',e=>{ const b=e.target.closest('[data-fmt]'); if(!b) return; e.preventDefault(); const ta=document.getElementById(b.dataset.for); if(ta) wrapSel(ta,b.dataset.fmt); });

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
  refresh();
}
const store = {
  async saveRecipe(r){ const {id,...body}=r; await api('PUT','/recipes/'+id, body); await loadState(); },
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
  render(); routeHash();
  setInterval(()=>{ if(document.visibilityState==='visible') loadState().catch(()=>{}); }, 8000);
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
function renderTop(){
  const unread = S.booted && canSocial() ? unreadCount() : 0;
  const pend = S.booted && canSocial() ? pendingIn().length : 0;
  const cur = S.view==='book' ? 'library' : S.view;
  $('#topbar').innerHTML = `
    <button class="brand" data-act="go" data-v="library" aria-label="Entre Fogones, ir a la biblioteca">${spoon(38)}<span class="w"><span class="w1" style="display:block">entre</span><span class="w2" style="display:block">fogones</span></span></button>
    <nav class="nav" aria-label="Secciones">
      <button data-act="go" data-v="library" ${cur==='library'?'aria-current="page"':''}>Biblioteca</button>
      <button data-act="go" data-v="chat" ${cur==='chat'?'aria-current="page"':''}>Chat${unread?`<span class="badge">${unread}</span>`:''}</button>
      <button data-act="go" data-v="friends" ${cur==='friends'?'aria-current="page"':''}>Amigos${pend?`<span class="badge">${pend}</span>`:''}</button>
      ${!S.booted?'':canSocial()?`<button class="me" data-act="account">${avatar(S.uid)}<span>@${esc(S.profile.username)}</span></button>`:`<button class="login" data-act="login">${ico('user')}Iniciar sesión</button>`}
    </nav>`;
}
function render(){
  document.body.classList.toggle('in-book', S.view==='book');
  renderTop();
  const m=$('#main');
  if(S.view==='library'){ m.innerHTML = viewLibrary(); fitSpines(); }
  else if(S.view==='book'){ renderBook(); return; }
  else if(S.view==='chat'){ m.innerHTML = viewChat(); afterChat(); }
  else if(S.view==='friends'){ m.innerHTML = viewFriends(); afterFriends(); }
}
let refreshQueued=false;
function refresh(){
  if(!S.booted || refreshQueued) return; refreshQueued=true;
  requestAnimationFrame(()=>{ refreshQueued=false;
    renderTop();
    if(S.view==='library'){ $('#main').innerHTML=viewLibrary(); fitSpines(); }
    else if(S.view==='book'){ if(!S.book.visiting) syncOwnBook(); if(S.view==='book') renderBook(); else render(); }
    else if(S.view==='chat'){ const l=$('#convList'); if(l) l.innerHTML=convListHtml(); else render(); updateConvHeader(); }
    else if(S.view==='friends'){ const l=$('#fside'); if(l) l.innerHTML=friendsSide(); drawSearch(); }
  });
}
function go(v){
  if(S.zoom){ S.zoom=null; document.body.style.overflow=''; if(document.fullscreenElement) document.exitFullscreen().catch(()=>{}); }
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
  const name = S.profile?.display || 'tu cocina';
  const none = S.recipes.filter(r=>!r.folderId || !S.folders.some(f=>f.id===r.folderId));
  const banner = !S.profile && !lsGet('ef_hide_banner') ? `<div class="banner">${ico('chat')}<span style="flex:1;min-width:200px">Puedes usar la app sin cuenta: tus recetas se guardan en este dispositivo. Inicia sesión o crea una cuenta para tenerlas en todos tus dispositivos, añadir amigos y chatear.</span><button class="btn sm" data-act="login">Iniciar sesión</button><button class="x" data-act="hideBanner" aria-label="Cerrar aviso" title="No volver a mostrar">${ico('x')}</button></div>` : '';
  const books = [
    `<button class="spine all" style="--cloth:#6E4429;height:226px" data-act="openBook" data-id="all" aria-label="Todas las recetas, ${S.recipes.length}"><span class="st">Todas</span><span class="sc">${S.recipes.length}</span></button>`,
    ...S.folders.map(f=>{const n=S.recipes.filter(r=>r.folderId===f.id).length;return `<button class="spine" style="--cloth:${esc(f.color)};color:${inkOn(f.color)};height:${spineH(f.id,f.name)}px" data-act="openBook" data-id="${esc(f.id)}" aria-label="${esc(f.name)}, ${n} recetas"><span class="st">${esc(f.name)}</span><span class="sc">${n}</span></button>`}),
    none.length?`<button class="spine" style="--cloth:#7A6A5C;height:190px" data-act="openBook" data-id="none" aria-label="Sin carpeta, ${none.length}"><span class="st">Sin carpeta</span><span class="sc">${none.length}</span></button>`:'',
    `<button class="spine add" style="height:200px" data-act="newFolder" aria-label="Nueva carpeta">${ico('plus')}<span class="st">Nueva carpeta</span></button>`
  ].join('');
  const recent = S.recipes.slice(0,9);
  return `${banner}
  <div class="lib-head">
    <div><p class="eyebrow">Biblioteca</p><h1>La estantería de ${esc(name)}</h1></div>
    <div class="row">
      <button class="btn pri" data-act="newRecipe">${ico('plus')}Nueva receta</button>
      <button class="btn" data-act="openLink">${ico('link')}Abrir un enlace</button>
    </div>
  </div>
  <div class="shelf-wrap"><div class="shelf">${books}</div><div class="shelf-board"></div></div>
  <section class="recent">
    <h2>Últimas recetas</h2>
    ${recent.length?`<div class="cards">${recent.map(cardHtml).join('')}</div>`:
      `<div class="empty">${spoon(54,'var(--muted)','var(--bg)')}<p style="margin:0">Aquí aparecerán tus recetas. Pega un enlace de una web de cocina, haz una foto a una receta, pídesela a ${esc(aiName())} o escríbela tú.</p><button class="btn pri" data-act="newRecipe">${ico('plus')}Añadir la primera receta</button></div>`}
  </section>`;
}
function cardHtml(r){
  const f=S.folders.find(f=>f.id===r.folderId);
  return `<button class="rcard" data-act="openRecipe" data-id="${esc(r.id)}">
    <span class="thumb">${r.image?`<img src="${esc(r.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:spoon(34,'var(--accent)','var(--accent-soft)')}</span>
    <span style="min-width:0"><span class="tt">${esc(r.title||'Sin título')}</span><span class="mm">${esc([f?.name, r.time].filter(Boolean).join(' · ')||'Sin carpeta')}</span></span>
  </button>`;
}

/* ===== Libro ===== */
const byTitle = (a,b)=>(a.title||'').localeCompare(b.title||'','es');
function ownBook(id){
  if(id==='all') return {id:'all', name:'Todas mis recetas', color:'#6E4429', owner:S.uid, recipes:[...S.recipes].sort(byTitle)};
  if(id==='none') return {id:'none', name:'Sin carpeta', color:'#7A6A5C', owner:S.uid, recipes:S.recipes.filter(r=>!r.folderId||!S.folders.some(f=>f.id===r.folderId)).sort(byTitle)};
  const f=S.folders.find(f=>f.id===id); if(!f) return null;
  return {id:f.id, name:f.name, color:f.color, owner:S.uid, folder:true, recipes:S.recipes.filter(r=>r.folderId===f.id).sort(byTitle)};
}
function syncOwnBook(){
  const b = ownBook(S.book.id);
  if(!b){ S.view='library'; S.book=null; S.zoom=null; return; }
  const curR = currentRecipe();
  S.book = b;
  const focusId = S.pendingFocus || curR?.id;
  if(focusId){ const i=b.recipes.findIndex(r=>r.id===focusId); if(i>=0){ S.page = pageOfRecipe(i); if(S.zoom==='page') S.zoomPage=S.page; if(S.pendingFocus===focusId) S.pendingFocus=null; } }
  const total=pages().length;
  S.page = Math.max(0, Math.min(S.page, total-2));
  if(S.zoomPage!=null) S.zoomPage = Math.min(S.zoomPage, total-1);
}
function pages(){
  const p=[{k:'title'},{k:'index'}];
  S.book.recipes.forEach(r=>{p.push({k:'rl',r});p.push({k:'rr',r});});
  if(p.length%2) p.push({k:'end'});
  return p;
}
const pageOfRecipe = i => 2+2*i;
function currentRecipe(){
  if(!S.book) return null; const p=pages();
  if(S.zoom==='page') return p[S.zoomPage]?.r || null;
  return p[S.page]?.r || p[S.page+1]?.r || null;
}
function openBook(id, recipeId){
  const b=ownBook(id); if(!b) return;
  S.book=b; S.page=0; S.zoom=null;
  if(recipeId){ const i=b.recipes.findIndex(r=>r.id===recipeId); if(i>=0) S.page=pageOfRecipe(i); }
  if(S.view!=='book') S.prevView=S.view;
  if(S.view==='chat') stopChat();
  S.view='book'; render(); window.scrollTo(0,0);
}
function bookTools(){
  const b=S.book, cur=currentRecipe(); let t='';
  if(b.visiting){
    t = cur ? `<button class="btn pri sm" data-act="saveCopy">${ico('save')}Guardar en mi libro</button>` : '';
    if(b.folder && b.recipes.length) t += `<button class="btn sm" data-act="saveFolderCopy">${ico('book')}Guardar la carpeta entera</button>`;
  } else if(cur) t = `<button class="btn sm" data-act="editRecipe" data-id="${esc(cur.id)}">${ico('edit')}Editar</button>
      <button class="btn sm" data-act="shareRecipe" data-id="${esc(cur.id)}">${ico('share')}Compartir</button>
      <button class="btn sm" data-act="moveRecipe" data-id="${esc(cur.id)}">${ico('move')}Mover</button>
      <button class="btn sm danger" data-act="delRecipe" data-id="${esc(cur.id)}">${ico('trash')}Borrar</button>`;
  else if(b.folder) t = `<button class="btn sm" data-act="shareFolder">${ico('share')}Compartir carpeta</button>
      <button class="btn sm" data-act="editFolder">${ico('edit')}Renombrar o color</button>
      <button class="btn sm danger" data-act="delFolder">${ico('trash')}Borrar carpeta</button>`;
  return t;
}
function viewBook(){
  const b=S.book, p=pages(), total=p.length;
  if(S.page%2) S.page--;
  const solo = S.zoom==='page';
  const idxs = solo ? [S.zoomPage] : [S.page, S.page+1];
  const anim = k => S.turn==='next' ? (solo||k===1?'leaf-in-r':'') : S.turn==='prev' ? (solo||k===0?'leaf-in-l':'') : '';
  const pagesHtml = idxs.map((i,k)=>`<article class="page ${solo?'solo':(k?'r':'l')} ${anim(k)}" data-pi="${i}" title="${solo?'Toca para volver a las dos páginas':'Toca para ver esta página más grande'}">${pageHtml(p[i],i+1)}</article>`).join('');
  const atStart = solo ? S.zoomPage<=0 : S.page<=0;
  const atEnd = solo ? S.zoomPage>=total-1 : S.page+2>=total;
  const label = solo ? `Página ${S.zoomPage+1} de ${total}` : `Páginas ${S.page+1}–${S.page+2} de ${total}`;
  const pager = `<div class="pager"><button class="btn" data-act="prevPage" aria-label="Página anterior" ${atStart?'disabled':''}>${ico('back')}</button><span class="${S.zoom?'muted':'muted'}">${label}</span><button class="btn" data-act="nextPage" aria-label="Página siguiente" ${atEnd?'disabled':''}>${ico('next')}</button></div>`;
  const bookHtml = `<div class="book-stage" id="stage"><div class="book ${solo?'single':''}" id="book" style="--cloth:${esc(b.color||'#2F5D46')}"><div class="spread">${pagesHtml}</div></div></div>`;
  if(S.zoom){
    return `<div class="zoomwrap" role="dialog" aria-modal="true" aria-label="Libro ampliado">
      <div class="zoombar"><span class="ttl">${esc(b.name)}</span><div class="row">${solo?`<button class="btn sm" data-act="zoomSpread">${ico('book')}Ver las dos páginas</button>`:''}<button class="btn sm" data-act="zoomClose">${ico('x')}Cerrar</button></div></div>
      ${bookHtml}
      <div class="zoombar" style="justify-content:center">${pager}</div>
    </div>`;
  }
  const ownerLabel = b.visiting ? `de ${esc(b.ownerName||'')}` : '';
  return `<div class="book-head">
      <button class="btn ghost sm" data-act="closeBook">${ico('back')}${b.visiting?'Volver':'Estantería'}</button>
      <h1>${esc(b.name)} <span class="muted" style="font-weight:500;font-size:15px">${ownerLabel}</span></h1>
      <span class="sp"></span>
      <div class="row">${bookTools()}</div>
    </div>
    ${bookHtml}
    <div class="book-foot">
      ${pager}
      <span class="hint">Toca una página para verla más grande</span>
      <div class="row">
        <button class="btn sm" data-act="zoomFull">${ico('expand')}Ampliar libro</button>
        ${!b.visiting?`<button class="btn pri sm" data-act="newRecipe" data-folder="${b.folder?esc(b.id):''}">${ico('plus')}Añadir receta aquí</button>`:''}
      </div>
    </div>`;
}
function pageHtml(p,num){
  const b=S.book; if(!p) return '';
  const pn=`<span class="pn">${num}</span>`;
  const wrap = h => `<div class="pc">${h}</div>${pn}`;
  if(p.k==='title'){
    const who = b.visiting ? (b.ownerName||'') : (S.profile?.display||'');
    return wrap(`<div class="title-page">${spoon(64,'var(--paper-ink)','var(--paper)')}<div class="orn"></div><h2>${esc(b.name)}</h2><div class="orn"></div>
      <p style="margin:0;color:var(--paper-muted)">${b.recipes.length} ${b.recipes.length===1?'receta':'recetas'}</p>
      ${who?`<p class="by" style="margin:0">de la cocina de ${esc(who)}</p>`:''}</div>`);
  }
  if(p.k==='index'){
    if(!b.recipes.length) return wrap(`<h2>Índice</h2><div class="pempty"><p>Este libro todavía está en blanco.</p>${b.visiting?'':`<button class="btn sm" data-act="newRecipe" data-folder="${b.folder?esc(b.id):''}">${ico('plus')}Añadir una receta</button>`}</div>`);
    return wrap(`<h2>Índice</h2><ol class="toc">${b.recipes.map((r,i)=>`<li><button data-act="goPage" data-p="${pageOfRecipe(i)}"><span class="tn">${esc(r.title||'Sin título')}</span><span class="dots"></span><span class="tp">${pageOfRecipe(i)+1}</span></button></li>`).join('')}</ol>`);
  }
  if(p.k==='end') return wrap(`<div class="title-page"><div class="orn"></div><p class="by">Fin</p><div class="orn"></div></div>`);
  const r=p.r;
  if(p.k==='rl'){
    const base=parseInt(r.servings)||0, shown=S.scale[r.id]||base, f=base?shown/base:1;
    const serv = base?`<span class="serv" aria-label="Raciones"><button data-act="serv" data-id="${esc(r.id)}" data-d="-1" aria-label="Menos raciones">−</button><span style="font-variant-numeric:tabular-nums">${shown} raciones</span><button data-act="serv" data-id="${esc(r.id)}" data-d="1" aria-label="Más raciones">+</button></span>`:(r.servings?`<span>${esc(r.servings)}</span>`:'');
    return wrap(`<h2>${esc(r.title||'Sin título')}</h2>
      <div class="meta">${serv}${r.time?`<span>${esc(r.time)}</span>`:''}${r.difficulty?`<span>${esc(r.difficulty)}</span>`:''}</div>
      ${r.image?`<img class="pimg" src="${esc(r.image)}" alt="${esc(r.title||'')}" referrerpolicy="no-referrer" onload="fitPages()" onerror="this.remove();fitPages()">`:''}
      <h3>Ingredientes</h3>
      ${(r.ingredients||[]).length?`<ul class="ing">${r.ingredients.map(i=>`<li>${fmt(scaleLine(i,f))}</li>`).join('')}</ul>`:'<p style="color:var(--paper-muted)">Sin ingredientes apuntados.</p>'}`);
  }
  if(p.k==='rr'){
    const from = r.fromUid && r.fromUid!==S.uid && S.profiles[r.fromUid] ? `<p class="src">Compartida por ${esc(pname(r.fromUid))}</p>`:'';
    return wrap(`<h3 style="margin-top:0">Preparación</h3>
      ${(r.steps||[]).length?`<ol class="steps">${r.steps.map(s=>`<li><span>${fmt(s)}</span></li>`).join('')}</ol>`:'<p style="color:var(--paper-muted)">Sin pasos apuntados.</p>'}
      ${r.notes?`<p class="note">${fmt(r.notes)}</p>`:''}
      ${r.source?`<p class="src">Fuente: <a href="${esc(r.source)}" target="_blank" rel="noopener">${esc(r.source)}</a></p>`:''}${from}`);
  }
  return pn;
}
function renderBook(){
  document.body.classList.add('in-book');
  $('#main').innerHTML=viewBook();
  document.body.style.overflow = S.zoom ? 'hidden' : '';
  layoutBook();
}
/* Tamaño del libro: las dos páginas caben enteras en la ventana */
function layoutBook(){
  const stage=$('#stage'), book=$('#book'); if(!stage||!book) return;
  const solo=S.zoom==='page';
  const W=stage.clientWidth;
  let H;
  if(S.zoom) H=stage.clientHeight;
  else {
    const top=stage.getBoundingClientRect().top + window.scrollY;
    const foot=$('.book-foot'); const fh=foot?foot.offsetHeight+16:60;
    H=window.innerHeight - top - fh - 14;
  }
  H=Math.max(H, 260);
  const bp=Math.round(Math.max(6, Math.min(16, W*0.012)));
  const AR=0.72, n=solo?1:2;
  const ph=Math.max(150, Math.min(H-2*bp, (W-2*bp-8)/(AR*n)));
  book.style.setProperty('--bp', bp+'px');
  book.style.width=Math.round(ph*AR*n+2*bp)+'px';
  book.style.height=Math.round(ph+2*bp)+'px';
  fitPages();
}
/* El texto de cada página se ajusta para que se vea entero sin desplazarse */
function fitPages(){
  document.querySelectorAll('#book .page').forEach(pg=>{
    const pc=pg.querySelector('.pc'); if(!pc) return;
    const fits=()=>pc.scrollHeight<=pc.clientHeight+1 && pc.scrollWidth<=pc.clientWidth+1;
    let hi=Math.max(6, pg.clientHeight/27), lo=3.5;
    pc.style.overflow='hidden';
    pg.style.fontSize=hi+'px';
    if(fits()) return;
    for(let k=0;k<14;k++){ const mid=(lo+hi)/2; pg.style.fontSize=mid+'px'; if(fits()) lo=mid; else hi=mid; }
    pg.style.fontSize=lo+'px';
    if(!fits()) pc.style.overflow='auto';
  });
}
function turn(dir){
  const total=pages().length;
  if(S.zoom==='page'){
    const np=S.zoomPage+(dir==='next'?1:-1); if(np<0||np>=total) return; S.zoomPage=np;
  } else {
    const np=S.page+(dir==='next'?2:-2); if(np<0||np>=total) return; S.page=np;
  }
  S.turn=dir; renderBook(); S.turn=null;
}
function zoomTo(mode){
  if(mode==='full' && !S.zoom){ try{ const el=document.documentElement; if(el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(()=>{}); }catch{} }
  if(!mode && document.fullscreenElement){ try{ document.exitFullscreen().catch(()=>{}); }catch{} }
  S.zoom=mode; renderBook();
}
document.addEventListener('click',e=>{
  if(S.view!=='book') return;
  const pg=e.target.closest('#book .page'); if(!pg || e.target.closest('button,a,input,select,textarea')) return;
  if(S.zoom==='page'){ S.page=S.zoomPage-(S.zoomPage%2); zoomTo(S.zoomFrom||null); }
  else { S.zoomFrom=S.zoom; S.zoomPage=+pg.dataset.pi; S.zoom='page'; renderBook(); }
});
document.addEventListener('keydown',e=>{
  if(S.view!=='book' || $('#modal-root').children.length || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
  if(e.key==='ArrowRight') turn('next');
  else if(e.key==='ArrowLeft') turn('prev');
  else if(e.key==='Escape' && S.zoom){ if(S.zoom==='page'){ S.page=S.zoomPage-(S.zoomPage%2); zoomTo(S.zoomFrom||null); } else zoomTo(null); }
});
let resizeT=null;
addEventListener('resize',()=>{ clearTimeout(resizeT); resizeT=setTimeout(()=>{ if(S.view==='book') layoutBook(); },80); });
document.addEventListener('fullscreenchange',()=>{ if(!document.fullscreenElement && S.zoom==='full'){ S.zoom=null; if(S.view==='book') renderBook(); } else if(S.view==='book') layoutBook(); });
if(document.fonts?.ready) document.fonts.ready.then(()=>{ if(S.view==='book') layoutBook(); if(S.view==='library') fitSpines(); });

/* ===== Modales ===== */
function openModal(html,{wide=false,onClose}={}){
  const root=$('#modal-root');
  root.innerHTML=`<div class="scrim" data-scrim><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true">${html}</div></div>`;
  root._onClose=onClose;
  setTimeout(()=>root.querySelector('input:not([readonly]),textarea,select')?.focus(),30);
  return root.querySelector('.modal');
}
function closeModal(){ const root=$('#modal-root'); const cb=root._onClose; root.innerHTML=''; root._onClose=null; cb?.(); }
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
    ${allowNone?`<button class="btn" data-fid="">Sin carpeta</button>`:''}
  </div>`);
  m.querySelectorAll('[data-fid]').forEach(b=>b.onclick=()=>{closeModal();cb(b.dataset.fid||null)});
}

/* ===== Carpeta ===== */
function folderModal(f){
  const isNew=!f; f=f||{id:gid(),name:'',color:CLOTHS[(S.folders.length)%CLOTHS.length][0],created:now()};
  let color=f.color;
  const m=openModal(`${mHead(isNew?'Nueva carpeta':'Editar carpeta')}
    <form id="ff" style="display:grid;gap:16px">
      <div class="field"><label for="fname">Nombre</label><input id="fname" class="inp" required maxlength="40" value="${esc(f.name)}" placeholder="Postres, Cenas rápidas, De la abuela…"></div>
      <div class="field"><label>Color de la tela</label>${colorField('fcolor', color, CLOTHS)}</div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri">${isNew?'Crear carpeta':'Guardar'}</button></div>
    </form>`);
  initColorField(m,'fcolor',c=>{color=c});
  $('#ff',m).onsubmit=async e=>{e.preventDefault();const name=$('#fname',m).value.trim();if(!name)return;
    try{ await store.saveFolder({...f,name,color}); closeModal(); toast(isNew?'Carpeta creada':'Carpeta guardada'); }catch(err){ toast(err.error||'No se pudo guardar la carpeta'); }};
}

/* ===== Nueva receta ===== */
const aiName = () => S.aiName || 'la IA';
const noAiHtml = what => `<div class="empty" style="padding:22px">${ico('sparkle')}<p style="margin:0;max-width:440px">${what} usa inteligencia artificial y todavía no está activada en el servidor. Mientras tanto puedes importar desde un enlace o escribir la receta a mano.</p></div>`;
function newRecipeModal(folderId){
  const m=openModal(`${mHead('Nueva receta')}
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="url">${ico('link')}Desde enlace</button>
      <button role="tab" aria-selected="false" data-tab="video">${ico('play')}Desde vídeo</button>
      <button role="tab" aria-selected="false" data-tab="photo">${ico('camera')}Desde foto</button>
      <button role="tab" aria-selected="false" data-tab="ai">${ico('sparkle')}Con ${esc(aiName())}</button>
      <button role="tab" aria-selected="false" data-tab="hand">${ico('edit')}A mano</button>
    </div>
    <div id="tabBody"></div>`,{wide:true});
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
            if(S.ai){ busy(st,'Leyendo la receta…'); const {recipe}=await api('POST','/ai/extract',{text:pasted}); closeModal(); editorModal({...recipe, source:url, folderId}); }
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
          <p class="muted" style="margin:0;font-size:14px">Se lee el título, la descripción y, en YouTube, los subtítulos. Si la receta solo se dice en voz, sube el vídeo.</p>
          <div id="vpasteWrap" hidden class="field"><label for="vpaste">Texto del vídeo</label><p class="muted" style="margin:0;font-size:14px" id="vpasteMsg"></p><textarea id="vpaste" class="inp" rows="6"></textarea></div>
          <div id="vstatus"></div>
          <div class="row" style="justify-content:flex-end"><button class="btn pri" id="vgo">${ico('play')}Sacar la receta</button></div>
        </form>
        <div style="border-top:1px solid var(--line);padding-top:14px;display:grid;gap:10px">
          <p style="margin:0"><strong>¿Lo tienes guardado en el móvil?</strong> Súbelo y se escucha lo que dicen para sacar la receta (máximo 25 MB).</p>
          <div class="row"><label class="btn" for="vfile">${ico('upload')}Subir vídeo</label><input id="vfile" type="file" accept="video/*,audio/*" hidden></div>
          <div id="vfstatus"></div>
        </div>
      </div>`;
      enableRichPaste($('#vpaste',m));
      $('#fv',m).onsubmit=async e=>{e.preventDefault();
        const url=$('#vurl',m).value.trim(), pasted=$('#vpaste',m).value.trim(), st=$('#vstatus',m), btn=$('#vgo',m); btn.disabled=true;
        try{
          if(pasted){
            if(S.ai){ busy(st,'Leyendo la receta…'); const {recipe}=await api('POST','/ai/extract',{text:pasted}); closeModal(); aiChatModal({folderId, seed:{recipe:{...recipe, source:url}, reply:'He sacado la receta del vídeo. Revísala: apruébala o pídeme cambios.'}}); }
            else { closeModal(); editorModal({...roughParse(pasted), source:url, folderId}); }
            return;
          }
          busy(st,'Mirando el vídeo…');
          const {recipe}=await api('POST','/import',{url});
          closeModal();
          if(S.ai) aiChatModal({folderId, seed:{recipe, reply:'He sacado la receta del vídeo. Revísala: si está bien, apruébala; si falta algo, pídemelo.'}});
          else editorModal({...recipe, folderId});
        }catch(err){
          st.innerHTML='';
          if(err.needText){ $('#vpasteWrap',m).hidden=false; $('#vpasteMsg',m).textContent=err.error; if(err.text) $('#vpaste',m).value=err.text; $('#vpaste',m).focus(); btn.innerHTML=`${ico('play')}Sacar la receta del texto`; }
          else st.innerHTML=`<p class="err">${esc(err.error)}</p>`;
        } finally{ btn.disabled=false; }
      };
      $('#vfile',m).onchange=async e=>{
        const f=e.target.files[0]; if(!f) return; const st=$('#vfstatus',m);
        if(!S.ai){ st.innerHTML=`<p class="err">Para escuchar vídeos hace falta la IA, que todavía no está activada.</p>`; return; }
        if(f.size>25*1024*1024){ st.innerHTML=`<p class="err">El vídeo pesa más de 25 MB. Prueba con uno más corto o con el enlace.</p>`; return; }
        busy(st,'Escuchando el vídeo… puede tardar un minuto');
        try{
          const r=await fetch('/api/import/video-file',{method:'POST',credentials:'same-origin',headers:{'content-type':f.type||'video/mp4'},body:f});
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
  m.querySelectorAll('[data-tab]').forEach(t=>t.onclick=()=>{m.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-selected',x===t));tabs[t.dataset.tab]()});
  tabs.url();
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
function aiChatModal({folderId, seed}={}){
  const st={msgs:[], recipe:null, busy:false};
  if(folderId===undefined||folderId==='') folderId = S.book && !S.book.visiting && S.book.folder ? S.book.id : (S.folders[0]?.id||'');
  if(seed){ st.recipe=seed.recipe; st.msgs.push({role:'assistant', text:seed.reply, raw:JSON.stringify({reply:seed.reply, recipe:seed.recipe})}); }
  const m=openModal(`${mHead(seed?'Receta de la foto':'Receta con '+aiName())}
    <div class="aichat" id="aichat"></div>
    <div id="aiprev"></div>
    <form id="aiform" class="aiform">
      <textarea id="aiin" class="inp" rows="2" aria-label="Mensaje"></textarea>
      <button class="btn pri" id="aigo"></button>
    </form>
    <div id="aierr"></div>`,{wide:true});
  const log=$('#aichat',m), prev=$('#aiprev',m), inp=$('#aiin',m), go=$('#aigo',m);
  const drawLog=()=>{
    log.innerHTML = (st.msgs.length?'':`<p class="muted" style="margin:0">Dile a ${esc(aiName())} qué te apetece y te propone una receta. Luego puedes pedirle cambios hasta que te guste.</p>`)
      + st.msgs.map(x=>`<div class="aimsg ${x.role}">${fmt(x.text)}</div>`).join('')
      + (st.busy?`<div class="aimsg assistant"><span class="spin"></span> Pensando…</div>`:'');
    log.scrollTop=log.scrollHeight;
    inp.placeholder = st.recipe ? '¿Quieres cambiar algo? Ej.: sin lactosa, para 6 personas, más picante' : 'Ej.: una lasaña de verduras para 4, fácil';
    go.innerHTML = `${ico('send')}${st.recipe?'Pedir cambios':'Pedir receta'}`;
    go.disabled = st.busy;
  };
  const drawPrev=()=>{
    if(!st.recipe){ prev.innerHTML=''; return; }
    prev.innerHTML = recipePreview(st.recipe) + `<div class="approve">
      <label for="aifold" class="muted" style="font-size:14px">Guardar en</label>
      <select id="aifold" class="inp" style="width:auto;min-width:160px">${S.folders.map(f=>`<option value="${esc(f.id)}" ${f.id===folderId?'selected':''}>${esc(f.name)}</option>`).join('')}<option value="" ${!folderId?'selected':''}>Sin carpeta</option></select>
      <span style="flex:1"></span>
      <button type="button" class="btn" id="aiedit">${ico('edit')}Retocar a mano</button>
      <button type="button" class="btn pri" id="aiok">${ico('save')}Aprobar</button>
    </div>`;
    $('#aifold',m).onchange=e=>{folderId=e.target.value};
    $('#aiedit',m).onclick=()=>{ const r=st.recipe; closeModal(); editorModal({...r, folderId:$('#aifold',m)?.value||folderId}); };
    $('#aiok',m).onclick=async()=>{
      const b=$('#aiok',m); b.disabled=true;
      const r={...st.recipe, id:gid(), folderId:folderId||null, created:now()};
      try{ S.pendingFocus=r.id; await store.saveRecipe(r); closeModal(); toast('Receta aprobada y guardada'); openBook(r.folderId||'none', r.id); }
      catch(err){ b.disabled=false; $('#aierr',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
    };
  };
  const send=async()=>{
    const t=inp.value.trim(); if(!t||st.busy) return;
    inp.value=''; $('#aierr',m).innerHTML='';
    st.msgs.push({role:'user', text:t, raw:t}); st.busy=true; drawLog();
    try{
      const out=await api('POST','/ai/chat',{messages:st.msgs.map(x=>({role:x.role, content:x.raw}))});
      if(out.recipe){ const keep=st.recipe?.image; st.recipe={...out.recipe, ...(keep?{image:keep}:{})}; }
      st.msgs.push({role:'assistant', text:out.reply||(out.recipe?'Aquí la tienes.':''), raw:JSON.stringify({reply:out.reply, recipe:out.recipe})});
    }catch(err){ st.msgs.pop(); inp.value=t; $('#aierr',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
    st.busy=false; drawLog(); drawPrev();
  };
  $('#aiform',m).onsubmit=e=>{e.preventDefault(); send();};
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
  drawLog(); drawPrev();
}

/* ===== Color: muestras rápidas y ruleta para cualquier color ===== */
function hexToRgb(h){h=String(h||'#000').replace('#','');if(h.length===3)h=[...h].map(c=>c+c).join('');const n=parseInt(h,16)||0;return [n>>16&255,n>>8&255,n&255]}
function rgbToHex(r,g,b){return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('').toUpperCase()}
function hsvToRgb(h,s,v){const f=n=>{const k=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return [f(5)*255,f(3)*255,f(1)*255]}
function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return [h,mx?d/mx:0,mx]}
function inkOn(hex){ const [r,g,b]=hexToRgb(hex).map(x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4}); return (.2126*r+.7152*g+.0722*b)>.42?'#2E1A11':'#FBF3E8'; }
function colorField(id, value, presets){
  return `<div class="cfield" id="${id}" data-value="${esc(value)}">
    <div class="swatches">${presets.map(([c,n])=>`<button type="button" class="sw" style="background:${c}" data-c="${c}" aria-label="${esc(n)}"></button>`).join('')}
      <button type="button" class="sw wheelbtn" aria-label="Elegir otro color con la ruleta" aria-expanded="false"></button></div>
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
    wb.setAttribute('aria-pressed',!preset); onChange?.(c); };
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
function editorModal(d){
  const isNew=!d.id; const r={id:d.id||gid(), title:'', image:'', servings:'', time:'', difficulty:'', ingredients:[], steps:[], notes:'', source:'', folderId:null, created:now(), ...d};
  if(r.folderId===undefined||r.folderId==='') r.folderId = S.book && !S.book.visiting && S.book.folder ? S.book.id : (S.folders[0]?.id||null);
  let image=r.image||'';
  const m=openModal(`${mHead(isNew?'Revisa y guarda la receta':'Editar receta')}
  ${d.byClaude?'<p class="muted" style="margin:0;font-size:14px">Receta escrita por Claude. Cambia lo que quieras antes de guardarla.</p>':''}
  <form id="fe" style="display:grid;gap:14px">
    <div class="field"><label for="etitle">Título</label><input id="etitle" class="inp" required maxlength="120" value="${esc(r.title)}"></div>
    <div class="field"><label>Foto del plato (opcional)</label><div class="imgbox"><span id="eimgPrev">${image?`<img src="${esc(image)}" alt="" referrerpolicy="no-referrer">`:''}</span>
      <label class="btn sm" for="eimg">${ico('camera')}${image?'Cambiar foto':'Añadir foto'}</label><input id="eimg" type="file" accept="image/*" hidden>
      <button type="button" class="btn sm ghost" id="eimgDel" ${image?'':'hidden'}>Quitar</button></div></div>
    <div class="grid2">
      <div class="field"><label for="eserv">Raciones</label><input id="eserv" class="inp" inputmode="numeric" value="${esc(r.servings)}" placeholder="4"></div>
      <div class="field"><label for="etime">Tiempo</label><input id="etime" class="inp" value="${esc(r.time)}" placeholder="45 min"></div>
      <div class="field"><label for="ediff">Dificultad</label><select id="ediff" class="inp">${['','Fácil','Media','Difícil'].map(x=>`<option ${x===r.difficulty?'selected':''} value="${x}">${x||'—'}</option>`).join('')}</select></div>
      <div class="field"><label for="efold">Carpeta</label><select id="efold" class="inp">${S.folders.map(f=>`<option value="${esc(f.id)}" ${f.id===r.folderId?'selected':''}>${esc(f.name)}</option>`).join('')}<option value="" ${!r.folderId?'selected':''}>Sin carpeta</option></select></div>
    </div>
    <div class="field"><div class="lblrow"><label for="eing">Ingredientes, uno por línea</label>${fmtBar('eing')}</div><textarea id="eing" class="inp" rows="7" placeholder="200 g de harina&#10;2 huevos&#10;1 pizca de sal">${esc((r.ingredients||[]).join('\n'))}</textarea></div>
    <div class="field"><div class="lblrow"><label for="esteps">Preparación, un paso por línea</label>${fmtBar('esteps')}</div><textarea id="esteps" class="inp" rows="7">${esc((r.steps||[]).join('\n'))}</textarea></div>
    <div class="field"><div class="lblrow"><label for="enotes">Notas (salen escritas a mano en el libro)</label>${fmtBar('enotes')}</div><textarea id="enotes" class="inp" rows="2">${esc(r.notes)}</textarea></div>
    <div class="field"><label for="esrc">Enlace de origen (opcional)</label><input id="esrc" class="inp" type="url" value="${esc(r.source)}"></div>
    <p class="muted" style="margin:0;font-size:13px">Para poner algo en negrita o cursiva, selecciónalo y pulsa N o C. Al pegar texto de una web se conservan.</p>
    <div id="estatus"></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="esave">${ico('save')}Guardar en mi libro</button></div>
  </form>`,{wide:true});
  ['eing','esteps','enotes'].forEach(id=>enableRichPaste($('#'+id,m)));
  $('#eimg',m).onchange=async e=>{const f=e.target.files[0];if(!f)return;$('#eimgPrev',m).innerHTML='<span class="spin"></span>';
    try{ image=await compressImage(f); $('#eimgPrev',m).innerHTML=`<img src="${image}" alt="">`; $('#eimgDel',m).hidden=false; }catch{ $('#eimgPrev',m).innerHTML=''; toast('No se pudo leer esa imagen'); }};
  $('#eimgDel',m).onclick=()=>{image='';$('#eimgPrev',m).innerHTML='';$('#eimgDel',m).hidden=true};
  $('#fe',m).onsubmit=async e=>{e.preventDefault();
    const lines=v=>v.split('\n').map(s=>s.replace(/^\s*[-•*]\s*/,'').trim()).filter(Boolean);
    const out={...r, title:$('#etitle',m).value.trim(), image, servings:$('#eserv',m).value.trim(), time:$('#etime',m).value.trim(), difficulty:$('#ediff',m).value,
      folderId:$('#efold',m).value||null, ingredients:lines($('#eing',m).value), steps:lines($('#esteps',m).value).map(s=>s.replace(/^\d+[.)]\s*/,'')), notes:$('#enotes',m).value.trim(), source:$('#esrc',m).value.trim()};
    delete out.byClaude;
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
  const fr=friends();
  const friendsHtml = !S.profile
    ? `<div class="banner" style="margin:0">${ico('user')}<span style="flex:1;min-width:180px">Inicia sesión para enviarlo a tus amigos por el chat.</span><button class="btn sm" data-act="login">Iniciar sesión</button></div>`
    : fr.length ? `<div class="pick">${fr.map(id=>`<div class="person">${avatar(id)}<div class="pb"><div class="pn">${esc(pname(id))}</div><div class="pu">${esc(puser(id))}</div></div><button class="btn sm" data-send="${esc(id)}">${ico('send')}Enviar</button></div>`).join('')}</div>`
    : `<p class="muted" style="margin:0">Aún no tienes amigos en la app. Añádelos desde la pestaña Amigos.</p>`;
  const m=openModal(`${mHead(kind==='recipe'?'Compartir receta':'Compartir carpeta')}
    <p style="margin:0;font-family:var(--f-book);font-size:20px">${esc(item.title||item.name)}</p>
    <div class="field"><label>Enviar a un amigo</label>${friendsHtml}</div>
    <div class="field"><label for="shlink">Enlace</label><div class="linkbox"><input id="shlink" class="inp" readonly value="${esc(link)}"><button class="btn" id="shcopy">${ico('copy')}Copiar</button></div>
    <p class="muted" style="margin:0;font-size:13px">Cualquiera con el enlace puede verla y guardarse una copia, aunque no tenga cuenta.</p></div>`);
  $('#shcopy',m).onclick=()=>copyText(link,$('#shlink',m));
  m.querySelectorAll('[data-send]').forEach(b=>b.onclick=async()=>{
    b.disabled=true;
    try{ await sendShare(b.dataset.send, kind, item, 'share'); b.innerHTML=`${ico('send')}Enviado`; toast('Enviado por el chat'); }catch(err){ b.disabled=false; toast(err.error||'No se pudo enviar'); }
  });
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
function routeHash(){ const rm=location.hash.match(/^#reset~([a-f0-9]{64})$/); if(rm){ try{history.replaceState(null,'',location.pathname+location.search)}catch{} resetModal(rm[1]); return; } const c=parseCode(location.hash); if(c){ try{history.replaceState(null,'',location.pathname+location.search)}catch{} openShared(c); } }
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
  S.zoom=null;
  if(S.view==='chat'){ S.returnChat=S.chatWith; stopChat(); }
  if(S.view!=='book') S.prevView=S.view;
  S.book=book; S.page=page; S.view='book'; render(); window.scrollTo(0,0);
}
function copyToMine(r, folderId){
  const {id, folderId:_f, ...rest} = r;
  return api('PUT','/recipes/'+gid(), {...rest, folderId, fromUid:r.fromUid||null, created:now()});
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
        <div class="field"><label for="luser">Usuario o correo</label><input id="luser" class="inp" required autocomplete="username"></div>
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
        <div class="field"><label for="ruser">Nombre de usuario</label><input id="ruser" class="inp" required maxlength="20" placeholder="ainara_cocina" autocomplete="username">
          <span class="muted" style="font-size:13px">De 3 a 20 letras minúsculas, números o _. Tus amigos te buscan por este nombre.</span></div>
        <div class="field"><label for="rmail">Correo electrónico</label><input id="rmail" class="inp" type="email" required maxlength="254" autocomplete="email">
          <span class="muted" style="font-size:13px">Solo para recuperar la contraseña si la olvidas. Nadie más lo ve.</span></div>
        <div class="field"><label for="rpass">Contraseña</label><input id="rpass" class="inp" type="password" required minlength="6" autocomplete="new-password">
          <span class="muted" style="font-size:13px">Al menos 6 caracteres.</span></div>
        <div class="field"><label>Tu color</label>${colorField('pcolor', color, AVCOLORS.map(c=>[c,'Color '+c]))}</div>
        <label class="row" style="font-size:14px;align-items:flex-start;flex-wrap:nowrap"><input type="checkbox" id="racc" required style="margin-top:4px">
          <span>He leído y acepto el <a href="/legal/aviso-legal" target="_blank">aviso legal y condiciones de uso</a> y la <a href="/legal/privacidad" target="_blank">política de privacidad</a>. Tengo al menos 14 años.</span></label>
        <div id="rstatus"></div>
        <div class="row" style="justify-content:flex-end"><button class="btn pri" id="rgo">Crear cuenta</button></div>
      </form>`;
      $('#ruser',m).oninput=e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')};
      initColorField(m,'pcolor',c=>{color=c});
      $('#fr',m).onsubmit=async e=>{e.preventDefault(); $('#rgo',m).disabled=true;
        try{ await api('POST','/register',{display:$('#rname',m).value.trim(), username:$('#ruser',m).value.trim(), email:$('#rmail',m).value.trim(), password:$('#rpass',m).value, color, accept:$('#racc',m).checked});
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
function accountModal(){
  const p=S.profile; let color=p.color||AVCOLORS[0];
  const m=openModal(`${mHead('Tu cuenta')}
    <form id="fa" style="display:grid;gap:14px">
      <div class="row">${avatar(S.uid,'lg')}<div><div style="font-weight:700">${esc(p.display)}</div><div class="muted">@${esc(p.username)}</div></div></div>
      <div class="field"><label for="aname">Tu nombre</label><input id="aname" class="inp" required maxlength="40" value="${esc(p.display||'')}"></div>
      <div class="field"><label for="amail">Correo electrónico</label><input id="amail" class="inp" type="email" required value="${esc(S.me.email||'')}">
        ${S.me.email?'':'<span class="err" style="font-size:13px">Añade un correo para poder recuperar la contraseña.</span>'}</div>
      <div class="field"><label>Tu color</label>${colorField('pcolor', color, AVCOLORS.map(c=>[c,'Color '+c]))}</div>
      <div id="astatus"></div>
      <div class="row" style="justify-content:space-between"><button type="button" class="btn ghost sm" id="aout">${ico('out')}Cerrar sesión</button><button class="btn pri" id="ago">Guardar</button></div>
      <div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:12px">
        <span class="muted" style="font-size:13px"><a href="/legal/privacidad" target="_blank">Privacidad</a> · <a href="/legal/aviso-legal" target="_blank">Condiciones</a></span>
        <button type="button" class="btn ghost sm danger" id="adel">${ico('trash')}Borrar mi cuenta</button></div>
    </form>`);
  initColorField(m,'pcolor',c=>{color=c});
  $('#aout',m).onclick=async()=>{ await api('POST','/logout').catch(()=>{}); stopChat(); closeModal(); S.view='library'; await loadState(); render(); toast('Sesión cerrada'); };
  $('#adel',m).onclick=()=>deleteAccountModal();
  $('#fa',m).onsubmit=async e=>{e.preventDefault();
    try{ await api('PUT','/me',{display:$('#aname',m).value.trim(), email:$('#amail',m).value.trim(), color}); await loadState(); closeModal(); toast('Cuenta guardada'); }
    catch(err){ $('#astatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
  };
}
function deleteAccountModal(){
  const m=openModal(`${mHead('Borrar mi cuenta')}
    <form id="fd" style="display:grid;gap:14px">
      <p style="margin:0">Se borrarán para siempre tu cuenta, tus recetas, tus carpetas, tus amistades y los mensajes que has enviado. No se puede deshacer.</p>
      <div class="field"><label for="dpass">Escribe tu contraseña para confirmarlo</label><input id="dpass" class="inp" type="password" required autocomplete="current-password"></div>
      <div id="dstatus"></div>
      <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="closeModal">Cancelar</button><button class="btn pri" id="dgo">Borrar para siempre</button></div>
    </form>`);
  $('#fd',m).onsubmit=async e=>{e.preventDefault(); $('#dgo',m).disabled=true;
    try{ await api('DELETE','/me',{password:$('#dpass',m).value}); stopChat(); closeModal(); S.view='library'; await loadState(); render(); toast('Cuenta borrada'); }
    catch(err){ $('#dgo',m).disabled=false; $('#dstatus',m).innerHTML=`<p class="err">${esc(err.error)}</p>`; }
  };
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
  box.innerHTML = S.searchRes.length ? S.searchRes.map(p=>personRow(p.id, friendState(p.id))).join('')
    : `<p class="muted" style="margin:0">${S.search?'Nadie con ese nombre todavía.':'Todavía no hay más personas en Entre Fogones. Pásales el enlace de la app a tus amigos para que se creen su cuenta.'}</p>`;
}
let searchT=null;
async function runSearch(){
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
function stopChat(){ clearInterval(msgTimer); msgTimer=null; S.chatWith=null; S.msgs=[]; }
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
          <button class="btn sm" data-act="chatShareRecipe">${ico('book')}Compartir receta</button>
          <button class="btn sm" data-act="chatShareFolder">${ico('move')}Compartir carpeta</button>
          <button class="btn sm" data-act="chatAsk">${ico('hand')}Pedir receta</button>
          <button class="btn sm" data-act="chatSuggest">${ico('sparkle')}Sugerir receta</button>
        </div>
        <form id="cform"><textarea id="ctext" rows="1" placeholder="Escribe un mensaje" aria-label="Mensaje"></textarea><button class="btn pri" aria-label="Enviar">${ico('send')}</button></form>
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
  ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,120)+'px';lsSet('ef_draft_'+S.chatWith,ta.value)});
  ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();f.requestSubmit()}});
  f.onsubmit=async e=>{e.preventDefault();const t=ta.value.trim();if(!t)return;ta.value='';lsSet('ef_draft_'+S.chatWith,'');
    const type=S.askMode?'ask':'text'; S.askMode=false; ta.placeholder='Escribe un mensaje';
    try{ await sendMsg(S.chatWith,{type,text:t}); }catch(err){ ta.value=t; toast(err.error||'No se pudo enviar'); }};
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
      const sn=m.snap||{}; const tag = m.purpose==='suggest'?'Te sugiero':(m.purpose==='answer'?'Aquí tienes':(m.type==='recipe'?'Receta':'Carpeta'));
      const meta = m.type==='recipe' ? [sn.time, sn.servings?sn.servings+' raciones':'', sn.n?sn.n+' ingredientes':''].filter(Boolean).join(' · ') : `${sn.n||0} recetas`;
      const k=m.type==='recipe'?'r':'f';
      inner=`<span class="tag">${esc(tag)}</span>${m.text?esc(m.text):''}<div class="mcard"><div class="mt">${esc(sn.title||'')}</div><div style="font-size:13px;color:var(--paper-muted)">${esc(meta)}</div>
        <div class="row"><button class="btn sm" data-act="openRef" data-k="${k}" data-i="${esc(m.ref?.id)}">${ico('book')}Abrir</button>
        ${mine?'':`<button class="btn sm" data-act="saveRef" data-k="${k}" data-i="${esc(m.ref?.id)}">${ico('save')}Guardar en mi libro</button>`}</div></div>`;
    } else if(m.type==='ask'){
      inner=`<span class="tag">Pide una receta</span>${esc(m.text)}${mine?'':`<div class="row" style="margin-top:8px"><button class="btn sm" data-act="answerAsk">${ico('send')}Enviarle una receta</button></div>`}`;
    } else inner=fmt(m.text);
    return `${sep}<div class="msg ${mine?'mine':''} ${m.type==='ask'?'ask':''}">${inner}<span class="when">${esc(new Date(m.ts).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}))}</span></div>`;
  }).join('');
  if(atBottom) box.scrollTop=box.scrollHeight;
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

/* ===== Acciones ===== */
const fail = err => toast(err?.error||'No se pudo completar');
const ACT = {
  hideBanner:()=>{ lsSet('ef_hide_banner',true); refresh(); },
  go:el=>go(el.dataset.v),
  closeModal:()=>closeModal(),
  register:()=>{ closeModal(); authModal('signup'); },
  login:()=>{ closeModal(); authModal('login'); },
  account:()=>accountModal(),
  newRecipe:el=>{ closeModal(); newRecipeModal(el.dataset.folder||undefined); },
  newFolder:()=>folderModal(),
  openBook:el=>openBook(el.dataset.id),
  openRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(!r) return; openBook(r.folderId&&S.folders.some(f=>f.id===r.folderId)?r.folderId:'none', r.id); },
  closeBook:()=>{ S.zoom=null; document.body.style.overflow=''; const back=S.prevView||'library'; S.book=null; if(back==='chat'&&S.returnChat){ const id=S.returnChat; S.returnChat=null; openChat(id); } else { S.view='library'; go(back==='book'?'library':back); } },
  prevPage:()=>turn('prev'), nextPage:()=>turn('next'),
  goPage:el=>{ let p=+el.dataset.p; if(p%2)p--; S.turn='next'; S.page=p; renderBook(); S.turn=null; },
  zoomFull:()=>zoomTo('full'),
  zoomClose:()=>zoomTo(null),
  zoomSpread:()=>{ S.page=S.zoomPage-(S.zoomPage%2); zoomTo(S.zoomFrom==='full'?'full':null); },
  serv:el=>{ const r=S.book.recipes.find(x=>x.id===el.dataset.id); const base=parseInt(r.servings)||0; if(!base) return; const cur=S.scale[r.id]||base; S.scale[r.id]=Math.max(1,Math.min(99,cur+ +el.dataset.d)); renderBook(); },
  editRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(r) editorModal({...r}); },
  shareRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(r) shareModal('recipe',r); },
  moveRecipe:el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(!r) return; folderPicker('Mover a…', async fid=>{ try{ await store.saveRecipe({...r,folderId:fid}); toast('Receta movida'); }catch(e){fail(e)} }); },
  delRecipe:async el=>{ const r=S.recipes.find(x=>x.id===el.dataset.id); if(!r) return; if(await confirmBox(`Se borrará «${r.title}» de tu libro.`)){ try{ await store.deleteRecipe(r.id); toast('Receta borrada'); }catch(e){fail(e)} } },
  shareFolder:()=>{ const f=S.folders.find(x=>x.id===S.book.id); if(f) shareModal('folder',f); },
  editFolder:()=>{ const f=S.folders.find(x=>x.id===S.book.id); if(f) folderModal({...f}); },
  delFolder:async()=>{ const f=S.folders.find(x=>x.id===S.book.id); if(!f) return; if(await confirmBox(`Se borrará la carpeta «${f.name}». Sus recetas no se pierden: pasan a «Sin carpeta».`)){ try{ await store.deleteFolder(f.id); go('library'); toast('Carpeta borrada'); }catch(e){fail(e)} } },
  saveCopy:()=>{ const r=currentRecipe(); if(!r) return; folderPicker('Guardar en…', async fid=>{ try{ await copyToMine({...r, fromUid:S.book.owner}, fid); await loadState(); toast('Guardada en tu libro'); }catch(e){ fail(e); } }); },
  saveFolderCopy:async()=>{ const b=S.book; try{ const fid=gid(); await api('PUT','/folders/'+fid,{name:b.name,color:b.color||CLOTHS[0][0],created:now()}); for(const r of b.recipes) await copyToMine({...r, fromUid:b.owner}, fid); await loadState(); toast(`«${b.name}» guardada en tu estantería`); }catch(e){ fail(e); } },
  openLink:()=>{ const m=openModal(`${mHead('Abrir un enlace')}<form id="fl" style="display:grid;gap:12px"><div class="field"><label for="lk">Pega el enlace que te han pasado</label><input id="lk" class="inp" required></div><div id="lkst"></div><div class="row" style="justify-content:flex-end"><button class="btn pri">Abrir</button></div></form>`);
    $('#fl',m).onsubmit=e=>{e.preventDefault();const c=parseCode($('#lk',m).value);if(!c){$('#lkst',m).innerHTML='<p class="err">Ese enlace no es de una receta o carpeta de Entre Fogones.</p>';return}closeModal();openShared(c)}; },
  addFriend:async el=>{ try{ const r=await api('POST','/friends/'+el.dataset.id); await loadState(); drawSearch(); toast(r.status==='accepted'?`Ahora ${pname(el.dataset.id)} y tú sois amigos`:'Solicitud enviada'); }catch(e){ fail(e); } },
  dropFriend:async el=>{ try{ await api('DELETE','/friends/'+el.dataset.id); await loadState(); drawSearch(); }catch(e){ fail(e); } },
  unfriend:el=>unfriend(el.dataset.id).catch(fail),
  chatWith:el=>openChat(el.dataset.id),
  chatBack:()=>{ stopChat(); render(); },
  chatShareRecipe:()=>recipePicker('Compartir una receta', (r,t)=>sendShare(S.chatWith,'recipe',r,'share',t).catch(fail)),
  chatSuggest:()=>recipePicker('Sugerir una receta', (r,t)=>sendShare(S.chatWith,'recipe',r,'suggest',t).catch(fail)),
  answerAsk:()=>recipePicker('Enviarle una receta', (r,t)=>sendShare(S.chatWith,'recipe',r,'answer',t).catch(fail)),
  chatShareFolder:()=>{ if(!S.folders.length) return; folderPicker('Compartir una carpeta', fid=>{ const f=S.folders.find(x=>x.id===fid); if(f) sendShare(S.chatWith,'folder',f,'share').catch(fail); },{allowNone:false}); },
  chatAsk:()=>{ S.askMode=true; const ta=$('#ctext'); ta.placeholder='¿Qué receta le pides? Ej.: ¿me pasas la de tu tarta de queso?'; ta.focus(); toast('Escribe qué receta le pides'); },
  openRef:el=>openShared({kind:el.dataset.k, id:el.dataset.i}),
  saveRef:async el=>{
    const {k,i}=el.dataset;
    try{
      if(k==='r'){ const d=await api('GET','/public/recipe/'+i);
        folderPicker('Guardar en…', async fid=>{ try{ await copyToMine({...d.recipe, fromUid:d.owner.id}, fid); await loadState(); toast('Guardada en tu libro'); }catch(e){fail(e)} }); }
      else { const d=await api('GET','/public/folder/'+i); const fid=gid();
        await api('PUT','/folders/'+fid,{name:d.folder.name,color:d.folder.color||CLOTHS[0][0],created:now()});
        for(const r of d.recipes) await copyToMine({...r,fromUid:d.owner.id}, fid);
        await loadState(); toast(`«${d.folder.name}» guardada en tu estantería`); }
    }catch(e){ fail(e); }
  }
};
document.addEventListener('click',e=>{ const el=e.target.closest('[data-act]'); if(!el) return; const f=ACT[el.dataset.act]; if(f){ e.preventDefault(); f(el,e); } });

boot();
