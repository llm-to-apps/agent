import { z } from "zod";

export const canvasGenerationModeSchema = z
  .enum(["static", "dataSnapshot", "interactive"])
  .optional()
  .default("static")
  .describe(
    "static for UI without app data, dataSnapshot for UI with retrieved app data, interactive for UI that declares host actions.",
  );

export const canvasDataSourceSchema = z.object({
  name: z.string().min(1).max(120),
  source: z.enum(["appMcp", "uploadedFiles", "agentContext"]),
  tool: z.string().min(1).max(160).optional(),
  input: z.unknown().optional(),
  data: z.unknown(),
});

export const canvasActionSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().min(1).max(500),
  inputSchema: z.unknown().optional(),
});

export const generateSandboxedUiInputSchema = z.object({
  title: z.string().min(1).max(160),
  mode: canvasGenerationModeSchema,
  prompt: z
    .string()
    .min(1)
    .max(4000)
    .describe("Short description of what this generated interface is for."),
  dataSources: z
    .array(canvasDataSourceSchema)
    .optional()
    .default([])
    .describe(
      "Data snapshots used by the canvas. For app data UIs, include the actual retrieved data and also embed it into the HTML.",
    ),
  actions: z
    .array(canvasActionSchema)
    .optional()
    .default([])
    .describe(
      "Host actions the iframe UI intends to request later via postMessage. Declare only actions the app can support.",
    ),
  html: z
    .string()
    .min(1)
    .max(200_000)
    .describe(
      "A complete iframe-ready HTML document with inline CSS and JavaScript. Include doctype, html, head, style, body, and script when useful. External scripts and styles are allowed only from the canvas runtime CSP allowlist. Prefer Tailwind CSS via https://cdn.tailwindcss.com for polished styling, Vue 3 global build via unpkg/jsdelivr for interactive state, and Chart.js via jsdelivr for charts. Default to a light, neutral, operational UI unless the user explicitly asks for dark mode. Do not output .vue files, JSX, TypeScript, npm installs, Vite configs, import maps, or build steps. For dataSnapshot or interactive mode, embed dataSources as initial JSON state inside the document before creating the UI.",
    ),
});

export const updateSandboxedUiInputSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  prompt: z
    .string()
    .min(1)
    .max(4000)
    .describe("Short description of the requested canvas edit."),
  changeSummary: z
    .string()
    .min(1)
    .max(1000)
    .describe("Concise summary of what changed in this canvas version."),
  html: z
    .string()
    .min(1)
    .max(200_000)
    .describe(
      "The full updated iframe-ready HTML document. Return the complete document, not a patch or partial snippet.",
    ),
});
