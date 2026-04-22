import { NextResponse } from "next/server";
import { createClient } from "@/lib/ai";
import {
  buildCopyPrompt,
  buildImagePrompt,
  normalizeInput,
  parseZineContent
} from "@/lib/zine";
import type { ZineContent, ZineFormInput, ZineGenerationResponse } from "@/lib/types";

export const runtime = "nodejs";

const textModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
const imageModel = "gemini-3-pro-image-preview";
const fallbackImageHost = "https://image.pollinations.ai/prompt";

function buildLocalFallbackContent(input: ZineFormInput): ZineContent {
  const titleWords = input.theme.split(" ").slice(0, 4);
  const themeTitle = titleWords.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

  return {
    title: themeTitle || "Future Commons",
    subtitle: `${input.vibe} • ${input.location}`,
    hook: input.message,
    manifesto: `${input.message} We build practical joy through shared tools, local care, and repair-first neighborhoods.`,
    sections: [
      { heading: "Build", body: `Shape ${input.theme} with community ownership, cooperative maintenance, and low-cost access for neighbors.` },
      { heading: "Grow", body: `Use ${input.symbols} as living infrastructure that feeds people, cools streets, and restores trust.` },
      { heading: "Share", body: "Design systems where skills, food, and energy circulate locally instead of being locked behind paywalls." },
      { heading: "Practice", body: "Start small this week, document what works, and invite one new person into the process." }
    ],
    cta: "Print this. Post it. Build it together.",
    footer: `For ${input.name}`,
    artPrompt: `Premium editorial solarpunk illustration of ${input.theme} in ${input.location}, featuring ${input.symbols}, no text, portrait composition, tactile print texture.`,
    paletteName: input.palette || "Mosslight",
    palette: ["#dff5e1", "#7fcf93", "#2d6a4f", "#103d2e"]
  };
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function generateZineTextWithFallback(
  client: NonNullable<ReturnType<typeof createClient>>,
  prompt: string
): Promise<string> {
  let lastError: unknown;

  for (const model of textModels) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.8,
            responseMimeType: "application/json"
          }
        });

        if (response.text) {
          return response.text;
        }
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);
        const retryable = status === 429 || status === 500 || status === 503;

        if (retryable && attempt === 0) {
          await sleep(650);
          continue;
        }

        break;
      }
    }
  }

  throw lastError ?? new Error("Text generation failed.");
}

async function generateFallbackAiImage(prompt: string): Promise<string> {
  const params = new URLSearchParams({
    width: "896",
    height: "1152",
    nologo: "true",
    enhance: "true",
    model: "flux"
  });

  const url = `${fallbackImageHost}/${encodeURIComponent(prompt)}?${params.toString()}`;
  const response = await fetch(url, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Fallback AI image request failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request: Request) {
  let payload: Partial<ZineFormInput> = {};

  try {
    payload = (await request.json()) as Partial<ZineFormInput>;
  } catch {
    payload = {};
  }

  const input = normalizeInput(payload);
  const client = createClient();

  if (!client) {
    return NextResponse.json(
      { error: "Google AI is not configured. Set GEMINI_API_KEY or GOOGLE_API_KEY." },
      { status: 503 }
    );
  }

  try {
    let content: ZineContent;

    try {
      const text = await generateZineTextWithFallback(client, buildCopyPrompt(input));
      content = parseZineContent(text, input);
    } catch (textError) {
      console.error("Google text generation failed, using local fallback copy", textError);
      content = buildLocalFallbackContent(input);
    }

    const imagePrompt = buildImagePrompt(content, input);

    try {
      const imageResponse = await client.models.generateContent({
        model: imageModel,
        contents: imagePrompt,
        config: {
          responseModalities: ["IMAGE"],
          imageConfig: {
            imageSize: "2K"
          }
        }
      });

      const imageBytes =
        imageResponse.data ??
        imageResponse.candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data;

      if (!imageBytes) {
        throw new Error("Google image API returned no bytes.");
      }

      return NextResponse.json<ZineGenerationResponse>({
        content,
        imageDataUrl: `data:image/png;base64,${imageBytes}`,
        source: "google-ai"
      });
    } catch (imageError) {
      console.error("Google image generation failed, trying fallback AI provider", imageError);
      const fallbackImageDataUrl = await generateFallbackAiImage(imagePrompt);
      return NextResponse.json<ZineGenerationResponse>({
        content,
        imageDataUrl: fallbackImageDataUrl,
        source: "pollinations-ai"
      });
    }
  } catch (error) {
    console.error("Generation failed", error);
    return NextResponse.json({ error: "AI generation failed. Please retry in a moment." }, { status: 502 });
  }
}
