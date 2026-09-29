(function () {
  'use strict';
  var CFG = window.RECETARIO_CONFIG || {};
  var CLOUD = !!(CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase);
  var sb = CLOUD ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey) : null;
  var BUCKET = 'fotos';
  var CACHE_KEY = 'recetario-cache-v1';

  var CATS = ['Pastas', 'Arroces', 'Carnes', 'Pescados', 'Guisos', 'Huevos', 'Guarniciones', 'Ensaladas', 'Picadas', 'Salsas', 'Dulces'];
  var QUICK = {
    Pastas: ['Tinto liviano · Pinot Noir', 'Blanco · Chardonnay', 'Rosado'],
    Arroces: ['Blanco seco · Sauvignon Blanc', 'Chardonnay', 'Pinot Noir'],
    Carnes: ['Tinto · Malbec', 'Cabernet Sauvignon', 'Cerveza negra'],
    Pescados: ['Blanco · Sauvignon Blanc', 'Rosado bien frío', 'Espumante brut'],
    Guisos: ['Tinto · Malbec', 'Bonarda', 'Cerveza roja'],
    Huevos: ['Blanco · Sauvignon Blanc', 'Rosado', 'Espumante'],
    Guarniciones: ['Según el plato principal'],
    Ensaladas: ['Blanco · Torrontés', 'Rosado', 'Espumante brut'],
    Picadas: ['Blanco · Chardonnay', 'Espumante brut', 'Tinto joven'],
    Salsas: ['Según el plato'],
    Dulces: ['Café', 'Late harvest', 'Té negro']
  };

  var recipes = [];
  var app = document.getElementById('app');
  var S = { q: '', cat: 'Todas', checked: {}, canEdit: false, email: '', draft: null, saving: false, msg: '', confirmDel: false, offline: false, loaded: false };

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function byId(id) { for (var i = 0; i < recipes.length; i++) if (recipes[i].id === id) return recipes[i]; return null; }
  function slug(s) {
    var b = norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'receta';
    var id = b, n = 2; while (byId(id)) id = b + '-' + n++; return id;
  }
  var I = {
    glass: function (c) { return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="' + (c || 'currentColor') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h10v5a5 5 0 0 1-10 0z"/><path d="M12 13v7"/><path d="M8 21h8"/></svg>'; },
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>',
    plus: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>',
    check: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="color:var(--muted)"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    bulb: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/></svg>',
    cam: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>'
  };

  /* ---------- data ---------- */
  function cacheWrite() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(recipes)); } catch (e) { } }
  function cacheRead() { try { var s = localStorage.getItem(CACHE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function loadBundled() { return fetch('recetas.json').then(function (r) { return r.json(); }); }
  function loadCloud() {
    return sb.from('recetas').select('id,data,created_at').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) throw res.error;
      return res.data.map(function (row) { var d = row.data || {}; d.id = row.id; return d; });
    });
  }
  function refresh() {
    if (!CLOUD) return Promise.resolve();
    return loadCloud().then(function (list) { recipes = list; S.offline = false; cacheWrite(); render(); })
      .catch(function () { S.offline = true; render(); });
  }

  /* ---------- routing ---------- */
  function route() {
    var h = (location.hash || '').slice(1);
    if (h === 'entrar') return { v: 'login' };
    if (h === 'nueva') return { v: 'edit', id: null };
    if (h.indexOf('editar-') === 0) return { v: 'edit', id: h.slice(7) };
    if (h && byId(h)) return { v: 'detail', id: h };
    return { v: 'list' };
  }
  window.addEventListener('hashchange', function () { S.confirmDel = false; S.msg = ''; render(); window.scrollTo(0, 0); });

  /* ---------- list ---------- */
  function filtered() {
    var q = norm(S.q.trim());
    return recipes.filter(function (r) {
      if (S.cat !== 'Todas' && r.cat !== S.cat) return false;
      if (!q) return true;
      return norm(r.name + ' ' + r.cat + ' ' + r.parts.map(function (p) { return p.ing.join(' '); }).join(' ')).indexOf(q) >= 0;
    });
  }
  function gridHTML() {
    if (!S.loaded) return '<p class="empty">Cargando recetas…</p>';
    var list = filtered();
    if (!list.length) return '<p class="empty">' + (recipes.length ? 'No encontré recetas con esa búsqueda.' : 'Todavía no hay recetas.') + '</p>';
    return '<div class="grid">' + list.map(function (r) {
      var meta = [r.cat, r.time].filter(Boolean).join(' · ');
      var img = r.photos && r.photos[0] ? '<img class="ph" src="' + esc(r.photos[0]) + '" alt="" loading="lazy">' : '<div class="ph"></div>';
      return '<a class="card" href="#' + esc(r.id) + '">' + img + '<span class="nm">' + esc(r.name) + '</span><span class="meta">' + esc(meta) + '</span>' +
        (r.wine && r.wine.label ? '<span class="wn">' + I.glass() + '<span>' + esc(r.wine.label) + '</span></span>' : '') + '</a>';
    }).join('') + '</div>';
  }
  function chipsHTML() {
    var counts = {}; recipes.forEach(function (r) { counts[r.cat] = (counts[r.cat] || 0) + 1; });
    var cats = ['Todas'].concat(CATS.filter(function (c) { return counts[c]; }), Object.keys(counts).filter(function (c) { return CATS.indexOf(c) < 0; }));
    return cats.map(function (c) {
      return '<button type="button" class="chip" data-act="cat" data-v="' + esc(c) + '" aria-pressed="' + (S.cat === c) + '">' + esc(c) + '<span class="n">' + (c === 'Todas' ? recipes.length : counts[c]) + '</span></button>';
    }).join('');
  }
  function footHTML() {
    var parts = [recipes.length + ' recetas · cada una con su maridaje'];
    var acc = '';
    if (CLOUD) acc = S.canEdit ? '<br>Editando como ' + esc(S.email) + ' · <button type="button" data-act="logout">Salir</button>' : '<br><a href="#entrar">Entrar para editar</a>';
    else acc = '<br>Modo sin nube: se muestran las recetas incluidas en la app.';
    return '<p class="foot">' + parts.join('') + acc + '</p>';
  }
  function listView() {
    return '<div class="wrap"><header class="top"><div><div class="kicker">Recetario de Iván</div><h1>Mis recetas</h1></div>' +
      (S.canEdit ? '<a class="btn primary" href="#nueva">' + I.plus + 'Nueva receta</a>' : '') + '</header>' +
      (S.offline ? '<p class="note offline" role="status">Sin conexión: estás viendo las recetas guardadas en este teléfono.</p>' : '') +
      '<label class="search" style="margin-top:4px">' + I.search + '<input id="q" type="search" placeholder="Buscar receta o ingrediente" aria-label="Buscar receta o ingrediente" value="' + esc(S.q) + '"></label>' +
      '<div class="chips" role="group" aria-label="Categorías">' + chipsHTML() + '</div><div id="grid">' + gridHTML() + '</div>' + footHTML() + '</div>';
  }

  /* ---------- detail ---------- */
  function wineCard(w) {
    if (!w || !w.label) return '';
    return '<section class="wine" aria-label="Maridaje"><div class="row"><div class="glass">' + I.glass('var(--wine-ink)') + '</div><div><div class="lbl">Maridaje <span class="tag">' + (w.own ? 'Tuyo' : 'Sugerido') + '</span></div><div class="name">' + esc(w.label) + '</div></div></div>' +
      (w.note ? '<p>' + esc(w.note) + '</p>' : '') +
      (w.alt && w.alt.length ? '<div class="alts">' + w.alt.map(function (a) { return '<span>También: ' + esc(a) + '</span>'; }).join('') + '</div>' : '') + '</section>';
  }
  function detailView(r) {
    var ck = S.checked[r.id] || {};
    var photos = r.photos || [];
    var pills = [];
    if (r.servings) pills.push(/^\d+$/.test(r.servings) ? r.servings + (r.servings === '1' ? ' porción' : ' porciones') : r.servings);
    if (r.time) pills.push(r.time);
    var parts = r.parts.map(function (p, pi) {
      var h = '<section class="part">';
      if (p.title) h += '<h3 class="sub">' + esc(p.title) + '</h3>';
      if (p.ing.length) {
        h += '<h3>Ingredientes</h3><div class="ing">' + p.ing.map(function (t, ii) {
          var k = pi + '-' + ii, on = !!ck[k];
          return '<button type="button" data-act="tick" data-k="' + k + '" aria-pressed="' + on + '"><span class="box">' + (on ? I.check : '') + '</span><span class="t">' + esc(t) + '</span></button>';
        }).join('') + '</div>';
      }
      if (p.steps.length) h += '<h3>Preparación</h3><ol class="steps">' + p.steps.map(function (s) { return '<li><span>' + esc(s) + '</span></li>'; }).join('') + '</ol>';
      return h + '</section>';
    }).join('');
    var hasSteps = r.parts.some(function (p) { return p.steps.length; });
    return '<div class="narrow"><div class="bar"><a class="icon-btn" href="#" aria-label="Volver a mis recetas">' + I.back + '</a><div class="acts">' +
      '<button type="button" class="btn ghost" data-act="share">Compartir</button>' +
      (S.canEdit ? '<a class="btn ghost" href="#editar-' + esc(r.id) + '">Editar</a><button type="button" class="btn ghost danger" data-act="askdel">Borrar</button>' : '') + '</div></div>' +
      (S.msg ? '<p class="note" role="status">' + esc(S.msg) + '</p>' : '') +
      (S.confirmDel ? '<div class="confirm"><strong>¿Borrar «' + esc(r.name) + '»?</strong><span class="muted">Se borra para todos los que usan el recetario.</span><div class="acts"><button type="button" class="btn primary" data-act="del"' + (S.saving ? ' disabled' : '') + '>' + (S.saving ? 'Borrando…' : 'Sí, borrar') + '</button><button type="button" class="btn" data-act="canceldel">Cancelar</button></div></div>' : '') +
      (photos.length ? '<div class="gallery' + (photos.length > 1 ? ' multi' : '') + '">' + photos.map(function (p, i) { return '<img src="' + esc(p) + '" alt="' + esc(r.name) + ', foto ' + (i + 1) + '">'; }).join('') + '</div>' : '') +
      '<div class="head"><div class="kicker">' + esc(r.cat) + '</div><h1>' + esc(r.name) + '</h1>' + (pills.length ? '<div class="pills">' + pills.map(function (p) { return '<span class="pill">' + esc(p) + '</span>'; }).join('') + '</div>' : '') + '</div>' +
      wineCard(r.wine) + parts +
      (!hasSteps ? '<p class="note" style="margin-top:18px">Esta receta todavía no tiene pasos cargados.</p>' : '') +
      (r.tips ? '<div class="tip">' + I.bulb + '<div><strong>Tip</strong><div>' + esc(r.tips) + '</div></div></div>' : '') + '</div>';
  }
  function recipeText(r) {
    var out = [r.name, ''];
    var meta = [r.servings && ('Porciones: ' + r.servings), r.time && ('Tiempo: ' + r.time)].filter(Boolean);
    if (meta.length) out.push(meta.join(' · '), '');
    r.parts.forEach(function (p) {
      if (p.title) out.push(p.title.toUpperCase());
      if (p.ing.length) { out.push('Ingredientes:'); p.ing.forEach(function (i) { out.push('- ' + i); }); }
      if (p.steps.length) { out.push('Preparación:'); p.steps.forEach(function (s, i) { out.push((i + 1) + '. ' + s); }); }
      out.push('');
    });
    if (r.tips) out.push('Tip: ' + r.tips, '');
    if (r.wine && r.wine.label) out.push('Maridaje: ' + r.wine.label + (r.wine.alt && r.wine.alt.length ? ' (también: ' + r.wine.alt.join(', ') + ')' : ''));
    return out.join('\n');
  }

  /* ---------- login ---------- */
  function loginView() {
    return '<div class="login"><div class="bar"><a class="icon-btn" href="#" aria-label="Volver">' + I.back + '</a></div>' +
      '<h1 style="font-size:34px">Entrar para editar</h1><p class="muted">Solo las cuentas que agregaste en Supabase pueden cargar o cambiar recetas.</p>' +
      '<form class="form" id="login" novalidate><label class="field"><span>Email</span><input id="l-email" type="email" autocomplete="username" required></label>' +
      '<label class="field"><span>Contraseña</span><input id="l-pass" type="password" autocomplete="current-password" required></label>' +
      (S.msg ? '<p class="note warn" role="alert">' + esc(S.msg) + '</p>' : '') +
      '<button type="submit" class="btn primary"' + (S.saving ? ' disabled' : '') + '>' + (S.saving ? 'Entrando…' : 'Entrar') + '</button></form></div>';
  }

  /* ---------- editor ---------- */
  function blankDraft() { return { id: null, name: '', cat: 'Pastas', servings: '', time: '', photos: [], parts: [{ title: '', ing: [], steps: [] }], tips: '', wine: { label: '', note: '', alt: [], own: true } }; }
  function ensureDraft(id) {
    if (S.draft && S.draft._for === (id || '')) return;
    var r = id ? byId(id) : null;
    S.draft = r ? JSON.parse(JSON.stringify(r)) : blankDraft();
    S.draft._for = id || '';
    if (!S.draft.wine) S.draft.wine = { label: '', note: '', alt: [], own: true };
  }
  function syncDraft() {
    var d = S.draft; if (!d || !document.getElementById('f-name')) return;
    function v(id) { var el = document.getElementById(id); return el ? el.value : ''; }
    function lines(s) { return s.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
    d.name = v('f-name').trim(); d.cat = v('f-cat'); d.servings = v('f-serv').trim(); d.time = v('f-time').trim(); d.tips = v('f-tips').trim();
    d.parts = d.parts.map(function (p, i) { return { title: v('f-pt-' + i).trim(), ing: lines(v('f-pi-' + i)), steps: lines(v('f-ps-' + i)) }; });
    var wl = v('f-wl').trim();
    if (wl !== d.wine.label) d.wine.own = true;
    d.wine.label = wl; d.wine.note = v('f-wn').trim();
    d.wine.alt = v('f-wa').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function editView() {
    var d = S.draft, isNew = !d.id, back = isNew ? '#' : '#' + esc(d.id);
    var catOpts = CATS.concat(CATS.indexOf(d.cat) < 0 && d.cat ? [d.cat] : []).map(function (c) { return '<option' + (c === d.cat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('');
    var photos = d.photos.map(function (p, i) {
      return '<div class="th"><img src="' + esc(p) + '" alt="Foto ' + (i + 1) + '">' + (i === 0 ? '<span class="first">Portada</span>' : '') + '<button type="button" data-act="rmphoto" data-i="' + i + '" aria-label="Quitar foto ' + (i + 1) + '">' + I.x + '</button></div>';
    }).join('');
    var parts = d.parts.map(function (p, i) {
      return '<div class="fpart"><div class="hd"><strong>' + (i === 0 ? 'Receta' : 'Parte ' + (i + 1)) + '</strong>' + (i > 0 ? '<button type="button" class="btn ghost danger" data-act="rmpart" data-i="' + i + '">Quitar</button>' : '') + '</div>' +
        '<label class="field"><span>Título ' + (i === 0 ? '(opcional)' : '') + '</span><input id="f-pt-' + i + '" type="text" value="' + esc(p.title) + '" placeholder="' + (i === 0 ? 'Dejalo vacío si la receta es una sola' : 'Ej.: Papas rosti · 15/20 min') + '"></label>' +
        '<label class="field"><span>Ingredientes (uno por línea)</span><textarea id="f-pi-' + i + '" rows="5" placeholder="300 g de papas&#10;1 cebolla de verdeo">' + esc(p.ing.join('\n')) + '</textarea></label>' +
        '<label class="field"><span>Preparación (un paso por línea)</span><textarea id="f-ps-' + i + '" rows="5" placeholder="Pelar y cortar las papas en cubos chicos.">' + esc(p.steps.join('\n')) + '</textarea></label></div>';
    }).join('');
    var quick = (QUICK[d.cat] || []).map(function (q) { return '<button type="button" data-act="usewine" data-v="' + esc(q) + '">' + esc(q) + '</button>'; }).join('');
    return '<div class="narrow"><div class="bar"><a class="icon-btn" href="' + back + '" aria-label="Cancelar">' + I.back + '</a><h1 style="font-size:30px;margin-right:auto">' + (isNew ? 'Nueva receta' : 'Editar receta') + '</h1></div>' +
      '<form class="form" id="f" novalidate>' +
      '<div class="field"><span>Fotos</span><div class="photos">' + photos + '<label class="add-photo">' + I.cam + '<span>Sacar o elegir fotos</span><input id="f-photo" type="file" accept="image/*" multiple></label></div></div>' +
      '<label class="field"><span>Nombre</span><input id="f-name" type="text" required value="' + esc(d.name) + '" placeholder="Ej.: Risotto de hongos portobellos"></label>' +
      '<div class="row3"><label class="field"><span>Categoría</span><select id="f-cat">' + catOpts + '</select></label>' +
      '<label class="field"><span>Porciones</span><input id="f-serv" type="text" inputmode="numeric" value="' + esc(d.servings) + '" placeholder="4"></label>' +
      '<label class="field"><span>Tiempo</span><input id="f-time" type="text" value="' + esc(d.time) + '" placeholder="40 min"></label></div>' +
      parts +
      '<button type="button" class="btn ghost" data-act="addpart">' + I.plus + 'Agregar otra parte (salsa, guarnición…)</button>' +
      '<label class="field"><span>Tips y notas</span><textarea id="f-tips" rows="2" placeholder="Ej.: dejar reposar unas horas">' + esc(d.tips) + '</textarea></label>' +
      '<div class="fwine"><div style="display:flex;align-items:center;gap:8px">' + I.glass('var(--wine-muted)') + '<strong>Maridaje</strong></div>' +
      '<label class="field"><span>Vino o bebida</span><input id="f-wl" type="text" value="' + esc(d.wine.label) + '" placeholder="Ej.: Tinto · Malbec"></label>' +
      '<label class="field"><span>Por qué (opcional)</span><input id="f-wn" type="text" value="' + esc(d.wine.note) + '" placeholder="Ej.: acompaña el pimentón sin taparlo"></label>' +
      '<label class="field"><span>Alternativas, separadas por coma</span><input id="f-wa" type="text" value="' + esc(d.wine.alt.join(', ')) + '" placeholder="Bonarda, cerveza roja"></label>' +
      (quick ? '<div style="font-size:13px;color:var(--wine-muted)">Sugerencias para ' + esc(d.cat) + ':</div><div class="sugs">' + quick + '</div>' : '') + '</div>' +
      '<div class="save-bar">' + (S.msg ? '<span class="status" role="status">' + esc(S.msg) + '</span>' : '') +
      '<a class="btn ghost" href="' + back + '">Cancelar</a><button type="submit" class="btn primary"' + (S.saving ? ' disabled' : '') + '>' + (S.saving ? 'Guardando…' : 'Guardar receta') + '</button></div></form></div>';
  }

  function resizeImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.onload = function () {
        var max = 1200, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      img.src = url;
    });
  }
  function dataUrlToBlob(u) {
    var parts = u.split(','), bin = atob(parts[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: 'image/jpeg' });
  }
  function uploadPhotos(id, photos) {
    return Promise.all(photos.map(function (p, i) {
      if (p.indexOf('data:') !== 0) return p;
      var path = id + '/' + Date.now() + '-' + i + '.jpg';
      return sb.storage.from(BUCKET).upload(path, dataUrlToBlob(p), { contentType: 'image/jpeg', upsert: false }).then(function (res) {
        if (res.error) throw res.error;
        return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      });
    }));
  }
  function ownStoragePath(url) {
    var m = String(url).split('/storage/v1/object/public/' + BUCKET + '/');
    return m.length === 2 ? decodeURIComponent(m[1]) : null;
  }

  function submitDraft() {
    syncDraft();
    var d = S.draft;
    if (!d.name) { S.msg = 'Poné un nombre para la receta.'; render(); var n = document.getElementById('f-name'); if (n) n.focus(); return; }
    d.parts = d.parts.filter(function (p, i) { return i === 0 || p.title || p.ing.length || p.steps.length; });
    var isNew = !d.id, id = d.id || slug(d.name);
    var before = isNew ? null : byId(id);
    S.saving = true; S.msg = ''; render();
    uploadPhotos(id, d.photos).then(function (urls) {
      var data = { id: id, name: d.name, cat: d.cat, servings: d.servings, time: d.time, photos: urls, parts: d.parts, tips: d.tips, wine: d.wine };
      var q = isNew ? sb.from('recetas').insert({ id: id, data: data }) : sb.from('recetas').update({ data: data, updated_at: new Date().toISOString() }).eq('id', id);
      return q.then(function (res) {
        if (res.error) throw res.error;
        if (before) {
          var gone = (before.photos || []).filter(function (u) { return urls.indexOf(u) < 0; }).map(ownStoragePath).filter(Boolean);
          if (gone.length) sb.storage.from(BUCKET).remove(gone);
        }
        return refresh();
      });
    }).then(function () {
      S.saving = false; S.draft = null; S.msg = 'Receta guardada.';
      if (location.hash.slice(1) === id) render(); else location.hash = id;
    }, function (err) {
      S.saving = false;
      S.msg = navigator.onLine === false ? 'Sin conexión: conectate a internet para guardar.' : 'No se pudo guardar (' + ((err && err.message) || 'error') + '). Probá de nuevo.';
      render();
    });
  }
  function deleteRecipe(r) {
    S.saving = true; render();
    sb.from('recetas').delete().eq('id', r.id).then(function (res) {
      if (res.error) throw res.error;
      var paths = (r.photos || []).map(ownStoragePath).filter(Boolean);
      if (paths.length) sb.storage.from(BUCKET).remove(paths);
      return refresh();
    }).then(function () { S.saving = false; S.confirmDel = false; location.hash = ''; }, function (err) {
      S.saving = false; S.msg = 'No se pudo borrar (' + ((err && err.message) || 'error') + ').'; render();
    });
  }

  /* ---------- render & events ---------- */
  function render() {
    var rt = route();
    if (rt.v === 'login' && (!CLOUD || S.canEdit)) rt = { v: 'list' };
    if (rt.v === 'edit' && !S.canEdit) rt = rt.id && byId(rt.id) ? { v: 'detail', id: rt.id } : { v: 'list' };
    if (rt.v !== 'edit') S.draft = null;
    if (rt.v === 'login') { app.innerHTML = loginView(); return; }
    if (rt.v === 'edit') { ensureDraft(rt.id); app.innerHTML = editView(); return; }
    if (rt.v === 'detail') { app.innerHTML = detailView(byId(rt.id)); document.title = byId(rt.id).name + ' · Mi recetario'; return; }
    document.title = 'Mi recetario';
    app.innerHTML = listView();
  }
  app.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]'); if (!t) return;
    var a = t.getAttribute('data-act'), rt = route(), r = rt.id ? byId(rt.id) : null;
    if (a === 'cat') { S.cat = t.getAttribute('data-v'); app.querySelector('.chips').innerHTML = chipsHTML(); document.getElementById('grid').innerHTML = gridHTML(); return; }
    if (a === 'tick' && r) { var m = S.checked[r.id] = S.checked[r.id] || {}; var k = t.getAttribute('data-k'); m[k] = !m[k]; t.setAttribute('aria-pressed', String(!!m[k])); t.querySelector('.box').innerHTML = m[k] ? I.check : ''; return; }
    if (a === 'share' && r) {
      var txt = recipeText(r);
      if (navigator.share) { navigator.share({ title: r.name, text: txt }).catch(function () { }); return; }
      var done = function (ok) { S.msg = ok ? 'Receta copiada. Pegala donde quieras.' : 'No se pudo copiar automáticamente.'; render(); };
      try { navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
      return;
    }
    if (a === 'logout') { sb.auth.signOut(); return; }
    if (a === 'askdel') { S.confirmDel = true; render(); return; }
    if (a === 'canceldel') { S.confirmDel = false; render(); return; }
    if (a === 'del' && r) { deleteRecipe(r); return; }
    if (!S.draft) return;
    if (a === 'addpart') { syncDraft(); S.draft.parts.push({ title: '', ing: [], steps: [] }); render(); return; }
    if (a === 'rmpart') { syncDraft(); S.draft.parts.splice(+t.getAttribute('data-i'), 1); render(); return; }
    if (a === 'rmphoto') { syncDraft(); S.draft.photos.splice(+t.getAttribute('data-i'), 1); render(); return; }
    if (a === 'usewine') { syncDraft(); S.draft.wine = { label: t.getAttribute('data-v'), note: '', alt: [], own: false }; render(); return; }
  });
  app.addEventListener('input', function (ev) {
    if (ev.target.id === 'q') { S.q = ev.target.value; document.getElementById('grid').innerHTML = gridHTML(); }
  });
  app.addEventListener('change', function (ev) {
    if (ev.target.id === 'f-cat') { syncDraft(); render(); return; }
    if (ev.target.id === 'f-photo') {
      var files = Array.prototype.slice.call(ev.target.files || []);
      if (!files.length) return;
      syncDraft(); S.msg = 'Preparando fotos…'; render();
      Promise.all(files.map(function (f) { return resizeImage(f).catch(function () { return null; }); })).then(function (urls) {
        var ok = urls.filter(Boolean);
        S.draft.photos = S.draft.photos.concat(ok);
        S.msg = ok.length < urls.length ? 'Alguna foto no se pudo leer.' : '';
        render();
      });
    }
  });
  app.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (S.saving) return;
    if (ev.target.id === 'login') {
      var email = document.getElementById('l-email').value.trim(), pass = document.getElementById('l-pass').value;
      S.saving = true; S.msg = ''; render();
      sb.auth.signInWithPassword({ email: email, password: pass }).then(function (res) {
        S.saving = false;
        if (res.error) { S.msg = 'Email o contraseña incorrectos.'; render(); var e = document.getElementById('l-email'); if (e) e.value = email; return; }
        location.hash = '';
      });
      return;
    }
    submitDraft();
  });

  /* ---------- start ---------- */
  var cached = cacheRead();
  (cached ? Promise.resolve(cached) : loadBundled().catch(function () { return []; })).then(function (list) {
    recipes = list; S.loaded = true; render();
    refresh();
  });
  if (CLOUD) {
    sb.auth.getSession().then(function (res) { var s = res.data && res.data.session; S.canEdit = !!s; S.email = s ? s.user.email : ''; render(); });
    sb.auth.onAuthStateChange(function (_e, s) { var was = S.canEdit; S.canEdit = !!s; S.email = s ? s.user.email : ''; if (was !== S.canEdit) render(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && !S.draft) refresh(); });
    window.addEventListener('online', function () { if (!S.draft) refresh(); });
  }

  /* ---------- updates of the app itself ---------- */
  if ('serviceWorker' in navigator) {
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (!reloading) { reloading = true; location.reload(); } });
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      function offer(w) {
        var bar = document.getElementById('update');
        bar.hidden = false;
        document.getElementById('update-btn').onclick = function () { w.postMessage('activar'); };
      }
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
      setInterval(function () { reg.update(); }, 60 * 60 * 1000);
    }).catch(function () { });
  }
})();
