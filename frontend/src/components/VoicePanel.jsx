import React, { useEffect, useMemo, useRef, useState } from 'react';
import { STTManager } from '../speechSTT';
import { speakText, stopSpeaking } from '../speechTTS';
import { sendToAI } from '../api';
import { getClientId } from '../clientId';

// Lightweight styles for testing. Easy to remove.
const styles = {
	panel: {
		border: '1px dashed var(--border,#ccc)',
		padding: '0.75rem',
		borderRadius: 8,
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5rem',
		background: 'rgba(0,0,0,0.02)'
	},
	row: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' },
	btn: {
		padding: '0.4rem 0.8rem',
		borderRadius: 6,
		border: '1px solid #ccc',
		background: '#fff',
		cursor: 'pointer'
	},
	transcript: {
		maxHeight: 140,
		overflowY: 'auto',
		background: '#fff',
		border: '1px solid #eee',
		borderRadius: 6,
		padding: '0.5rem',
		fontSize: 14
	},
	label: { fontWeight: 600 }
};

export default function VoicePanel({ onAiSpeakingChange, onTranscriptChange }) {
	const stt = useRef(null);
	const [running, setRunning] = useState(false);
	const [partial, setPartial] = useState('');
	const [turns, setTurns] = useState([]); // {role:'user'|'ai', content}
	const [showTranscript, setShowTranscript] = useState(true);
	const [lang, setLang] = useState('en-US');
	const [busy, setBusy] = useState(false);

	// A generation counter for AI TTS so partial speech won't resume after interrupt
	const speakGenRef = useRef(0);

	// Notify parent component when transcript changes
	useEffect(() => {
		onTranscriptChange?.(turns);
	}, [turns, onTranscriptChange]);

		const turnsRef = useRef(turns);
		useEffect(() => { turnsRef.current = turns; }, [turns]);

		useEffect(() => {
			stt.current = new STTManager();
			stt.current.onRunningChange = setRunning;
			// Do not use raw speechStart event to avoid echo false-positives
			stt.current.onSpeechStart = null;
			stt.current.onPartial = async (text) => {
				// When the user starts talking and AI is talking, stop AI immediately and advance generation
				if (text && text.trim().length > 0) {
					// Interrupt any ongoing TTS; mark a new generation so previous won't resume
					speakGenRef.current += 1;
					onAiSpeakingChange?.(false);
					await stopSpeaking();
				}
				setPartial(text);
			};
			stt.current.onFinalResult = async (text) => {
				// Add user turn
				setTurns((t) => [...t, { role: 'user', content: text }]);
				setPartial('');
				// Ask AI then speak it
				try {
					setBusy(true);
					const hist = turnsRef.current;
						const { text: aiText } = await sendToAI([...hist, { role: 'user', content: text }], getClientId());
						const out = (aiText || '').trim();
						setTurns((t) => [...t, { role: 'ai', content: out }]);
						if (out) {
							// Capture generation at time of start; if user speaks again we won't resume
							const myGen = ++speakGenRef.current;
							await new Promise((resolve) => {
								speakText(out, {
									onStart: () => {
										// Only mark speaking if still same generation
										if (speakGenRef.current === myGen) onAiSpeakingChange?.(true);
									},
									onEnd: () => {
										if (speakGenRef.current === myGen) onAiSpeakingChange?.(false);
										resolve();
									},
									onError: () => {
										if (speakGenRef.current === myGen) onAiSpeakingChange?.(false);
										resolve();
									},
								});
							});
						} else {
							onAiSpeakingChange?.(false);
						}
				} catch (e) {
					console.error('AI or TTS error', e);
				} finally {
					setBusy(false);
				}
			};
			return () => {
				stt.current?.stop?.();
				stt.current = null;
			};
		}, []);

	const toggle = async () => {
		if (!stt.current) return;
		if (running) await stt.current.stop();
		else await stt.current.start(lang);
	};

	const transcriptBody = useMemo(() => {
		const last = partial ? [{ role: 'user', content: partial + ' …' }] : [];
		return [...turns, ...last];
	}, [turns, partial]);

	return (
		<div style={styles.panel}>
			<div style={styles.row}>
				<span style={styles.label}>Voice (test):</span>
				<button style={styles.btn} onClick={toggle} disabled={busy}>
					{running ? 'Stop mic' : 'Start mic'}
				</button>
				<button style={styles.btn} onClick={() => setShowTranscript(s => !s)}>
					{showTranscript ? 'Hide transcript' : 'Show transcript'}
				</button>
				<label>
					<span style={{ marginRight: 6 }}>Lang</span>
					<select value={lang} onChange={e => setLang(e.target.value)}>
						<option value="en-US">English (US)</option>
						<option value="en-GB">English (UK)</option>
						<option value="fr-FR">French</option>
						<option value="de-DE">German</option>
						<option value="es-ES">Spanish</option>
					</select>
				</label>
				{busy && <span aria-live="polite">Thinking…</span>}
			</div>

			{showTranscript && (
				<div style={styles.transcript} aria-live="polite">
					{transcriptBody.length === 0 ? (
						<div style={{ opacity: 0.6 }}>Transcript will appear here…</div>
					) : (
						transcriptBody.map((t, i) => (
							<div key={i}>
								<strong>{t.role === 'user' ? 'You' : 'AI'}:</strong> {t.content}
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
}
