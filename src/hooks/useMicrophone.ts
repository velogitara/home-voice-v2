import { useEffect, useRef, useState } from "react";
import type { VoiceStatus } from "../types/voice";

export function useMicrophone() {
    const [errorMessage, setErrorMessage] = useState("");
    const [status, setStatus] = useState<VoiceStatus>("idle");
    const [volume, setVolume] = useState(0);
    const [stream, setStream] = useState<MediaStream | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    const streamRef = useRef<MediaStream | null>(null);

    const startVolumeMonitoring = async (stream: MediaStream) => {
        const audioContext = new AudioContext();

        await audioContext.resume();

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        const data = new Uint8Array(analyser.fftSize);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const updateVolume = () => {
            analyser.getByteTimeDomainData(data);

            let sum = 0;

            for (const sample of data) {
                const normalized = (sample - 128) / 128;
                sum += normalized * normalized;
            }

            const rms = Math.sqrt(sum / data.length);
            const normalizedVolume = Math.min(1, rms * 5);

            setVolume(normalizedVolume);

            animationFrameRef.current = requestAnimationFrame(updateVolume);
        };

        updateVolume();
    };

    const stopVolumeMonitoring = () => {
        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (audioContextRef.current !== null) {
            void audioContextRef.current.close();
            audioContextRef.current = null;
        }

        analyserRef.current = null;
        setVolume(0);
    };
    const startMicrophone = async () => {
        setStatus("requesting");
        setErrorMessage("");

        try {
            const microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            streamRef.current = microphoneStream;
            setStream(microphoneStream);
            await startVolumeMonitoring(microphoneStream);
            setStatus("connected");
        } catch (error) {
            // console.error("Error accessing microphone:", error);
            // setStatus("error");
            // setErrorMessage(
            //     "Microphone access was denied or unavailable. Please check your browser settings and try again.",
            // );
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setStream(null);

            console.error("Error accessing microphone:", error);
            setStatus("error");
            setErrorMessage(
                "Microphone access was denied or unavailable. Please check your browser settings and try again.",
            );
        }
    };
    const stopMicrophone = () => {
        stopVolumeMonitoring();

        streamRef.current?.getTracks().forEach((track) => track.stop());

        streamRef.current = null;
        setStatus("idle");
        setVolume(0);
    };

    const toggleMicrophone = () => {
        if (status === "connected") {
            stopMicrophone();
        } else {
            void startMicrophone();
        }
    };

    useEffect(() => {
        return () => {
            stopVolumeMonitoring();

            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            setStream(null);
        };
    }, []);

    return {
        status,
        errorMessage,
        volume,
        stream,
        toggleMicrophone,
    };
}
