import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = 3001;

const client = new OpenAI({
    maxRetries: 0,
});

app.use(
    cors({
        origin: "http://localhost:5173",
    }),
);

app.use(express.json());

app.post("/api/session", async (request, response) => {
    const sdp = request.body?.sdp;

    if (typeof sdp !== "string" || sdp.length === 0) {
        return response.status(400).json({
            error: "Missing SDP offer",
        });
    }

    try {
        const result = await client.live.create({
            session: {
                model: "gpt-live-1",
            },
            transport: {
                type: "webrtc",
                sdp,
            },
        });

        response.status(201).json(result);
    } catch (error) {
        console.error("OpenAI live session error:", error);

        response.status(500).json({
            error: "Could not create live session",
        });
    }
});
app.get("/health", (_request, response) => {
    response.json({
        ok: true,
        service: "home-voice-server",
    });
});
app.get("/api/config-check", (_request, response) => {
    response.json({
        openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
