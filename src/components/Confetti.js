"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#e3a53d", "#7bc47f", "#6fb3d8", "#e07a7a", "#c98fe0"];

/** Fires once on mount, cleans up after ~1.8s. Render it conditionally (e.g. `{show && <Confetti />}`). */
export default function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);

    const pieces = Array.from({ length: 120 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: window.innerHeight / 3,
      vx: (Math.random() - 0.5) * 10,
      vy: Math.random() * -10 - 4,
      size: Math.random() * 6 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 18,
    }));

    let frame;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of pieces) {
        p.vy += 0.35; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (elapsed < 1800) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 10001,
      }}
    />
  );
}
