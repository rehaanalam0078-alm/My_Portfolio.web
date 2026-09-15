/**
 * REHAAN_ENGINE Main Application Controller
 * Connects spatial engine, audio engine, HUD telemetry, and interactive elements.
 */

import { SpatialAudioEngine } from './audio.js';
import { SpatialCanvases } from './starfield.js';
import { SpatialEngine } from './spatial-engine.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Subsystems
  const audio = new SpatialAudioEngine();
  const canvases = new SpatialCanvases('starfield-canvas', 'atmosphere-canvas');
  const spatialEngine = new SpatialEngine(audio, canvases);

  // Expose global controller for debugging / external calls
  window.REHAAN_ENGINE = {
    audio,
    canvases,
    spatialEngine,
    jumpToNode: (i) => spatialEngine.jumpToNode(i)
  };

  // Audio Autoplay Policy Unlocking
  const unlockAudio = () => {
    audio.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('wheel', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('wheel', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });

  // Synthesize UI Click Sound on Interactive Elements
  document.addEventListener('click', (e) => {
    const interactive = e.target.closest('button, a, [role="button"], .spatial-interactive-btn');
    if (interactive) {
      audio.playClick();
    }
  });

  // Setup Audio HUD Toggle Button
  const audioToggleBtn = document.getElementById('audio-toggle-btn');
  const audioBtnLabel = document.getElementById('audio-btn-label');
  const audioIndicatorDot = document.getElementById('audio-indicator-dot');

  const updateAudioUI = (enabled) => {
    if (!audioToggleBtn || !audioBtnLabel || !audioIndicatorDot) return;
    if (enabled) {
      audioBtnLabel.innerText = 'AUDIO: ON';
      audioIndicatorDot.className = 'w-2 h-2 rounded-full bg-cyan-400 animate-pulse';
      audioToggleBtn.classList.remove('opacity-50');
      audioToggleBtn.setAttribute('aria-pressed', 'true');
    } else {
      audioBtnLabel.innerText = 'AUDIO: OFF';
      audioIndicatorDot.className = 'w-2 h-2 rounded-full bg-slate-500';
      audioToggleBtn.classList.add('opacity-50');
      audioToggleBtn.setAttribute('aria-pressed', 'false');
    }
  };

  // Set initial UI according to stored state
  updateAudioUI(audio.isEnabled);

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newState = audio.toggle();
      updateAudioUI(newState);
    });
  }

  // Connect Teleport Coordinate Navigation Dots
  const teleportNav = document.getElementById('teleport-nav');
  if (teleportNav) {
    const dots = teleportNav.querySelectorAll('button');
    dots.forEach((dot) => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeIndex = parseInt(dot.getAttribute('data-node-index'), 10);
        if (!isNaN(nodeIndex)) {
          spatialEngine.jumpToNode(nodeIndex);
        }
      });
    });
  }

  // Connect In-World Portal and Flow CTAs
  const enterPortalBtn = document.getElementById('cta-enter-portal');
  if (enterPortalBtn) {
    enterPortalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      spatialEngine.jumpToNode(1);
    });
  }

  const travelForwardBtn = document.getElementById('cta-travel-forward');
  if (travelForwardBtn) {
    travelForwardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      spatialEngine.jumpToNode(3);
    });
  }

  const cycleUniverseBtn = document.getElementById('cta-cycle-universe');
  if (cycleUniverseBtn) {
    cycleUniverseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      spatialEngine.jumpToNode(0);
    });
  }

  // Telemetry Toast Notification system for missing links / action triggers
  const showTelemetryNotice = (message) => {
    let toast = document.getElementById('telemetry-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'telemetry-toast';
      toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/95 border border-cyan-400/60 shadow-[0_0_20px_rgba(56,189,248,0.35)] flex items-center gap-2.5 pointer-events-none transition-all duration-300 opacity-0 translate-y-4';
      toast.innerHTML = `
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        <span id="telemetry-toast-msg" class="font-mono text-xs text-cyan-200 font-bold tracking-wider"></span>
      `;
      document.body.appendChild(toast);
    }
    const msgEl = document.getElementById('telemetry-toast-msg');
    if (msgEl) msgEl.innerText = message;
    toast.classList.remove('opacity-0', 'translate-y-4');
    toast.classList.add('opacity-100', 'translate-y-0');

    clearTimeout(window.__toastTimeout);
    window.__toastTimeout = setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-4');
    }, 2800);
  };

  window.showTelemetryNotice = showTelemetryNotice;
});
