/**
 * useANE — React hook for ANE inference server integration
 *
 * Connects to ane_inference.py HTTP server (default port 8189).
 * Endpoints:
 *   GET  /health           → { status: "ok" }
 *   GET  /status           → { device, chip, ram_gb, ne_cores, ne_tflops, macos }
 *   GET  /models           → { models: [...], ane_capable: [...] }
 *   POST /generate         → { prompt, model, max_tokens, temperature }
 *                          ← { text, backend, model, elapsed_ms, tokens, error }
 *   POST /prompt-enhance   → { prompt, style }
 *                          ← { enhanced, backend, elapsed_ms }
 */

import { useState, useRef, useCallback } from "react";

export const ANE_MODELS = [
  { id: "stories110m", label: "Stories 110M", params: "110M", capable: true,  dim: 768,  layers: 12 },
  { id: "qwen3-0.6b",  label: "Qwen3 0.6B",  params: "0.6B", capable: true,  dim: 1024, layers: 28 },
  { id: "qwen3-1.5b",  label: "Qwen3 1.5B",  params: "1.5B", capable: false, dim: 1536, layers: 28 },
  { id: "qwen3-7b",    label: "Qwen3 7B",     params: "7B",   capable: false, dim: 3584, layers: 32 },
];

export const DEFAULT_ANE_HOST = "http://127.0.0.1:8189";

export function useANE() {
  const [status, setStatus]         = useState("disconnected");   // disconnected | connecting | connected | generating | error
  const [device, setDevice]         = useState(null);             // device info from /status
  const [availableModels, setAvailableModels] = useState(ANE_MODELS);
  const [generating, setGenerating] = useState(false);
  const [enhancing, setEnhancing]   = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const abortRef = useRef(null);

  // ── Connect: hit /health then /status ────────────────────────────────────
  const connect = useCallback(async (host = DEFAULT_ANE_HOST) => {
    setStatus("connecting");
    try {
      const health = await fetch(`${host}/health`, { signal: AbortSignal.timeout(4000) });
      if (!health.ok) throw new Error("Health check failed");

      // Try /status (new endpoint — falls back gracefully if not yet patched)
      let deviceInfo = null;
      try {
        const s = await fetch(`${host}/status`, { signal: AbortSignal.timeout(3000) });
        if (s.ok) deviceInfo = await s.json();
      } catch (_) { /* server not yet patched — that's fine */ }

      // Try /models
      let modelInfo = null;
      try {
        const m = await fetch(`${host}/models`, { signal: AbortSignal.timeout(3000) });
        if (m.ok) modelInfo = await m.json();
      } catch (_) {}

      if (deviceInfo) setDevice(deviceInfo);
      if (modelInfo?.models) {
        // Merge server model list with our local capability table
        setAvailableModels(prev =>
          prev.map(m => ({ ...m, available: modelInfo.models.includes(m.id) }))
        );
      }

      setStatus("connected");
      return { ok: true, device: deviceInfo };
    } catch (err) {
      setStatus("error");
      return { ok: false, error: err.message };
    }
  }, []);

  const disconnect = useCallback(() => {
    abortRef.current?.abort();
    setStatus("disconnected");
    setDevice(null);
    setLastResult(null);
  }, []);

  // ── Generate: POST /generate ──────────────────────────────────────────────
  const generate = useCallback(async (host, { prompt, model, max_tokens = 256, temperature = 0.7 }, onLog) => {
    if (generating) return null;
    setGenerating(true);
    setStatus("generating");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      onLog?.(`[ANE] Submitting to ${model}…`);
      const t0 = Date.now();

      const res = await fetch(`${host}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, model, max_tokens, temperature }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const result = {
        ...data,
        client_elapsed_ms: Date.now() - t0,
      };
      setLastResult(result);

      const bLabel = data.backend === "ane" ? "⚡ ANE" : "☁ Anthropic";
      onLog?.(`[ANE] ${bLabel} → ${data.tokens ?? "?"} tokens in ${data.elapsed_ms ?? "?"}ms`);
      if (data.error) onLog?.(`[ANE] ✗ ${data.error}`);

      return result;
    } catch (err) {
      if (err.name !== "AbortError") {
        onLog?.(`[ANE] ✗ ${err.message}`);
      }
      return null;
    } finally {
      setGenerating(false);
      setStatus(status === "generating" ? "connected" : status);
    }
  }, [generating, status]);

  // ── Prompt Enhance: POST /prompt-enhance ─────────────────────────────────
  const enhancePrompt = useCallback(async (host, { prompt, style = "photorealistic" }, onLog) => {
    if (enhancing || status === "disconnected") return null;
    setEnhancing(true);
    try {
      onLog?.(`[ANE] Enhancing prompt via ANE…`);
      const res = await fetch(`${host}/prompt-enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      onLog?.(`[ANE] ✓ Prompt enhanced in ${data.elapsed_ms ?? "?"}ms via ${data.backend}`);
      return data.enhanced ?? null;
    } catch (err) {
      onLog?.(`[ANE] Enhance failed: ${err.message}`);
      return null;
    } finally {
      setEnhancing(false);
    }
  }, [enhancing, status]);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setGenerating(false);
    setEnhancing(false);
    setStatus("connected");
  }, []);

  return {
    status,
    device,
    availableModels,
    generating,
    enhancing,
    lastResult,
    connect,
    disconnect,
    generate,
    enhancePrompt,
    abort,
  };
}
