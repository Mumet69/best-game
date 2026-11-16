// All sound is synthesized with WebAudio — no audio files, no network.
// Short oscillator blips for shots, hits and pickups, plus a quiet generative
// music loop (a pentatonic arpeggio over a soft drone) that starts on the
// first user gesture, as browsers require.
export function createAudio() {
  let context = null;
  let master = null;
  let musicGain = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  // A lazy pentatonic line: C major pentatonic over two octaves.
  const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return true;
    }
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      musicGain = context.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      // A soft drone under everything.
      const drone = context.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 65.41;
      const droneGain = context.createGain();
      droneGain.gain.value = 0.05;
      drone.connect(droneGain);
      droneGain.connect(musicGain);
      drone.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone({ type = 'sine', from = 440, to = null, seconds = 0.12, volume = 0.2, when = 0 }) {
    if (!context || muted) return;
    const start = context.currentTime + when;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + seconds + 0.02);
  }

  function startMusic() {
    if (musicTimer !== null) return;
    musicTimer = window.setInterval(() => {
      if (muted || !context) return;
      // Walk the scale; every eighth step rests, every fourth steps down.
      step += 1;
      if (step % 8 === 0) return;
      const note = SCALE[(step * 3 + Math.floor(step / 4)) % SCALE.length];
      tone({ type: 'triangle', from: note, seconds: 0.5, volume: 0.07 });
      if (step % 4 === 0) tone({ type: 'sine', from: note / 2, seconds: 0.9, volume: 0.05 });
    }, 340);
  }

  return {
    // Call from the first click or keypress; safe to call any time.
    unlock() {
      if (ensure()) startMusic();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone({ type: 'square', from: 880, to: 520, seconds: 0.07, volume: 0.08 });
    },
    enemyHit() {
      tone({ type: 'triangle', from: 320, to: 180, seconds: 0.08, volume: 0.12 });
    },
    enemyDie() {
      tone({ type: 'sawtooth', from: 220, to: 40, seconds: 0.18, volume: 0.14 });
      tone({ type: 'sine', from: 660, to: 990, seconds: 0.12, volume: 0.08, when: 0.02 });
    },
    playerHit() {
      tone({ type: 'sawtooth', from: 160, to: 50, seconds: 0.3, volume: 0.25 });
    },
    shard() {
      tone({ type: 'sine', from: 1180, to: 1560, seconds: 0.09, volume: 0.1 });
    },
    heart() {
      tone({ type: 'sine', from: 523, to: 784, seconds: 0.25, volume: 0.16 });
      tone({ type: 'sine', from: 784, to: 1046, seconds: 0.2, volume: 0.12, when: 0.1 });
    },
    wave() {
      tone({ type: 'triangle', from: 392, seconds: 0.16, volume: 0.16 });
      tone({ type: 'triangle', from: 523, seconds: 0.16, volume: 0.16, when: 0.14 });
      tone({ type: 'triangle', from: 659, seconds: 0.28, volume: 0.16, when: 0.28 });
    },
    boss() {
      tone({ type: 'sawtooth', from: 98, to: 49, seconds: 0.7, volume: 0.2 });
      tone({ type: 'sawtooth', from: 147, to: 73, seconds: 0.7, volume: 0.14, when: 0.1 });
    },
    buy() {
      tone({ type: 'sine', from: 784, seconds: 0.1, volume: 0.14 });
      tone({ type: 'sine', from: 1174, seconds: 0.18, volume: 0.14, when: 0.08 });
    },
    denied() {
      tone({ type: 'square', from: 180, to: 120, seconds: 0.12, volume: 0.1 });
    },
    victory() {
      [523, 659, 784, 1046].forEach((note, index) => {
        tone({ type: 'triangle', from: note, seconds: 0.4, volume: 0.16, when: index * 0.16 });
      });
    },
  };
}
