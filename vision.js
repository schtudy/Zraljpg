// AI 인물 따기 + 눈 찾기 (MediaPipe, 브라우저 안에서만 실행. 사진은 전송되지 않음)
const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const SEG = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';
const FACE = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let loader = null, dead = false;
const cache = new WeakMap();

function load(report) {
  if (dead) return Promise.reject(new Error('vision unavailable'));
  loader ??= (async () => {
    report?.(10, 'AI 도구 받는 중 (처음 한 번만)');
    const V = await import(/* @vite-ignore */ `${CDN}/vision_bundle.mjs`);
    const fs = await V.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
    report?.(35, '인물 인식 준비 중');
    const seg = await V.ImageSegmenter.createFromOptions(fs, {
      baseOptions: { modelAssetPath: SEG, delegate: 'CPU' }, runningMode: 'IMAGE',
      outputConfidenceMasks: true, outputCategoryMask: false });
    report?.(55, '눈 인식 준비 중');
    const face = await V.FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: FACE, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 1 });
    return { seg, face };
  })().catch(e => { dead = true; loader = null; throw e; });
  return loader;
}

// 결과: { mask: 캔버스(인물=불투명), eyes: [{x,y}] 사진 기준 0~1 좌표 | null }
export function analyze(img, report) {
  if (!cache.has(img)) cache.set(img, run(img, report).catch(e => { cache.delete(img); throw e; }));
  return cache.get(img);
}

async function run(img, report) {
  const { seg, face } = await load(report);
  report?.(75, '인물 따는 중');
  const res = seg.segment(img);
  const m = res.confidenceMasks[res.confidenceMasks.length - 1];
  const w = m.width, h = m.height, conf = m.getAsFloat32Array();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const cx = c.getContext('2d'), id = cx.createImageData(w, h);
  for (let i = 0; i < conf.length; i++) {
    id.data[i * 4 + 3] = Math.max(0, Math.min(255, (conf[i] - 0.3) * 2.5 * 255));
  }
  cx.putImageData(id, 0, 0);
  res.close?.();

  report?.(90, '눈 찾는 중');
  let eyes = null;
  const lm = face.detect(img).faceLandmarks?.[0];
  if (lm) {
    const avg = (a, b) => ({ x: (lm[a].x + lm[b].x) / 2, y: (lm[a].y + lm[b].y) / 2 });
    eyes = (lm.length > 473 ? [lm[468], lm[473]] : [avg(33, 133), avg(362, 263)])
      .map(p => ({ x: p.x, y: p.y })).sort((a, b) => a.x - b.x);
  }
  return { mask: c, eyes };
}
