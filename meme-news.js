import { fit, cover, FONT } from './draw.js';

export default {
  id: 'news',
  name: '뉴스 속보',
  emoji: '🚨',
  desc: '빨간 속보 딱지와 하단 헤드라인. 사소한 일을 대형 사건처럼 만들기.',
  fields: [
    { key: 'headline', label: '헤드라인', placeholder: '월요일 아침, 또 알람 못 들어', max: 28 },
    { key: 'ticker', label: '아래 흐르는 글', placeholder: '전문가 "주말이 너무 짧았다" 분석', max: 40 },
  ],
  size: () => ({ w: 1280, h: 720 }),
  render(ctx, img, v, W, H) {
    cover(ctx, img, 0, 0, W, H);
    const barH = 120, tickH = 46, y = H - barH - tickH - 30;
    // 헤드라인 바
    ctx.fillStyle = '#fff'; ctx.fillRect(40, y, W - 80, barH);
    ctx.fillStyle = '#d81e1e'; ctx.fillRect(40, y, 190, barH);
    ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.font = `64px ${FONT.display}`; ctx.fillText('속보', 135, y + barH / 2 + 3);
    ctx.fillStyle = '#111'; ctx.textAlign = 'left';
    fit(ctx, v.headline, W - 80 - 190 - 50, 62, FONT.display);
    ctx.fillText(v.headline, 255, y + barH / 2 + 3);
    // 티커
    ctx.fillStyle = '#12245a'; ctx.fillRect(40, y + barH, W - 80, tickH);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(40, y + barH, 110, tickH);
    ctx.fillStyle = '#12245a'; ctx.textAlign = 'center';
    ctx.font = `bold 24px ${FONT.body}`;
    const d = new Date();
    ctx.fillText(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, 95, y + barH + tickH / 2);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    fit(ctx, v.ticker, W - 80 - 140, 26, FONT.body, 'bold');
    ctx.fillText(v.ticker, 170, y + barH + tickH / 2);
    // LIVE 딱지
    ctx.fillStyle = '#d81e1e'; ctx.fillRect(W - 170, 36, 120, 48);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = `bold 28px ${FONT.body}`; ctx.fillText('● LIVE', W - 110, 61);
  },
};
