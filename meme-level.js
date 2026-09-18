// "○○급" 짤: 눈 레이저 + 분신 + 플라즈마 번개 + 3D 크롬 글자
import { fit, FONT } from './draw.js';
import { analyze } from './vision.js';

const COLORS = { 보라: '#a64dff', 핑크: '#ff4fd8', 파랑: '#2f6bff', 하늘: '#3fe0ff', 빨강: '#ff2a2a', 주황: '#ff7a00', 금색: '#ffc93c', 초록: '#39ff88' };
const RAINBOW = ['#ff2d2d', '#ff8a00', '#ffe600', '#39ff88', '#3fa8ff', '#5b4dff', '#c04dff'];

// ---------- 공용 ----------
const rgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; };
const hexA = (h, a) => `rgba(${rgb(h).join(',')},${a})`;
const mix = (h, t, a) => { const A = rgb(h), B = rgb(t); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * a).toString(16).padStart(2, '0')).join(''); };
const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const layer = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
const box = (iw, ih, W, H) => { const s = Math.max(W / iw, H / ih); return { s, dx: (W - iw * s) / 2, dy: (H - ih * s) / 2 }; };
const place = (ctx, src, T, iw, ih) => ctx.drawImage(src, T.dx, T.dy, iw * T.s, ih * T.s);

// 축소→확대로 만드는 가벼운 블러 (사파리 포함 모든 브라우저 동작)
function shrink(src, f) {
  let c = src;
  for (let s = 1; s < f; s *= 2) {
    const [n, nc] = layer(Math.max(1, c.width >> 1), Math.max(1, c.height >> 1));
    nc.drawImage(c, 0, 0, n.width, n.height); c = n;
  }
  return c;
}
function bloom(ctx, src, W, H, amt = 1, steps = [[4, 0.35], [16, 0.28], [48, 0.22]]) {
  if (amt <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingQuality = 'high';
  for (const [f, a] of steps) { ctx.globalAlpha = Math.min(1, a * amt); ctx.drawImage(shrink(src, f), 0, 0, W, H); }
  ctx.restore();
}
function blob(ctx, x, y, rad, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}
// 첫 색 위주로 뽑기
const pickCol = (pal, r) => pal.length === 1 || r() < 0.55 ? pal[0] : pal[1 + Math.floor(r() * (pal.length - 1))];

// ---------- 구도: 눈 기준으로 얼굴 크게 ----------
function frame(img, W, H, eyes, hasMask, on) {
  const base = box(img.width, img.height, W, H);
  if (!eyes || !on) return base;
  const [a, b] = eyes.map(p => ({ x: p.x * img.width, y: p.y * img.height }));
  const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ty = H * 0.3;
  let s = Math.min(W * 0.15 / dist, base.s * 3);
  s = Math.max(s, (H - ty) / (img.height - my)); // 몸이 바닥까지 닿게
  if (!hasMask) s = Math.max(s, base.s);
  let dx = W / 2 - mx * s, dy = ty - my * s;
  if (!hasMask) { dx = Math.min(0, Math.max(W - img.width * s, dx)); dy = Math.min(0, Math.max(H - img.height * s, dy)); }
  return { s, dx, dy };
}

// ---------- 사진 분위기 ----------
function mood(c, W, H, m, P) {
  if (m === 'raw') return;
  const [ct, sat, br] = { drama: [1.35, 1.3, 0.95], dark: [1.3, 1.0, 0.7], mono: [1.35, 0, 0.9], tint: [1.25, 0.85, 0.85] }[m];
  const d = c.getImageData(0, 0, W, H), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const r = a[i] * br, g = a[i + 1] * br, b = a[i + 2] * br, l = 0.3 * r + 0.59 * g + 0.11 * b;
    a[i] = (l + (r - l) * sat - 128) * ct + 128;
    a[i + 1] = (l + (g - l) * sat - 128) * ct + 128;
    a[i + 2] = (l + (b - l) * sat - 128) * ct + 128;
  }
  c.putImageData(d, 0, 0);
  if (m === 'tint') { c.globalCompositeOperation = 'soft-light'; c.fillStyle = hexA(P, 0.55); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
}
// 단색 발광 분신용
function monoTint(src, col, W, H) {
  const [c, cx] = layer(W, H); cx.drawImage(src, 0, 0);
  const d = cx.getImageData(0, 0, W, H), a = d.data, [R, G, B] = rgb(col);
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const v = Math.pow((0.3 * a[i] + 0.59 * a[i + 1] + 0.11 * a[i + 2]) / 255, 1.1) * 1.5, w = Math.max(0, v - 1) * 200;
    a[i] = R * v + w; a[i + 1] = G * v + w; a[i + 2] = B * v + w;
  }
  cx.putImageData(d, 0, 0);
  // 아래로 갈수록 사라지게
  cx.globalCompositeOperation = 'destination-out';
  const g = cx.createLinearGradient(0, H * 0.25, 0, H * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000');
  cx.fillStyle = g; cx.fillRect(0, 0, W, H); return c;
}

// ---------- 플라즈마 번개 ----------
function boltPts(x1, y1, x2, y2, d, r, out) {
  if (d < 5) { out.push([x2, y2]); return; }
  const mx = (x1 + x2) / 2 + (r() - 0.5) * d, my = (y1 + y2) / 2 + (r() - 0.5) * d;
  boltPts(x1, y1, mx, my, d / 2, r, out); boltPts(mx, my, x2, y2, d / 2, r, out);
}
function bolt(ctx, x1, y1, x2, y2, w, col, r, depth) {
  const L = Math.hypot(x2 - x1, y2 - y1), pts = [[x1, y1]];
  boltPts(x1, y1, x2, y2, L * 0.3, r, pts);
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = hexA(col, 0.25); ctx.lineWidth = w * 4; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  ctx.strokeStyle = hexA(mix(col, '#ffffff', 0.6), 0.7); ctx.lineWidth = Math.max(0.5, w * 0.3); ctx.stroke();
  if (depth <= 0) return;
  const ang = Math.atan2(y2 - y1, x2 - x1), n = 2 + Math.floor(r() * 3);
  for (let k = 0; k < n; k++) {
    const [bx, by] = pts[Math.floor(pts.length * (0.15 + r() * 0.7))];
    const a = ang + (r() < 0.5 ? -1 : 1) * (0.3 + r() * 0.8), l = L * (0.2 + r() * 0.35);
    bolt(ctx, bx, by, bx + Math.cos(a) * l, by + Math.sin(a) * l, w * 0.6, col, r, depth - 1);
  }
}
function plasma(ctx, W, H, pal, r, cx, cy, amount, spread) {
  ctx.lineJoin = ctx.lineCap = 'round';
  const n = Math.round(8 + amount * 8);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, r0 = spread * (0.8 + r() * 0.5);
    const sx = cx + Math.cos(a) * r0, sy = cy + Math.sin(a) * r0 * 1.2;
    const l = W * (0.25 + r() * 0.45), a2 = a + (r() - 0.5) * 0.9;
    bolt(ctx, sx, sy, sx + Math.cos(a2) * l, sy + Math.sin(a2) * l, W * (0.002 + r() * 0.004), pickCol(pal, r), r, 2);
  }
}
function effects(ctx, W, H, type, pal, r, cx, cy, amount) {
  if (type === 'lightning') plasma(ctx, W, H, pal, r, cx, cy, amount, W * 0.26);
  else if (type === 'space') {
    for (let i = 0; i < 8; i++) blob(ctx, r() * W, r() * H, W * (0.2 + r() * 0.35), pickCol(pal, r), 0.35);
    for (let i = 0; i < 320; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`; ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.5 + r() * 2.2, 0, 7); ctx.fill(); }
  } else if (type === 'fire') {
    const warm = ['#ff3b00', '#ff7a00', '#ffc93c', pal[0]];
    for (let i = 0; i < 70 * amount / 3; i++) {
      const x = r() < 0.6 ? (r() < 0.5 ? r() * W * 0.3 : W - r() * W * 0.3) : r() * W, y = H * (0.2 + r() * 0.9);
      ctx.save(); ctx.translate(x, y); ctx.scale(1, 2.2 + r() * 1.5);
      blob(ctx, 0, 0, W * (0.015 + r() * 0.04), warm[i % warm.length], 0.3); ctx.restore();
    }
    plasma(ctx, W, H, ['#ff7a00', '#ffc93c'], r, cx, cy, amount * 0.4, W * 0.3);
  } else if (type === 'burst') {
    const R = Math.hypot(W, H);
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2, da = Math.PI / 72 * (0.2 + r() * 0.5);
      ctx.fillStyle = hexA(pal[i % pal.length], 0.35); ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a - da) * R, cy + Math.sin(a - da) * R); ctx.lineTo(cx + Math.cos(a + da) * R, cy + Math.sin(a + da) * R); ctx.fill();
    }
  }
  if (type !== 'none') for (let i = 0; i < 60 * amount; i++) { // 불티
    ctx.fillStyle = hexA(pickCol(pal, r), 0.5 + r() * 0.5);
    ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.6 + r() * 2.4, 0, 7); ctx.fill();
  }
}

// ---------- 레이저 / 눈빛 ----------
function poly(ctx, L, w0, w1) { ctx.beginPath(); ctx.moveTo(0, -w0); ctx.lineTo(L, -w1); ctx.lineTo(L, w1); ctx.lineTo(0, w0); ctx.fill(); }
function lasers(ctx, eyes, mode, A, W) {
  const d = Math.hypot(eyes[1].x - eyes[0].x, eyes[1].y - eyes[0].y) || W * 0.15, L = W * 1.6, w = d * 0.13;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  eyes.forEach((e, i) => {
    const ang = { 'up-right': -0.3, 'up-left': Math.PI + 0.3, 'down-right': 0.35, spread: i ? -0.25 : Math.PI + 0.25 }[mode];
    ctx.save(); ctx.translate(e.x, e.y);
    if (ang !== undefined) {
      ctx.save(); ctx.rotate(ang);
      for (const [a0, a1, w0, w1, len] of [[0.35, 0, 1.4, 3.5, 1], [0.9, 0, 0.7, 1.4, 1]]) {
        const g = ctx.createLinearGradient(0, 0, L * len, 0); g.addColorStop(0, hexA(A, a0)); g.addColorStop(1, hexA(A, a1));
        ctx.fillStyle = g; poly(ctx, L * len, w * w0, w * w1);
      }
      const g = ctx.createLinearGradient(0, 0, L * 0.8, 0); g.addColorStop(0, '#fff'); g.addColorStop(0.6, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; poly(ctx, L * 0.8, w * 0.28, w * 0.55);
      ctx.restore();
    }
    const R = d * (mode === 'glow' ? 0.42 : 0.26);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, '#fff'); g.addColorStop(0.12, '#fff'); g.addColorStop(0.3, hexA(A, 0.85)); g.addColorStop(1, hexA(A, 0));
    ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
    for (const [sw, sh] of [[R * 3.5, d * 0.012], [d * 0.01, R * 1.2]]) { // 렌즈 플레어
      const s = ctx.createLinearGradient(-sw, 0, sw, 0); s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.5, 'rgba(255,255,255,.9)'); s.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sw > sh ? s : '#fff'; ctx.fillRect(-sw, -sh, sw * 2, sh * 2);
    }
    ctx.restore();
  });
  ctx.restore();
}
function rainbow(ctx, eyes, W) {
  const d = Math.hypot(eyes[1].x - eyes[0].x, eyes[1].y - eyes[0].y) || W * 0.15;
  const ox = (eyes[0].x + eyes[1].x) / 2, oy = (eyes[0].y + eyes[1].y) / 2 + d * 1.15;
  const L = W * 1.5, w0 = d * 0.5, w1 = W * 0.45, n = RAINBOW.length;
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(0.22); ctx.globalAlpha = 0.85;
  RAINBOW.forEach((c, i) => {
    const a0 = -w0 / 2 + i * w0 / n, a1 = -w1 / 2 + i * w1 / n, g = ctx.createLinearGradient(0, 0, L, 0);
    g.addColorStop(0, '#fff'); g.addColorStop(0.12, c); g.addColorStop(1, hexA(c, 0.6));
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, a0); ctx.lineTo(L, a1); ctx.lineTo(L, a1 + w1 / n + 1); ctx.lineTo(0, a0 + w0 / n + 0.5); ctx.fill();
  });
  ctx.restore();
}

// ---------- 별 ----------
function stars(ctx, n, pal, W, H, r, eyes) {
  for (let i = 0; i < n; i++) {
    let x, y, k = 0;
    const d = Math.hypot(eyes[1].x - eyes[0].x, eyes[1].y - eyes[0].y) || W * 0.15, fx = (eyes[0].x + eyes[1].x) / 2, fy = (eyes[0].y + eyes[1].y) / 2 + d * 0.6;
    do { x = r() * W; y = r() * H * 0.72; } while (++k < 12 && Math.hypot((x - fx) / 1.3, y - fy) < d * 2.3); // 얼굴 피하기
    const s = W * (0.018 + r() * 0.04), col = pickCol(pal, r);
    ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 0.6);
    if (i % 3 === 0) { // 오각별
      ctx.beginPath();
      for (let j = 0; j < 10; j++) { const rr = j % 2 ? s * 0.45 : s, a = j * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = hexA(mix(col, '#ffffff', 0.35), 0.95); ctx.fill();
      ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#fff'; ctx.stroke();
    } else { // 반짝이
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.1, -s * 0.1, s, 0); ctx.quadraticCurveTo(s * 0.1, s * 0.1, 0, s);
      ctx.quadraticCurveTo(-s * 0.1, s * 0.1, -s, 0); ctx.quadraticCurveTo(-s * 0.1, -s * 0.1, 0, -s); ctx.fill();
      blob(ctx, 0, 0, s * 0.8, col, 0.8);
    }
    ctx.restore();
  }
}

function hanja(ctx, val, W, H) {
  const [a, b] = val.split('|'), s = W * 0.085;
  ctx.save(); ctx.font = `900 ${s}px ${FONT.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  [[a, W * 0.075, '#ffe600'], [b, W * 0.925, '#7dff6b']].forEach(([t, x, c]) => [...t].forEach((ch, i) => {
    const y = H * 0.04 + i * s * 1.05;
    ctx.save(); ctx.shadowColor = c; ctx.shadowBlur = s * 0.4; ctx.lineWidth = s * 0.2; ctx.strokeStyle = '#000'; ctx.strokeText(ch, x, y); ctx.restore();
    ctx.fillStyle = c; ctx.fillText(ch, x, y);
  }));
  ctx.restore();
}

// ---------- 글자 (레이어 합성 방식) ----------
// 글자 모양 마스크: lw>0 이면 테두리만큼 두꺼워짐, fill=false 면 속이 빈 선
function glyph(Wd, Ht, t, x, y, s, lw = 0, fill = true) {
  const [c, g] = layer(Wd, Ht);
  g.font = `${s}px ${FONT.display}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = `${-s * 0.02}px`;
  g.fillStyle = g.strokeStyle = '#fff'; g.lineJoin = 'round';
  if (fill) g.fillText(t, x, y);
  if (lw) { g.lineWidth = lw; g.strokeText(t, x, y); }
  return c;
}
// 마스크에 색/그라데이션 입히기
function paint(mask, style, alpha = 1) {
  const [c, g] = layer(mask.width, mask.height);
  g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'source-in';
  g.globalAlpha = alpha; g.fillStyle = style; g.fillRect(0, 0, c.width, c.height); return c;
}
// 마스크 a 에서 (dx,dy) 만큼 밀린 a 를 뺀 가장자리
function edge(mask, dx, dy, blur) {
  const [c, g] = layer(mask.width, mask.height);
  g.drawImage(mask, 0, 0); g.globalCompositeOperation = 'destination-out'; g.drawImage(mask, dx, dy);
  if (!blur) return c;
  const [o, og] = layer(mask.width, mask.height);
  og.drawImage(shrink(c, blur), 0, 0, o.width, o.height);
  og.globalCompositeOperation = 'destination-in'; og.drawImage(mask, 0, 0); return o;
}
function glint(g, x, y, s, col) {
  g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter';
  const r = g.createRadialGradient(0, 0, 0, 0, 0, s); r.addColorStop(0, '#fff'); r.addColorStop(0.2, hexA(col, 0.8)); r.addColorStop(1, hexA(col, 0));
  g.fillStyle = r; g.fillRect(-s, -s, s * 2, s * 2);
  g.fillStyle = '#fff';
  for (const [w, h] of [[s * 1.5, s * 0.03], [s * 0.03, s * 0.6]]) g.fillRect(-w, -h, w * 2, h * 2);
  g.restore();
}

function word(ctx, t, cx, cy, s, st, pal, i, seed) {
  const A = pal[i % pal.length], B = pal[(i + 1) % pal.length];
  const g0 = layer(1, 1)[1]; g0.font = `${s}px ${FONT.display}`;
  const tw = g0.measureText(t).width;
  const deep = st === 'metal' || st === 'rainbow', ext = deep ? Math.round(s * 0.13) : 0;
  const pad = Math.round(s * 0.45), Wd = Math.ceil(tw + pad * 2), Ht = Math.ceil(s * 1.2 + pad * 2 + ext);
  const x = Wd / 2, y = pad + s * 0.6, top = y - s * 0.55, bot = y + s * 0.5;
  const [OUT, o] = layer(Wd, Ht);
  const face = glyph(Wd, Ht, t, x, y, s);
  const vgrad = stops => { const g = o.createLinearGradient(0, top, 0, bot); stops.forEach(([k, c]) => g.addColorStop(k, c)); return g; };
  let glowSrc;

  if (deep || st === 'sub') {
    const ow = s * (st === 'sub' ? 0.2 : 0.2), thick = glyph(Wd, Ht, t, x, y, s, ow);
    // 테두리 + 입체 전체 실루엣
    const [U, u] = layer(Wd, Ht);
    for (let d = 0; d <= ext; d++) u.drawImage(thick, d * 0.2, d);
    glowSrc = paint(U, A);
    o.drawImage(paint(U, '#07030d'), 0, 0);
    if (ext) { // 옆면 (위 밝고 아래 어둡게)
      const side = glyph(Wd, Ht, t, x, y, s, s * 0.06), [X, xg] = layer(Wd, Ht);
      for (let d = 1; d <= ext; d++) xg.drawImage(side, d * 0.2, d);
      const g = o.createLinearGradient(0, top + ext * 0.5, 0, bot + ext);
      g.addColorStop(0, mix(A, '#000000', 0.2)); g.addColorStop(0.5, mix(B, '#000000', 0.5)); g.addColorStop(1, mix(A, '#000000', 0.85));
      o.drawImage(paint(X, g), 0, 0);
      o.drawImage(paint(edge(X, 0, -2), 'rgba(255,255,255,.35)'), 0, 0); // 옆면 줄무늬 광
    }
    // 밝은 림
    o.drawImage(paint(glyph(Wd, Ht, t, x, y, s, s * 0.075), vgrad([[0, '#ffffff'], [0.5, mix(A, '#ffffff', 0.6)], [1, mix(B, '#ffffff', 0.35)]])), 0, 0);
    // 크롬 면
    let fs;
    if (st === 'rainbow') { fs = o.createLinearGradient(x - tw / 2, 0, x + tw / 2, 0); RAINBOW.forEach((c, k) => fs.addColorStop(k / (RAINBOW.length - 1), c)); }
    else if (st === 'sub') fs = vgrad([[0, '#ffffff'], [0.55, '#ffffff'], [1, mix(A, '#ffffff', 0.45)]]);
    else fs = vgrad([[0, '#ffffff'], [0.22, mix(A, '#ffffff', 0.65)], [0.48, A], [0.5, mix(A, '#000000', 0.55)],
      [0.56, mix(B, '#000000', 0.25)], [0.82, B], [1, mix(B, '#ffffff', 0.7)]]);
    o.drawImage(paint(face, fs), 0, 0);
    if (st !== 'sub') {
      const b = Math.max(2, s * 0.035);
      o.drawImage(paint(edge(face, 0, b, 4), 'rgba(255,255,255,.7)'), 0, 0);                  // 윗면 베벨 하이라이트
      o.drawImage(paint(edge(face, 0, -b, 4), hexA(mix(B, '#000000', 0.6), 0.45)), 0, 0);      // 아랫면 베벨 그림자
      const [Gl, gl] = layer(Wd, Ht); gl.drawImage(face, 0, 0); gl.globalCompositeOperation = 'source-in';
      const gg = gl.createLinearGradient(0, top, 0, bot); gg.addColorStop(0, 'rgba(255,255,255,.55)'); gg.addColorStop(0.42, 'rgba(255,255,255,.12)'); gg.addColorStop(0.46, 'rgba(255,255,255,0)');
      gl.fillStyle = gg; gl.fillRect(0, 0, Wd, Ht); o.drawImage(Gl, 0, 0);                  // 윗면 광택
      const r = rng(seed + i * 31);
      for (let k = 0; k < 2; k++) glint(o, x - tw * 0.4 + r() * tw * 0.8, top + s * (0.05 + r() * 0.15), s * 0.28, A);
    }
  } else if (st === 'neon') {
    const tube = glyph(Wd, Ht, t, x, y, s, s * 0.09, false);
    glowSrc = paint(glyph(Wd, Ht, t, x, y, s, s * 0.16, false), A);
    o.drawImage(paint(face, hexA(A, 0.18)), 0, 0);
    o.drawImage(paint(glyph(Wd, Ht, t, x, y, s, s * 0.17, false), hexA(mix(A, '#000000', 0.3), 0.9)), 0, 0);
    o.drawImage(paint(tube, mix(A, '#ffffff', 0.25)), 0, 0);
    o.drawImage(paint(glyph(Wd, Ht, t, x, y, s, s * 0.03, false), '#ffffff'), 0, 0);
  } else { // comic
    const white = glyph(Wd, Ht, t, x, y, s, s * 0.36), black = glyph(Wd, Ht, t, x, y, s, s * 0.2);
    o.drawImage(paint(black, 'rgba(0,0,0,.85)'), s * 0.05, s * 0.08);                          // 그림자
    o.drawImage(paint(white, pal.length > 1 ? mix(A, '#ffffff', 0.8) : '#ffffff'), 0, 0);
    o.drawImage(paint(black, '#000000'), 0, 0);
    o.drawImage(paint(face, pal.length > 1 ? vgrad([[0, '#ffffff'], [0.35, mix(A, '#ffffff', 0.5)], [1, A]]) : '#ffffff'), 0, 0);
    o.drawImage(paint(edge(face, 0, Math.max(2, s * 0.03), 2), 'rgba(255,255,255,.8)'), 0, 0);
    glowSrc = paint(white, A, 0.6);
  }

  // 메인 캔버스에 합성 (바깥 빛 → 글자)
  const tilt = st === 'rainbow' ? [1, 0, -0.16, 1] : [1, 0, 0, 1];
  ctx.save(); ctx.translate(cx, cy); ctx.transform(...tilt, 0, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const [f, a] of (st === 'neon' ? [[4, 0.9], [8, 0.8], [16, 0.7]] : [[4, 0.6], [8, 0.65], [16, 0.5]])) {
    ctx.globalAlpha = a; ctx.drawImage(shrink(glowSrc, f), -x, -y, Wd, Ht);
  }
  ctx.restore();
  ctx.drawImage(OUT, -x, -y);
  ctx.restore();
}

function texts(ctx, v, pal, W, H) {
  const lines = v.main.split('/').map(s => s.trim()).filter(Boolean), maxW = W * 0.86;
  ctx.textAlign = 'center';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  const sizes = lines.map(l => fit(ctx, l, maxW * 1.02, W * (lines.length > 2 ? 0.13 : lines.length > 1 ? 0.17 : 0.25), FONT.display));
  let yb = H * 0.955;
  for (let i = lines.length - 1; i >= 0; i--) {
    const s = sizes[i]; word(ctx, lines[i], W / 2, yb - s * 0.55, s, v.textStyle, pal, i, v.seed); yb -= s * 1.14;
  }
  if (v.top) {
    const s = fit(ctx, v.top, maxW, W * 0.068, FONT.display);
    word(ctx, v.top, W / 2, yb - s * 0.45, s, 'sub', pal, 0, v.seed);
  }
}

export default {
  id: 'level',
  name: '○○급 짤',
  emoji: '⚡',
  desc: '눈에서 레이저, 양옆에 분신, 번개와 3D 글자까지. 요즘 제일 핫한 "○○급" 포스터 짤.',
  fields: [
    { key: 'top', label: '윗줄 작은 글', placeholder: '시험 전날 밤새는', max: 24 },
    { key: 'main', label: '큰 글 (/ 로 줄바꿈)', placeholder: '벼락치기급', max: 36 },
    { key: 'laser', type: 'select', label: '눈깔 레이저', default: 'up-right',
      options: [['up-right', '오른쪽 위로 발사'], ['down-right', '오른쪽 아래로 발사'], ['up-left', '왼쪽 위로 발사'], ['spread', '양옆으로 쫙'], ['glow', '눈만 번쩍'], ['off', '끄기']] },
    { key: 'eyes', type: 'points', count: 2, label: '눈 위치', hint: '레이저가 엇나가면 미리보기에서 왼눈, 오른눈 순서로 눌러 주세요.' },
    { key: 'clones', type: 'select', label: '분신 소환', default: '2', options: [['0', '없음'], ['2', '2명'], ['4', '4명']] },
    { key: 'colors', type: 'chips', label: '색깔 조합 (여러 개, 첫 색이 주인공)', options: Object.keys(COLORS), swatch: COLORS, default: ['보라', '파랑'] },
    { key: 'bg', type: 'select', label: '배경 이펙트', default: 'lightning',
      options: [['lightning', '번개 파지직'], ['fire', '불꽃'], ['space', '우주 별빛'], ['burst', '집중선'], ['none', '없음']] },
    { key: 'amount', type: 'range', label: '이펙트 양', min: 1, max: 5, default: 3 },
    { key: 'textStyle', type: 'select', label: '글자 스타일', default: 'metal',
      options: [['metal', '3D 크롬'], ['rainbow', '무지개 크롬'], ['neon', '네온사인'], ['comic', '만화 자막']] },
    { key: 'mood', type: 'select', label: '사진 분위기', default: 'tint',
      options: [['tint', '색 물들이기'], ['drama', '드라마틱'], ['dark', '어둡고 진하게'], ['mono', '흑백'], ['raw', '원본 그대로']] },
    { key: 'stars', type: 'range', label: '반짝이 별', min: 0, max: 20, default: 6 },
    { key: 'rainbow', type: 'toggle', label: '입에서 무지개 빔', default: false },
    { key: 'hanja', type: 'select', label: '양옆 세로 사자성어', default: 'off',
      options: [['off', '없음'], ['天上天下|唯我獨尊', '天上天下 · 唯我獨尊'], ['破天滅地|神之一體', '破天滅地 · 神之一體'], ['一騎當千|萬夫不當', '一騎當千 · 萬夫不當']] },
    { key: 'zoom', type: 'toggle', label: '얼굴 크게 (자동 구도)', default: true },
    { key: 'ai', type: 'toggle', label: 'AI 인물 따기 + 눈 자동 찾기 (첫 사용 시 몇 MB 다운로드)', default: true },
    { key: 'seed', type: 'dice', label: '번개 모양 바꾸기', default: 1 },
  ],
  heavy: true,
  size: () => ({ w: 1080, h: 1350 }),

  async prepare(img, v, report) {
    if (v.hanja !== 'off') await document.fonts.load(`900 80px ${FONT.body}`, v.hanja).catch(() => {});
    return v.ai ? analyze(img, report) : {};
  },

  render(ctx, img, v, W, H, cache = {}) {
    const pal = (v.colors.length ? v.colors : ['보라']).map(k => COLORS[k]), P = pal[0];
    const r = rng(v.seed * 7919), amount = v.amount ?? 3, hasMask = !!cache.mask;
    const T = frame(img, W, H, cache.eyes, hasMask, v.zoom);
    const eyes = v.eyes?.length === 2 ? v.eyes.map(p => ({ x: p.x * W, y: p.y * H })).sort((a, b) => a.x - b.x)
      : cache.eyes ? cache.eyes.map(p => ({ x: p.x * img.width * T.s + T.dx, y: p.y * img.height * T.s + T.dy }))
      : [{ x: W * 0.43, y: H * 0.3 }, { x: W * 0.57, y: H * 0.3 }];
    const d = Math.hypot(eyes[1].x - eyes[0].x, eyes[1].y - eyes[0].y) || W * 0.15;
    const cx = (eyes[0].x + eyes[1].x) / 2, cy = (eyes[0].y + eyes[1].y) / 2 + d * 1.6;

    // 1) 배경
    ctx.fillStyle = '#050208'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) blob(ctx, r() * W, r() * H, W * (0.3 + r() * 0.3), pickCol(pal, r), 0.1);
    const [E, ec] = layer(W, H); ec.globalCompositeOperation = 'lighter';
    effects(ec, W, H, v.bg, pal, r, cx, cy, amount);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(E, 0, 0); ctx.restore();
    bloom(ctx, E, W, H, 0.8 + amount * 0.2);

    // 2) 인물 레이어
    const [Ph, pc] = layer(W, H); place(pc, img, T, img.width, img.height);
    mood(pc, W, H, v.mood, P); // 불투명 상태에서 보정 (투명 영역 물들지 않게)
    const [S, sc] = layer(W, H); sc.drawImage(Ph, 0, 0); sc.globalCompositeOperation = 'destination-in';
    if (hasMask) place(sc, cache.mask, T, img.width, img.height);
    else {
      const m = sc.createRadialGradient(cx, cy - d, W * 0.22, cx, cy, W * 0.7);
      m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); sc.fillStyle = m; sc.fillRect(0, 0, W, H);
    }

    // 3) 분신 (단색 발광)
    const n = +v.clones;
    if (n) {
      const spots = [[-0.38, -0.05, 1.1, 0.75], [0.38, -0.05, 1.1, 0.75]];
      if (n === 4) spots.unshift([-0.5, -0.15, 0.85, 0.5], [0.5, -0.15, 0.85, 0.5]);
      spots.forEach(([ox, oy, s, a], i) => {
        const C = monoTint(S, pal[(i + (pal.length > 1 ? 1 : 0)) % pal.length], W, H);
        ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'screen';
        ctx.translate(cx + ox * W, cy + oy * H); ctx.scale(ox < 0 ? -s : s, s); ctx.drawImage(C, -cx, -cy); ctx.restore();
      });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(E, 0, 0); ctx.restore(); // 분신 위로 번개
    }

    // 4) 주인공 + 오라 + 테두리 빛
    if (hasMask) {
      const [Au, ac] = layer(W, H); ac.fillStyle = P; ac.fillRect(0, 0, W, H);
      ac.globalCompositeOperation = 'destination-in'; ac.drawImage(S, 0, 0);
      bloom(ctx, Au, W, H, 1, [[8, 0.55], [16, 0.35]]);
      ctx.drawImage(S, 0, 0);
      const [Ri, rc] = layer(W, H); rc.drawImage(Au, 0, 0); rc.globalCompositeOperation = 'destination-out';
      const sm = shrink(S, 16); for (let k = 0; k < 2; k++) rc.drawImage(sm, 0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.drawImage(Ri, 0, 0); ctx.restore();
    } else {
      ctx.drawImage(S, 0, 0);
      const [O, oc] = layer(W, H); oc.drawImage(E, 0, 0); oc.globalCompositeOperation = 'destination-out';
      const m = oc.createRadialGradient(cx, cy - d, W * 0.15, cx, cy - d, W * 0.45);
      m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); oc.fillStyle = m; oc.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.drawImage(O, 0, 0); ctx.restore();
    }

    // 5) 몸을 휘감는 앞쪽 번개
    if (hasMask && (v.bg === 'lightning' || v.bg === 'fire')) {
      const [F, fc] = layer(W, H); fc.globalCompositeOperation = 'lighter';
      plasma(fc, W, H, v.bg === 'fire' ? ['#ff7a00', '#ffc93c'] : pal, r, cx, cy + d, amount * 0.35, d * 2.4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75; ctx.drawImage(F, 0, 0); ctx.restore();
      bloom(ctx, F, W, H, 0.6);
    }

    // 6) 무지개 · 레이저 · 별
    if (v.rainbow) rainbow(ctx, eyes, W);
    const [L, lc] = layer(W, H);
    if (v.laser !== 'off') lasers(lc, eyes, v.laser, pal.length > 1 && v.laser !== 'glow' ? P : P, W);
    stars(lc, v.stars, pal, W, H, r, eyes);
    ctx.drawImage(L, 0, 0); bloom(ctx, L, W, H, 1);

    // 7) 마감: 전체 은은한 빛 + 비네팅 + 하단 어둡게
    const G = shrink(ctx.canvas, 8);
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.14; ctx.drawImage(G, 0, 0, W, H); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.45, W / 2, H * 0.5, W * 0.95);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    const tg = ctx.createLinearGradient(0, H * 0.62, 0, H);
    tg.addColorStop(0, 'rgba(0,0,0,0)'); tg.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = tg; ctx.fillRect(0, H * 0.62, W, H * 0.38);

    if (v.hanja !== 'off') hanja(ctx, v.hanja, W, H);
    texts(ctx, v, pal, W, H);
  },
};
