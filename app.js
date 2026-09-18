import MEMES from './memes.js';

// ===== 설정 =====
const CFG = {
  maxBytes: 10 * 1024 * 1024,            // 업로드 한도 10MB
  maxSide: 2000,                         // 원본을 이 크기로 줄여서 작업(메모리 절약)
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  fonts: ['64px "Black Han Sans"', 'bold 32px "Noto Sans KR"'],
};

const $ = id => document.getElementById(id);
const el = {
  file: $('file'), drop: $('drop'), info: $('fileInfo'), thumb: $('thumb'), name: $('fileName'),
  size: $('fileSize'), qBar: $('quotaBar'), qText: $('quotaText'), remove: $('removeBtn'), msg: $('msg'),
  grid: $('memeGrid'), fields: $('fields'), quality: $('quality'), canvas: $('canvas'), empty: $('empty'),
  prog: $('progress'), pFill: $('progressFill'), pText: $('progressText'), make: $('makeBtn'),
  result: $('result'), dl: $('downloadBtn'), share: $('shareBtn'), rInfo: $('resultInfo'), list: $('memeList'),
};
const ctx = el.canvas.getContext('2d');
const state = { img: null, meme: MEMES[0], points: {}, job: 0, blob: null, url: null };

const fmt = b => b < 1024 * 1024 ? (b / 1024).toFixed(0) + 'KB' : (b / 1024 / 1024).toFixed(1) + 'MB';
const tick = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 60)));
const showMsg = t => { el.msg.textContent = t; el.msg.hidden = !t; };

// ===== 사진 업로드 =====
async function loadFile(f) {
  showMsg('');
  if (!f) return;
  if (!CFG.types.includes(f.type)) return showMsg(/heic|heif/i.test(f.type + f.name)
    ? 'HEIC 사진은 못 읽어요. JPG로 바꿔서 올려 주세요.' : 'JPG, PNG, WEBP, GIF 사진만 올릴 수 있어요.');
  if (f.size > CFG.maxBytes) return showMsg(`${fmt(f.size)}짜리 사진이에요. ${fmt(CFG.maxBytes)} 이하로 줄여서 올려 주세요.`);

  const src = URL.createObjectURL(f);
  try {
    const raw = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
    state.img = downscale(raw);
  } catch { return showMsg('사진을 열 수 없어요. 다른 사진으로 해 보세요.'); }
  el.thumb.src = src;
  el.name.textContent = f.name;
  el.size.textContent = `${fmt(f.size)} · ${state.img.width}×${state.img.height}`;
  const pct = Math.min(100, f.size / CFG.maxBytes * 100);
  el.qBar.style.width = pct + '%';
  el.qBar.classList.toggle('warn', pct > 80);
  el.qText.textContent = `한도 ${fmt(CFG.maxBytes)} 중 ${pct.toFixed(0)}% 사용`;
  el.info.hidden = false; el.make.disabled = false; el.empty.hidden = true; state.points = {};
  preview();
}

function downscale(img) {
  const s = Math.min(1, CFG.maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  if (s === 1) return img;
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function clearPhoto() {
  state.img = null; el.file.value = ''; el.info.hidden = true; el.make.disabled = true;
  el.empty.hidden = false; el.result.hidden = true; ctx.clearRect(0, 0, el.canvas.width, el.canvas.height);
}

el.file.addEventListener('change', e => loadFile(e.target.files[0]));
el.remove.addEventListener('click', clearPhoto);
el.drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.file.click(); } });
['dragenter', 'dragover'].forEach(t => el.drop.addEventListener(t, e => { e.preventDefault(); el.drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => el.drop.addEventListener(t, e => { e.preventDefault(); el.drop.classList.remove('over'); }));
el.drop.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
window.addEventListener('paste', e => {
  const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (item) loadFile(item.getAsFile());
});

// ===== 밈 선택 / 입력칸 =====
// 입력칸 종류: text(기본) | select | chips(여러 개) | range | toggle | points(미리보기 터치) | dice(랜덤 버튼)
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FIELD = {
  text: f => `<label for="f-${f.key}">${f.label}</label><input id="f-${f.key}" name="${f.key}" maxlength="${f.max || 40}" placeholder="${esc(f.placeholder || '')}">`,
  select: f => `<label for="f-${f.key}">${f.label}</label><select id="f-${f.key}" name="${f.key}">${f.options.map(([v, l]) =>
    `<option value="${esc(v)}"${v === f.default ? ' selected' : ''}>${l}</option>`).join('')}</select>`,
  chips: f => `<span class="label">${f.label}</span><div class="chips">${f.options.map(o =>
    `<label class="chip"><input type="checkbox" name="${f.key}" value="${o}"${f.default?.includes(o) ? ' checked' : ''}><span style="--c:${f.swatch?.[o] || '#fff'}">${o}</span></label>`).join('')}</div>`,
  range: f => `<label for="f-${f.key}">${f.label} <output id="o-${f.key}">${f.default}</output></label><input type="range" id="f-${f.key}" name="${f.key}" min="${f.min}" max="${f.max}" value="${f.default}">`,
  toggle: f => `<label class="switch"><input type="checkbox" name="${f.key}"${f.default ? ' checked' : ''}><span>${f.label}</span></label>`,
  points: f => `<span class="label">${f.label}</span><p class="hint"><span id="p-${f.key}">자동</span> · ${f.hint} <button type="button" class="btn btn-ghost" data-reset="${f.key}">자동으로 되돌리기</button></p>`,
  dice: f => `<button type="button" class="btn btn-ghost" data-dice="${f.key}">🎲 ${f.label}</button><input type="hidden" name="${f.key}" value="${f.default}">`,
};

function buildGrid() {
  el.grid.innerHTML = MEMES.map(m =>
    `<button type="button" class="meme-tile" role="radio" data-id="${m.id}" aria-checked="false"><span aria-hidden="true">${m.emoji}</span>${m.name}</button>`).join('');
  el.grid.addEventListener('click', e => { const b = e.target.closest('.meme-tile'); if (b) selectMeme(b.dataset.id); });
  if (el.list) el.list.innerHTML = MEMES.map(m => `<li><b>${m.name}</b> ${m.desc}</li>`).join('');
}

function selectMeme(id) {
  state.meme = MEMES.find(m => m.id === id) || MEMES[0];
  state.points = {};
  history.replaceState(null, '', '#' + state.meme.id);
  el.grid.querySelectorAll('.meme-tile').forEach(b => b.setAttribute('aria-checked', b.dataset.id === state.meme.id));
  el.fields.innerHTML = state.meme.fields.map(f => `<div class="field field-${f.type || 'text'}">${FIELD[f.type || 'text'](f)}</div>`).join('');
  el.canvas.classList.toggle('tappable', state.meme.fields.some(f => f.type === 'points'));
  preview();
}

let timer;
el.fields.addEventListener('input', e => {
  const o = document.getElementById('o-' + e.target.name); if (o) o.textContent = e.target.value;
  clearTimeout(timer); timer = setTimeout(preview, 200);
});
el.fields.addEventListener('click', e => {
  const dice = e.target.closest('[data-dice]'), reset = e.target.closest('[data-reset]');
  if (dice) { const i = el.fields.elements[dice.dataset.dice]; i.value = +i.value + 1; preview(); }
  if (reset) { delete state.points[reset.dataset.reset]; pointLabel(reset.dataset.reset); preview(); }
});

// 미리보기 터치로 좌표 찍기 (눈 위치 등)
function pointLabel(key) {
  const f = state.meme.fields.find(x => x.key === key), p = state.points[key], t = document.getElementById('p-' + key);
  if (t) t.textContent = p ? `${p.length}/${f.count} 찍음` : '자동';
}
el.canvas.addEventListener('click', e => {
  const f = state.meme.fields.find(x => x.type === 'points');
  if (!f || !state.img) return;
  const r = el.canvas.getBoundingClientRect();
  let arr = state.points[f.key] || [];
  if (arr.length >= f.count) arr = [];
  state.points[f.key] = arr = [...arr, { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }];
  pointLabel(f.key);
  if (arr.length === f.count) preview();
});

function values() {
  const v = {}, F = el.fields.elements;
  state.meme.fields.forEach(f => {
    const i = F[f.key];
    switch (f.type || 'text') {
      case 'text': v[f.key] = (i?.value || '').trim() || f.placeholder || ''; break;
      case 'chips': v[f.key] = [...el.fields.querySelectorAll(`input[name="${f.key}"]:checked`)].map(x => x.value); break;
      case 'toggle': v[f.key] = !!i?.checked; break;
      case 'range': case 'dice': v[f.key] = +(i?.value ?? f.default); break;
      case 'points': v[f.key] = state.points[f.key]?.length === f.count ? state.points[f.key] : null; break;
      default: v[f.key] = i?.value ?? f.default;
    }
  });
  return v;
}

// ===== 그리기 =====
const loadFonts = text => Promise.all(CFG.fonts.map(f => document.fonts.load(f, text || '가'))).catch(() => {});

async function draw(report) {
  const job = ++state.job, v = values();
  await loadFonts(Object.values(v).filter(x => typeof x === 'string').join('') + '가');
  let cache = {};
  if (state.meme.prepare) {
    try { cache = await state.meme.prepare(state.img, v, report) || {}; }
    catch (e) {
      console.warn(e);
      showMsg('AI 인식을 못 불러와서 기본 모드로 만들어요. 레이저가 엇나가면 미리보기에서 눈을 직접 눌러 주세요.');
    }
  }
  if (job !== state.job) return false; // 더 최근 요청이 있으면 버림
  const { w, h } = state.meme.size(state.img);
  el.canvas.width = w; el.canvas.height = h;
  ctx.save(); state.meme.render(ctx, state.img, v, w, h, cache); ctx.restore();
  return true;
}

async function preview() {
  if (!state.img) return;
  el.result.hidden = true;
  await draw((p, t) => { el.prog.hidden = false; setProg(p, t); });
  el.prog.hidden = true;
}

// ===== JPG 만들기 (진행률) =====
function setProg(p, t) { el.pFill.style.width = p + '%'; el.pText.textContent = t; }

el.make.addEventListener('click', async () => {
  if (!state.img) return;
  el.make.disabled = true; el.prog.hidden = false; el.result.hidden = true;
  try {
    setProg(10, '글꼴 준비 중'); await tick();
    setProg(30, '사진 맞추는 중'); await tick();
    setProg(55, '이펙트 입히는 중');
    if (!await draw((p, t) => setProg(30 + p * 0.4, t))) return;
    await tick();
    setProg(85, 'JPG 굽는 중');
    const blob = await new Promise(r => el.canvas.toBlob(r, 'image/jpeg', +el.quality.value));
    if (!blob) throw new Error('blob');
    if (state.url) URL.revokeObjectURL(state.url);
    state.blob = blob; state.url = URL.createObjectURL(blob);
    const fname = `jjal-${state.meme.id}-${Date.now()}.jpg`;
    const file = new File([blob], fname, { type: 'image/jpeg' });
    el.dl.href = state.url; el.dl.download = fname;
    el.share.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    el.share.onclick = () => navigator.share({ files: [file], title: '짤공장에서 만든 짤' }).catch(() => {});
    el.rInfo.textContent = `${el.canvas.width}×${el.canvas.height} · ${fmt(blob.size)}`;
    setProg(100, '완성!'); el.result.hidden = false;
  } catch {
    setProg(0, '실패'); showMsg('만드는 중 문제가 생겼어요. 화질을 낮추거나 더 작은 사진으로 다시 해 보세요.');
  } finally {
    el.make.disabled = false;
    setTimeout(() => { el.prog.hidden = true; }, 1500);
  }
});

// ===== 시작 =====
buildGrid();
selectMeme(location.hash.slice(1));
