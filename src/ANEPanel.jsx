/**
 * ANEPanel.jsx
 * The ⚡ ANE tab inside hermit-purple-studio.
 *
 * Features:
 *  - Connect/disconnect to ane_inference.py server (port 8189)
 *  - Device info card: chip, NE cores, TOPS, RAM
 *  - Model picker with ANE-capable badge
 *  - Generation panel: prompt → ANE/Anthropic → streamed response
 *  - Prompt Enhance button: sends ComfyUI prompt to ANE, gets enriched version
 *  - Backend indicator: shows whether response came from local ANE or Anthropic API
 *  - Live log shared with parent
 */

import { useState, useRef, useEffect } from "react";
import { useANE, ANE_MODELS, DEFAULT_ANE_HOST } from "./useANE";

// ── Colours consistent with the existing dark purple theme ───────────────────
const C = {
  bg:      "#0a0612",
  surface: "#1a0f24",
  border:  "#2a1f35",
  borderB: "#3d2850",
  accent:  "#7c3aed",
  accentL: "#c084fc",
  green:   "#22c55e",
  amber:   "#f59e0b",
  red:     "#ef4444",
  cyan:    "#22d3ee",
  text:    "#e8d5ff",
  muted:   "#9a8fa0",
  dim:     "#6b5878",
};

function Pill({ label, color }) {
  return (
    <span style={{
      fontSize: 9, fontFamily: "monospace", letterSpacing: ".1em",
      padding: "2px 7px", borderRadius: 99,
      border: `1px solid ${color}44`, background: `${color}18`, color,
    }}>{label}</span>
  );
}

function DeviceCard({ device, ne_tflops = 12.57 }) {
  if (!device) return null;
  const rows = [
    ["chip",     device.chip ?? "M4 Max"],
    ["ANE",      `${device.ne_cores ?? 16}-core · ${ne_tflops} TFLOPS FP16`],
    ["RAM",      device.ram_gb ? `${device.ram_gb} GB unified` : "—"],
    ["macOS",    device.macos ?? "—"],
  ];
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.borderB}`,
      borderRadius: 10, padding: "14px 16px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: `linear-gradient(135deg, ${C.accent}, ${C.cyan})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, boxShadow: `0 0 12px ${C.accent}55`,
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 12, color: C.text, fontFamily: "monospace", fontWeight: 700 }}>
            Apple Neural Engine
          </div>
          <div style={{ fontSize: 10, color: C.dim }}>local inference · zero network latency</div>
        </div>
        <Pill label="ONLINE" color={C.green} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 1 }}>{k}</div>
            <div style={{ fontSize: 11, color: C.accentL, fontFamily: "monospace" }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModelPicker({ models, selected, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>
        Model
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {models.map(m => {
          const active = selected === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onChange(m.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px", borderRadius: 8,
                border: `1px solid ${active ? C.accent : C.border}`,
                background: active ? `${C.accent}18` : C.surface,
                color: active ? C.accentL : C.muted,
                cursor: "pointer", textAlign: "left", transition: "all .15s",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: m.capable ? C.green : C.amber,
                  boxShadow: m.capable ? `0 0 5px ${C.green}` : "none",
                }} />
                <span style={{ fontSize: 12, fontFamily: "monospace" }}>{m.label}</span>
                <span style={{ fontSize: 10, color: C.dim }}>{m.params}</span>
              </div>
              <Pill
                label={m.capable ? "⚡ ANE" : "☁ API"}
                color={m.capable ? C.green : C.amber}
              />
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: C.dim, marginTop: 8, lineHeight: 1.6 }}>
        ⚡ ANE — runs locally on the Neural Engine (≤0.6B params)<br/>
        ☁ API — routes to Anthropic (larger models)
      </div>
    </div>
  );
}

function BackendBadge({ backend, elapsed_ms, tokens }) {
  if (!backend) return null;
  const isANE = backend === "ane";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "5px 12px", borderRadius: 99,
      border: `1px solid ${isANE ? C.green : C.amber}44`,
      background: `${isANE ? C.green : C.amber}10`,
      marginBottom: 10,
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: isANE ? C.green : C.amber,
        boxShadow: `0 0 6px ${isANE ? C.green : C.amber}`,
      }} />
      <span style={{ fontSize: 10, color: isANE ? C.green : C.amber, fontFamily: "monospace" }}>
        {isANE ? "⚡ Apple Neural Engine" : "☁ Anthropic API"}
      </span>
      {elapsed_ms && (
        <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>
          {elapsed_ms}ms
        </span>
      )}
      {tokens && (
        <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>
          · {tokens} tok
        </span>
      )}
    </div>
  );
}

function ResponseBox({ text, backend, elapsed_ms, tokens }) {
  if (!text) return null;
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.borderB}`,
      borderRadius: 10, padding: 16, marginTop: 16,
    }}>
      <BackendBadge backend={backend} elapsed_ms={elapsed_ms} tokens={tokens} />
      <div style={{
        fontSize: 13, color: C.text, lineHeight: 1.75,
        fontFamily: "'Space Mono', monospace",
        whiteSpace: "pre-wrap", wordBreak: "break-word",
      }}>
        {text}
      </div>
    </div>
  );
}

// ── Main panel ───────────────────────────────────────────────────────────────

export default function ANEPanel({ addLog, comfyPrompt, onEnhancedPrompt }) {
  const [host, setHost] = useState(DEFAULT_ANE_HOST);
  const [model, setModel] = useState("qwen3-0.6b");
  const [prompt, setPrompt] = useState("");
  const [maxTokens, setMaxTokens] = useState(256);
  const [temperature, setTemperature] = useState(0.7);
  const [subTab, setSubTab] = useState("chat");  // "chat" | "enhance"

  const {
    status, device, availableModels, generating, enhancing,
    lastResult, connect, disconnect, generate, enhancePrompt, abort,
  } = useANE();

  const statusColor = {
    disconnected: C.red, connecting: C.amber, connected: C.green,
    generating: C.amber, error: C.red,
  }[status] ?? C.red;

  const statusLabel = {
    disconnected: "Disconnected", connecting: "Connecting…",
    connected: "Connected", generating: "Generating…", error: "Connection Error",
  }[status] ?? status;

  async function handleConnect() {
    addLog(`[ANE] Connecting to ${host}…`);
    const r = await connect(host);
    if (r.ok) {
      addLog(`[ANE] ✓ Connected${r.device?.chip ? ` — ${r.device.chip}` : ""}`);
    } else {
      addLog(`[ANE] ✗ ${r.error}`);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    const result = await generate(host, { prompt, model, max_tokens: maxTokens, temperature }, addLog);
    if (result?.error) addLog(`[ANE] ✗ ${result.error}`);
  }

  async function handleEnhance() {
    if (!comfyPrompt?.trim()) {
      addLog("[ANE] No ComfyUI prompt to enhance — type something in the Generate tab first.");
      return;
    }
    addLog(`[ANE] Enhancing: "${comfyPrompt.slice(0, 60)}…"`);
    const enhanced = await enhancePrompt(host, { prompt: comfyPrompt, style: "photorealistic cinematic" }, addLog);
    if (enhanced) {
      onEnhancedPrompt?.(enhanced);
      addLog(`[ANE] ✓ Prompt enhanced and applied to ComfyUI.`);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 680, margin: "0 auto" }}>

      {/* Connection bar */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center", marginBottom: 20,
        padding: "10px 14px", background: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 10,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: statusColor, boxShadow: `0 0 6px ${statusColor}`,
          flexShrink: 0,
        }} />
        <input
          value={host}
          onChange={e => setHost(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleConnect()}
          style={{
            flex: 1, background: "transparent", border: "none",
            color: C.accentL, fontSize: 11, fontFamily: "monospace",
          }}
        />
        <span style={{ fontSize: 10, color: statusColor, fontFamily: "monospace", flexShrink: 0 }}>
          {statusLabel}
        </span>
        {(generating || enhancing) ? (
          <button onClick={abort} style={{
            padding: "4px 10px", borderRadius: 6,
            border: `1px solid ${C.red}`, background: "transparent",
            color: C.red, fontSize: 10, cursor: "pointer", fontFamily: "monospace",
          }}>■ Stop</button>
        ) : (
          <button
            onClick={status === "disconnected" || status === "error" ? handleConnect : disconnect}
            style={{
              padding: "4px 12px", borderRadius: 6,
              border: `1px solid ${C.borderB}`, background: C.bg,
              color: C.muted, fontSize: 10, cursor: "pointer", fontFamily: "monospace",
            }}
          >
            {status === "disconnected" || status === "error" ? "Connect" : "Disconnect"}
          </button>
        )}
      </div>

      {/* Device card */}
      {device && <DeviceCard device={device} />}

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {[["chat", "💬 Chat"], ["enhance", "✨ Enhance Prompt"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} style={{
            padding: "8px 16px", background: "none", border: "none",
            borderBottom: subTab === id ? `2px solid ${C.accentL}` : "2px solid transparent",
            color: subTab === id ? C.accentL : C.dim,
            cursor: "pointer", fontSize: 12, fontFamily: "monospace", marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {subTab === "chat" && (
        <>
          <ModelPicker models={availableModels} selected={model} onChange={setModel} />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
              Prompt
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === "Enter" && e.metaKey && handleGenerate()}
              placeholder="Ask the ANE something… (⌘↵ to generate)"
              rows={4}
              style={{
                width: "100%", background: C.surface, color: C.text,
                border: `1px solid ${C.borderB}`, borderRadius: 8,
                padding: "12px 14px", fontSize: 13, fontFamily: "monospace",
                resize: "vertical", lineHeight: 1.6,
              }}
            />
          </div>

          {/* Sliders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            {[
              { label: "Max Tokens", value: maxTokens, min: 32, max: 512, step: 16, set: setMaxTokens },
              { label: "Temperature", value: temperature, min: 0, max: 1, step: 0.05, set: setTemperature },
            ].map(({ label, value, min, max, step, set }) => (
              <div key={label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
                  <span style={{ fontSize: 11, color: C.accentL, fontFamily: "monospace" }}>{value}</span>
                </div>
                <input
                  type="range" min={min} max={max} step={step} value={value}
                  onChange={e => set(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: C.accent }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || status !== "connected" || !prompt.trim()}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
              cursor: (generating || status !== "connected") ? "not-allowed" : "pointer",
              background: generating
                ? `linear-gradient(135deg, #2a1040, #3d1d5c)`
                : status !== "connected"
                  ? C.surface
                  : `linear-gradient(135deg, ${C.accent}, #a855f7)`,
              color: status !== "connected" ? C.dim : "#fff",
              fontFamily: "monospace", fontSize: 13, letterSpacing: ".1em", fontWeight: 700,
              boxShadow: (!generating && status === "connected") ? `0 4px 24px ${C.accent}55` : "none",
            }}
          >
            {generating ? "GENERATING…" : status !== "connected" ? "CONNECT FIRST" : "⚡ RUN ON ANE"}
          </button>

          <ResponseBox
            text={lastResult?.text}
            backend={lastResult?.backend}
            elapsed_ms={lastResult?.elapsed_ms}
            tokens={lastResult?.tokens}
          />
        </>
      )}

      {subTab === "enhance" && (
        <div>
          <div style={{
            background: C.surface, border: `1px solid ${C.borderB}`,
            borderRadius: 10, padding: 20, marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, color: C.accentL, fontFamily: "monospace", fontWeight: 700, marginBottom: 8 }}>
              ✨ ANE Prompt Enhancer
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>
              Takes the current ComfyUI prompt and runs it through the ANE (or Anthropic fallback)
              to add cinematic lighting, composition cues, and detail — then injects the result
              back into the Generate tab automatically.
            </div>

            <div style={{
              padding: "10px 14px", background: C.bg,
              border: `1px solid ${C.border}`, borderRadius: 8,
              fontFamily: "monospace", fontSize: 12, color: C.muted,
              minHeight: 60, marginBottom: 16, lineHeight: 1.6,
            }}>
              {comfyPrompt?.trim()
                ? <><span style={{ color: C.dim }}>Current ComfyUI prompt:</span><br/><span style={{ color: C.text }}>{comfyPrompt}</span></>
                : <span style={{ color: C.dim }}>No prompt yet — type something in the Generate tab first.</span>
              }
            </div>

            <button
              onClick={handleEnhance}
              disabled={enhancing || status !== "connected" || !comfyPrompt?.trim()}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                cursor: (enhancing || status !== "connected" || !comfyPrompt?.trim()) ? "not-allowed" : "pointer",
                background: enhancing
                  ? `linear-gradient(135deg, #1a2a1f, #1f3528)`
                  : status !== "connected"
                    ? C.surface
                    : `linear-gradient(135deg, #14532d, #15803d)`,
                color: (status !== "connected" || !comfyPrompt?.trim()) ? C.dim : "#dcfce7",
                fontFamily: "monospace", fontSize: 12, letterSpacing: ".1em", fontWeight: 700,
                boxShadow: (!enhancing && status === "connected" && comfyPrompt?.trim()) ? "0 4px 20px #15803d44" : "none",
              }}
            >
              {enhancing ? "ENHANCING…" : "✨ ENHANCE VIA ANE → APPLY TO COMFYUI"}
            </button>
          </div>

          {/* Pipeline diagram */}
          <div style={{
            padding: "16px 20px", background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 10,
          }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 14 }}>
              Integration Pipeline
            </div>
            {[
              { icon: "✏️", label: "Your prompt", desc: "typed in Generate tab" },
              { icon: "⚡", label: "ANE / Anthropic", desc: "enhances with detail cues", color: C.green },
              { icon: "🎨", label: "ComfyUI KSampler", desc: "GPU image generation", color: C.accentL },
              { icon: "🖼️", label: "Output image", desc: "appears in history" },
            ].map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: i < 3 ? 0 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: step.color ? `${step.color}18` : C.bg,
                    border: `1px solid ${step.color ? step.color + "44" : C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16,
                  }}>{step.icon}</div>
                  {i < 3 && <div style={{ width: 1, height: 20, background: C.border, margin: "4px 0" }} />}
                </div>
                <div style={{ paddingTop: 4 }}>
                  <div style={{ fontSize: 12, color: step.color ?? C.text, fontFamily: "monospace" }}>{step.label}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
