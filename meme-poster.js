import { fit, cover, FONT } from './draw.js';

export default {
  id: 'poster',
  name: '명언 포스터',
  emoji: '🏆',
  desc: '검은 바탕에 액자 사진, 큼직한 한 줄 명언. 진지할수록 웃긴 짤.',
  fields: [
    { key: 'title', label: '큰 제목', placeholder: '중요한 건 꺾이지 않는 마음', max: 20 },
    { key: 'sub', label: '작은 글', placeholder: '(시험 D-1, 아직 1페이지)', max: 36 },
  ],
  size: () => ({ w: 1080, h: 1350 }),
  render(ctx, img, v, W, H) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const m = 90, ph = 900;
    ctx.fillStyle = '#fff'; ctx.fillRect(m - 8, m - 8, W - m * 2 + 16, ph + 16);
    ctx.fillStyle = '#000'; ctx.fillRect(m - 2, m - 2, W - m * 2 + 4, ph + 4);
    cover(ctx, img, m, m, W - m * 2, ph);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    fit(ctx, v.title, W - 140, 86, FONT.display); ctx.fillText(v.title, W / 2, m + ph + 60);
    ctx.fillStyle = '#c9c9c9';
    fit(ctx, v.sub, W - 200, 38, FONT.body); ctx.fillText(v.sub, W / 2, m + ph + 180);
  },
};
