import React, { useEffect, useRef } from 'react';

/**
 * OrbitLandingBackground
 *
 * Continuous high-performance animated grid background for the ORBIT landing page.
 * Recreates the precise visual language of the reference:
 * - Large rounded grid cells with subtle hairline borders
 * - Subtle moving micro-elements (dot matrix, constellation graphs, telemetry lines, micro-pixels)
 * - Timed ORBIT-orange 4-pointed star signals with glowing pulse & expanding ripple
 * - Network propagation where adjacent cells briefly illuminate and react
 * - Seamless scroll synchronization across the entire page
 * - Reduced motion support & battery-conserving tab visibility culling
 */

interface ActiveSignal {
  id: number;
  gridX: number;
  gridY: number;
  startTime: number;
  duration: number; // in ms, ~3000ms
  peakScale: number;
  type: 'star' | 'pulse';
}

interface LocalPulseParticle {
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  alpha: number;
}

export const OrbitLandingBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number | null = null;
    let isVisible = true;
    let lastTime = performance.now();
    let scrollY = window.scrollY;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Grid configuration
    const CELL_SIZE = 104; // large rounded cells
    const CELL_GAP = 8;
    const CELL_STEP = CELL_SIZE + CELL_GAP;
    const CELL_RADIUS = 10;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // Signal state
    const activeSignals: ActiveSignal[] = [];
    const localPulses: LocalPulseParticle[] = [];
    let nextSignalTime = performance.now() + 1200;
    let signalIdCounter = 0;

    // Resize handler
    const updateSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.scale(dpr, dpr);
    };

    updateSize();

    const handleResize = () => {
      updateSize();
      if (prefersReducedMotion) {
        drawFrame(performance.now(), true);
      }
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      if (prefersReducedMotion) {
        drawFrame(performance.now(), true);
      }
    };

    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible && !prefersReducedMotion) {
        lastTime = performance.now();
        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(renderLoop);
        }
      } else if (!isVisible && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Pseudorandom generator based on grid coords (stable across scroll)
    const getCellHash = (gx: number, gy: number): number => {
      let h = (gx * 374761393 + gy * 668265263) ^ 0x5bf03635;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return (h ^ (h >>> 16)) >>> 0;
    };

    // Helper: draw rounded rectangle
    const drawRoundedRect = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) => {
      context.beginPath();
      context.moveTo(x + r, y);
      context.lineTo(x + w - r, y);
      context.arcTo(x + w, y, x + w, y + r, r);
      context.lineTo(x + w, y + h - r);
      context.arcTo(x + w, y + h, x + w - r, y + h, r);
      context.lineTo(x + r, y + h);
      context.arcTo(x, y + h, x, y + h - r, r);
      context.lineTo(x, y + r);
      context.arcTo(x, y, x + r, y, r);
      context.closePath();
    };

    // Helper: draw 4-pointed diamond star
    const drawFourPointStar = (
      context: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      outerRadius: number,
      innerRadius: number,
      color: string,
      alpha: number
    ) => {
      context.save();
      context.fillStyle = color;
      context.globalAlpha = alpha;
      context.beginPath();

      // Draw 4-point star with 8 vertices
      const points = 4;
      for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI) / points - Math.PI / 2;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) {
          context.moveTo(x, y);
        } else {
          context.lineTo(x, y);
        }
      }
      context.closePath();
      context.fill();
      context.restore();
    };

    // Helper: draw corner plus/cross marker
    const drawCornerCross = (
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      alpha: number
    ) => {
      context.save();
      context.strokeStyle = `rgba(15, 23, 42, ${alpha})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x - size, y);
      context.lineTo(x + size, y);
      context.moveTo(x, y - size);
      context.lineTo(x, y + size);
      context.stroke();
      context.restore();
    };

    // Main drawing routine
    const drawFrame = (currentTime: number, staticMode = false) => {
      // Clear canvas with crisp white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Grid position based on scroll
      const startCol = Math.floor(-CELL_GAP / CELL_STEP) - 1;
      const endCol = Math.ceil((width + CELL_GAP) / CELL_STEP) + 1;

      const offsetY = -(scrollY % CELL_STEP);
      const startRow = Math.floor((-offsetY - CELL_GAP) / CELL_STEP) - 1;
      const endRow = Math.ceil((height - offsetY + CELL_GAP) / CELL_STEP) + 1;

      const baseRowOffset = Math.floor(scrollY / CELL_STEP);

      // Trigger new signals periodically if not static
      if (!staticMode && currentTime >= nextSignalTime && isVisible) {
        // Pick a random visible grid cell (avoiding extreme edges)
        const visibleCols = Math.max(1, endCol - startCol - 2);
        const visibleRows = Math.max(1, endRow - startRow - 2);
        const randomCol = startCol + 1 + Math.floor(Math.random() * visibleCols);
        const randomRow = startRow + 1 + Math.floor(Math.random() * visibleRows);
        const worldRow = baseRowOffset + randomRow;

        activeSignals.push({
          id: ++signalIdCounter,
          gridX: randomCol,
          gridY: worldRow,
          startTime: currentTime,
          duration: 3200 + Math.random() * 800,
          peakScale: 1.0 + Math.random() * 0.25,
          type: Math.random() > 0.15 ? 'star' : 'pulse',
        });

        // Spawn 2-4 subtle outgoing pulse trails to orthogonal neighbors
        const neighbors = [
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
        ];
        neighbors.forEach((n) => {
          if (Math.random() > 0.2) {
            const startX = randomCol * CELL_STEP + CELL_SIZE / 2;
            const startY = (worldRow - baseRowOffset) * CELL_STEP + offsetY + CELL_SIZE / 2;
            const targetX = (randomCol + n.dx) * CELL_STEP + CELL_SIZE / 2;
            const targetY = (worldRow + n.dy - baseRowOffset) * CELL_STEP + offsetY + CELL_SIZE / 2;

            localPulses.push({
              startX,
              startY,
              targetX,
              targetY,
              progress: 0,
              speed: 0.0008 + Math.random() * 0.0006,
              alpha: 0.6,
            });
          }
        });

        // Next signal interval: between 2.2 and 4.2 seconds
        nextSignalTime = currentTime + 2200 + Math.random() * 2000;
      }

      // Cleanup finished signals
      for (let i = activeSignals.length - 1; i >= 0; i--) {
        if (currentTime - activeSignals[i].startTime > activeSignals[i].duration) {
          activeSignals.splice(i, 1);
        }
      }

      // 1. Draw Grid Cells & Corner Markers
      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
          const worldRow = baseRowOffset + r;
          const cellX = c * CELL_STEP;
          const cellY = r * CELL_STEP + offsetY;
          const hash = getCellHash(c, worldRow);

          // Check if this cell or immediate neighbor has an active signal
          let cellReactionIntensity = 0;
          let activeSignalForCell: ActiveSignal | null = null;

          for (const sig of activeSignals) {
            const dx = Math.abs(sig.gridX - c);
            const dy = Math.abs(sig.gridY - worldRow);
            const elapsed = currentTime - sig.startTime;
            const progress = Math.min(1, Math.max(0, elapsed / sig.duration));

            if (dx === 0 && dy === 0) {
              activeSignalForCell = sig;
              cellReactionIntensity = Math.max(cellReactionIntensity, Math.sin(progress * Math.PI));
            } else if (dx <= 1 && dy <= 1) {
              const neighborDelay = (dx + dy) * 200;
              const neighborElapsed = elapsed - neighborDelay;
              if (neighborElapsed > 0) {
                const neighborProg = Math.min(1, neighborElapsed / (sig.duration * 0.7));
                cellReactionIntensity = Math.max(
                  cellReactionIntensity,
                  Math.sin(neighborProg * Math.PI) * 0.45
                );
              }
            }
          }

          // Draw the rounded cell container
          drawRoundedRect(ctx, cellX, cellY, CELL_SIZE, CELL_SIZE, CELL_RADIUS);

          // Cell subtle background tint (clean white with micro variation)
          if (cellReactionIntensity > 0) {
            ctx.fillStyle = `rgba(249, 115, 22, ${0.015 * cellReactionIntensity})`;
            ctx.fill();
          }

          // Cell border
          if (cellReactionIntensity > 0) {
            ctx.strokeStyle = `rgba(249, 115, 22, ${0.05 + 0.18 * cellReactionIntensity})`;
            ctx.lineWidth = 1;
          } else {
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.048)';
            ctx.lineWidth = 1;
          }
          ctx.stroke();

          // Corner intersection markers (drawn at bottom-right of cell)
          const cornerX = cellX + CELL_SIZE + CELL_GAP / 2;
          const cornerY = cellY + CELL_SIZE + CELL_GAP / 2;
          drawCornerCross(ctx, cornerX, cornerY, 2.5, 0.08 + (cellReactionIntensity > 0 ? 0.12 : 0));

          // 2. Draw Micro-elements inside cell based on hash
          const patternType = hash % 100;
          const cellCenterX = cellX + CELL_SIZE / 2;
          const cellCenterY = cellY + CELL_SIZE / 2;

          // Pattern A: 3x3 or 4x4 Dot / Micro-Square Matrix (approx 12% of cells)
          if (patternType < 12) {
            const matrixSize = hash % 2 === 0 ? 3 : 4;
            const dotSize = 2.5;
            const dotGap = 4;
            const totalMSize = matrixSize * dotSize + (matrixSize - 1) * dotGap;
            const startMX = cellCenterX - totalMSize / 2;
            const startMY = cellCenterY - totalMSize / 2;

            const timePhase = (currentTime * 0.0008 + hash * 0.1) % (Math.PI * 2);
            const activeDotIndex = Math.floor(((timePhase + Math.PI) / (Math.PI * 2)) * (matrixSize * matrixSize));

            for (let mx = 0; mx < matrixSize; mx++) {
              for (let my = 0; my < matrixSize; my++) {
                const idx = my * matrixSize + mx;
                const px = startMX + mx * (dotSize + dotGap);
                const py = startMY + my * (dotSize + dotGap);

                let dotAlpha = 0.09;
                if (idx === activeDotIndex) {
                  dotAlpha = 0.22;
                }
                if (cellReactionIntensity > 0) {
                  dotAlpha += 0.2 * cellReactionIntensity;
                }

                ctx.fillStyle = cellReactionIntensity > 0
                  ? `rgba(234, 88, 12, ${dotAlpha})`
                  : `rgba(15, 23, 42, ${dotAlpha})`;

                ctx.fillRect(px, py, dotSize, dotSize);
              }
            }
          }

          // Pattern B: Topology / Constellation Nodes (approx 8% of cells)
          else if (patternType >= 12 && patternType < 20) {
            const nodeCount = 3 + (hash % 2);
            const radius = 16;
            const t = staticMode ? 0 : currentTime * 0.0004 + hash;

            const nodes: Array<{ x: number; y: number }> = [];
            for (let i = 0; i < nodeCount; i++) {
              const angle = (i / nodeCount) * Math.PI * 2 + Math.sin(t + i) * 0.2;
              const dist = radius * (0.6 + 0.35 * Math.cos(t * 0.7 + i));
              nodes.push({
                x: cellCenterX + Math.cos(angle) * dist,
                y: cellCenterY + Math.sin(angle) * dist,
              });
            }

            // Draw connecting lines
            ctx.save();
            ctx.strokeStyle = cellReactionIntensity > 0
              ? `rgba(234, 88, 12, ${0.12 + 0.15 * cellReactionIntensity})`
              : 'rgba(15, 23, 42, 0.065)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < nodes.length; i++) {
              const next = nodes[(i + 1) % nodes.length];
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(next.x, next.y);
            }
            ctx.stroke();

            // Draw tiny circular nodes
            for (let i = 0; i < nodes.length; i++) {
              ctx.fillStyle = cellReactionIntensity > 0
                ? `rgba(234, 88, 12, ${0.2 + 0.25 * cellReactionIntensity})`
                : 'rgba(15, 23, 42, 0.12)';
              ctx.beginPath();
              ctx.arc(nodes[i].x, nodes[i].y, 1.8, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }

          // Pattern C: Telemetry / Mini Horizontal Data Bars (approx 7% of cells)
          else if (patternType >= 20 && patternType < 27) {
            const lineCount = 3;
            const lineSpacing = 5;
            const startLY = cellCenterY - ((lineCount - 1) * lineSpacing) / 2;

            for (let i = 0; i < lineCount; i++) {
              const baseWidth = 14 + ((hash + i * 7) % 18);
              const linePhase = staticMode ? 0 : Math.sin(currentTime * 0.001 + hash + i);
              const curWidth = baseWidth + linePhase * 4;
              const lx = cellCenterX - curWidth / 2;
              const ly = startLY + i * lineSpacing;

              ctx.fillStyle = cellReactionIntensity > 0
                ? `rgba(234, 88, 12, ${0.1 + 0.15 * cellReactionIntensity})`
                : `rgba(15, 23, 42, ${0.07 + i * 0.02})`;

              ctx.fillRect(lx, ly, curWidth, 1.5);
            }
          }

          // Pattern D: Single Micro-Pixel Drift (approx 8% of cells)
          else if (patternType >= 27 && patternType < 35) {
            const driftRange = 18;
            const t = staticMode ? 0 : currentTime * 0.0006 + hash;
            const dx = Math.cos(t) * driftRange * 0.7;
            const dy = Math.sin(t * 1.3) * driftRange * 0.7;

            ctx.fillStyle = cellReactionIntensity > 0
              ? `rgba(234, 88, 12, ${0.25 + 0.2 * cellReactionIntensity})`
              : 'rgba(15, 23, 42, 0.13)';

            ctx.fillRect(cellCenterX + dx - 1.5, cellCenterY + dy - 1.5, 3, 3);
          }

          // Pattern E: Minimal Corner Accent (approx 6% of cells)
          else if (patternType >= 35 && patternType < 41) {
            const bracketSize = 7;
            const bx = cellX + 8;
            const by = cellY + 8;

            ctx.save();
            ctx.strokeStyle = cellReactionIntensity > 0
              ? `rgba(234, 88, 12, ${0.15 + 0.2 * cellReactionIntensity})`
              : 'rgba(15, 23, 42, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx, by + bracketSize);
            ctx.lineTo(bx, by);
            ctx.lineTo(bx + bracketSize, by);
            ctx.stroke();
            ctx.restore();
          }

          // 3. Draw Active Orange Signal if this cell is the active signal target
          if (activeSignalForCell) {
            const elapsed = currentTime - activeSignalForCell.startTime;
            const progress = Math.min(1, Math.max(0, elapsed / activeSignalForCell.duration));

            // Easing: smooth sine envelope
            const envelope = Math.sin(progress * Math.PI);
            const scale = (0.75 + 0.35 * envelope) * activeSignalForCell.peakScale;

            ctx.save();

            // Radial orange background glow
            const glowRadius = 38 * scale;
            const radialGrad = ctx.createRadialGradient(
              cellCenterX,
              cellCenterY,
              0,
              cellCenterX,
              cellCenterY,
              glowRadius
            );
            radialGrad.addColorStop(0, `rgba(249, 115, 22, ${0.24 * envelope})`);
            radialGrad.addColorStop(0.5, `rgba(249, 115, 22, ${0.08 * envelope})`);
            radialGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
            ctx.fillStyle = radialGrad;
            ctx.beginPath();
            ctx.arc(cellCenterX, cellCenterY, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            // Expanding circular ripple
            const rippleRadius = 8 + progress * 42;
            const rippleAlpha = Math.max(0, (1 - progress) * 0.35 * envelope);
            ctx.strokeStyle = `rgba(249, 115, 22, ${rippleAlpha})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cellCenterX, cellCenterY, rippleRadius, 0, Math.PI * 2);
            ctx.stroke();

            // 4-Pointed ORBIT Star (Sharp & Crisp, exactly like reference)
            const starOuterR = 11 * scale;
            const starInnerR = 3.2 * scale;
            drawFourPointStar(
              ctx,
              cellCenterX,
              cellCenterY,
              starOuterR,
              starInnerR,
              '#ea580c',
              0.95 * envelope
            );

            // Subtle second layer highlight star (smaller, brighter orange)
            drawFourPointStar(
              ctx,
              cellCenterX,
              cellCenterY,
              starOuterR * 0.65,
              starInnerR * 0.6,
              '#fb923c',
              0.9 * envelope
            );

            // Crisp center core pinpoint (white)
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.95 * envelope;
            ctx.beginPath();
            ctx.arc(cellCenterX, cellCenterY, 1.6 * scale, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
          }
        }
      }

      // 4. Update and Draw Local Network Pulses traveling between cells
      if (!staticMode) {
        const delta = Math.min(currentTime - lastTime, 50);
        for (let i = localPulses.length - 1; i >= 0; i--) {
          const p = localPulses[i];
          p.progress += p.speed * delta;

          if (p.progress >= 1) {
            localPulses.splice(i, 1);
            continue;
          }

          const curX = p.startX + (p.targetX - p.startX) * p.progress;
          const curY = p.startY + (p.targetY - p.startY) * p.progress;
          const pEnvelope = Math.sin(p.progress * Math.PI);
          const currentAlpha = p.alpha * pEnvelope;

          // Tiny moving signal dot along grid
          ctx.fillStyle = `rgba(249, 115, 22, ${currentAlpha})`;
          ctx.beginPath();
          ctx.arc(curX, curY, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      lastTime = currentTime;
    };

    // Render loop
    const renderLoop = (time: number) => {
      if (!isVisible) return;
      drawFrame(time);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    if (prefersReducedMotion) {
      drawFrame(performance.now(), true);
    } else {
      animationFrameId = requestAnimationFrame(renderLoop);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="orbit-animated-grid-canvas pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
};
