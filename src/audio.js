export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.enabled = true;
    this.secret = false;
    this.nodes = [];
    this.started = false;
  }
  async start() {
    if (!this.enabled) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.055;
      this.musicGain.connect(this.master);
      this.started = true;
      this.setMood(false);
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }
  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.24 : 0, this.ctx.currentTime, 0.08);
  }
  setMood(secret) {
    this.secret = secret;
    if (!this.ctx || !this.musicGain) return;
    for (const n of this.nodes) { try { n.stop?.(); } catch {} }
    this.nodes = [];
    const now = this.ctx.currentTime;
    const freqs = secret ? [43.65, 55, 65.41] : [110, 146.83, 164.81];
    freqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      osc.type = secret ? (i === 1 ? 'sawtooth' : 'triangle') : 'sine';
      osc.frequency.value = freq;
      filter.type = 'lowpass';
      filter.frequency.value = secret ? 230 : 520;
      gain.gain.value = i === 0 ? 0.35 : 0.16;
      osc.connect(filter); filter.connect(gain); gain.connect(this.musicGain);
      osc.start(now);
      this.nodes.push(osc);
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = secret ? 0.09 + i*0.025 : 0.12 + i*0.04;
      lfoGain.gain.value = secret ? 7 : 3;
      lfo.connect(lfoGain); lfoGain.connect(osc.frequency); lfo.start(now);
      this.nodes.push(lfo);
    });
  }
  tone(freq=440, duration=0.12, type='sine', volume=0.18, slide=0) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq+slide), now+duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now+duration);
    osc.connect(gain); gain.connect(this.master);
    osc.start(now); osc.stop(now+duration+0.02);
  }
  sfx(name) {
    const secret = this.secret;
    const map = {
      click:[secret?105:480,0.07,'triangle',0.12,secret?-25:130],
      coin:[secret?650:880,0.12,'sine',0.12,secret?310:330],
      jump:[secret?88:180,0.2,'sawtooth',0.08,secret?300:260],
      nitro:[secret?72:120,0.32,'sawtooth',0.09,secret?450:650],
      hit:[secret?58:95,0.22,'square',0.12,-30],
      boss:[secret?48:75,0.5,'sawtooth',0.14,secret?180:280],
      win:[secret?260:520,0.45,'triangle',0.14,secret?460:680],
      unlock:[secret?130:440,0.7,'sine',0.16,secret?520:880]
    };
    const a = map[name] || map.click;
    this.tone(...a);
  }
}
