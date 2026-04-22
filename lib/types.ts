export type ZineFormInput = {
  name: string;
  vibe: string;
  theme: string;
  symbols: string;
  message: string;
  palette: string;
  location: string;
};

export type ZineSection = {
  heading: string;
  body: string;
};

export type ZineContent = {
  title: string;
  subtitle: string;
  hook: string;
  manifesto: string;
  sections: ZineSection[];
  cta: string;
  footer: string;
  artPrompt: string;
  paletteName: string;
  palette: string[];
};

export type ZineGenerationResponse = {
  content: ZineContent;
  imageDataUrl: string;
  source: "google-ai" | "pollinations-ai";
};
