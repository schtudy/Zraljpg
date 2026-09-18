import { fit, outline, scaled, cover, FONT } from './draw.js';

export default {
  id: 'caption',
  name: '위아래 자막',
  emoji: '🤬',
  desc: '사진 위아래에 굵은 흰 글씨를 얹는 가장 기본 짤. 킹받는 순간에 딱.',
  fields: [
    { key: 'top', label: '윗줄', placeholder: '아 진짜', max: 24 },
    { key: 'bottom', label: '아랫줄', placeholder: '킹받네 ㅋㅋ', max: 24 },
  ],
  size: img => scaled(img, 1080),
  render(ctx, img, v, W, H) {
    cover(ctx, img, 0, 0, W, H);
    ctx.textAlign = 'center';
    const pad = W * 0.05, max = W * 0.12;
    ctx.textBaseline = 'top';
    let s = fit(ctx, v.top, W - pad * 2, max, FONT.display);
    outline(ctx, v.top, W / 2, pad, { width: s * 0.18 });
    ctx.textBaseline = 'bottom';
    s = fit(ctx, v.bottom, W - pad * 2, max, FONT.display);
    outline(ctx, v.bottom, W / 2, H - pad, { width: s * 0.18 });
  },
};
