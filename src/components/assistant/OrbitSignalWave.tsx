import React, { useEffect, useRef } from 'react';

interface OrbitSignalWaveProps {
  className?: string;
}

export const OrbitSignalWave: React.FC<OrbitSignalWaveProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId: number;
    let dpr = window.devicePixelRatio || 1;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;

    const updateSize = () => {
      if (!canvas) return;
      dpr = window.devicePixelRatio || 1;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Wave configuration for clear, crisp visibility
    const waveCount = 9;
    const dotSpacing = 14;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerY = height * 0.5;
      const numDots = Math.ceil(width / dotSpacing) + 2;

      for (let w = 0; w < waveCount; w++) {
        const normW = w / (waveCount - 1); // 0 to 1
        const waveOffset = (w - (waveCount - 1) / 2) * 22;
        const frequency = 0.0032 + w * 0.0006;
        const speed = (0.015 + (w % 3) * 0.005) * (prefersReducedMotion ? 0 : 1);
        const amplitude = 26 + Math.sin(w * 0.8) * 14;
        
        // Base opacity: clearly visible on dark background (0.35 to 0.7)
        const centerProximity = 1 - Math.abs(normW - 0.5) * 1.4;
        const layerOpacity = Math.max(0.35, 0.45 + centerProximity * 0.35);

        // Pre-calculate points for this wave
        const points: { x: number; y: number; alpha: number; isPulse: boolean }[] = [];

        for (let i = 0; i <= numDots; i++) {
          const x = i * dotSpacing;

          // Harmonic undulating wave
          const y =
            centerY +
            waveOffset +
            Math.sin(x * frequency + phase * (w % 2 === 0 ? 1 : -0.85) + w * 0.9) * amplitude +
            Math.cos(x * (frequency * 1.8) - phase * 0.4 + w) * (amplitude * 0.3);

          // Edge fade so waves gracefully fade out at left/right viewport boundaries
          const edgeDist = Math.min(x, width - x);
          const edgeFade = Math.min(1, edgeDist / 120);

          const finalAlpha = layerOpacity * edgeFade;

          const isPulse = (i + Math.floor(phase * 6) + w * 5) % 20 === 0;

          points.push({ x, y, alpha: finalAlpha, isPulse });
        }

        // 1. Draw connecting thin wave trace
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          if (i === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.strokeStyle = `rgba(100, 116, 139, ${Math.max(0.12, layerOpacity * 0.35).toFixed(2)})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Draw signal node dots along the wave
        for (let i = 0; i < points.length; i++) {
          const pt = points[i];
          if (pt.alpha <= 0.05) continue;

          ctx.beginPath();
          if (pt.isPulse) {
            // Highlighting active signal telemetry packet
            ctx.fillStyle = `rgba(249, 115, 22, ${Math.min(0.95, pt.alpha * 1.8)})`;
            ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Matrix signal dot
            const isCenterWave = w >= 2 && w <= waveCount - 3;
            ctx.fillStyle = isCenterWave
              ? `rgba(203, 213, 225, ${pt.alpha})`
              : `rgba(148, 163, 184, ${pt.alpha * 0.85})`;
            ctx.arc(pt.x, pt.y, 1.4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      phase += 0.02;

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden flex items-center justify-center z-0 ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </div>
  );
};
