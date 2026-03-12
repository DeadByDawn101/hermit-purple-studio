import { useState, useEffect, useRef } from "react";
import { useComfyUI } from "./useComfyUI";

const WORKFLOWS = [
  { id: "txt2img", name: "Text → Image", icon: "✦", desc: "Generate images from a text prompt" },
  { id: "img2img", name: "Image → Image", icon: "⟳", desc: "Transform an existing image" },
  { id: "inpaint", name: "Inpaint", icon: "◈", desc: "Fill or replace a masked region" },
  { id: "upscale", name: "Upscale", icon: "⬡", desc: "Enhance image resolution" },
  { id: "controlnet", name: "ControlNet", icon: "⊕", desc: "Guided generation with structure" },
];

const SAMPLERS = ["euler", "euler_ancestral", "dpm_2", "dpm_2_ancestral", "dpmpp_2m", "dpmpp_sde", "ddim", "lcm"];
const SCHEDULERS = ["normal", "karras", "exponential", "sgm_uniform", "simple", "ddim_uniform"];
const FALLBACK_MODELS = ["v1-5-pruned-emaonly.ckpt", "dreamshaper_8.safetensors", "realisticVisionV60B1.safetensors"];

const defaultParams = {
  prompt: "",
  negative: "ugly, blurry, low quality, watermark, text",
  model: FALLBACK_MODELS[0],
  steps: 20,
  cfg: 7,
  width: 512,
  height: 512,
  seed: -1,
  sampler: "euler_ancestral",
  scheduler: "karras",
  denoise: 1.0,
  batchSize: 1,
};

// ─── Small UI components ──────────────────────────────────────────────────────

function Slider({ label, value, min, max, step = 1, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 12, color: "#e8d5ff", fontFamily: "monospace" }}>{value}</span>
      </div>
      <div style={{ position: "relative", height: 20, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: "#2a1f35", borderRadius: 99 }} />
        <div style={{
          position: "absolute", left: 0, height: 3, borderRadius: 99,
          width: `${((value - min) / (max - min)) * 100}%`,
          background: "linear-gradient(90deg, #7c3aed, #c084fc)"
        }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
          style={{ position: "absolute", left: 0, right: 0, width: "100%", opacity: 0, cursor: "pointer", height: 20, margin: 0 }}
        />
        <div style={{
          position: "absolute",
          left: `calc(${((value - min) / (max - min)) * 100}% - 7px)`,
          width: 14, height: 14, borderRadius: "50%",
          background: "#c084fc", boxShadow: "0 0 8px #a855f7", pointerEvents: "none"
        }} />
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", background: "#1a0f24", color: "#e8d5ff",
        border: "1px solid #3d2850", borderRadius: 6, padding: "7px 10px",
        fontSize: 12, fontFamily: "monospace", cursor: "pointer", outline: "none"
      }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ImageCard({ src, seed, filename, onClick }) {
  return (
    <div onClick={onClick} style={{
      aspectRatio: "1/1", borderRadius: 10, overflow: "hidden",
      background: "#1a0f24", border: "1px solid #3d2850",
      cursor: "pointer", position: "relative", transition: "transform 0.15s, box-shadow 0.15s"
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.boxShadow = "0 8px 32px #7c3aed55"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(transparent, rgba(10,5,20,0.9))",
        padding: "8px 10px 8px", fontSize: 10, color: "#9a8fa0", fontFamily: "monospace"
      }}>
        {filename ?? `seed: ${seed}`}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [workflow, setWorkflow] = useState("txt2img");
  const [params, setParams] = useState(defaultParams);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("generate");
  const [serverQueue, setServerQueue] = useState({ queue_running: [], queue_pending: [] });
  const [host, setHost] = useState("http://127.0.0.1:8188");
  const [log, setLog] = useState(["[system] ComfyUI Studio ready.", "[system] Enter your server address and click Connect."]);
  const logRef = useRef();

  const { status, models, progress, running, connect, disconnect, generate, getQueue, interrupt } = useComfyUI();

  const set = (key) => (val) => setParams(p => ({ ...p, [key]: val }));

  function addLog(msg) {
    setLog(prev => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  // Update model list when server connects
  useEffect(() => {
    if (models.length > 0) {
      set("model")(models[0]);
      addLog(`Loaded ${models.length} models from server.`);
    }
  }, [models]);

  async function handleConnect() {
    addLog(`Connecting to ${host}…`);
    const result = await connect(host);
    if (result.ok) {
      addLog(`Connected. ${result.models.length} checkpoint(s) found.`);
    } else {
      addLog(`✗ Connection failed: ${result.error}`);
    }
  }

  function handleDisconnect() {
    disconnect();
    addLog("Disconnected.");
  }

  async function handleGenerate() {
    if (running || status !== "connected") return;
    const seed = params.seed === -1 ? Math.floor(Math.random() * 2 ** 32) : params.seed;
    addLog(`Starting generation — workflow: ${workflow}, seed: ${seed}`);
    addLog(`Model: ${params.model} | Steps: ${params.steps} | CFG: ${params.cfg}`);

    await generate(
      host,
      workflow,
      { ...params, seed },
      (img) => {
        setHistory(h => [{ id: Date.now(), src: img.src, filename: img.filename, seed, workflow, params: { ...params, seed } }, ...h]);
      },
      (msg) => addLog(msg)
    );
  }

  async function handleRefreshQueue() {
    if (status === "disconnected") return;
    try {
      const q = await getQueue(host);
      setServerQueue(q);
    } catch (e) {
      addLog(`✗ Queue fetch failed: ${e.message}`);
    }
  }

  async function handleInterrupt() {
    await interrupt(host);
    addLog("⚡ Interrupt sent to server.");
  }

  const activeModels = models.length > 0 ? models : FALLBACK_MODELS;
  const statusColor = { disconnected: "#ef4444", connecting: "#f59e0b", connected: "#22c55e", generating: "#f59e0b", error: "#ef4444" }[status] ?? "#ef4444";
  const statusLabel = { disconnected: "Disconnected", connecting: "Connecting…", connected: "Connected", generating: "Generating…", error: "Error" }[status] ?? status;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0612", fontFamily: "'Space Mono', 'Courier New', monospace", color: "#e8d5ff", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0612; }
        ::-webkit-scrollbar-thumb { background: #3d2850; border-radius: 99px; }
        textarea, input, select { outline: none; }
        textarea:focus, input:focus { border-color: #7c3aed !important; }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: "1px solid #1e1228",
        background: "rgba(10,6,18,0.95)", backdropFilter: "blur(10px)",
        position: "sticky", top: 0, zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: "linear-gradient(135deg, #7c3aed, #c084fc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, boxShadow: "0 0 18px #7c3aed66"
          }}>⚡</div>
          <div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
              ComfyUI <span style={{ color: "#c084fc" }}>Studio</span>
            </div>
            <div style={{ fontSize: 9, color: "#6b5878", letterSpacing: "0.1em" }}>VISUAL WORKFLOW INTERFACE</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            value={host}
            onChange={e => setHost(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConnect()}
            style={{
              background: "#1a0f24", border: "1px solid #3d2850",
              borderRadius: 6, padding: "5px 10px", fontSize: 11,
              color: "#c084fc", width: 220, fontFamily: "monospace"
            }}
          />
          {running && (
            <button onClick={handleInterrupt} style={{
              padding: "5px 12px", borderRadius: 6, border: "1px solid #ef4444",
              background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer", fontFamily: "monospace"
            }}>■ Stop</button>
          )}
          <button
            onClick={status === "disconnected" || status === "error" ? handleConnect : handleDisconnect}
            style={{
              padding: "5px 14px", borderRadius: 6, border: "1px solid #3d2850",
              background: "#1a0f24", color: statusColor, fontSize: 11, cursor: "pointer",
              fontFamily: "monospace", display: "flex", alignItems: "center", gap: 6
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
            {statusLabel}
          </button>
        </div>
      </div>

      {/* Workflow selector */}
      <div style={{ display: "flex", gap: 8, padding: "14px 24px", borderBottom: "1px solid #1e1228", overflowX: "auto" }}>
        {WORKFLOWS.map(w => (
          <button key={w.id} onClick={() => setWorkflow(w.id)} style={{
            padding: "8px 18px", borderRadius: 8, border: "1px solid",
            borderColor: workflow === w.id ? "#7c3aed" : "#2a1f35",
            background: workflow === w.id ? "rgba(124,58,237,0.15)" : "#1a0f24",
            color: workflow === w.id ? "#c084fc" : "#6b5878",
            fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
            display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
            boxShadow: workflow === w.id ? "0 0 16px #7c3aed33" : "none"
          }}>
            <span style={{ fontSize: 14 }}>{w.icon}</span> {w.name}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: params */}
        <div style={{
          width: 280, flexShrink: 0, borderRight: "1px solid #1e1228",
          overflowY: "auto", padding: 20, background: "rgba(16,8,26,0.6)"
        }}>
          <div style={{ fontSize: 10, color: "#6b5878", letterSpacing: "0.1em", marginBottom: 14, textTransform: "uppercase" }}>Parameters</div>

          <Select label="Model" value={params.model} options={activeModels} onChange={set("model")} />
          <Select label="Sampler" value={params.sampler} options={SAMPLERS} onChange={set("sampler")} />
          <Select label="Scheduler" value={params.scheduler} options={SCHEDULERS} onChange={set("scheduler")} />

          <div style={{ height: 1, background: "#1e1228", margin: "16px 0" }} />

          <Slider label="Steps" value={params.steps} min={1} max={150} onChange={set("steps")} />
          <Slider label="CFG Scale" value={params.cfg} min={1} max={30} step={0.5} onChange={set("cfg")} />
          <Slider label="Denoise" value={params.denoise} min={0} max={1} step={0.01} onChange={set("denoise")} />

          <div style={{ height: 1, background: "#1e1228", margin: "16px 0" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[["Width", "width"], ["Height", "height"]].map(([l, k]) => (
              <div key={k}>
                <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                <select value={params[k]} onChange={e => set(k)(parseInt(e.target.value))} style={{
                  width: "100%", background: "#1a0f24", color: "#e8d5ff",
                  border: "1px solid #3d2850", borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "monospace"
                }}>
                  {[256, 384, 512, 640, 768, 1024, 1280, 1536].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            ))}
          </div>

          <Slider label="Batch Size" value={params.batchSize} min={1} max={8} onChange={set("batchSize")} />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>Seed</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" value={params.seed} onChange={e => set("seed")(parseInt(e.target.value))} style={{
                flex: 1, background: "#1a0f24", color: "#e8d5ff",
                border: "1px solid #3d2850", borderRadius: 6, padding: "6px 8px", fontSize: 12, fontFamily: "monospace"
              }} />
              <button onClick={() => set("seed")(Math.floor(Math.random() * 2 ** 32))} style={{
                padding: "6px 10px", borderRadius: 6, border: "1px solid #3d2850",
                background: "#1a0f24", color: "#c084fc", cursor: "pointer", fontSize: 14
              }} title="Random">⟳</button>
              <button onClick={() => set("seed")(-1)} style={{
                padding: "6px 10px", borderRadius: 6, border: "1px solid #3d2850",
                background: "#1a0f24", color: "#6b5878", cursor: "pointer", fontSize: 10
              }} title="Random each run">∞</button>
            </div>
          </div>
        </div>

        {/* Center */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #1e1228", padding: "0 24px" }}>
            {[["generate", "Generate"], ["history", `History (${history.length})`], ["queue", "Server Queue"]].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); if (id === "queue") handleRefreshQueue(); }} style={{
                padding: "12px 18px", background: "none", border: "none",
                borderBottom: tab === id ? "2px solid #c084fc" : "2px solid transparent",
                color: tab === id ? "#c084fc" : "#6b5878",
                cursor: "pointer", fontSize: 12, fontFamily: "monospace", marginBottom: -1
              }}>{label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            {tab === "generate" && (
              <div style={{ maxWidth: 700, margin: "0 auto" }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Positive Prompt</div>
                  <textarea
                    value={params.prompt}
                    onChange={e => set("prompt")(e.target.value)}
                    placeholder="Describe what you want to generate…"
                    rows={4}
                    style={{
                      width: "100%", background: "#1a0f24", color: "#e8d5ff",
                      border: "1px solid #3d2850", borderRadius: 8, padding: "12px 14px",
                      fontSize: 13, fontFamily: "monospace", resize: "vertical", lineHeight: 1.6
                    }}
                  />
                </div>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Negative Prompt</div>
                  <textarea
                    value={params.negative}
                    onChange={e => set("negative")(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", background: "#1a0f24", color: "#9a8fa0",
                      border: "1px solid #2a1f35", borderRadius: 8, padding: "10px 14px",
                      fontSize: 12, fontFamily: "monospace", resize: "vertical"
                    }}
                  />
                </div>

                {/* Generate button */}
                <div style={{ marginBottom: 28 }}>
                  <button
                    onClick={handleGenerate}
                    disabled={running || status !== "connected"}
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 10, border: "none",
                      cursor: (running || status !== "connected") ? "not-allowed" : "pointer",
                      background: running
                        ? "linear-gradient(135deg, #3d1d5c, #5b2d82)"
                        : status !== "connected"
                          ? "#1a0f24"
                          : "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: status !== "connected" ? "#6b5878" : "#fff",
                      fontFamily: "monospace", fontSize: 13, letterSpacing: "0.1em", fontWeight: 700,
                      position: "relative", overflow: "hidden",
                      boxShadow: (!running && status === "connected") ? "0 4px 24px #7c3aed66" : "none"
                    }}
                  >
                    {running && (
                      <div style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: `${progress}%`, background: "rgba(168,85,247,0.25)", transition: "width 0.4s ease"
                      }} />
                    )}
                    <span style={{ position: "relative" }}>
                      {running ? `GENERATING… ${progress}%` : status !== "connected" ? "CONNECT TO SERVER FIRST" : "⚡ GENERATE"}
                    </span>
                  </button>
                </div>

                {/* Latest results */}
                {history.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: "#6b5878", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Latest Output</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                      {history.slice(0, 4).map(img => (
                        <ImageCard key={img.id} src={img.src} seed={img.seed} filename={img.filename} onClick={() => setSelected(img)} />
                      ))}
                    </div>
                  </div>
                )}

                {history.length === 0 && !running && (
                  <div style={{ textAlign: "center", padding: "60px 20px", border: "1px dashed #2a1f35", borderRadius: 12 }}>
                    <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>⚡</div>
                    <div style={{ color: "#6b5878", fontSize: 13 }}>Connect to your ComfyUI server and generate your first image</div>
                  </div>
                )}
              </div>
            )}

            {tab === "history" && (
              history.length === 0
                ? <div style={{ textAlign: "center", padding: 60, color: "#6b5878" }}>No history yet</div>
                : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                  {history.map(img => (
                    <ImageCard key={img.id} src={img.src} seed={img.seed} filename={img.filename} onClick={() => setSelected(img)} />
                  ))}
                </div>
            )}

            {tab === "queue" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 10, color: "#6b5878", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Running: {serverQueue.queue_running.length} | Pending: {serverQueue.queue_pending.length}
                  </div>
                  <button onClick={handleRefreshQueue} style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid #3d2850",
                    background: "#1a0f24", color: "#9a8fa0", cursor: "pointer", fontSize: 11, fontFamily: "monospace"
                  }}>⟳ Refresh</button>
                </div>
                {[...serverQueue.queue_running, ...serverQueue.queue_pending].length === 0
                  ? <div style={{ textAlign: "center", padding: 60, color: "#6b5878" }}>Queue is empty</div>
                  : [...serverQueue.queue_running.map(j => ({ ...j, state: "running" })), ...serverQueue.queue_pending.map(j => ({ ...j, state: "pending" }))].map((job, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "12px 16px", borderRadius: 8, marginBottom: 8,
                      background: "#1a0f24", border: `1px solid ${job.state === "running" ? "#7c3aed" : "#2a1f35"}`
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%",
                        background: job.state === "running" ? "#22c55e" : "#6b5878",
                        boxShadow: job.state === "running" ? "0 0 6px #22c55e" : "none"
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "#c084fc", fontFamily: "monospace" }}>{job[0]} — {job.state}</div>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Log console */}
          <div style={{ borderTop: "1px solid #1e1228", background: "#080410", height: 110, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "6px 14px 4px", fontSize: 9, color: "#3d2850", letterSpacing: "0.12em" }}>CONSOLE LOG</div>
            <div ref={logRef} style={{ flex: 1, overflowY: "auto", padding: "0 14px 10px" }}>
              {log.map((line, i) => (
                <div key={i} style={{
                  fontSize: 11, fontFamily: "monospace", lineHeight: 1.7,
                  color: line.includes("✓") ? "#22c55e" : line.includes("✗") ? "#ef4444" : line.includes("system") ? "#6b5878" : "#9a8fa0"
                }}>{line}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Image detail modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 999, backdropFilter: "blur(8px)"
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#12091e", borderRadius: 14, border: "1px solid #3d2850",
            padding: 24, maxWidth: 700, width: "90vw", maxHeight: "90vh",
            overflowY: "auto", display: "flex", gap: 24, flexWrap: "wrap"
          }}>
            <img src={selected.src} alt="" style={{ width: 280, height: 280, borderRadius: 10, objectFit: "cover" }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Image Details</div>
              {[
                ["Workflow", selected.workflow],
                ["File", selected.filename ?? "—"],
                ["Seed", selected.seed],
                ["Model", selected.params.model],
                ["Steps", selected.params.steps],
                ["CFG", selected.params.cfg],
                ["Sampler", selected.params.sampler],
                ["Scheduler", selected.params.scheduler],
                ["Size", `${selected.params.width}×${selected.params.height}`],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#6b5878", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 12, color: "#c084fc", fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
              {selected.prompt && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 9, color: "#6b5878", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Prompt</div>
                  <div style={{ fontSize: 12, color: "#e8d5ff", lineHeight: 1.6 }}>{selected.params.prompt}</div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
                <button onClick={() => { setParams(selected.params); setWorkflow(selected.workflow); setSelected(null); setTab("generate"); }} style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "monospace"
                }}>⟳ Reuse Params</button>
                <button onClick={() => setSelected(null)} style={{
                  padding: "8px 16px", borderRadius: 8, border: "1px solid #3d2850",
                  background: "#1a0f24", color: "#9a8fa0", fontSize: 12, cursor: "pointer", fontFamily: "monospace"
                }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
