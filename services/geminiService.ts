import { AspectRatio, Resolution } from "../types";
import piexif from "piexifjs";

let cachedStylePrompt = `Analyze the provided image(s) and extract the following details to recreate a similar style and composition:
1. Subject (Main subject description)
2. Background (Environmental context)
3. Camera Angle (Lens, angle, view)
4. Composition (Placement, framing)
5. Mood (Lighting mood, vibe)
6. Art Style (Style, medium, texture)

Return the result in JSON format with keys: subject_main, background_context, camera_angle, composition_layout, mood_atmosphere, art_style.`;

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";

const normalizeAspectRatio = (ratio: AspectRatio): string => {
  const supported = ["1:1", "3:4", "4:3", "9:16", "16:9", "2:3", "3:2", "21:9", "9:21"];
  if (supported.includes(ratio)) return ratio;
  return ratio;
};

const detectAspectRatio = (width: number, height: number): AspectRatio => {
  const ratio = width / height;
  const targets: { ratio: number; value: AspectRatio }[] = [
    { ratio: 21 / 9, value: "21:9" },
    { ratio: 16 / 9, value: "16:9" },
    { ratio: 3 / 2, value: "3:2" },
    { ratio: 4 / 3, value: "4:3" },
    { ratio: 1 / 1, value: "1:1" },
    { ratio: 3 / 4, value: "3:4" },
    { ratio: 2 / 3, value: "2:3" },
    { ratio: 9 / 16, value: "9:16" },
    { ratio: 9 / 21, value: "9:21" },
  ];

  let closest = targets[0];
  let minDiff = Math.abs(ratio - targets[0].ratio);

  for (const target of targets) {
    const diff = Math.abs(ratio - target.ratio);
    if (diff < minDiff) {
      minDiff = diff;
      closest = target;
    }
  }

  return closest.value;
};

const toBinaryString = (str: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
};

const cleanPromptForExif = (prompt: string): string => {
  if (!prompt) return "";
  return prompt
    .split("\n\n")
    .filter((section) => {
      const s = section.trim();
      return !s.startsWith("[Ratio]") && !s.startsWith("[Resolution]");
    })
    .join("\n\n")
    .trim();
};

const callBackend = async <T>(path: string, password: string, payload: unknown): Promise<T> => {
  if (!password) throw new Error("Password is required");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Password": password,
    },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${response.status})`);
  }

  return data as T;
};

export const validateApiCredential = async (credential: string): Promise<boolean> => {
  try {
    await callBackend<{ translatedText?: string }>("/api/translate", credential, { text: "" });
    return true;
  } catch {
    return false;
  }
};

export const extractExifPrompt = (dataUrl: string): string | null => {
  try {
    const exifObj = piexif.load(dataUrl);
    const userComment = exifObj["Exif"]?.[piexif.ExifIFD.UserComment];
    if (!userComment) return null;

    let binary = "";
    if (typeof userComment === "string") {
      binary = userComment;
    } else if (Array.isArray(userComment)) {
      binary = String.fromCharCode(...userComment);
    }

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);

    if (decoded.trim().startsWith("Prompt")) {
      return decoded;
    }
  } catch {
    // ignore EXIF parse errors
  }
  return null;
};

const applyExifMetadata = async (dataUrl: string, prompt: string): Promise<string> => {
  const jpegDataUrl: string = await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      resolve(canvas.toDataURL("image/jpeg", 1.0));
    };
    img.src = dataUrl;
  });

  try {
    const cleaned = cleanPromptForExif(prompt);
    const formattedPrompt = "Prompt\n" + cleaned;
    const encodedPrompt = toBinaryString(formattedPrompt);

    const zeroth: any = {};
    zeroth[piexif.ImageIFD.ImageDescription] = "";
    zeroth[piexif.ImageIFD.Software] = "ConceptBug by Seongwon";
    zeroth[piexif.ImageIFD.Artist] = "";

    const exif: any = {};
    exif[piexif.ExifIFD.UserComment] = encodedPrompt;

    const exifObj = { "0th": zeroth, "Exif": exif, "GPS": {} };
    const exifBytes = piexif.dump(exifObj);

    return piexif.insert(exifBytes, jpegDataUrl);
  } catch (e) {
    console.error("EXIF injection failed:", e);
    return jpegDataUrl;
  }
};

export const extractPromptFromImages = async (
  password: string,
  images: string[],
  selectedModelId: string
): Promise<Record<string, string>> => {
  if (!images || images.length === 0) return {};

  try {
    const result = await callBackend<Record<string, string>>("/api/extract-prompt", password, {
      images,
      selectedModelId,
      systemPrompt: cachedStylePrompt,
    });
    return result || {};
  } catch (err: any) {
    console.error("Extraction error:", err);
    throw new Error(err.message || "Prompt extraction failed.");
  }
};

export const translateText = async (password: string, text: string): Promise<string> => {
  if (!text || !text.trim()) return "";
  try {
    const result = await callBackend<{ translatedText?: string }>("/api/translate", password, { text });
    return result?.translatedText?.trim() || text;
  } catch (e) {
    console.error("Translation Error:", e);
    return text;
  }
};

export const generateImage = async (
  password: string,
  prompt: string,
  model: string,
  aspectRatio: AspectRatio,
  imageSize: Resolution,
  referenceImages: string[]
) => {
  const result = await callBackend<{ imageDataUrl?: string; imageBase64?: string; mimeType?: string }>(
    "/api/generate-image",
    password,
    {
      prompt,
      model: model || "gemini-3.1-flash-image-preview",
      aspectRatio: normalizeAspectRatio(aspectRatio),
      imageSize,
      referenceImages: referenceImages.slice(0, 8),
    }
  );

  const rawImage =
    result.imageDataUrl ||
    (result.imageBase64 ? `data:${result.mimeType || "image/png"};base64,${result.imageBase64}` : "");

  if (!rawImage) throw new Error("No generated image returned.");

  return await applyExifMetadata(rawImage, prompt);
};

export const upscaleImage = async (
  password: string,
  dataUrl: string,
  prompt: string,
  model: string
): Promise<string> => {
  const { width, height } = await new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = dataUrl;
  });

  const detectedRatio = detectAspectRatio(width, height);
  const targetSize: Resolution = "2K";

  const result = await callBackend<{ imageDataUrl?: string; imageBase64?: string; mimeType?: string }>(
    "/api/upscale-image",
    password,
    {
      dataUrl,
      model: model || "gemini-3.1-flash-image-preview",
      targetSize,
      aspectRatio: normalizeAspectRatio(detectedRatio),
      prompt:
        "Upscale and enhance this image to 2K quality. Maintain exact fidelity to the original composition, colors, and subjects. Improve clarity and sharpness without adding any new elements.",
    }
  );

  const upscaledImage =
    result.imageDataUrl ||
    (result.imageBase64 ? `data:${result.mimeType || "image/jpeg"};base64,${result.imageBase64}` : "");

  if (!upscaledImage) throw new Error("No upscaled image returned.");

  return await applyExifMetadata(upscaledImage, prompt);
};
