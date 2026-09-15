import { useEffect, useRef, useState } from "react";

type RecorderStatus = "idle" | "recording" | "processing" | "error";

type VoiceTurnResponse = {
    text?: string;
    answer?: string;
    error?: string;
};

export function useVoiceRecorder(stream: MediaStream | null) {
    const [status, setStatus] = useState<RecorderStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [transcript, setTranscript] = useState("");
    const [answer, setAnswer] = useState("");

    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const uploadRecording = async (mimeType: string) => {
        setStatus("processing");
        setErrorMessage("");

        try {
            const audioBlob = new Blob(chunksRef.current, { type: mimeType });

            const formData = new FormData();

            const extension = mimeType.includes("webm") ? "webm" : "m4a";

            formData.append("audio", audioBlob, `voice.${extension}`);

            const response = await fetch(
                "http://localhost:3001/api/voice-turn",
                {
                    method: "POST",
                    body: formData,
                },
            );

            const result = (await response.json()) as VoiceTurnResponse;

            if (!response.ok) {
                throw new Error(result.error ?? "Voice request failed");
            }

            setTranscript(result.text ?? "");
            setAnswer(result.answer ?? "");
            setStatus("idle");
        } catch (error) {
            console.error("Voice turn error:", error);

            setStatus("error");
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not process voice recording",
            );
        }
    };

    const startRecording = () => {
        if (!stream) {
            setStatus("error");
            setErrorMessage("Enable the microphone first");
            return;
        }

        if (typeof MediaRecorder === "undefined") {
            setStatus("error");
            setErrorMessage("MediaRecorder is not supported");
            return;
        }

        const supportedMimeTypes = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
        ];

        const mimeType =
            supportedMimeTypes.find((type) =>
                MediaRecorder.isTypeSupported(type),
            ) ?? "";

        const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);

        chunksRef.current = [];

        recorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        });

        recorder.addEventListener("stop", () => {
            void uploadRecording(recorder.mimeType);
        });

        recorderRef.current = recorder;
        setTranscript("");
        setAnswer("");
        setErrorMessage("");
        setStatus("recording");

        recorder.start();
    };

    const stopRecording = () => {
        const recorder = recorderRef.current;

        if (recorder && recorder.state === "recording") {
            recorder.stop();
        }
    };

    const toggleRecording = () => {
        if (status === "recording") {
            stopRecording();
        } else if (status === "idle" || status === "error") {
            startRecording();
        }
    };

    useEffect(() => {
        return () => {
            const recorder = recorderRef.current;

            if (recorder && recorder.state === "recording") {
                recorder.stop();
            }
        };
    }, []);

    return {
        status,
        errorMessage,
        transcript,
        answer,
        toggleRecording,
    };
}
