"use client";

import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import type { ZineContent, ZineGenerationResponse, ZineFormInput } from "@/lib/types";

const defaultPrompt = "urban mushroom farm collective";
const defaultTextDirection = "For example, write a compact manifesto about shared abundance, local repair, and a hopeful future.";

function buildPayloadFromPrompt(prompt: string, textDirection: string): ZineFormInput {
  return {
    name: "Field Collective",
    vibe: "lush, cooperative, and quietly radical",
    theme: prompt,
    symbols: "community gardens, bikes, fungi, solar glass, rainwater, shared workshops",
    message: textDirection.trim() || defaultTextDirection,
    palette: "Mosslight",
    location: "a near-future neighborhood commons"
  };
}

const quickPrompts = [
  "a seed library on a transit station roof",
  "a neighborhood repair cafe and orchard",
  "a riverfront commons powered by solar art",
  "a midnight garden market under lanterns"
];

export default function HomePage() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [textDirection, setTextDirection] = useState(defaultTextDirection);
  const [zineTextDirection, setZineTextDirection] = useState(defaultTextDirection);
  const [content, setContent] = useState<ZineContent | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [source, setSource] = useState<ZineGenerationResponse["source"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Drop in one prompt and generate your AI zine page.");
  const previewRef = useRef<HTMLDivElement>(null);

  const paletteCss = useMemo(() => {
    const palette = content?.palette ?? ["#dff5e1", "#7fcf93", "#2d6a4f", "#103d2e"];
    return {
      "--zine-a": palette[0],
      "--zine-b": palette[1],
      "--zine-c": palette[2],
      "--zine-d": palette[3]
    } as React.CSSProperties;
  }, [content]);

  const sourceLabel =
    source === "google-ai"
      ? "Google Gemini"
      : source === "pollinations-ai"
        ? "AI fallback"
        : "Not generated yet";

  const statusTone = loading
    ? "is-loading"
    : status.toLowerCase().includes("failed") || status.toLowerCase().includes("unavailable")
      ? "is-error"
      : source
        ? "is-success"
        : "is-neutral";

  async function generateZine() {
    const trimmedPrompt = prompt.trim();
    const trimmedTextDirection = textDirection.trim();
    if (!trimmedPrompt) {
      setStatus("Add a prompt first, like: urban mushroom farm collective.");
      return;
    }

    setLoading(true);
    setStatus("Generating your AI-powered zine page...");

    try {
      const payload = buildPayloadFromPrompt(trimmedPrompt, trimmedTextDirection);
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorBody?.error ?? `Request failed: ${response.status}`);
      }

      const data = (await response.json()) as ZineGenerationResponse;
      setContent(data.content);
      setImageDataUrl(data.imageDataUrl);
      setSource(data.source);
      setZineTextDirection(trimmedTextDirection || defaultTextDirection);
      setStatus(data.source === "google-ai" ? "Generated with Google AI." : "Generated with fallback AI.");
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        setStatus(error.message);
      } else {
        setStatus("Something interrupted generation. Try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function downloadPreview() {
    if (!previewRef.current) {
      return;
    }

    const png = await toPng(previewRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      style: {
        borderRadius: "28px"
      }
    });

    const link = document.createElement("a");
    link.download = `${(content?.title || "solarpunk-zine").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    link.href = png;
    link.click();
  }

  return (
    <main className="page-shell">
      <section className="hero-copy">
        <div className="eyebrow">Solarpunk Zine Generator</div>
        <h1>Zine Gen</h1>

        <div className={`status-chip ${statusTone}`}>{status}</div>

        <div className="prompt-heading">Suggestions</div>
        <div className="prompt-grid">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="prompt-chip"
              onClick={() => setPrompt(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          className="input-panel"
          onSubmit={(event) => {
            event.preventDefault();
            void generateZine();
          }}
        >
          <div className="form-header">
            <h2>Create</h2>
          </div>

          <div className="field-cluster">
            <h3>Main Prompt</h3>
            <label>
              Prompt
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                rows={3}
                placeholder="Enter a solarpunk concept, collective, scene, or world fragment..."
              />
            </label>
          </div>

          <div className="field-cluster">
            <h3>Text Direction</h3>
            <label>
              What should the zine say?
              <textarea
                value={textDirection}
                onChange={(event) => setTextDirection(event.target.value)}
                rows={4}
                placeholder="Tell the AI what kind of text to write about the prompt..."
              />
            </label>
          </div>

          <div className="button-row">
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Generating…" : "Generate zine"}
            </button>
              <button className="secondary-button" type="button" onClick={() => { setPrompt(defaultPrompt); setTextDirection(defaultTextDirection); }}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="preview-column">
        <div className="preview-toolbar">
          <div>
            <strong>Preview</strong>
            <span>{sourceLabel}</span>
          </div>
          <button className="secondary-button" type="button" onClick={() => void downloadPreview()} disabled={!content}>
            Download PNG
          </button>
        </div>

        <div className="zine-stage" ref={previewRef} style={paletteCss}>
          <article className="zine-page">
            <div className="zine-layout">
              <div className="hero-image-frame">
                {imageDataUrl ? <img src={imageDataUrl} alt={content?.title ?? "Generated zine cover"} /> : <div className="image-placeholder">Your AI zine illustration appears here.</div>}
              </div>

              <div className="zine-copy">
                <h2>{content?.title ?? "Your future issue"}</h2>
                <p className="subtitle">{content?.subtitle ?? "A custom zine page will appear here."}</p>
                <p className="direction-note">{zineTextDirection}</p>

                <section className="story-block">
                  <p className="lede">{content?.hook ?? "A hopeful first line for your zine."}</p>
                  <p className="manifesto">{content?.manifesto ?? "Describe the future in your own voice, and the generator will turn it into a page you can share."}</p>
                </section>

                {content?.sections?.[0] ? (
                  <article className="section-card">
                    <h3>{content.sections[0].heading}</h3>
                    <p>{content.sections[0].body}</p>
                  </article>
                ) : null}
              </div>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
