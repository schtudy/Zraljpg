// 짤 그릴 때 쓰는 공용 도구. 새 밈에서 import 해서 쓰면 됨.
export const FONT = { display: '"Black Han Sans"', body: '"Noto Sans KR"' };

// 사진을 영역에 꽉 채우기(잘라서 맞춤)
export function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

// 폭에 맞게 글자 크기 자동 조절
export function fit(ctx, text, maxW, maxSize, family = FONT.display, weight = '') {
  let size = maxSize;
  do { ctx.font = `${weight} ${size}px ${family}`; } while (ctx.measureText(text).width > maxW && --size > 10);
  return size;
}

// 테두리 있는 글자
export function outline(ctx, text, x, y, { fill = '#fff', stroke = '#000', width = 8 } = {}) {
  ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

// 줄바꿈 (한글은 글자 단위로 끊음)
export function wrap(ctx, text, maxW, maxLines = 3) {
  const lines = []; let line = '';
  for (const ch of String(text)) {
    if (ch === '\n' || ctx.measureText(line + ch).width > maxW) {
      lines.push(line); line = ch === '\n' ? '' : ch;
      if (lines.length === maxLines) return lines;
    } else line += ch;
  }
  if (line) lines.push(line);
  return lines.slice(0, maxLines);
}

// 사진 비율 유지하며 긴 변을 max 로 맞춘 크기
export function scaled(img, max) {
  const s = Math.min(1, max / Math.max(img.width, img.height));
  return { w: Math.round(img.width * s), h: Math.round(img.height * s) };
}
