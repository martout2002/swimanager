'use client';

import { useEffect, useRef } from 'react';

/** Deterministic from the reference, so the same invoice always draws the same code. */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967295;
  };
}

// ponytail: a placeholder pattern, not a scannable PayNow code. Swap in a real SGQR
// payload generator when the coach's UEN and the bank integration are wired up.
function draw(canvas: HTMLCanvasElement, seed: string): void {
  const size = 25;
  const cell = 9;
  canvas.width = size * cell;
  canvas.height = size * cell;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const rand = seededRandom(seed);
  const finders: [number, number][] = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ];
  const inFinder = (x: number, y: number) =>
    finders.some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7);

  ctx.fillStyle = '#0A3D5C';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y)) continue;
      if (rand() > 0.56) ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  for (const [ox, oy] of finders) {
    ctx.fillStyle = '#0A3D5C';
    ctx.fillRect(ox * cell, oy * cell, 7 * cell, 7 * cell);
    ctx.fillStyle = '#fff';
    ctx.fillRect((ox + 1) * cell, (oy + 1) * cell, 5 * cell, 5 * cell);
    ctx.fillStyle = '#0A3D5C';
    ctx.fillRect((ox + 2) * cell, (oy + 2) * cell, 3 * cell, 3 * cell);
  }
}

export function PayNowQr({ reference }: { reference: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, reference);
  }, [reference]);

  return (
    <div className="qr-box">
      <canvas ref={canvasRef} />
      <div className="qr-ref">{reference}</div>
      <div className="qr-caption">
        Scan with any Singapore banking app — DBS, OCBC, UOB, and more. Amount and reference are
        already filled in.
      </div>
      <div className="qr-caption" style={{ marginTop: 6 }}>
        Your coach confirms once the transfer lands — this updates automatically for you.
      </div>
    </div>
  );
}
