import { fit, cover, wrap, FONT } from './draw.js';

export default {
  id: 'wanted',
  name: '현상수배',
  emoji: '🤠',
  desc: '누런 종이에 수배 사진과 죄목, 현상금. 친구 생일 축하용으로 인기.',
  fields: [
    { key: 'name', label: '이름', placeholder: '김철수', max: 10 },
    { key: 'crime', label: '죄목', placeholder: '마지막 치킨 조각 몰래 먹음', max: 30 },
    { key: 'reward', label: '현상금', placeholder: '₩ 3,000원', max: 14 },
  ],
  size: () => ({ w: 1080, h: 1440 }),
  render(ctx, img, v, W, H) {
    ctx.fillStyle = '#e9d3a2'; ctx.fillRect(0, 0, W, H);
    // 종이 얼룩
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(120,80,30,${(i % 5) * 0.012})`;
      ctx.beginPath(); ctx.arc((i * 263) % W, (i * 397) % H, 20 + (i * 37) % 90, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#4a2f12'; ctx.lineWidth = 14; ctx.strokeRect(36, 36, W - 72, H - 72);
    ctx.fillStyle = '#3b240c'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `190px ${FONT.display}`; ctx.fillText('현상수배', W / 2, 80);
    const px = 150, py = 310, pw = W - 300, ph = 620;
    ctx.save(); ctx.filter = 'sepia(0.6) contrast(1.1)'; cover(ctx, img, px, py, pw, ph); ctx.restore();
    ctx.lineWidth = 10; ctx.strokeRect(px, py, pw, ph);
    fit(ctx, v.name, W - 200, 110, FONT.display); ctx.fillText(v.name, W / 2, 965);
    ctx.font = `bold 44px ${FONT.body}`;
    wrap(ctx, '죄목: ' + v.crime, W - 220, 2).forEach((l, i) => ctx.fillText(l, W / 2, 1100 + i * 58));
    ctx.fillStyle = '#8b1a10';
    fit(ctx, v.reward, W - 200, 96, FONT.display); ctx.fillText(v.reward, W / 2, 1240);
  },
};
