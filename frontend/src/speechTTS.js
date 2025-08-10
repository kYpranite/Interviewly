import { getSpeechToken } from './api.js';

let synthesizer = null;
let audioDest = null; // Speaker destination we can close to stop playback immediately
// Track the currently active speech so we can cancel/avoid stale callbacks
let current = null; // { id, timeoutId, settled, canceled, cancelFn, synth, dest }

export async function initSynthesizer() {
  if (synthesizer) return synthesizer;
  const data = await getSpeechToken();
  const speechConfig = window.SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
  // Voice + compressed output for smooth streaming to an <audio> element we control
  speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
  // Use MP3 which is widely reliable with default speaker output
  speechConfig.speechSynthesisOutputFormat = window.SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
  // Use default speaker output for reliable audible playback; we drive the UI timing ourselves
  try { audioDest?.close?.(); } catch (_) {}
  audioDest = new window.SpeechSDK.SpeakerAudioDestination();
  const audioConfig = window.SpeechSDK.AudioConfig.fromSpeakerOutput(audioDest);
  synthesizer = new window.SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
  return synthesizer;
}

export async function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!text) return;
  try {
    const synth = await initSynthesizer();
    // Mark this speech as current
    const id = Math.random().toString(36).slice(2);
    // Cancel any previous pending timeout
    if (current?.timeoutId) {
      clearTimeout(current.timeoutId);
    }
  current = { id, timeoutId: null, settled: false, canceled: false, cancelFn: null, synth, dest: audioDest };

    // Trigger onStart on first of synthesisStarted/synthesizing
    let started = false;
  const startOnce = () => {
      if (started) return;
      if (current?.id !== id || current?.settled) return;
      started = true;
      try { onStart?.(); } catch (_) {}
    };
    synth.synthesisStarted = startOnce;
    synth.synthesizing = startOnce;
    synth.synthesisCanceled = (s, e) => {
      if (current?.id !== id || current?.settled) return;
      current.settled = true;
      if (current.timeoutId) { clearTimeout(current.timeoutId); current.timeoutId = null; }
      try { onError?.(e); } catch (_) {}
    };
    synth.synthesisCompleted = () => { /* no-op; handled in result callback */ };

    synth.speakTextAsync(
      text,
      (result) => {
        if (current?.id !== id || current?.settled) return;
        try {
          // Estimate duration from mp3 size @ 48 kbps (6000 bytes/sec)
          const bytes = result?.audioData;
          const byteLen = (bytes && bytes.byteLength) || 0;
          let delayMs = 400;
          if (byteLen > 0) {
            delayMs = Math.max(350, Math.ceil(byteLen / 6000 * 1000)) + 100; // small buffer
          }
          current.timeoutId = setTimeout(() => {
            if (!current || current.id !== id || current.settled) return;
            current.settled = true;
            current.timeoutId = null;
            try { onEnd?.(); } catch (_) {}
          }, delayMs);
        } catch (err) {
          if (!current || current.id !== id || current.settled) return;
          current.settled = true;
          if (current.timeoutId) { clearTimeout(current.timeoutId); current.timeoutId = null; }
          try { onError?.(err); } catch (_) {}
        }
      },
      err => {
        if (!current || current.id !== id || current.settled) return;
        current.settled = true;
        if (current.timeoutId) { clearTimeout(current.timeoutId); current.timeoutId = null; }
        try { onError?.(err); } catch (_) {}
      }
    );

    // Provide a cancel function used by stopSpeaking to resolve awaiting flows
    current.cancelFn = () => {
      if (!current || current.id !== id || current.settled) return;
      current.settled = true;
      if (current.timeoutId) { clearTimeout(current.timeoutId); current.timeoutId = null; }
      try { onError?.(new Error('stopped')); } catch (_) {}
    };
  } catch (e) {
    onError?.(e);
  }
}

export function disposeSynthesizer() {
  try {
    synthesizer?.close?.();
  } catch (_) {}
  synthesizer = null;
  try { audioDest?.close?.(); } catch (_) {}
  audioDest = null;
}

export async function stopSpeaking() {
  // Gracefully stop current speech and prevent pending timeouts from firing
  try {
    if (current?.timeoutId) {
      clearTimeout(current.timeoutId);
      current.timeoutId = null;
    }
    // Signal cancellation to any awaiting logic
    try { current?.cancelFn?.(); } catch (_) {}
    // Close the specific destination first (halts sound output immediately)
    try { current?.dest?.pause?.(); } catch (_) {}
    try { current?.dest?.close?.(); } catch (_) {}
    if (synthesizer || current?.synth) {
      await new Promise((resolve) => {
        try { (current?.synth || synthesizer).stopSpeakingAsync(() => resolve(), () => resolve()); }
        catch (_) { resolve(); }
      });
      // Close and null to forcefully end any buffered playback on some platforms
      try { (current?.synth || synthesizer).close?.(); } catch (_) {}
      synthesizer = null;
    }
    // Close the global and current speaker destinations to be safe
    try { audioDest?.pause?.(); } catch (_) {}
    try { audioDest?.close?.(); } catch (_) {}
    audioDest = null;
    current = null;
  } catch (_) { /* swallow */ }
}
