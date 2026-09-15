/**
 * REHAAN_ENGINE 3D Spatial Universe Coordinate Engine
 * Handles continuous Z-axis navigation, inertia, touch gestures, and HUD synchronizations.
 */

export const LOOP_DISTANCE = 33600;

export const NODES = [
  { id: 'node-0', z: 0, title: 'ENTRY ORBIT' },
  { id: 'node-1', z: 2800, title: 'THE HERO DEVICE' },
  { id: 'node-2', z: 5600, title: 'IDENTITY SPECIFICATION' },
  { id: 'node-3', z: 8400, title: 'ENGINEERING MATRIX' },
  { id: 'node-4', z: 11200, title: 'MYWALLPAPER APP' },
  { id: 'node-5', z: 14000, title: 'MYWALLPAPER ADMIN' },
  { id: 'node-6', z: 16800, title: 'URBAN BITES APP' },
  { id: 'node-7', z: 19600, title: 'URBAN BITES CONSOLE' },
  { id: 'node-8', z: 22400, title: 'FALAH PRO' },
  { id: 'node-9', z: 25200, title: 'FACESENSE & DRC' },
  { id: 'node-10', z: 28000, title: 'EXPERIENCE MATRIX' },
  { id: 'node-11', z: 30800, title: 'THE CORE' },
];

export class SpatialEngine {
  constructor(audioEngine, canvases) {
    this.audio = audioEngine;
    this.canvases = canvases;

    this.targetDepth = 0;
    this.currentDepth = 0;
    this.lastActiveNodeIndex = -1;
    this.indicatorTimeout = null;

    this.isRunning = true;
    this.lastTime = performance.now();

    // Touch momentum tracking
    this.touchStartY = 0;
    this.lastTouchY = 0;
    this.lastTouchTime = 0;
    this.touchVelocity = 0;
    this.isTouchActive = false;

    // Cache DOM references
    this.depthBar = document.getElementById('depth-bar');
    this.depthVal = document.getElementById('depth-val');
    this.destIndicator = document.getElementById('destination-indicator');
    this.destTitle = document.getElementById('destination-title');
    this.teleportDots = document.querySelectorAll('#teleport-nav button');

    this.initInputs();
    this.initVisibility();
    this.startLoop();
  }

  initInputs() {
    // Wheel & Trackpad
    window.addEventListener('wheel', (e) => {
      // Normalize wheel delta across various browsers / mice
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY * 2.2), 650);
      this.targetDepth += delta;
    }, { passive: true });

    // Touch Gestures with Natural Inertial Momentum
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isTouchActive = true;
        this.touchStartY = e.touches[0].clientY;
        this.lastTouchY = this.touchStartY;
        this.lastTouchTime = performance.now();
        this.touchVelocity = 0;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (!this.isTouchActive || e.touches.length !== 1) return;
      const currentY = e.touches[0].clientY;
      const now = performance.now();
      const deltaY = (this.lastTouchY - currentY);
      const dt = Math.max(now - this.lastTouchTime, 1);

      this.touchVelocity = (deltaY / dt) * 16.6; // normalized velocity
      this.targetDepth += deltaY * 3.4;

      this.lastTouchY = currentY;
      this.lastTouchTime = now;
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (this.isTouchActive) {
        this.isTouchActive = false;
        // Apply flick inertia
        if (Math.abs(this.touchVelocity) > 2) {
          const momentum = Math.max(-1200, Math.min(1200, this.touchVelocity * 50));
          this.targetDepth += momentum;
        }
      }
    }, { passive: true });

    // Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        this.targetDepth += 700;
        this.audio.playClick();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        this.targetDepth -= 700;
        this.audio.playClick();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this.jumpToNode(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        this.jumpToNode(11);
      }
    });
  }

  initVisibility() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isRunning = false;
      } else {
        this.isRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((now) => this.renderLoop(now));
      }
    });
  }

  jumpToNode(index) {
    if (NODES[index]) {
      const currentNorm = ((this.currentDepth % LOOP_DISTANCE) + LOOP_DISTANCE) % LOOP_DISTANCE;
      const targetNorm = NODES[index].z;
      let delta = targetNorm - currentNorm;

      if (delta > LOOP_DISTANCE / 2) delta -= LOOP_DISTANCE;
      if (delta < -LOOP_DISTANCE / 2) delta += LOOP_DISTANCE;

      this.targetDepth = this.currentDepth + delta;
      this.audio.playClick();
    }
  }

  stepForward() {
    this.targetDepth += 2800;
    this.audio.playClick();
  }

  notifyDestination(title) {
    if (!this.destIndicator || !this.destTitle) return;

    this.destTitle.innerText = title;
    this.destIndicator.classList.remove('opacity-0', '-translate-y-2');
    this.destIndicator.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(this.indicatorTimeout);
    this.indicatorTimeout = setTimeout(() => {
      if (this.destIndicator) {
        this.destIndicator.classList.remove('opacity-100', 'translate-y-0');
        this.destIndicator.classList.add('opacity-0', '-translate-y-2');
      }
    }, 2400);
  }

  updateTeleportDots(activeIndex) {
    if (!this.teleportDots || this.teleportDots.length === 0) return;
    this.teleportDots.forEach((dot, idx) => {
      if (idx === activeIndex) {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-cyan-300 scale-125 shadow-[0_0_8px_#38bdf8] transition-all duration-300';
        dot.setAttribute('aria-current', 'true');
      } else {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-white/40 hover:bg-white/90 hover:scale-125 transition-all duration-300';
        dot.removeAttribute('aria-current');
      }
    });
  }

  startLoop() {
    const loop = (now) => {
      if (this.isRunning) {
        this.renderLoop(now);
        requestAnimationFrame(loop);
      }
    };
    requestAnimationFrame(loop);
  }

  renderLoop(now) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Smooth exponential inertia lerp
    const diff = this.targetDepth - this.currentDepth;
    this.currentDepth += diff * (1 - Math.pow(0.001, dt * 2.8));

    // Calculate instantaneous velocity for audio and starfield trail
    const instantaneousVelocity = Math.abs(diff);
    this.audio.updateWind(instantaneousVelocity);

    const velZ = diff * 0.09;
    if (this.canvases) {
      this.canvases.render(velZ);
    }

    const loopZ = ((this.currentDepth % LOOP_DISTANCE) + LOOP_DISTANCE) % LOOP_DISTANCE;

    // Update Depth Meter HUD
    if (this.depthBar && this.depthVal) {
      const pct = (loopZ / LOOP_DISTANCE) * 100;
      this.depthBar.style.height = `${pct.toFixed(2)}%`;
      this.depthVal.innerText = `${Math.floor(loopZ).toString().padStart(5, '0')}m`;
    }

    // Strict Zero-Overlap Spatial Isolation Matrix
    let closestDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < NODES.length; i++) {
      const nodeData = NODES[i];
      const el = document.getElementById(nodeData.id);
      if (!el) continue;

      let relativeZ = nodeData.z - loopZ;
      if (relativeZ < -LOOP_DISTANCE / 2) relativeZ += LOOP_DISTANCE;
      if (relativeZ > LOOP_DISTANCE / 2) relativeZ -= LOOP_DISTANCE;

      const absDist = Math.abs(relativeZ);
      if (absDist < closestDistance) {
        closestDistance = absDist;
        closestIndex = i;
      }

      // Spatial isolation window
      if (relativeZ < -550 || relativeZ > 1150) {
        el.style.display = 'none';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        continue;
      }

      el.style.display = 'flex';

      let opacity = 0;
      let scale = 1;

      if (relativeZ >= 0) {
        if (relativeZ > 450) {
          const progress = (1100 - relativeZ) / 650;
          opacity = Math.max(0, Math.min(1, progress));
        } else {
          opacity = 1;
        }
      } else {
        const leaveProgress = (550 - Math.abs(relativeZ)) / 550;
        opacity = Math.max(0, Math.min(1, leaveProgress));
      }

      // Node 1 smooth portal dive expansion
      if (nodeData.id === 'node-1') {
        if (relativeZ < 250 && relativeZ > -500) {
          const enterProgress = (250 - relativeZ) / 750;
          scale = 1 + enterProgress * 2.2;
        }
      }

      el.style.transform = `translate(-50%, -50%) translate3d(0px, 0px, ${-relativeZ}px) scale(${scale})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = Math.round(1000 - Math.min(absDist, 999));

      if (absDist < 600 && opacity > 0.7) {
        el.style.pointerEvents = 'auto';
      } else {
        el.style.pointerEvents = 'none';
      }
    }

    // Active node notification & teleport dot synchronization
    if (closestIndex !== this.lastActiveNodeIndex) {
      this.lastActiveNodeIndex = closestIndex;
      this.updateTeleportDots(closestIndex);
      if (closestDistance < 400) {
        this.notifyDestination(NODES[closestIndex].title);
      }
    }
  }
}
