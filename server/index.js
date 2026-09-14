import "dotenv/config";
import multer from "multer";
import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB
    },
});

app.use(
    cors({
        origin: "http://localhost:5173",
    }),
);

app.use(express.json());

app.get("/health", (_request, response) => {
    response.json({
        ok: true,
        service: "home-voice-server",
    });
});

app.post("/api/voice-turn", upload.single("audio"), (request, response) => {
    if (!request.file) {
        return response.status(400).json({
            error: "Missing audio file",
        });
    }

    response.json({
        ok: true,
        received: {
            originalName: request.file.originalname,
            mimeType: request.file.mimetype,
            size: request.file.size,
        },
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
