import { getSpeechToken } from './api.js';

// Robust STT manager with a tiny state machine to avoid close-on-null races.
// States: "idle" | "starting" | "running" | "stopping"
export class STTManager {
  constructor() {
    this.recognizer = null;
    this.status = 'idle';
    this.onFinalResult = null; // callback(text) when a final segment is recognized
    this.onRunningChange = null; // callback(boolean)
    this.onPartial = null; // callback(text)
  }

  async createRecognizer(language) {
    const data = await getSpeechToken();
    const speechConfig = window.SpeechSDK.SpeechConfig.fromAuthorizationToken(data.token, data.region);
    speechConfig.speechRecognitionLanguage = language || 'en-US';
    // Optional advanced tuning examples:
    // speechConfig.setProperty(window.SpeechSDK.PropertyId.Speech_SegmentationStrategy, 'Semantic');
    // speechConfig.setProperty(window.SpeechSDK.PropertyId.Speech_SegmentationSilenceTimeoutMs, '500');

    const audioConfig = window.SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new window.SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    return recognizer;
  }

  attach(rec) {
    const R = window.SpeechSDK.ResultReason;

    rec.recognizing = (s, e) => {
      if (e && e.result && e.result.reason === R.RecognizingSpeech) {
        const text = e.result.text || '';
        this.onPartial?.(text);
      }
    };

    rec.recognized = (s, e) => {
      if (!e || !e.result) return;
      const reason = e.result.reason;
      if (reason === R.RecognizedSpeech) {
        const finalText = e.result.text || '';
        if (finalText) this.onFinalResult?.(finalText);
      }
    };

    rec.canceled = () => {
      this.safeTeardownFromEvent('canceled');
    };

    rec.sessionStopped = () => {
      this.safeTeardownFromEvent('stopped');
    };
  }

  detach(rec) {
    if (!rec) return;
    rec.recognizing = null;
    rec.recognized = null;
    rec.canceled = null;
    rec.sessionStopped = null;
  }

  safeTeardownFromEvent() {
    const rec = this.recognizer;
    this.recognizer = null;
    this.status = 'idle';
    try { if (rec && typeof rec.close === 'function') rec.close(); } catch (_) {}
    this.onRunningChange?.(false);
  }

  async start(language) {
    if (this.status !== 'idle') return;
    this.status = 'starting';
    try {
      const rec = await this.createRecognizer(language);
      this.recognizer = rec;
      this.attach(rec);

      await new Promise((resolve, reject) => {
        try {
          rec.startContinuousRecognitionAsync(resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
      if (this.status !== 'starting') return;
      this.status = 'running';
      this.onRunningChange?.(true);
    } catch (e) {
      this.status = 'idle';
      this.onRunningChange?.(false);
      throw e;
    }
  }

  async stop() {
    if (this.status !== 'running' || !this.recognizer) {
      this.onRunningChange?.(false);
      this.status = 'idle';
      return;
    }
    this.status = 'stopping';
    const rec = this.recognizer;
    return new Promise((resolve) => {
      try {
        rec.stopContinuousRecognitionAsync(
          () => {
            this.detach(rec);
            try { rec.close?.(); } catch (_) {}
            if (this.recognizer === rec) this.recognizer = null;
            this.status = 'idle';
            this.onRunningChange?.(false);
            resolve();
          },
          () => {
            // Even on error, ensure we reset
            this.detach(rec);
            try { rec.close?.(); } catch (_) {}
            if (this.recognizer === rec) this.recognizer = null;
            this.status = 'idle';
            this.onRunningChange?.(false);
            resolve();
          }
        );
      } catch (_) {
        this.detach(rec);
        try { rec.close?.(); } catch (_) {}
        if (this.recognizer === rec) this.recognizer = null;
        this.status = 'idle';
        this.onRunningChange?.(false);
        resolve();
      }
    });
  }
}
