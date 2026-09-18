import { fit, outline, scaled, cover, FONT } from './draw.js';

export default {
  id: 'variety',
  name: '예능 자막',
  emoji: '📺',
  desc: '노란 글씨에 두꺼운 테두리, 옆엔 괄호 효과음. 예능 프로그램 자막 느낌.',
  fields: [
    { key: 'main', label: '자막', placeholder: '오히려 좋아', max: 20 },
    { key: 'sfx', label: '효과음 (괄호 글씨)', placeholder: '(해맑)', max: 10 },
  ],
  size: img => scaled(img, 1080),
  render(ctx, img, v, W, H) {
    cover(ctx, img, 0, 0, W, H);
    // 아래쪽 살짝 어둡게 해서 글씨 잘 보이게
    const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = g; ctx.fillRect(0, H * 0.6, W, H * 0.4);

    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const s = fit(ctx, v.main, W * 0.9, W * 0.14, FONT.display);
    const y = H - H * 0.06;
    outline(ctx, v.main, W / 2, y, { fill: '#ff5ca8', stroke: '#ff5ca8', width: s * 0.42 });
    outline(ctx, v.main, W / 2, y, { fill: '#ffe600', stroke: '#1a1a1a', width: s * 0.2 });

    if (v.sfx) {
      ctx.save();
      ctx.translate(W * 0.8, H * 0.18); ctx.rotate(-0.12);
      const t = fit(ctx, v.sfx, W * 0.35, W * 0.07, FONT.display);
      outline(ctx, v.sfx, 0, 0, { fill: '#fff', stroke: '#2f7cf6', width: t * 0.3 });
      ctx.restore();
    }
  },
};
