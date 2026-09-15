import "./App.css";
import { useState, useEffect } from "react";
import { useMicrophone } from "./hooks/useMicrophone";
import { StatusBadge } from "./components/StatusBadge";
import { SessionButton } from "./components/SessionButton";
import { VolumeMeter } from "./components/VolumeMeter";
import { useVoiceRecorder } from "./hooks/useVoiceRecorder";
import { useSilenceDetection } from "./hooks/useSilenceDetection";
function App() {
    const { status, errorMessage, volume, stream, toggleMicrophone } =
        useMicrophone();
    const {
        status: recorderStatus,
        errorMessage: recorderError,
        transcript,
        answer,
        toggleRecording,
        stopRecording,
    } = useVoiceRecorder(stream);
    useSilenceDetection(stream, recorderStatus === "recording", stopRecording);

    const recordButtonLabel =
        recorderStatus === "recording"
            ? "Stop recording"
            : recorderStatus === "processing"
              ? "Processing..."
              : "Record voice";

    const isConnected = status === "connected";
    const isError = status === "error";

    const [serverStatus, setServerStatus] = useState("Checking server...");

    useEffect(() => {
        fetch("http://localhost:3001/health")
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Health check failed");
                }

                return response.json();
            })
            .then((data) => {
                setServerStatus(data.service);
            })
            .catch(() => {
                setServerStatus("Backend unavailable");
            });
    }, []);

    return (
        <main className="app-shell">
            <section className="voice-card">
                <div className="top-line">
                    <span className="brand">HOME VOICE</span>

                    <StatusBadge status={status} />
                </div>

                <div className="hero">
                    <div
                        className={`microphone-orb ${
                            isConnected ? "microphone-orb--active" : ""
                        }`}
                    >
                        🎙️
                    </div>

                    <p className="overline">PERSONAL VOICE ASSISTANT</p>

                    <h1>Home Voice</h1>

                    <p className="description">
                        Local control panel for your voice assistant.
                    </p>
                    <p className="note">Server: {serverStatus}</p>
                    <p className="note">
                        Audio tracks: {stream?.getAudioTracks().length ?? 0}
                    </p>
                </div>

                <VolumeMeter volume={volume} />
                <div className="button-group">
                    <SessionButton
                        status={status}
                        onToggle={toggleMicrophone}
                    />
                    <button
                        type="button"
                        className="start-button"
                        onClick={toggleRecording}
                        disabled={
                            recorderStatus === "processing" ||
                            (!stream && recorderStatus !== "recording")
                        }
                    >
                        <span>
                            {recorderStatus === "recording" ? "■" : "▶"}
                        </span>
                        {recordButtonLabel}
                    </button>
                </div>
                {transcript && <p className="note">You: {transcript}</p>}

                {answer && <p className="note">Assistant: {answer}</p>}

                {recorderError && (
                    <p className="note note--error">{recorderError}</p>
                )}
                <p className={`note ${isError ? "note--error" : ""}`}>
                    {errorMessage ||
                        (isConnected
                            ? "Microphone is active locally. Audio is not sent anywhere yet."
                            : "Click the button to test microphone access.")}
                </p>
            </section>
        </main>
    );
}

export default App;
