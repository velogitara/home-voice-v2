import type { VoiceStatus } from "../types/voice";

type StatusBadgeProps = {
    status: VoiceStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const isActive = status === "connected";
    const isError = status === "error";
    const statusLabel =
        status === "requesting"
            ? "Requesting microphone..."
            : status === "connected"
              ? "Microphone ready"
              : status === "error"
                ? "Microphone Error"
                : "Disconnected";
    return (
        <span
            className={`status ${
                isActive ? "status--active" : isError ? "status--error" : ""
            }`}
        >
            <span className="status-dot" />
            {statusLabel}
        </span>
    );
}
