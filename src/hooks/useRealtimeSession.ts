import { useEffect, useRef, useState } from "react";

type RealtimeStatus = "idle" | "connecting" | "connected" | "error";

type SessionResponse = {
    session?: {
        id?: string;
    };
    transport?: {
        type?: string;
        sdp?: string;
    };
};

function waitForIceGatheringComplete(
    connection: RTCPeerConnection,
): Promise<void> {
    if (connection.iceGatheringState === "complete") {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const handleStateChange = () => {
            if (connection.iceGatheringState !== "complete") {
                return;
            }

            window.clearTimeout(timeoutId);
            connection.removeEventListener(
                "icegatheringstatechange",
                handleStateChange,
            );
            resolve();
        };

        const timeoutId = window.setTimeout(() => {
            connection.removeEventListener(
                "icegatheringstatechange",
                handleStateChange,
            );
            reject(new Error("Timed out while gathering ICE candidates"));
        }, 10_000);

        connection.addEventListener(
            "icegatheringstatechange",
            handleStateChange,
        );

        handleStateChange();
    });
}

export function useRealtimeSession(stream: MediaStream | null) {
    const [status, setStatus] = useState<RealtimeStatus>("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    useEffect(() => {
        if (!stream) {
            setStatus("idle");
            setErrorMessage("");
            return;
        }

        let cancelled = false;

        const connection = new RTCPeerConnection();
        peerConnectionRef.current = connection;

        setStatus("connecting");
        setErrorMessage("");

        connection.addEventListener("track", (event) => {
            const remoteStream = new MediaStream([event.track]);

            if (!audioRef.current) {
                return;
            }

            audioRef.current.srcObject = remoteStream;

            void audioRef.current.play().catch(() => {
                console.log("Press play in the audio controls");
            });
        });

        for (const track of stream.getAudioTracks()) {
            connection.addTrack(track, stream);
        }

        const events = connection.createDataChannel("oai-events");

        events.addEventListener("message", (event) => {
            const message = JSON.parse(String(event.data)) as { type?: string };

            console.log("OpenAI event:", message);

            if (message.type === "session.started") {
                setStatus("connected");
            }
        });

        const connect = async () => {
            try {
                const offer = await connection.createOffer();

                await connection.setLocalDescription(offer);
                await waitForIceGatheringComplete(connection);

                if (cancelled) {
                    return;
                }

                const sdp = connection.localDescription?.sdp;

                if (!sdp) {
                    throw new Error("Missing local SDP offer");
                }

                const response = await fetch(
                    "http://localhost:3001/api/session",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ sdp }),
                    },
                );

                if (!response.ok) {
                    const details = await response.text();

                    throw new Error(
                        `Session request failed (${response.status}): ${details}`,
                    );
                }

                const result = (await response.json()) as SessionResponse;

                if (!result.transport?.sdp) {
                    throw new Error("Missing SDP answer");
                }

                await connection.setRemoteDescription({
                    type: "answer",
                    sdp: result.transport.sdp,
                });

                console.log("Created session:", result.session?.id);
            } catch (error) {
                if (cancelled) {
                    return;
                }

                console.error("Realtime session error:", error);

                setStatus("error");
                setErrorMessage(
                    error instanceof Error
                        ? error.message
                        : "Could not connect to OpenAI",
                );

                connection.close();
            }
        };

        void connect();

        return () => {
            cancelled = true;

            events.close();
            connection.close();

            if (audioRef.current) {
                audioRef.current.srcObject = null;
            }

            if (peerConnectionRef.current === connection) {
                peerConnectionRef.current = null;
            }
        };
    }, [stream]);

    return {
        status,
        errorMessage,
        audioRef,
    };
}
