import type { VoiceStatus } from "../types/voice";

type SessionButtonProps = {
    status: VoiceStatus;
    onToggle: () => void;
};

export function SessionButton({ status, onToggle }: SessionButtonProps) {
    const isConnected = status === "connected";
    const isRequesting = status === "requesting";
    const buttonLabel =
        status === "requesting"
            ? "Requesting microphone..."
            : status === "connected"
              ? "Stop microphone"
              : status === "error"
                ? "Try again"
                : "Enable microphone";

    return (
        <button
            type="button"
            className="start-button"
            onClick={onToggle}
            aria-pressed={isConnected}
            disabled={isRequesting}
        >
            <span>{isConnected ? "■" : "▶"}</span>
            {buttonLabel}
        </button>
    );
}
