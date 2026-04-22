import type { ZineContent, ZineFormInput } from "./types";

const paletteLibrary = [
  {
    name: "Mosslight",
    colors: ["#dff5e1", "#7fcf93", "#2d6a4f", "#103d2e"]
  },
  {
    name: "Sunset Canopy",
    colors: ["#ffe8c8", "#ffb86b", "#f06543", "#6f1d1b"]
  },
  {
    name: "Tidal Glass",
    colors: ["#d7fff1", "#7ae7c7", "#2a9d8f", "#0b3d3a"]
  },
  {
    name: "Bloom Circuit",
    colors: ["#f6d9ff", "#c77dff", "#7b2cbf", "#2d1e4f"]
  },
  {
    name: "Orchard Dawn",
    colors: ["#f8f3d4", "#c7f28a", "#7cb342", "#355e3b"]
  }
];

const clean = (value: string) => value.trim().replace(/\s+/g, " ");

export function normalizeInput(input: Partial<ZineFormInput>): ZineFormInput {
  return {
    name: clean(input.name || "Kind Neighbor"),
    vibe: clean(input.vibe || "hopeful and cinematic"),
    theme: clean(input.theme || "a neighborhood built around shared gardens, solar roofs, and repair cafes"),
    symbols: clean(input.symbols || "sunflowers, bike lanes, birds, rain barrels"),
    message: clean(input.message || "Make beauty public, practical, and shared."),
    palette: clean(input.palette || "Mosslight"),
    location: clean(input.location || "a future version of your city")
  };
}

export function buildCopyPrompt(input: ZineFormInput): string {
  return [
    "You are designing a premium one-page Solarpunk zine that feels like a real editorial spread.",
    "Return ONLY valid JSON. Do not wrap it in markdown or code fences.",
    "The JSON object must have these string fields: title, subtitle, hook, manifesto, cta, footer, artPrompt, paletteName.",
    "It must also have a sections array with exactly 4 objects, each with heading and body strings.",
    "Tone: luminous, practical, communal, optimistic, tactile, and grounded in repair culture.",
    "Avoid generic sci-fi language. Make it feel like a beautiful printed zine that a person would keep on a wall.",
    "Treat the Theme below as the main user prompt and build the page around it.",
    "Write for a text-heavy editorial layout: the left side should feel rich with title, subtitle, manifesto, and short section blurbs.",
    "Keep the title short and strong. Avoid adding labels like edition numbers, print-ready notes, or extra magazine metadata.",
    `Reader name: ${input.name}`,
    `Mood: ${input.vibe}`,
    `Theme: ${input.theme}`,
    `Setting/location: ${input.location}`,
    `Symbols to weave in: ${input.symbols}`,
    `Core message: ${input.message}`,
    `Palette: ${input.palette}`,
    "You must include the Core message text verbatim at least once in either hook, manifesto, or cta.",
    "The title should be short, memorable, and zine-like.",
    "The hook should feel like a pull quote for the cover.",
    "The manifesto should be 2 to 3 sentences with strong visual language.",
    "Each section body should be short: 1 sentence, 12 to 22 words.",
    "The artPrompt should describe a high-end solarpunk editorial illustration for the cover with NO text inside the image.",
    "Compose the image with generous negative space and a left-friendly layout so the page text can breathe alongside the image.",
    "Keep the copy concise, poetic, and punchy, suitable for a single printed page."
  ].join("\n");
}

export function buildImagePrompt(content: ZineContent, input: ZineFormInput): string {
  return [
    "Create a premium editorial solarpunk cover illustration for a handmade zine.",
    "No text, no logos, no watermark, no visible typography inside the art.",
    "Make it look like a high-end printed magazine cover with layered paper collage, risograph grain, botanical futurism, and architectural details.",
    "Use asymmetrical composition, strong focal depth, soft sunlight, lush plants, reclaimed materials, and believable community infrastructure.",
    "Keep the composition bold and readable, with a dominant subject and a clean visual rhythm that supports text alongside it.",
    `Match the mood: ${input.vibe}.`,
    `Reflect the theme: ${input.theme}.`,
    `Include visual motifs: ${input.symbols}.`,
    `Use this palette direction: ${content.paletteName} (${content.palette.join(", ")}).`,
    `Make it feel like it belongs to ${input.name} in ${input.location}.`,
    "Portrait orientation, rich contrast, tactile paper texture, artful, vivid, and print-ready."
  ].join(" ");
}

function pickPalette(name: string): { name: string; colors: string[] } {
  const match = paletteLibrary.find((palette) => palette.name.toLowerCase() === name.toLowerCase());
  return match ?? paletteLibrary[0];
}

export function parseZineContent(raw: string, fallbackInput: ZineFormInput): ZineContent {
  const parsed = extractJson(raw);
  if (!parsed) {
    throw new Error("AI did not return valid JSON zine content.");
  }

  const palette = pickPalette(typeof parsed.paletteName === "string" ? parsed.paletteName : fallbackInput.palette);

  return {
    title: coerceString(parsed.title, `${fallbackInput.name}'s Future Notes`),
    subtitle: coerceString(parsed.subtitle, `${fallbackInput.vibe} / ${fallbackInput.location}`),
    hook: coerceString(parsed.hook, fallbackInput.message),
    manifesto: coerceString(parsed.manifesto, fallbackInput.message),
    sections: Array.isArray(parsed.sections)
      ? parsed.sections.slice(0, 4).map((section: { heading?: unknown; body?: unknown }) => ({
          heading: coerceString(section.heading, "Notes"),
          body: coerceString(section.body, "A small, hopeful paragraph about shared futures.")
        }))
      : [
          { heading: "Build", body: "Design practical change that feels beautiful in daily life." },
          { heading: "Gather", body: "Center shared tools, shared spaces, and shared stewardship." },
          { heading: "Care", body: "Treat maintenance, repair, and rest as community infrastructure." },
          { heading: "Keep Going", body: "Turn today’s small action into tomorrow’s collective habit." }
        ],
    cta: coerceString(parsed.cta, "Make one beautiful thing together."),
    footer: coerceString(parsed.footer, `For ${fallbackInput.name}`),
    artPrompt: coerceString(
      parsed.artPrompt,
      `A premium editorial solarpunk cover illustration about ${fallbackInput.theme} in ${fallbackInput.location}, no text.`
    ),
    paletteName: coerceString(parsed.paletteName, palette.name),
    palette: palette.colors
  };
}

function coerceString(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const cleaned = clean(value);
  return cleaned.length > 0 ? cleaned : fallback;
}

function extractJson(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fromFence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fromFence?.[1]?.trim() ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonText = candidate.slice(firstBrace, lastBrace + 1);
  try {
    const value = JSON.parse(jsonText);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
