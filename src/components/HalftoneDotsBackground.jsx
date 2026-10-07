import React, { useEffect, useRef } from 'react';

/**
 * HalftoneDotsBackground
 * Renders an interactive manga-style halftone dot matrix on a HTML5 Canvas.
 * Dots dynamically invert based on theme:
 * - Light Mode: Crisp dark/black dots on white background
 * - Dark Mode: Luminous white dots on dark background
 * Reacts to mouse cursor proximity with smooth magnetic pull, size growth, and opacity boost.
 */
const HalftoneDotsBackground = ({ className = '', excludeSelector = '[data-splash-cover]' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = 0;
    let height = 0;
    let cachedExcludeRect = null;
    let lastRectCheck = 0;

    // Grid configuration - stylish, clearly defined halftone dots with dynamic mouse attraction
    const spacing = 18; // Distance between dot centers in px (clean, airy, modern)
    const baseRadius = 1.15; // Crisp, clearly visible base dot radius (~2.3px diameter)
    const maxRadius = 3.2; // Pronounced maximum size on magnetic hover (~6.4px diameter)
    const hoverRadius = 140; // Mouse interaction radius in px
    const maxMagneticPull = 5.5; // Max px dots get pulled towards the cursor

    const mouse = {
      x: -9999,
      y: -9999,
      targetX: -9999,
      targetY: -9999,
      active: false
    };

    // Helper to reliably check theme: checks html.dark / html.light / localStorage before fallback to system media
    const getIsDarkTheme = () => {
      const root = document.documentElement;
      if (root.classList.contains('dark')) return true;
      if (root.classList.contains('light')) return false;
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark') return true;
      if (storedTheme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };

    const updateExcludeRect = (now = 0) => {
      if (now - lastRectCheck < 250 && cachedExcludeRect) return cachedExcludeRect;
      lastRectCheck = now;
      if (!excludeSelector) {
        cachedExcludeRect = null;
        return null;
      }
      const el = document.querySelector(excludeSelector);
      if (!el) {
        cachedExcludeRect = null;
        return null;
      }
      const cRect = canvas.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      if (eRect.width <= 0 || eRect.height <= 0) {
        cachedExcludeRect = null;
        return null;
      }
      cachedExcludeRect = {
        left: eRect.left - cRect.left,
        top: eRect.top - cRect.top,
        right: eRect.right - cRect.left,
        bottom: eRect.bottom - cRect.top
      };
      return cachedExcludeRect;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const parentRect = canvas.parentElement?.getBoundingClientRect();
      const w = Math.round(rect.width > 0 ? rect.width : (parentRect?.width || window.innerWidth));
      const h = Math.round(rect.height > 0 ? rect.height : (parentRect?.height || window.innerHeight));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = w;
      height = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      updateExcludeRect(0);
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

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('resize', resize, { passive: true });

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

      // Live theme detection: dark vs light
      const isDarkTheme = getIsDarkTheme();
      // Light Mode: Black dots (0, 0, 0) | Dark Mode: White dots (255, 255, 255)
      const dotColor = isDarkTheme ? '255, 255, 255' : '0, 0, 0';
      const baseAlpha = isDarkTheme ? 0.35 : 0.32;

      // Mobile check (under 768px): scale dot size down by 30%
      const isMobile = width < 768 || (typeof window !== 'undefined' && window.innerWidth < 768);
      const sizeMultiplier = isMobile ? 0.70 : 1.0;
      const effectiveBaseRadius = baseRadius * sizeMultiplier;
      const effectiveMaxRadius = maxRadius * sizeMultiplier;
      const currentSpacing = isMobile ? 14 : spacing;
      const currentHoverRadius = isMobile ? 95 : hoverRadius;
      const currentMagneticPull = isMobile ? 3.5 : maxMagneticPull;

      const cols = Math.ceil(width / currentSpacing) + 2;
      const rows = Math.ceil(height / currentSpacing) + 2;
      const excludeRect = updateExcludeRect(time);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          // Stagger alternate rows slightly for classic diagonal halftone pattern
          const offsetX = (j % 2 === 1) ? currentSpacing * 0.5 : 0;
          const originX = i * currentSpacing + offsetX;
          const originY = j * currentSpacing;

          // Natural organic ambient wave motion (subtle floating drift)
          const waveX = Math.sin(originY * 0.04 + t * 1.5) * 1.6 + Math.cos(originX * 0.03 + t * 0.8) * 0.8;
          const waveY = Math.cos(originX * 0.04 + t * 1.3) * 1.6 + Math.sin(originY * 0.03 + t * 0.9) * 0.8;
          const currentX = originX + waveX;
          const currentY = originY + waveY;

          // Skip dots that fall inside the excluded cover art bounds (guarantees cover stays strictly in front)
          if (excludeRect &&
              currentX >= excludeRect.left &&
              currentX <= excludeRect.right &&
              currentY >= excludeRect.top &&
              currentY <= excludeRect.bottom) {
            continue;
          }

          // Distance from dot to mouse
          const dx = mouse.x - currentX;
          const dy = mouse.y - currentY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Subtle organic breathing of dots
          const breath = Math.sin(originX * 0.05 + originY * 0.05 + t * 2) * (isMobile ? 0.08 : 0.12);
          let r = effectiveBaseRadius + Math.max(0, breath * 0.25);
          let alpha = Math.min(1, Math.max(0.18, baseAlpha + breath * 0.5));
          let drawX = currentX;
          let drawY = currentY;

          if (dist < currentHoverRadius && dist > 0.001) {
            const factor = 1 - (dist / currentHoverRadius);
            const easeFactor = factor * factor;

            // Magnetic attraction: gently attract dot toward cursor
            const pull = currentMagneticPull * easeFactor;
            drawX = currentX + (dx / dist) * pull;
            drawY = currentY + (dy / dist) * pull;

            // Scale and boost opacity on hover
            r = effectiveBaseRadius + (effectiveMaxRadius - effectiveBaseRadius) * easeFactor;
            alpha = Math.min(isDarkTheme ? 0.95 : 0.85, alpha + (isDarkTheme ? 0.65 : 0.55) * easeFactor);
          }

          // Also skip if magnetic pull dragged dot inside the exclude area
          if (excludeRect &&
              drawX >= excludeRect.left &&
              drawX <= excludeRect.right &&
              drawY >= excludeRect.top &&
              drawY <= excludeRect.bottom) {
            continue;
          }

          ctx.beginPath();
          ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${dotColor}, ${alpha})`;
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', resize);
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
