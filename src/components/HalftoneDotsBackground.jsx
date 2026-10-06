import React, { useEffect, useRef } from 'react';

/**
 * HalftoneDotsBackground
 * Renders an interactive manga-style halftone dot matrix on a HTML5 Canvas.
 * Dots are subtle/faint white by default, and subtly react to mouse cursor proximity
 * with smooth scaling and luminance boost.
 */
const HalftoneDotsBackground = ({ className = '' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = 0;
    let height = 0;

    // Grid config - smaller, sharper dots with clear baseline visibility
    const spacing = 14; // Distance between dot centers in px
    const baseRadius = 0.55; // Tiny needle-sharp base dot
    const maxRadius = 1.35; // Maximum size on magnetic hover
    const hoverRadius = 130; // Mouse interaction influence radius in px
    const maxMagneticPull = 5.5; // Max px dots get pulled towards the cursor

    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      active: false
    };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    };

    const handleTouchMove = (e) => {
      if (!e.touches[0]) return;
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.touches[0].clientX - rect.left;
      mouse.targetY = e.touches[0].clientY - rect.top;
      mouse.active = true;
    };

    const handleTouchEnd = () => {
      mouse.active = false;
      mouse.targetX = -9999;
      mouse.targetY = -9999;
    };

    const parent = canvas.parentElement || window;
    parent.addEventListener('mousemove', handleMouseMove, { passive: true });
    parent.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    parent.addEventListener('touchmove', handleTouchMove, { passive: true });
    parent.addEventListener('touchend', handleTouchEnd, { passive: true });

    const resizeObserver = new ResizeObserver(resize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    resize();

    const render = (time = 0) => {
      // Time in seconds for smooth ambient motion
      const t = time * 0.0012;

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.16;
      mouse.y += (mouse.targetY - mouse.y) * 0.16;

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / spacing) + 2;
      const rows = Math.ceil(height / spacing) + 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          // Stagger alternate rows slightly for classic diagonal halftone pattern
          const offsetX = (j % 2 === 1) ? spacing * 0.5 : 0;
          const originX = i * spacing + offsetX;
          const originY = j * spacing;

          // Natural organic ambient wave motion (subtle ocean/floating drift)
          const waveX = Math.sin(originY * 0.04 + t * 1.5) * 1.8 + Math.cos(originX * 0.03 + t * 0.8) * 0.8;
          const waveY = Math.cos(originX * 0.04 + t * 1.3) * 1.8 + Math.sin(originY * 0.03 + t * 0.9) * 0.8;
          const currentX = originX + waveX;
          const currentY = originY + waveY;

          // Distance from dot to mouse
          const dx = mouse.x - currentX;
          const dy = mouse.y - currentY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Subtle organic breathing of dots
          const breath = Math.sin(originX * 0.05 + originY * 0.05 + t * 2) * 0.08;
          let r = baseRadius + Math.max(0, breath * 0.2);
          let alpha = Math.min(1, Math.max(0.2, 0.40 + breath)); // Natural luminous pulse
          let drawX = currentX;
          let drawY = currentY;

          if (dist < hoverRadius && dist > 0.001) {
            const factor = 1 - (dist / hoverRadius);
            const easeFactor = factor * factor;

            // Magnetic attraction: gently attract dot toward cursor
            const pull = maxMagneticPull * easeFactor;
            drawX = currentX + (dx / dist) * pull;
            drawY = currentY + (dy / dist) * pull;

            // Scale and brighten on hover
            r = baseRadius + (maxRadius - baseRadius) * easeFactor;
            alpha = Math.min(1, alpha + 0.6 * easeFactor); // Crisp full-brightness on hover
          }

          ctx.beginPath();
          ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      parent.removeEventListener('touchmove', handleTouchMove);
      parent.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none select-none ${className}`}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};

export default HalftoneDotsBackground;
