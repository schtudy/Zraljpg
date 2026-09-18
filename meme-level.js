// "○○급" 짤: 눈 레이저 + 분신 + 이펙트 + 3D 글자
import { fit, FONT } from './draw.js';
import { analyze } from './vision.js';

const COLORS = { 보라: '#a64dff', 핑크: '#ff4fd8', 파랑: '#3d7bff', 하늘: '#3fe0ff', 빨강: '#ff3b3b', 주황: '#ff8a00', 금색: '#ffd23f', 초록: '#39ff88' };
const RAINBOW = ['#ff2d2d', '#ff8a00', '#ffe600', '#39ff88', '#3fa8ff', '#5b4dff', '#c04dff'];

const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const layer = (W, H) => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
const box = (iw, ih, W, H) => { const s = Math.max(W / iw, H / ih); return { s, dx: (W - iw * s) / 2, dy: (H - ih * s) / 2 }; };
const drawCover = (ctx, src, W, H) => { const b = box(src.width, src.height, W, H); ctx.drawImage(src, b.dx, b.dy, src.width * b.s, src.height * b.s); };

// ----- 사진 분위기 -----
function mood(c, W, H, m, P) {
  if (m === 'raw') return;
  const [ct, sat, br] = { drama: [1.35, 1.45, 1], dark: [1.25, 1.1, 0.72], mono: [1.3, 0, 0.95], tint: [1.2, 1.1, 0.9] }[m];
  const d = c.getImageData(0, 0, W, H), a = d.data;
  for (let i = 0; i < a.length; i += 4) {
    let r = a[i] * br, g = a[i + 1] * br, b = a[i + 2] * br;
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    a[i] = (l + (r - l) * sat - 128) * ct + 128;
    a[i + 1] = (l + (g - l) * sat - 128) * ct + 128;
    a[i + 2] = (l + (b - l) * sat - 128) * ct + 128;
  }
  c.putImageData(d, 0, 0);
  if (m === 'tint') { c.globalCompositeOperation = 'soft-light'; c.fillStyle = hexA(P, 0.6); c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
}

// ----- 배경 이펙트 -----
function boltPts(x1, y1, x2, y2, d, r, out) {
  if (d < 8) { out.push([x2, y2]); return; }
  const mx = (x1 + x2) / 2 + (r() - 0.5) * d, my = (y1 + y2) / 2 + (r() - 0.5) * d;
  boltPts(x1, y1, mx, my, d / 2, r, out); boltPts(mx, my, x2, y2, d / 2, r, out);
}
function bolt(ctx, x1, y1, x2, y2, col, w, r, branch) {
  const pts = [[x1, y1]]; boltPts(x1, y1, x2, y2, Math.hypot(x2 - x1, y2 - y1) * 0.35, r, pts);
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.lineJoin = 'round';
  ctx.shadowColor = col; ctx.shadowBlur = w * 5; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = w * 0.35; ctx.stroke();
  if (branch) for (let k = 0; k < 3; k++) {
    const [bx, by] = pts[Math.floor(r() * pts.length)], a = r() * Math.PI * 2, L = 40 + r() * 180;
    bolt(ctx, bx, by, bx + Math.cos(a) * L, by + Math.sin(a) * L, col, w * 0.5, r, false);
  }
}
function blob(ctx, x, y, rad, col, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
  g.addColorStop(0, hexA(col, a)); g.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}
function effects(ctx, W, H, type, pal, r) {
  const pick = i => pal[i % pal.length];
  if (type === 'none') return;
  if (type === 'lightning') {
    for (let i = 0; i < 6; i++) blob(ctx, r() * W, r() * H, W * (0.3 + r() * 0.3), pick(i), 0.35);
    for (let i = 0; i < 14; i++) {
      const side = i % 4, t = r();
      const [sx, sy] = [[t * W, 0], [W, t * H], [t * W, H], [0, t * H]][side];
      const a = r() * Math.PI * 2, d = W * (0.2 + r() * 0.3);
      bolt(ctx, sx, sy, W / 2 + Math.cos(a) * d, H * 0.42 + Math.sin(a) * d, pick(i), W * 0.008, r, true);
    }
  } else if (type === 'space') {
    for (let i = 0; i < 7; i++) blob(ctx, r() * W, r() * H, W * (0.3 + r() * 0.35), pick(i), 0.45);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
      ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.6 + r() * 2.2, 0, 7); ctx.fill();
    }
  } else if (type === 'fire') {
    const warm = ['#ff3b00', '#ff8a00', '#ffd23f', ...pal];
    for (let i = 0; i < 110; i++) {
      const edge = r() < 0.5 ? (r() < 0.5 ? r() * W * 0.25 : W - r() * W * 0.25) : r() * W;
      blob(ctx, edge, H * (0.35 + r() * 0.7), W * (0.05 + r() * 0.14), warm[i % warm.length], 0.5);
    }
    for (let i = 0; i < 90; i++) { ctx.fillStyle = hexA(warm[i % 3], 0.9); ctx.fillRect(r() * W, r() * H, 3, 3 + r() * 6); }
  } else if (type === 'burst') {
    const cx = W / 2, cy = H * 0.4, R = Math.hypot(W, H);
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * Math.PI * 2, da = Math.PI / 64 * (0.3 + r() * 0.6);
      ctx.fillStyle = hexA(pick(i), 0.45);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - da) * R, cy + Math.sin(a - da) * R);
      ctx.lineTo(cx + Math.cos(a + da) * R, cy + Math.sin(a + da) * R); ctx.fill();
    }
  }
}

// ----- 분신 -----
function clones(ctx, S, W, H, n, pal, hasMask) {
  if (!n) return;
  const spots = [[-0.3, 0.02, 0.92], [0.3, 0.02, 0.92]];
  if (n === 4) spots.unshift([-0.42, -0.07, 0.72], [0.42, -0.07, 0.72]);
  spots.forEach(([ox, oy, s], i) => {
    const [T, tc] = layer(W, H);
    tc.drawImage(S, 0, 0); tc.globalCompositeOperation = 'source-atop';
    tc.fillStyle = hexA(pal[i % pal.length], 0.65); tc.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = hasMask ? 0.8 : 0.75;
    ctx.globalCompositeOperation = hasMask ? 'source-over' : 'screen';
    ctx.translate(W / 2 + ox * W, H / 2 + oy * H); ctx.scale(ox < 0 ? -s : s, s);
    ctx.drawImage(T, -W / 2, -H / 2); ctx.restore();
  });
}

// ----- 눈 위치 -----
function eyePos(v, cache, img, W, H) {
  if (v.eyes?.length === 2) return v.eyes.map(p => ({ x: p.x * W, y: p.y * H })).sort((a, b) => a.x - b.x);
  if (cache.eyes) { const b = box(img.width, img.height, W, H); return cache.eyes.map(p => ({ x: p.x * img.width * b.s + b.dx, y: p.y * img.height * b.s + b.dy })); }
  return [{ x: W * 0.42, y: H * 0.33 }, { x: W * 0.58, y: H * 0.33 }];
}

// ----- 눈깔 레이저 -----
function beam(ctx, L, w, col) {
  const g = ctx.createLinearGradient(0, 0, L, 0);
  g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath();
  ctx.moveTo(0, -w * 0.35); ctx.lineTo(L, -w); ctx.lineTo(L, w); ctx.lineTo(0, w * 0.35); ctx.fill();
}
function lasers(ctx, eyes, mode, pal, W) {
  const d = Math.abs(eyes[1].x - eyes[0].x) || W * 0.16, w = d * 0.14, L = W * 1.5;
  const A = pal[0], B = pal[1] || pal[0];
  eyes.forEach((e, i) => {
    const ang = { 'up-right': -0.32, 'up-left': Math.PI + 0.32, spread: i ? -0.22 : Math.PI + 0.22 }[mode];
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(e.x, e.y);
    if (ang !== undefined) {
      ctx.save(); ctx.rotate(ang);
      beam(ctx, L, w * 3.2, hexA(A, 0.35)); beam(ctx, L, w * 1.6, hexA(B, 0.75)); beam(ctx, L * 0.85, w * 0.55, 'rgba(255,255,255,.95)');
      ctx.restore();
    }
    const R = w * (mode === 'glow' ? 5 : 3.2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, '#fff'); g.addColorStop(0.3, hexA(A, 0.9)); g.addColorStop(1, hexA(A, 0));
    ctx.fillStyle = g; ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(-R * 1.6, -w * 0.08, R * 3.2, w * 0.16);
    ctx.restore();
  });
}

// ----- 무지개 빔 (입에서 발사) -----
function rainbow(ctx, eyes, W) {
  const d = Math.abs(eyes[1].x - eyes[0].x) || W * 0.16;
  const ox = (eyes[0].x + eyes[1].x) / 2, oy = (eyes[0].y + eyes[1].y) / 2 + d * 1.15;
  const L = W * 1.4, w0 = d * 0.45, w1 = W * 0.4, n = RAINBOW.length;
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(0.2); ctx.globalAlpha = 0.8;
  ctx.shadowColor = '#fff'; ctx.shadowBlur = d * 0.3;
  RAINBOW.forEach((c, i) => {
    const a0 = -w0 / 2 + i * w0 / n, a1 = -w1 / 2 + i * w1 / n;
    ctx.fillStyle = c; ctx.beginPath();
    ctx.moveTo(0, a0); ctx.lineTo(L, a1); ctx.lineTo(L, a1 + w1 / n + 1); ctx.lineTo(0, a0 + w0 / n + 0.5); ctx.fill();
  });
  ctx.restore();
}

// ----- 반짝이 별 -----
function sparkles(ctx, n, pal, W, H, r) {
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H * 0.8, s = W * (0.02 + r() * 0.045);
    ctx.save(); ctx.translate(x, y); ctx.rotate(r() * 0.5);
    ctx.shadowColor = pal[i % pal.length]; ctx.shadowBlur = s;
    ctx.fillStyle = '#fff'; ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0); ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
    ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0); ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
    ctx.fill(); ctx.fill(); ctx.restore();
  }
}

// ----- 세로 사자성어 -----
function hanja(ctx, val, W, H) {
  const [a, b] = val.split('|'), s = W * 0.085;
  ctx.save(); ctx.font = `900 ${s}px ${FONT.body}`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
  [[a, W * 0.075, '#ffe600'], [b, W * 0.925, '#7dff6b']].forEach(([t, x, c]) => [...t].forEach((ch, i) => {
    const y = H * 0.04 + i * s * 1.05;
    ctx.lineWidth = s * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(ch, x, y);
    ctx.fillStyle = c; ctx.fillText(ch, x, y);
  }));
  ctx.restore();
}

// ----- 글자 -----
function styled(ctx, t, x, y, s, st, pal, i) {
  ctx.font = `${s}px ${FONT.display}`;
  const A = pal[i % pal.length], B = pal[(i + 1) % pal.length];
  if (st === 'metal') {
    ctx.fillStyle = '#12051f';
    for (let d = Math.round(s * 0.1); d > 0; d--) ctx.fillText(t, x + d * 0.4, y + d);
    ctx.save(); ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#fff'; ctx.shadowColor = A; ctx.shadowBlur = s * 0.5; ctx.strokeText(t, x, y); ctx.restore();
    const g = ctx.createLinearGradient(0, y - s, 0, y);
    g.addColorStop(0, '#fff'); g.addColorStop(0.4, A); g.addColorStop(0.62, B); g.addColorStop(1, '#fff');
    ctx.fillStyle = g; ctx.fillText(t, x, y);
  } else if (st === 'neon') {
    ctx.save(); ctx.strokeStyle = A; ctx.lineWidth = s * 0.08; ctx.shadowColor = A;
    for (const b of [s * 0.8, s * 0.4, s * 0.15]) { ctx.shadowBlur = b; ctx.strokeText(t, x, y); }
    ctx.restore(); ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillText(t, x, y);
  } else {
    ctx.lineWidth = s * 0.32; ctx.strokeStyle = '#fff'; ctx.strokeText(t, x, y);
    ctx.lineWidth = s * 0.18; ctx.strokeStyle = '#000'; ctx.strokeText(t, x, y);
    const g = ctx.createLinearGradient(0, y - s, 0, y); g.addColorStop(0, '#fff'); g.addColorStop(1, A);
    ctx.fillStyle = pal.length > 1 ? g : '#fff'; ctx.fillText(t, x, y);
  }
}
function texts(ctx, v, pal, W, H) {
  const lines = v.main.split('/').map(s => s.trim()).filter(Boolean);
  const maxW = W * 0.9;
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineJoin = 'round';
  const sizes = lines.map(l => fit(ctx, l, maxW, W * (lines.length > 2 ? 0.12 : 0.17), FONT.display));
  let y = H * 0.965;
  for (let i = lines.length - 1; i >= 0; i--) { styled(ctx, lines[i], W / 2, y, sizes[i], v.textStyle, pal, i); y -= sizes[i] * 1.1; }
  if (v.top) {
    const s = fit(ctx, v.top, maxW, W * 0.07, FONT.display);
    ctx.save(); ctx.shadowColor = pal[0]; ctx.shadowBlur = s * 0.6; ctx.lineWidth = s * 0.22; ctx.strokeStyle = '#000';
    ctx.strokeText(v.top, W / 2, y); ctx.restore();
    ctx.fillStyle = '#fff'; ctx.fillText(v.top, W / 2, y);
  }
}

export default {
  id: 'level',
  name: '○○급 짤',
  emoji: '⚡',
  desc: '눈에서 레이저, 양옆에 분신, 번개와 3D 글자까지. 요즘 제일 핫한 "○○급" 포스터 짤.',
  fields: [
    { key: 'top', label: '윗줄 작은 글', placeholder: '시험 전날 밤새는', max: 24 },
    { key: 'main', label: '큰 글 (/ 로 줄바꿈)', placeholder: '벼락치기/레전드급', max: 36 },
    { key: 'laser', type: 'select', label: '눈깔 레이저', default: 'up-right',
      options: [['up-right', '오른쪽 위로 발사'], ['up-left', '왼쪽 위로 발사'], ['spread', '양옆으로 쫙'], ['glow', '눈만 번쩍'], ['off', '끄기']] },
    { key: 'eyes', type: 'points', count: 2, label: '눈 위치', hint: '레이저가 엇나가면 미리보기에서 왼눈, 오른눈 순서로 눌러 주세요.' },
    { key: 'clones', type: 'select', label: '분신 소환', default: '2', options: [['0', '없음'], ['2', '2명'], ['4', '4명']] },
    { key: 'colors', type: 'chips', label: '색깔 조합 (여러 개 선택)', options: Object.keys(COLORS), swatch: COLORS, default: ['보라', '핑크'] },
    { key: 'bg', type: 'select', label: '배경 이펙트', default: 'lightning',
      options: [['lightning', '번개 파지직'], ['space', '우주 별빛'], ['fire', '불꽃'], ['burst', '집중선'], ['none', '없음']] },
    { key: 'textStyle', type: 'select', label: '글자 스타일', default: 'metal', options: [['metal', '3D 메탈'], ['neon', '네온사인'], ['comic', '만화 자막']] },
    { key: 'mood', type: 'select', label: '사진 분위기', default: 'tint',
      options: [['tint', '색 물들이기'], ['drama', '드라마틱'], ['dark', '어둡고 진하게'], ['mono', '흑백'], ['raw', '원본 그대로']] },
    { key: 'stars', type: 'range', label: '반짝이 별', min: 0, max: 20, default: 8 },
    { key: 'rainbow', type: 'toggle', label: '입에서 무지개 빔', default: false },
    { key: 'hanja', type: 'select', label: '양옆 세로 사자성어', default: 'off',
      options: [['off', '없음'], ['天上天下|唯我獨尊', '天上天下 · 唯我獨尊'], ['破天滅地|神之一體', '破天滅地 · 神之一體'], ['一騎當千|萬夫不當', '一騎當千 · 萬夫不當']] },
    { key: 'ai', type: 'toggle', label: 'AI 인물 따기 + 눈 자동 찾기 (첫 사용 시 몇 MB 다운로드)', default: true },
    { key: 'seed', type: 'dice', label: '이펙트 모양 바꾸기', default: 1 },
  ],
  size: () => ({ w: 1080, h: 1350 }),

  async prepare(img, v, report) {
    if (v.hanja !== 'off') await document.fonts.load(`900 80px ${FONT.body}`, v.hanja).catch(() => {});
    return v.ai ? analyze(img, report) : {};
  },

  render(ctx, img, v, W, H, cache = {}) {
    const pal = (v.colors.length ? v.colors : ['보라']).map(k => COLORS[k]), P = pal[0];
    const r = rng(v.seed * 7919);
    const hasMask = !!cache.mask;

    ctx.fillStyle = '#08040f'; ctx.fillRect(0, 0, W, H);
    blob(ctx, W / 2, H * 0.4, W * 0.8, P, 0.55);

    const [E, ec] = layer(W, H);
    ec.globalCompositeOperation = 'lighter'; effects(ec, W, H, v.bg, pal, r);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(E, 0, 0); ctx.restore();

    const [Ph, pc] = layer(W, H); drawCover(pc, img, W, H); mood(pc, W, H, v.mood, P);
    const [S, sc] = layer(W, H); sc.drawImage(Ph, 0, 0); sc.globalCompositeOperation = 'destination-in';
    if (hasMask) drawCover(sc, cache.mask, W, H);
    else {
      const m = sc.createRadialGradient(W / 2, H * 0.42, W * 0.25, W / 2, H * 0.45, W * 0.72);
      m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); sc.fillStyle = m; sc.fillRect(0, 0, W, H);
    }

    clones(ctx, S, W, H, +v.clones, pal, hasMask);
    ctx.save(); if (hasMask) { ctx.shadowColor = P; ctx.shadowBlur = W * 0.04; } ctx.drawImage(S, 0, 0); ctx.restore();

    if (!hasMask && v.bg !== 'none') { // 누끼 없으면 가장자리에 이펙트 한 번 더 덮기
      const [O, oc] = layer(W, H); oc.drawImage(E, 0, 0); oc.globalCompositeOperation = 'destination-out';
      const m = oc.createRadialGradient(W / 2, H * 0.42, W * 0.18, W / 2, H * 0.42, W * 0.5);
      m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); oc.fillStyle = m; oc.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalAlpha = 0.75; ctx.globalCompositeOperation = 'screen'; ctx.drawImage(O, 0, 0); ctx.restore();
    }

    const eyes = eyePos(v, cache, img, W, H);
    if (v.rainbow) rainbow(ctx, eyes, W);
    if (v.laser !== 'off') lasers(ctx, eyes, v.laser, pal, W);
    sparkles(ctx, v.stars, pal, W, H, r);

    const tg = ctx.createLinearGradient(0, H * 0.6, 0, H);
    tg.addColorStop(0, 'rgba(0,0,0,0)'); tg.addColorStop(1, 'rgba(0,0,0,.75)');
    ctx.fillStyle = tg; ctx.fillRect(0, H * 0.6, W, H * 0.4);
    if (v.hanja !== 'off') hanja(ctx, v.hanja, W, H);
    texts(ctx, v, pal, W, H);
  },
};
