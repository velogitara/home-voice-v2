import "dotenv/config";
import multer from "multer";
import express from "express";
import cors from "cors";
import Groq, { toFile } from "groq-sdk";

const app = express();
const port = 3001;
const groq = process.env.GROQ_API_KEY
    ? new Groq({
          apiKey: process.env.GROQ_API_KEY,
          maxRetries: 0,
      })
    : null;

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

app.post(
    "/api/voice-turn",
    upload.single("audio"),
    async (request, response) => {
        if (!request.file) {
            return response.status(400).json({
                error: "Audio file is required",
            });
        }

        if (!groq) {
            return response.status(503).json({
                error: "GROQ_API_KEY is not configured",
            });
        }

        try {
            const transcription = await groq.audio.transcriptions.create({
                file: await toFile(
                    request.file.buffer,
                    request.file.originalname,
                ),
                model: "whisper-large-v3-turbo",
                language: "ru",
                response_format: "json",
                temperature: 0,
            });
            const text = transcription.text.trim();

            const completion = await groq.chat.completions.create({
                model: "openai/gpt-oss-20b",
                messages: [
                    {
                        role: "system",
                        content: `Ты — голосовой помощник проекта Home Voice. 
 Текущая языковая модель — GPT-OSS 20B, запущенная через Groq. 
Ты не GPT-4, не GPT-5 и не ChatGPT. Никогда не называй себя этими моделями. 
 На данный момент в приложении подключены только: 
1. распознавание речи; 
2. генерация текстового ответа. 
 Память разговора, интернет, поиск информации, управление умным домом и напоминания пока не подключены. Не утверждай, что умеешь это делать, если соответствующий инструмент действительно не был передан тебе в сообщении. 
 Отвечай по-русски, естественно и без Markdown. 
Обычно отвечай 2–5 короткими предложениями. 
Если пользователь просит подробное объяснение, отвечай подробнее. 
Если тебя просят сравнить с ChatGPT, честно скажи, что точное сравнение возможно только на одинаковом наборе заданий.`,
                    },
                    {
                        role: "user",
                        content: text,
                    },
                ],
                reasoning_effort: "low",
                temperature: 0.4,
                max_completion_tokens: 400,
            });

            const choice = completion.choices[0];
            console.log("Groq choice:", {
                finishReason: choice?.finish_reason,
                content: choice?.message?.content,
                reasoning: choice?.message?.reasoning,
                usage: completion.usage,
            });

            const answer = choice?.message?.content?.trim() ?? "";
            // const answer =
            //     completion.choices[0]?.message?.content?.trim() ?? "";

            response.json({
                ok: true,
                text,
                answer,
                received: {
                    originalName: request.file.originalname,
                    mimeType: request.file.mimetype,
                    size: request.file.size,
                },
            });
        } catch (error) {
            console.error("Groq transcription error:", {
                status: error?.status,
                code: error?.code,
                message: error?.message,
            });

            response.status(error?.status === 429 ? 429 : 502).json({
                error: "Speech transcription failed",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            });
        }
    },
);
app.post("/api/chat", async (request, response) => {
    const text = request.body?.text?.trim();

    if (!text) {
        return response.status(400).json({
            error: "Text is required",
        });
    }

    if (!groq) {
        return response.status(503).json({
            error: "GROQ_API_KEY is not configured",
        });
    }

    try {
        const completion = await groq.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [
                {
                    role: "system",
                    content:
                        "Ты умный домашний голосовой помощник. Отвечай по-русски кратко и естественно. Не используй Markdown, потому что ответ будет озвучен.",
                },
                {
                    role: "user",
                    content: text,
                },
            ],
            temperature: 0.4,
            max_completion_tokens: 300,
        });

        const answer = completion.choices[0]?.message?.content?.trim() ?? "";

        response.json({
            ok: true,
            text,
            answer,
        });
    } catch (error) {
        console.error("Groq chat error:", {
            status: error?.status,
            code: error?.code,
            message: error?.message,
        });

        const status = Number.isInteger(error?.status) ? error.status : 502;

        response.status(status).json({
            error: "Text generation failed",
        });
    }
});
// app.post("/api/voice-turn", upload.single("audio"), (request, response) => {
//     if (!request.file) {
//         return response.status(400).json({
//             error: "Missing audio file",
//         });
//     }

//     response.json({
//         ok: true,
//         received: {
//             originalName: request.file.originalname,
//             mimeType: request.file.mimetype,
//             size: request.file.size,
//         },
//     });
// });

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
