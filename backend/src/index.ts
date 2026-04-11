import { GoogleGenAI, Type } from "@google/genai";
import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  Bindings: {
    GEMINI_API_KEY: string;
    APP_PASSWORD?: string;
    APP_PASSWORD_HASH?: string;
    ALLOWED_ORIGINS?: string;
  };
  Variables: {
    effectiveApiKey: string;
  };
};

type DataPart = { inlineData: { data: string; mimeType: string } };

const app = new Hono<Env>();

const LOOSE_SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
] as const;

const DEFAULT_EXTRACT_PROMPT = `Analyze the provided image(s) and extract the following details to recreate a similar style and composition:
1. Subject (Main subject description)
2. Background (Environmental context)
3. Camera Angle (Lens, angle, view)
4. Composition (Placement, framing)
5. Mood (Lighting mood, vibe)
6. Art Style (Style, medium, texture)

Return the result in JSON format with keys: subject_main, background_context, camera_angle, composition_layout, mood_atmosphere, art_style.`;

const jsonError = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const parseAllowedOrigins = (raw?: string): string[] =>
  (raw || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

const isOriginAllowed = (origin: string | undefined, allowed: string[]) => {
  if (!origin) return true;
  if (!allowed.length) return true;
  if (allowed.includes("*")) return true;
  return allowed.includes(origin);
};

const parseDataUrl = (value: string): DataPart["inlineData"] => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL payload.");
  }
  return {
    mimeType: match[1],
    data: match[2].replace(/\s/g, ""),
  };
};

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const sha256Hex = async (text: string): Promise<string> => {
  const encoded = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return toHex(new Uint8Array(digest));
};

const verifyPassword = async (input: string, env: Env["Bindings"]): Promise<boolean> => {
  if (!input) return false;
  if (env.APP_PASSWORD && input === env.APP_PASSWORD) return true;
  if (env.APP_PASSWORD_HASH) {
    const hashed = await sha256Hex(input);
    return hashed === env.APP_PASSWORD_HASH.toLowerCase();
  }
  return false;
};

const extractImageParts = (images: string[]): DataPart[] =>
  images.map((image) => ({ inlineData: parseDataUrl(image) }));

const getGeneratedImageDataUrl = (response: any): string => {
  for (const part of response?.candidates?.[0]?.content?.parts || []) {
    if (part?.inlineData?.data && part?.inlineData?.mimeType) {
      return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No generated image returned from Gemini.");
};

app.use("*", async (c, next) => {
  const allowedOrigins = parseAllowedOrigins(c.env.ALLOWED_ORIGINS);
  const requestOrigin = c.req.header("Origin");

  if (!isOriginAllowed(requestOrigin, allowedOrigins)) {
    return c.json({ error: "Origin is not allowed." }, 403);
  }

  const activeOrigin = requestOrigin || (allowedOrigins[0] || "*");
  return cors({
    origin: activeOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-App-Password"],
    maxAge: 86400,
  })(c, next);
});

app.get("/", (c) => c.json({ ok: true, service: "conceptbug-backend" }));

app.use("/api/*", async (c, next) => {
  const credential = (c.req.header("X-App-Password") || "").trim();
  if (!credential) {
    return c.json({ error: "API key is invalid." }, 401);
  }

  if (/^\d{4}$/.test(credential)) {
    const valid = await verifyPassword(credential, c.env);
    if (!valid) {
      return c.json({ error: "API key is invalid." }, 401);
    }
    c.set("effectiveApiKey", c.env.GEMINI_API_KEY);
    return next();
  }

  c.set("effectiveApiKey", credential);
  return next();
});

app.post("/api/translate", async (c) => {
  try {
    const body = await c.req.json<{ text?: string }>();
    const text = (body.text || "").trim();
    if (!text) {
      return c.json({ translatedText: "" });
    }

    const ai = new GoogleGenAI({ apiKey: c.get("effectiveApiKey") });
    const response = await ai.models.generateContent({
      model: "gemini-flash-lite-latest",
      contents: `Translate the following text. If it is Korean, translate to English. If it is English, translate to Korean. Only return the translated text without explanation or quotes.\n\nText: ${text}`,
      config: {
        safetySettings: LOOSE_SAFETY_SETTINGS as any,
      },
    });

    return c.json({ translatedText: response.text?.trim() || text });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err?.message || "Translation failed." }, 500);
  }
});

app.post("/api/extract-prompt", async (c) => {
  try {
    const body = await c.req.json<{
      images?: string[];
      selectedModelId?: string;
      systemPrompt?: string;
    }>();
    const images = body.images || [];
    if (!images.length) {
      return c.json({});
    }

    const model =
      body.selectedModelId === "gemini-2.5-flash-image" ? "gemini-2.5-flash" : "gemini-3.1-pro-preview";

    const ai = new GoogleGenAI({ apiKey: c.get("effectiveApiKey") });
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [{ text: body.systemPrompt || DEFAULT_EXTRACT_PROMPT }, ...extractImageParts(images)],
      } as any,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject_main: { type: Type.STRING },
            background_context: { type: Type.STRING },
            camera_angle: { type: Type.STRING },
            composition_layout: { type: Type.STRING },
            mood_atmosphere: { type: Type.STRING },
            art_style: { type: Type.STRING },
          },
          required: [
            "subject_main",
            "background_context",
            "camera_angle",
            "composition_layout",
            "mood_atmosphere",
            "art_style",
          ],
        },
        safetySettings: LOOSE_SAFETY_SETTINGS as any,
        temperature: 0.4,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return c.json(parsed);
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err?.message || "Prompt extraction failed." }, 500);
  }
});

app.post("/api/generate-image", async (c) => {
  try {
    const body = await c.req.json<{
      prompt?: string;
      model?: string;
      aspectRatio?: string;
      imageSize?: string;
      referenceImages?: string[];
    }>();
    if (!body.prompt?.trim()) {
      return c.json({ error: "Prompt is required." }, 400);
    }

    const refs = (body.referenceImages || []).slice(0, 8);
    const ai = new GoogleGenAI({ apiKey: c.get("effectiveApiKey") });

    const response = await ai.models.generateContent({
      model: body.model || "gemini-3.1-flash-image-preview",
      contents: {
        parts: [{ text: body.prompt }, ...extractImageParts(refs)],
      } as any,
      config: {
        imageConfig: {
          aspectRatio: body.aspectRatio || "16:9",
          imageSize: body.imageSize || "1K",
        },
        safetySettings: LOOSE_SAFETY_SETTINGS as any,
        temperature: 0.4,
      },
    });

    return c.json({ imageDataUrl: getGeneratedImageDataUrl(response) });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err?.message || "Image generation failed." }, 500);
  }
});

app.post("/api/upscale-image", async (c) => {
  try {
    const body = await c.req.json<{
      dataUrl?: string;
      model?: string;
      targetSize?: string;
      aspectRatio?: string;
      prompt?: string;
    }>();
    if (!body.dataUrl) {
      return c.json({ error: "dataUrl is required." }, 400);
    }

    const ai = new GoogleGenAI({ apiKey: c.get("effectiveApiKey") });
    const response = await ai.models.generateContent({
      model: body.model || "gemini-3.1-flash-image-preview",
      contents: {
        parts: [
          { inlineData: parseDataUrl(body.dataUrl) },
          {
            text:
              body.prompt ||
              "Upscale and enhance this image to 2K quality. Maintain exact fidelity to the original composition, colors, and subjects. Improve clarity and sharpness without adding any new elements.",
          },
        ],
      } as any,
      config: {
        imageConfig: {
          imageSize: body.targetSize || "2K",
          aspectRatio: body.aspectRatio || "16:9",
        },
        safetySettings: LOOSE_SAFETY_SETTINGS as any,
      },
    });

    return c.json({ imageDataUrl: getGeneratedImageDataUrl(response) });
  } catch (err: any) {
    console.error(err);
    return c.json({ error: err?.message || "Upscale failed." }, 500);
  }
});

app.onError((err) => {
  console.error(err);
  return jsonError("Internal server error.", 500);
});

export default app;
