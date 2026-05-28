// cosmos.js — decorative particle background animation
export function initCosmos(canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');

  let width, height;
  let particles = [];
  let animationId;

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
        size: randomBetween(0.5, 2.5),
        speedX: randomBetween(-0.3, 0.3),
        speedY: randomBetween(-0.3, 0.3),
        opacity: randomBetween(0.2, 1.0),
        pulse: randomBetween(0, Math.PI * 2),
        pulseSpeed: randomBetween(0.005, 0.025),
        color: pickColor(),
      });
    }
  }

  function drawConnections() {
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
      // Move
      p.x += p.speedX;
      p.y += p.speedY;

      // Wrap around edges
      if (p.x < 0) p.x = width;
      else if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      else if (p.y > height) p.y = 0;

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

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });

  return {
    destroy() {
      cancelAnimationFrame(animationId);
    },
  };
}
