/**
 * REHAAN_ENGINE Cinematic Deep Space Fleet Battle Simulation
 * Real-time dogfighting StarShips, laser tracers, shield impacts,
 * shockwave explosions, debris embers, and hyperspace warp streaks.
 */

export class StarShip {
  constructor(system, faction, type, forceSide) {
    this.system = system;
    this.faction = faction; // 'rebel' or 'imperial'
    this.type = type;       // 'cruiser', 'fighter', 'interceptor'
    this.respawn(forceSide);
  }

  respawn(forceSide) {
    this.health = this.type === 'cruiser' ? 300 : (this.type === 'interceptor' ? 45 : 60);
    this.maxHealth = this.health;
    this.isDead = false;
    this.deathTimer = 0;

    const w = this.system.width || window.innerWidth;
    const h = this.system.height || window.innerHeight;

    const fromLeft = forceSide !== undefined ? forceSide : (this.faction === 'rebel');
    this.x = fromLeft ? -100 - Math.random() * 200 : w + 100 + Math.random() * 200;
    this.y = Math.random() * h;
    this.z = this.type === 'cruiser' ? (Math.random() * 800 + 1200) : (Math.random() * 1100 + 400);

    const baseSpeed = this.type === 'cruiser' 
      ? 0.35 + Math.random() * 0.25 
      : (this.type === 'interceptor' ? 2.6 + Math.random() * 0.9 : 1.9 + Math.random() * 0.6);
    this.speed = baseSpeed;
    this.angle = fromLeft ? (Math.random() * 0.5 - 0.25) : (Math.PI + Math.random() * 0.5 - 0.25);
    this.turnSpeed = this.type === 'cruiser' ? 0.003 : 0.035;
    this.reloadTime = this.type === 'cruiser' ? 60 + Math.random() * 50 : 25 + Math.random() * 35;
    this.reloadCooldown = Math.random() * this.reloadTime;

    // Hyperspace warp entry streak
    if (Math.random() < 0.8) {
      this.system.warpStreaks.push({
        x: this.x,
        y: this.y,
        angle: this.angle,
        length: 260 + Math.random() * 180,
        color: this.faction === 'rebel' ? '#38bdf8' : '#fb7185',
        life: 1.0
      });
    }
  }

  update(w, h, scrollDelta) {
    if (this.isDead) return;

    // 3D Parallax shift with virtual camera depth scroll
    this.z -= scrollDelta * 0.18;
    if (this.z < 250) this.z += 1400;
    if (this.z > 2200) this.z -= 1400;

    // Find nearest opposing target to dogfight
    let nearestDist = Infinity;
    let targetShip = null;
    const ships = this.system.ships;

    for (let i = 0; i < ships.length; i++) {
      const other = ships[i];
      if (other !== this && other.faction !== this.faction && !other.isDead) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < nearestDist) {
          nearestDist = dist;
          targetShip = other;
        }
      }
    }

    // Steering logic
    if (targetShip && this.type !== 'cruiser') {
      const desiredAngle = Math.atan2(targetShip.y - this.y, targetShip.x - this.x);
      let diff = desiredAngle - this.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      this.angle += Math.max(-this.turnSpeed, Math.min(this.turnSpeed, diff));
    } else {
      this.angle += (Math.random() - 0.5) * 0.015;
    }

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    // Firing mechanics
    this.reloadCooldown--;
    if (this.reloadCooldown <= 0 && targetShip && nearestDist < (w * 0.75)) {
      this.fire(targetShip);
      this.reloadCooldown = this.reloadTime + Math.random() * 20;
    }

    // Screen edge boundary wrapping
    if (this.x < -350 || this.x > w + 350 || this.y < -250 || this.y > h + 250) {
      this.respawn();
    }
  }

  fire(target) {
    const isRebel = this.faction === 'rebel';
    const laserColor = isRebel ? '#38bdf8' : '#f43f5e';
    const laserGlow = isRebel ? 'rgba(56, 189, 248, 0.85)' : 'rgba(244, 63, 94, 0.85)';
    const angleScatter = (Math.random() - 0.5) * 0.08;
    const fireAngle = this.angle + angleScatter;
    const muzzleDist = this.type === 'cruiser' ? 36 : 14;

    const lx = this.x + Math.cos(this.angle) * muzzleDist;
    const ly = this.y + Math.sin(this.angle) * muzzleDist;

    this.system.lasers.push({
      x: lx,
      y: ly,
      prevX: lx,
      prevY: ly,
      vx: Math.cos(fireAngle) * (isRebel ? 15.5 : 14.8),
      vy: Math.sin(fireAngle) * (isRebel ? 15.5 : 14.8),
      color: laserColor,
      glow: laserGlow,
      faction: this.faction,
      life: 55,
      target: target,
      damage: this.type === 'cruiser' ? 26 : 14
    });

    // Distant spatial audio blaster sound
    if (this.system.audio) {
      const distToCenter = Math.hypot(this.x - (this.system.width / 2), this.y - (this.system.height / 2));
      const distFactor = Math.max(0.1, 1 - distToCenter / 1200);
      this.system.audio.playLaser(this.faction, 0.025 * distFactor);
    }
  }

  takeHit(damage, hitX, hitY) {
    this.health -= damage;
    this.system.createShieldSparks(hitX, hitY, this.faction === 'rebel' ? '#38bdf8' : '#fb7185');

    if (this.health <= 0 && !this.isDead) {
      this.isDead = true;
      this.system.triggerShipExplosion(this.x, this.y, this.type, this.faction);
      setTimeout(() => {
        this.respawn();
      }, 3200 + Math.random() * 3500);
    }
  }

  render(ctx, dpr) {
    if (this.isDead) return;

    const scale = Math.max(0.35, 750 / this.z) * dpr;
    const isRebel = this.faction === 'rebel';

    ctx.save();
    ctx.translate(this.x * dpr, this.y * dpr);
    ctx.rotate(this.angle);
    ctx.scale(scale, scale);

    ctx.shadowBlur = 10 * dpr;
    ctx.shadowColor = isRebel ? 'rgba(56, 189, 248, 0.45)' : 'rgba(244, 63, 94, 0.45)';

    // Engine Thruster Glow Tail
    ctx.beginPath();
    const thrustLen = (this.speed * 6 + Math.random() * 4) * (this.type === 'cruiser' ? 2.5 : 1.5);
    const thrustGrad = ctx.createLinearGradient(-15, 0, -15 - thrustLen, 0);
    thrustGrad.addColorStop(0, isRebel ? '#38bdf8' : '#fb7185');
    thrustGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = thrustGrad;
    ctx.rect(-15 - thrustLen, -3, thrustLen, 6);
    ctx.fill();

    // Vector Chassis
    if (this.type === 'cruiser') {
      ctx.fillStyle = isRebel ? '#13284d' : '#221124';
      ctx.strokeStyle = isRebel ? '#38bdf8' : '#f43f5e';
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      ctx.moveTo(42, 0);
      ctx.lineTo(-32, -22);
      ctx.lineTo(-24, 0);
      ctx.lineTo(-32, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.85;
      ctx.fillRect(-12, -4, 14, 8);
      ctx.globalAlpha = 1.0;

      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-20, 0);
      ctx.strokeStyle = isRebel ? 'rgba(56, 189, 248, 0.8)' : 'rgba(251, 113, 133, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();

    } else if (this.type === 'fighter') {
      ctx.fillStyle = isRebel ? '#0b2447' : '#1b1424';
      ctx.strokeStyle = isRebel ? '#38bdf8' : '#fb7185';
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -4);
      ctx.lineTo(-14, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, -14);
      ctx.lineTo(-14, -14);
      ctx.moveTo(0, 0);
      ctx.lineTo(-6, 14);
      ctx.lineTo(-14, 14);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(3, 0, 1.8, 0, Math.PI * 2);
      ctx.fill();

    } else {
      ctx.fillStyle = isRebel ? '#0e3a5f' : '#2a1120';
      ctx.strokeStyle = isRebel ? '#2dd4bf' : '#f43f5e';
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-10, -12);
      ctx.lineTo(10, -10);
      ctx.lineTo(0, -3);
      ctx.moveTo(-10, 12);
      ctx.lineTo(10, 10);
      ctx.lineTo(0, 3);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export class StarshipBattleSystem {
  constructor(canvasId, audioEngine) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.audio = audioEngine;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.ships = [];
    this.lasers = [];
    this.explosions = [];
    this.warpStreaks = [];

    this.resize();
    this.initFleet();

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
  }

  resize() {
    if (!this.canvas) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
  }

  initFleet() {
    this.ships = [];
    this.lasers = [];
    this.explosions = [];
    this.warpStreaks = [];

    const isMobile = this.width < 768;

    // Rebel Squadrons (Cyan/Teal)
    this.ships.push(new StarShip(this, 'rebel', 'cruiser', true));
    this.ships.push(new StarShip(this, 'rebel', 'fighter', true));
    this.ships.push(new StarShip(this, 'rebel', 'interceptor', true));
    if (!isMobile) {
      this.ships.push(new StarShip(this, 'rebel', 'fighter', true));
      this.ships.push(new StarShip(this, 'rebel', 'interceptor', true));
    }

    // Imperial Squadrons (Crimson/Violet-Red)
    this.ships.push(new StarShip(this, 'imperial', 'cruiser', false));
    this.ships.push(new StarShip(this, 'imperial', 'fighter', false));
    this.ships.push(new StarShip(this, 'imperial', 'interceptor', false));
    if (!isMobile) {
      this.ships.push(new StarShip(this, 'imperial', 'fighter', false));
      this.ships.push(new StarShip(this, 'imperial', 'interceptor', false));
    }
  }

  createShieldSparks(x, y, color) {
    for (let i = 0; i < 6; i++) {
      this.explosions.push({
        type: 'spark',
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        color: color,
        alpha: 1,
        decay: 0.05 + Math.random() * 0.04,
        size: Math.random() * 2 + 1
      });
    }
  }

  triggerShipExplosion(x, y, type, faction) {
    const isCapital = type === 'cruiser';
    const numParticles = isCapital ? 65 : 32;
    const baseColor = faction === 'rebel' ? '#38bdf8' : '#f43f5e';

    // Shockwave Ring
    this.explosions.push({
      type: 'shockwave',
      x: x,
      y: y,
      radius: 4,
      maxRadius: isCapital ? 90 : 45,
      color: '#ffffff',
      alpha: 1,
      decay: isCapital ? 0.02 : 0.035
    });

    // Core Fireball Flash
    this.explosions.push({
      type: 'flash',
      x: x,
      y: y,
      radius: isCapital ? 40 : 20,
      color: '#ffffff',
      alpha: 1,
      decay: 0.08
    });

    // Debris fragments
    for (let i = 0; i < numParticles; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * (isCapital ? 7.5 : 5.0) + 1.2;
      const pColor = Math.random() < 0.35 ? '#ffffff' : (Math.random() < 0.7 ? '#fde047' : baseColor);
      this.explosions.push({
        type: 'debris',
        x: x,
        y: y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: Math.random() * (isCapital ? 3.8 : 2.5) + 0.8,
        color: pColor,
        alpha: 1,
        decay: Math.random() * 0.025 + 0.015
      });
    }

    if (this.audio) {
      const distToCenter = Math.hypot(x - (this.width / 2), y - (this.height / 2));
      const distFactor = Math.max(0.2, 1 - distToCenter / 1400);
      this.audio.playExplosion(isCapital ? 0.09 * distFactor : 0.05 * distFactor);
    }
  }

  updateAndRender(velZ) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dpr = this.dpr;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Hyperspace Warp streaks
    for (let i = this.warpStreaks.length - 1; i >= 0; i--) {
      const streak = this.warpStreaks[i];
      ctx.save();
      ctx.globalAlpha = streak.life * 0.75;
      ctx.strokeStyle = streak.color;
      ctx.lineWidth = 1.8 * dpr;
      ctx.shadowBlur = 12 * dpr;
      ctx.shadowColor = streak.color;
      ctx.beginPath();
      ctx.moveTo((streak.x - Math.cos(streak.angle) * streak.length) * dpr, (streak.y - Math.sin(streak.angle) * streak.length) * dpr);
      ctx.lineTo(streak.x * dpr, streak.y * dpr);
      ctx.stroke();
      ctx.restore();

      streak.life -= 0.05;
      if (streak.life <= 0) this.warpStreaks.splice(i, 1);
    }

    // 2. Ships update & render
    for (let i = 0; i < this.ships.length; i++) {
      const ship = this.ships[i];
      ship.update(w, h, velZ);
      ship.render(ctx, dpr);
    }

    // 3. Lasers update & dogfight hit-detection
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.prevX = laser.x;
      laser.prevY = laser.y;
      laser.x += laser.vx;
      laser.y += laser.vy;
      laser.life--;

      ctx.save();
      ctx.strokeStyle = laser.color;
      ctx.lineWidth = 2.2 * dpr;
      ctx.shadowBlur = 14 * dpr;
      ctx.shadowColor = laser.glow;
      ctx.beginPath();
      ctx.moveTo((laser.prevX - laser.vx * 0.7) * dpr, (laser.prevY - laser.vy * 0.7) * dpr);
      ctx.lineTo(laser.x * dpr, laser.y * dpr);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(laser.x * dpr, laser.y * dpr, 1.4 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      let hit = false;
      for (let j = 0; j < this.ships.length; j++) {
        const target = this.ships[j];
        if (!target.isDead && target.faction !== laser.faction) {
          const dist = Math.hypot(target.x - laser.x, target.y - laser.y);
          const hitRadius = target.type === 'cruiser' ? 38 : 16;
          if (dist < hitRadius) {
            target.takeHit(laser.damage, laser.x, laser.y);
            hit = true;
            break;
          }
        }
      }

      if (hit || laser.life <= 0 || laser.x < -100 || laser.x > w + 100 || laser.y < -100 || laser.y > h + 100) {
        this.lasers.splice(i, 1);
      }
    }

    // 4. Explosions, Shockwaves, Debris
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      ctx.save();

      if (exp.type === 'shockwave') {
        exp.radius += (exp.maxRadius - exp.radius) * 0.14 + 1.2;
        ctx.globalAlpha = Math.max(0, exp.alpha);
        ctx.strokeStyle = exp.color;
        ctx.lineWidth = 2.0 * dpr;
        ctx.shadowBlur = 18 * dpr;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(exp.x * dpr, exp.y * dpr, exp.radius * dpr, 0, Math.PI * 2);
        ctx.stroke();
      } else if (exp.type === 'flash') {
        ctx.globalAlpha = Math.max(0, exp.alpha * 0.85);
        ctx.fillStyle = exp.color;
        ctx.shadowBlur = 30 * dpr;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(exp.x * dpr, exp.y * dpr, exp.radius * dpr, 0, Math.PI * 2);
        ctx.fill();
      } else if (exp.type === 'debris' || exp.type === 'spark') {
        exp.x += exp.vx;
        exp.y += exp.vy;
        exp.vx *= 0.96;
        exp.vy *= 0.96;
        ctx.globalAlpha = Math.max(0, exp.alpha);
        ctx.fillStyle = exp.color;
        ctx.shadowBlur = 8 * dpr;
        ctx.shadowColor = exp.color;
        ctx.beginPath();
        ctx.arc(exp.x * dpr, exp.y * dpr, exp.size * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      exp.alpha -= exp.decay;
      if (exp.alpha <= 0) {
        this.explosions.splice(i, 1);
      }
    }
  }

  destroy() {
    window.removeEventListener('resize', this.resizeHandler);
  }
}
