import { useEffect, useRef } from "react";

const speechThreshold = 0.035;
const silenceDurationMs = 1_900;
const minimumSpeechDurationMs = 450;

export function useSilenceDetection(
    stream: MediaStream | null,
    enabled: boolean,
    onSilence: () => void,
) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const onSilenceRef = useRef(onSilence);
    const firstSpeechAtRef = useRef<number | null>(null);
    const lastSpeechAtRef = useRef<number | null>(null);

    useEffect(() => {
        onSilenceRef.current = onSilence;
    }, [onSilence]);

    useEffect(() => {
        if (!stream || !enabled) {
            return;
        }

        let cancelled = false;

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 1_024;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const samples = new Uint8Array(analyser.fftSize);

        audioContextRef.current = audioContext;
        firstSpeechAtRef.current = null;
        lastSpeechAtRef.current = null;

        const monitorSilence = () => {
            if (cancelled) {
                return;
            }

            analyser.getByteTimeDomainData(samples);

            let sum = 0;

            for (const sample of samples) {
                const normalized = (sample - 128) / 128;
                sum += normalized * normalized;
            }

            const rms = Math.sqrt(sum / samples.length);
            const now = performance.now();

            if (rms >= speechThreshold) {
                firstSpeechAtRef.current ??= now;
                lastSpeechAtRef.current = now;
            }

            const firstSpeechAt = firstSpeechAtRef.current;
            const lastSpeechAt = lastSpeechAtRef.current;

            if (
                firstSpeechAt !== null &&
                lastSpeechAt !== null &&
                now - firstSpeechAt >= minimumSpeechDurationMs &&
                now - lastSpeechAt >= silenceDurationMs
            ) {
                onSilenceRef.current();
                return;
            }

            animationFrameRef.current = requestAnimationFrame(monitorSilence);
        };

        const startMonitoring = async () => {
            await audioContext.resume();

            if (!cancelled) {
                monitorSilence();
            }
        };

        void startMonitoring();

        return () => {
            cancelled = true;

            if (animationFrameRef.current !== null) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }

            void audioContext.close();

            if (audioContextRef.current === audioContext) {
                audioContextRef.current = null;
            }
        };
    }, [stream, enabled]);
}
