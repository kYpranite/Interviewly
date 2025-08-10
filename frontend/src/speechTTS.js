import { getSpeechToken } from './api.js';

let synthesizer = null;

export async function initSynthesizer() {
  if (synthesizer) return synthesizer;
  const data = await getSpeechToken();
  const speechConfig = window.SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
  // Voice + compressed output for smooth streaming to an <audio> element we control
  speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural';
  speechConfig.speechSynthesisOutputFormat = window.SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
  // Use default speaker output for reliable audible playback; we drive the UI timing ourselves
  const audioConfig = window.SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
  synthesizer = new window.SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
  return synthesizer;
}

export async function speakText(text, { onStart, onEnd, onError } = {}) {
  if (!text) return;
  try {
    const synth = await initSynthesizer();
    // Drive UI from synthesis start and an estimated duration based on audio bytes
    let done = false;
    const clear = () => { done = true; };

    synth.synthesisStarted = () => { try { onStart?.(); } catch (_) {} };
    synth.synthesisCanceled = (s, e) => { if (!done) { try { onError?.(e); } finally { clear(); } } };
    synth.synthesisCompleted = () => { /* we'll also use duration estimate below */ };

    synth.speakTextAsync(
      text,
      (result) => {
        try {
          // Estimate duration from mp3 size @ 48 kbps (6000 bytes/sec)
          const bytes = result?.audioData;
          const byteLen = (bytes && bytes.byteLength) || 0;
          if (byteLen > 0) {
            const durationMs = Math.max(350, Math.ceil(byteLen / 6000 * 1000));
            setTimeout(() => { if (!done) { try { onEnd?.(); } finally { clear(); } } }, durationMs + 120);
          } else {
            // Fallback: end shortly after completion
            setTimeout(() => { if (!done) { try { onEnd?.(); } finally { clear(); } } }, 400);
          }
        } catch (err) {
          if (!done) { try { onError?.(err); } finally { clear(); } }
        }
      },
      err => { if (!done) { try { onError?.(err); } finally { clear(); } } }
    );
  } catch (e) {
    onError?.(e);
  }
}

export function disposeSynthesizer() {
  try {
    synthesizer?.close?.();
  } catch (_) {}
  synthesizer = null;
}
