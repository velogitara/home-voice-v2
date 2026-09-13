import "./App.css";
import { useState, useEffect } from "react";
import { useMicrophone } from "./hooks/useMicrophone";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { StatusBadge } from "./components/StatusBadge";
import { SessionButton } from "./components/SessionButton";
import { VolumeMeter } from "./components/VolumeMeter";
function App() {
    const { status, errorMessage, volume, stream, toggleMicrophone } =
        useMicrophone();
    const {
        status: realtimeStatus,
        errorMessage: realtimeError,
        audioRef,
    } = useRealtimeSession(stream);

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
                    <audio
                        ref={audioRef}
                        autoPlay
                        controls
                        aria-label="Assistant audio"
                    />

                    <p className="note">Realtime: {realtimeStatus}</p>

                    {realtimeError && (
                        <p className="note note--error">{realtimeError}</p>
                    )}
                </div>

                <VolumeMeter volume={volume} />
                <div className="button-group">
                    <SessionButton
                        status={status}
                        onToggle={toggleMicrophone}
                    />
                </div>
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
