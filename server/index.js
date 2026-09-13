import "dotenv/config";
import express from "express";
import cors from "cors";

const app = express();
const port = 3001;

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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
