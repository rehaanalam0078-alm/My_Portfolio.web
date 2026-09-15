/**
 * REHAAN_ENGINE High-DPI Spatial Starfield & Atmospheric Nebular Dust System
 * Multi-depth parallax stars, streamer trails, and dynamic transit fog corridors.
 */

export class SpatialCanvases {
  constructor(starCanvasId, atmosCanvasId) {
    this.starCanvas = document.getElementById(starCanvasId);
    this.atmosCanvas = document.getElementById(atmosCanvasId);
    this.starCtx = this.starCanvas ? this.starCanvas.getContext('2d') : null;
    this.atmosCtx = this.atmosCanvas ? this.atmosCanvas.getContext('2d') : null;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.stars = [];
    this.dustParticles = [];

    // Quality tiering based on device screen size and hardware capabilities
    this.isMobile = window.innerWidth < 768;
    this.numStars = this.isMobile ? 500 : 1100;
    this.numDust = this.isMobile ? 40 : 80;

    this.initStars();
    this.initDust();
    this.resize();

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  resize() {
    if (!this.starCanvas || !this.atmosCanvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.isMobile = this.width < 768;

    const targetStars = this.isMobile ? 500 : 1100;
    if (this.stars.length !== targetStars) {
      this.numStars = targetStars;
      this.numDust = this.isMobile ? 40 : 80;
      this.initStars();
      this.initDust();
    }

    // High-DPI canvas buffer scaling
    this.starCanvas.width = Math.floor(this.width * this.dpr);
    this.starCanvas.height = Math.floor(this.height * this.dpr);
    this.starCanvas.style.width = `${this.width}px`;
    this.starCanvas.style.height = `${this.height}px`;

    this.atmosCanvas.width = Math.floor(this.width * this.dpr);
    this.atmosCanvas.height = Math.floor(this.height * this.dpr);
    this.atmosCanvas.style.width = `${this.width}px`;
    this.atmosCanvas.style.height = `${this.height}px`;
  }

  initStars() {
    this.stars = [];
    const colorPalette = [
      '#ffffff', '#ffffff', '#e0f2fe', '#bae6fd', 
      '#38bdf8', '#00f2fe', '#2dd4bf', '#818cf8'
    ];

    for (let i = 0; i < this.numStars; i++) {
      const zVal = Math.random() * 2400 + 40;
      this.stars.push({
        x: (Math.random() - 0.5) * this.width * 3.2,
        y: (Math.random() - 0.5) * this.height * 3.2,
        z: zVal,
        origZ: zVal,
        radius: Math.random() < 0.7 ? (Math.random() * 1.2 + 0.5) : (Math.random() * 2.0 + 1.1),
        alpha: Math.random() * 0.5 + 0.5,
        color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
        twinkleSpeed: Math.random() * 0.05 + 0.015,
        twinklePhase: Math.random() * Math.PI * 2,
        isStreamer: Math.random() < 0.22
      });
    }
  }

  initDust() {
    this.dustParticles = [];
    for (let i = 0; i < this.numDust; i++) {
      this.dustParticles.push({
        x: (Math.random() - 0.5) * this.width * 2.2,
        y: (Math.random() - 0.5) * this.height * 2.2,
        z: Math.random() * 3200,
        radius: Math.random() * 220 + 70,
        alpha: Math.random() * 0.05 + 0.02,
        hue: Math.random() > 0.45 ? 195 : (Math.random() > 0.5 ? 175 : 230)
      });
    }
  }

  render(velZ, transitFactor = 0) {
    if (!this.starCtx || !this.atmosCtx) return;

    const dpr = this.dpr;
    const w = this.starCanvas.width;
    const h = this.starCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const speedFactor = Math.abs(velZ);

    // 1. Render Multi-depth Starfield
    this.starCtx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      // Multi-tier speed: near stars move fast, mid stars medium, far stars slow
      const depthMultiplier = star.origZ < 700 ? 2.6 : (star.origZ < 1500 ? 1.4 : 0.65);
      star.z -= depthMultiplier * (velZ * 0.45 + 1.5);

      if (star.z < 25) {
        star.z += 2400;
      } else if (star.z > 2425) {
        star.z -= 2400;
      }

      star.twinklePhase += star.twinkleSpeed;
      const twinkle = (Math.sin(star.twinklePhase) + 1) * 0.25 + 0.6;

      const k = (460 * dpr) / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      if (px >= -20 && px <= w + 20 && py >= -20 && py <= h + 20) {
        const size = Math.max(0.5 * dpr, star.radius * k * 1.05);
        const alpha = Math.min(1, Math.max(0.2, (1 - star.z / 2400) * star.alpha * twinkle));

        this.starCtx.fillStyle = star.color;
        this.starCtx.globalAlpha = alpha;

        // Streamer trails when camera moves
        if ((speedFactor > 1.2 || star.isStreamer) && star.z < 1600) {
          const trailLength = Math.min(45, (velZ * 0.85 + 2.8) * (1800 / star.z));
          const prevK = (460 * dpr) / (star.z + trailLength * 8);
          const prevPx = star.x * prevK + cx;
          const prevPy = star.y * prevK + cy;

          this.starCtx.lineWidth = Math.max(0.6 * dpr, size * 0.85);
          this.starCtx.strokeStyle = star.color;
          this.starCtx.beginPath();
          this.starCtx.moveTo(px, py);
          this.starCtx.lineTo(prevPx, prevPy);
          this.starCtx.stroke();
        }

        this.starCtx.beginPath();
        this.starCtx.arc(px, py, size, 0, Math.PI * 2);
        this.starCtx.fill();
      }
    }
    this.starCtx.globalAlpha = 1.0;

    // 2. Render Atmospheric Nebular Fog with Transit Modulation
    this.atmosCtx.clearRect(0, 0, w, h);

    // Fog boost in the corridor between destinations
    const fogDensityMultiplier = 1.0 + transitFactor * 0.8;

    for (let i = 0; i < this.dustParticles.length; i++) {
      const p = this.dustParticles[i];
      p.z = ((p.z - (velZ * 0.5 + 1.0)) % 3200 + 3200) % 3200;
      const k = (360 * dpr) / (p.z + 100);
      const px = p.x * k + cx;
      const py = p.y * k + cy;

      if (px >= -250 && px <= w + 250 && py >= -250 && py <= h + 250) {
        const radius = p.radius * k * (1.0 + transitFactor * 0.3);
        const grad = this.atmosCtx.createRadialGradient(px, py, 0, px, py, radius);
        const alpha = p.alpha * (1 - p.z / 3200) * fogDensityMultiplier;

        grad.addColorStop(0, `hsla(${p.hue}, 90%, 65%, ${Math.min(0.22, alpha * 1.3)})`);
        grad.addColorStop(0.6, `hsla(${p.hue + 15}, 80%, 50%, ${Math.min(0.12, alpha * 0.5)})`);
        grad.addColorStop(1, 'transparent');

        this.atmosCtx.fillStyle = grad;
        this.atmosCtx.beginPath();
        this.atmosCtx.arc(px, py, radius, 0, Math.PI * 2);
        this.atmosCtx.fill();
      }
    }
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
  }
}
