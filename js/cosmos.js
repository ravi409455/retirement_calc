// cosmos.js — decorative particle background animation with cursor interaction
export function initCosmos(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');

  let width, height;
  let particles = [];
  let animationId;

  // Cursor tracking state
  let mouse = { x: null, y: null, radius: 160 };

  const handleMouseMove = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  const handleMouseLeave = () => {
    mouse.x = null;
    mouse.y = null;
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', handleMouseLeave);

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function pickColor() {
    const r = Math.random();
    if (r < 0.70) return 'rgba(120, 160, 255, ';      // blue  — 70%
    if (r < 0.85) return 'rgba(180, 140, 255, ';      // purple — 15%
    return 'rgba(200, 200, 255, ';                     // white  — 15%
  }

  function createParticles() {
    const count = Math.round((width * height) / 8000);
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: randomBetween(0, width),
        y: randomBetween(0, height),
        baseX: 0,
        baseY: 0,
        size: randomBetween(0.5, 2.5),
        speedX: randomBetween(-0.3, 0.3),
        speedY: randomBetween(-0.3, 0.3),
        opacity: randomBetween(0.2, 1.0),
        pulse: randomBetween(0, Math.PI * 2),
        pulseSpeed: randomBetween(0.005, 0.025),
        color: pickColor(),
      });
      // Store dynamic initial base positions
      particles[i].baseX = particles[i].x;
      particles[i].baseY = particles[i].y;
    }
  }

  function drawConnections() {
    // Inter-particle links
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.15;
          ctx.strokeStyle = `rgba(100, 140, 255, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    // Stellar connection to cursor (glowing neon cyan constellation threads)
    if (mouse.x !== null) {
      for (let i = 0; i < particles.length; i++) {
        const dx = mouse.x - particles[i].x;
        const dy = mouse.y - particles[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const alpha = (1 - dist / mouse.radius) * 0.28;
          ctx.strokeStyle = `rgba(34, 211, 238, ${alpha})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(particles[i].x, particles[i].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    // Background radial gradient
    ctx.clearRect(0, 0, width, height);
    const grad = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.4
    );
    grad.addColorStop(0, '#0d0d2b');
    grad.addColorStop(0.5, '#0a0a1f');
    grad.addColorStop(1, '#050510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    drawConnections();

    for (const p of particles) {
      // Move base position
      p.baseX += p.speedX;
      p.baseY += p.speedY;

      // Wrap base edges
      if (p.baseX < 0) p.baseX = width;
      else if (p.baseX > width) p.baseX = 0;
      if (p.baseY < 0) p.baseY = height;
      else if (p.baseY > height) p.baseY = 0;

      // Reset coordinates to base coordinates before cursor-displacement calculation
      p.x = p.baseX;
      p.y = p.baseY;

      // Apply mouse gravity displacement effect
      if (mouse.x !== null) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius; // 0 to 1 force scale
          // Attract stars towards the cursor
          p.x += (dx / dist) * force * 15;
          p.y += (dy / dist) * force * 15;
        }
      }

      // Pulse opacity
      p.pulse += p.pulseSpeed;
      const pulsedOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

      // Draw particle dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `${p.color}${pulsedOpacity})`;
      ctx.fill();

      // Glow for larger particles
      if (p.size > 1.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${pulsedOpacity * 0.15})`;
        ctx.fill();
      }
    }

    animationId = requestAnimationFrame(animate);
  }

  resize();
  createParticles();
  animate();

  const handleResize = () => {
    resize();
    createParticles();
  };

  window.addEventListener('resize', handleResize);

  return {
    destroy() {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    },
  };
}
