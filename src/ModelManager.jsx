import { useState, useRef } from "react";

const HF_MODEL_TYPES = [
  { id: "checkpoint", label: "Checkpoint", folder: "checkpoints", exts: [".safetensors", ".ckpt"] },
  { id: "lora", label: "LoRA", folder: "loras", exts: [".safetensors", ".pt"] },
  { id: "vae", label: "VAE", folder: "vae", exts: [".safetensors", ".pt"] },
  { id: "controlnet", label: "ControlNet", folder: "controlnet", exts: [".safetensors", ".pth"] },
  { id: "upscaler", label: "Upscaler", folder: "upscale_models", exts: [".pth", ".pt"] },
  { id: "embedding", label: "Embedding", folder: "embeddings", exts: [".safetensors", ".pt", ".bin"] },
];

// Popular curated models from HuggingFace
const FEATURED_MODELS = [
  {
    name: "Stable Diffusion 1.5",
    repo: "runwayml/stable-diffusion-v1-5",
    file: "v1-5-pruned-emaonly.safetensors",
    type: "checkpoint",
    size: "3.97 GB",
    desc: "The classic SD 1.5 base model",
    tags: ["base", "popular"],
  },
  {
    name: "DreamShaper 8",
    repo: "Lykon/dreamshaper-8",
    file: "DreamShaper_8_pruned.safetensors",
    type: "checkpoint",
    size: "2.13 GB",
    desc: "Versatile artistic model, great for portraits and fantasy",
    tags: ["artistic", "popular"],
  },
  {
    name: "Realistic Vision 6.0",
    repo: "SG161222/Realistic_Vision_V6.0_B1_noVAE",
    file: "Realistic_Vision_V6.0_NV_B1.safetensors",
    type: "checkpoint",
    size: "2.13 GB",
    desc: "Photorealistic humans and scenes",
    tags: ["realistic", "popular"],
  },
  {
    name: "SDXL Base 1.0",
    repo: "stabilityai/stable-diffusion-xl-base-1.0",
    file: "sd_xl_base_1.0.safetensors",
    type: "checkpoint",
    size: "6.94 GB",
    desc: "High-res 1024px generation from Stability AI",
    tags: ["xl", "base"],
  },
  {
    name: "SDXL Turbo",
    repo: "stabilityai/sdxl-turbo",
    file: "sd_xl_turbo_1.0_fp16.safetensors",
    type: "checkpoint",
    size: "3.09 GB",
    desc: "Fast single-step generation",
    tags: ["xl", "fast"],
  },
  {
    name: "VAE ft-mse-840000",
    repo: "stabilityai/sd-vae-ft-mse-original",
    file: "vae-ft-mse-840000-ema-pruned.safetensors",
    type: "vae",
    size: "335 MB",
    desc: "Improved VAE for SD 1.x models",
    tags: ["vae"],
  },
  {
    name: "ControlNet Canny",
    repo: "lllyasviel/sd-controlnet-canny",
    file: "diffusion_pytorch_model.safetensors",
    type: "controlnet",
    size: "1.45 GB",
    desc: "Edge-guided image generation",
    tags: ["controlnet"],
  },
  {
    name: "ControlNet OpenPose",
    repo: "lllyasviel/sd-controlnet-openpose",
    file: "diffusion_pytorch_model.safetensors",
    type: "controlnet",
    size: "1.45 GB",
    desc: "Pose-guided human generation",
    tags: ["controlnet"],
  },
];

function Tag({ label }) {
  const colors = {
    popular: ["#7c3aed22", "#c084fc"],
    base: ["#1e3a5f22", "#60a5fa"],
    xl: ["#1a3322", "#4ade80"],
    fast: ["#3a1a0022", "#fb923c"],
    realistic: ["#1a1a3a22", "#818cf8"],
    artistic: ["#3a1a2222", "#f472b6"],
    vae: ["#1a2a1a22", "#86efac"],
    controlnet: ["#2a1a1a22", "#fca5a5"],
  };
  const [bg, text] = colors[label] ?? ["#2a1f3522", "#9a8fa0"];
  return (
    <span style={{
      background: bg, color: text, border: `1px solid ${text}44`,
      borderRadius: 4, padding: "2px 7px", fontSize: 10, fontFamily: "monospace"
    }}>{label}</span>
  );
}

function DownloadItem({ name, progress, status, onCancel }) {
  return (
    <div style={{ padding: "12px 16px", borderRadius: 8, background: "#1a0f24", border: "1px solid #2a1f35", marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12, color: "#e8d5ff" }}>{name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#9a8fa0", fontFamily: "monospace" }}>{progress}%</span>
          {status === "downloading" && (
            <button onClick={onCancel} style={{
              background: "none", border: "1px solid #ef444444", color: "#ef4444",
              borderRadius: 4, padding: "2px 8px", fontSize: 10, cursor: "pointer", fontFamily: "monospace"
            }}>cancel</button>
          )}
        </div>
      </div>
      <div style={{ height: 4, background: "#2a1f35", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 99, transition: "width 0.3s",
          width: `${progress}%`,
          background: status === "done" ? "#22c55e" : status === "error" ? "#ef4444" : "linear-gradient(90deg, #7c3aed, #c084fc)"
        }} />
      </div>
      <div style={{ fontSize: 10, color: status === "done" ? "#22c55e" : status === "error" ? "#ef4444" : "#6b5878", marginTop: 5, fontFamily: "monospace" }}>
        {status === "done" ? "✓ Complete" : status === "error" ? "✗ Failed" : status === "cancelled" ? "Cancelled" : "Downloading…"}
      </div>
    </div>
  );
}

export default function ModelManager({ host, installedModels, onRefresh, addLog }) {
  const [tab, setTab] = useState("browse"); // browse | custom | local | downloads
  const [downloads, setDownloads] = useState([]);
  const [hfRepo, setHfRepo] = useState("");
  const [hfFile, setHfFile] = useState("");
  const [hfToken, setHfToken] = useState("");
  const [modelType, setModelType] = useState("checkpoint");
  const [filterTag, setFilterTag] = useState("all");
  const [search, setSearch] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [localType, setLocalType] = useState("checkpoint");
  const fileInputRef = useRef();
  const abortRefs = useRef({});

  const allTags = ["all", "popular", "base", "xl", "fast", "realistic", "artistic", "vae", "controlnet"];

  const filteredModels = FEATURED_MODELS.filter(m => {
    const matchTag = filterTag === "all" || m.tags.includes(filterTag);
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.repo.toLowerCase().includes(search.toLowerCase());
    return matchTag && matchSearch;
  });

  async function downloadFromHF(model) {
    const id = Date.now();
    const dlName = model.name ?? `${model.repo}/${model.file}`;
    setDownloads(d => [...d, { id, name: dlName, progress: 0, status: "downloading" }]);
    setTab("downloads");
    addLog?.(`Starting download: ${dlName}`);

    const typeInfo = HF_MODEL_TYPES.find(t => t.id === (model.type ?? modelType));
    const destFolder = typeInfo?.folder ?? "checkpoints";
    const url = `https://huggingface.co/${model.repo}/resolve/main/${model.file}`;

    try {
      // Ask ComfyUI server to download the file (via a custom endpoint if available,
      // otherwise instruct user to use the direct URL)
      // ComfyUI doesn't have a built-in download endpoint, so we'll use the
      // /upload/image workaround for small files, or stream via fetch for direct download

      const headers = hfToken ? { Authorization: `Bearer ${hfToken}` } : {};
      const controller = new AbortController();
      abortRefs.current[id] = controller;

      const response = await fetch(url, { headers, signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const total = parseInt(response.headers.get("content-length") ?? "0");
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        const pct = total ? Math.round((received / total) * 100) : 0;
        setDownloads(d => d.map(x => x.id === id ? { ...x, progress: pct } : x));
      }

      // Combine chunks into a blob
      const blob = new Blob(chunks);
      const filename = model.file.split("/").pop();

      // Trigger browser download so user can place it in ComfyUI's models folder
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      setDownloads(d => d.map(x => x.id === id ? { ...x, progress: 100, status: "done" } : x));
      addLog?.(`✓ Downloaded: ${filename} → move to ComfyUI/models/${destFolder}/`);
      onRefresh?.();
    } catch (err) {
      if (err.name === "AbortError") {
        setDownloads(d => d.map(x => x.id === id ? { ...x, status: "cancelled" } : x));
        addLog?.(`Cancelled: ${dlName}`);
      } else {
        setDownloads(d => d.map(x => x.id === id ? { ...x, status: "error" } : x));
        addLog?.(`✗ Download failed: ${err.message}`);
      }
    }
  }

  function cancelDownload(id) {
    abortRefs.current[id]?.abort();
  }

  function handleCustomDownload() {
    if (!hfRepo || !hfFile) return;
    downloadFromHF({ repo: hfRepo, file: hfFile, type: modelType, name: `${hfRepo}/${hfFile}` });
    setHfRepo(""); setHfFile("");
  }

  function handleLocalImport() {
    if (!localPath) return;
    const filename = localPath.split(/[\\/]/).pop();
    const typeInfo = HF_MODEL_TYPES.find(t => t.id === localType);
    addLog?.(`Local import: ${filename} → ComfyUI/models/${typeInfo?.folder}/${filename}`);
    alert(`Copy this file to your ComfyUI models folder:\n\nFrom: ${localPath}\nTo: ComfyUI/models/${typeInfo?.folder}/${filename}\n\nThen click Refresh Models in the main panel.`);
    setLocalPath("");
  }

  const s = (active) => ({
    padding: "8px 16px", background: "none", border: "none",
    borderBottom: active ? "2px solid #c084fc" : "2px solid transparent",
    color: active ? "#c084fc" : "#6b5878",
    cursor: "pointer", fontSize: 12, fontFamily: "monospace", marginBottom: -1
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Sub-tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1e1228", padding: "0 24px", flexShrink: 0 }}>
        {[["browse", "⬡ Browse HF Models"], ["custom", "⊕ Custom HF URL"], ["local", "◈ Local Import"], ["downloads", `↓ Downloads (${downloads.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={s(tab === id)}>{label}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

        {/* ── Browse featured HF models ── */}
        {tab === "browse" && (
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search models…"
                style={{
                  flex: 1, minWidth: 200, background: "#1a0f24", color: "#e8d5ff",
                  border: "1px solid #3d2850", borderRadius: 6, padding: "7px 12px",
                  fontSize: 12, fontFamily: "monospace"
                }}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setFilterTag(tag)} style={{
                    padding: "5px 12px", borderRadius: 6, border: "1px solid",
                    borderColor: filterTag === tag ? "#7c3aed" : "#2a1f35",
                    background: filterTag === tag ? "rgba(124,58,237,0.15)" : "#1a0f24",
                    color: filterTag === tag ? "#c084fc" : "#6b5878",
                    fontSize: 11, cursor: "pointer", fontFamily: "monospace"
                  }}>{tag}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 }}>
              {filteredModels.map((m, i) => (
                <div key={i} style={{
                  background: "#1a0f24", border: "1px solid #2a1f35",
                  borderRadius: 10, padding: "16px 18px",
                  display: "flex", flexDirection: "column", gap: 10
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#e8d5ff", fontWeight: 700, marginBottom: 4 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: "#6b5878", fontFamily: "monospace" }}>{m.repo}</div>
                    </div>
                    <div style={{ fontSize: 11, color: "#9a8fa0", fontFamily: "monospace", whiteSpace: "nowrap", marginLeft: 8 }}>{m.size}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#9a8fa0", lineHeight: 1.5 }}>{m.desc}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {m.tags.map(t => <Tag key={t} label={t} />)}
                    <Tag label={m.type} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => downloadFromHF(m)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 7, border: "none",
                        background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                        color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "monospace"
                      }}
                    >↓ Download</button>
                    <a
                      href={`https://huggingface.co/${m.repo}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "8px 14px", borderRadius: 7, border: "1px solid #3d2850",
                        background: "#12091e", color: "#9a8fa0", fontSize: 12,
                        textDecoration: "none", fontFamily: "monospace"
                      }}
                    >HF ↗</a>
                  </div>
                  <div style={{ fontSize: 10, color: "#3d2850", fontFamily: "monospace" }}>
                    {m.file}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Custom HF URL ── */}
        {tab === "custom" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, color: "#9a8fa0", lineHeight: 1.7, marginBottom: 20 }}>
                Enter any HuggingFace repo and filename to download directly. For gated models, provide your HF access token.
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>HuggingFace Repo</div>
                <input
                  value={hfRepo}
                  onChange={e => setHfRepo(e.target.value)}
                  placeholder="e.g. stabilityai/stable-diffusion-2-1"
                  style={{
                    width: "100%", background: "#1a0f24", color: "#e8d5ff",
                    border: "1px solid #3d2850", borderRadius: 6, padding: "9px 12px",
                    fontSize: 12, fontFamily: "monospace"
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Filename</div>
                <input
                  value={hfFile}
                  onChange={e => setHfFile(e.target.value)}
                  placeholder="e.g. v2-1_768-ema-pruned.safetensors"
                  style={{
                    width: "100%", background: "#1a0f24", color: "#e8d5ff",
                    border: "1px solid #3d2850", borderRadius: 6, padding: "9px 12px",
                    fontSize: 12, fontFamily: "monospace"
                  }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Model Type</div>
                <select value={modelType} onChange={e => setModelType(e.target.value)} style={{
                  width: "100%", background: "#1a0f24", color: "#e8d5ff",
                  border: "1px solid #3d2850", borderRadius: 6, padding: "9px 12px",
                  fontSize: 12, fontFamily: "monospace"
                }}>
                  {HF_MODEL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} → models/{t.folder}/</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
                  HF Access Token <span style={{ color: "#6b5878" }}>(optional, for gated models)</span>
                </div>
                <input
                  value={hfToken}
                  onChange={e => setHfToken(e.target.value)}
                  type="password"
                  placeholder="hf_…"
                  style={{
                    width: "100%", background: "#1a0f24", color: "#e8d5ff",
                    border: "1px solid #3d2850", borderRadius: 6, padding: "9px 12px",
                    fontSize: 12, fontFamily: "monospace"
                  }}
                />
                <div style={{ fontSize: 10, color: "#6b5878", marginTop: 5 }}>
                  Get your token at huggingface.co/settings/tokens
                </div>
              </div>

              {hfRepo && hfFile && (
                <div style={{
                  background: "#12091e", border: "1px solid #2a1f35",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                  fontSize: 11, color: "#6b5878", fontFamily: "monospace"
                }}>
                  URL: https://huggingface.co/{hfRepo}/resolve/main/{hfFile}
                </div>
              )}

              <button
                onClick={handleCustomDownload}
                disabled={!hfRepo || !hfFile}
                style={{
                  width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                  background: (!hfRepo || !hfFile) ? "#1a0f24" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                  color: (!hfRepo || !hfFile) ? "#6b5878" : "#fff",
                  fontSize: 13, cursor: (!hfRepo || !hfFile) ? "not-allowed" : "pointer",
                  fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em"
                }}
              >↓ Download from HuggingFace</button>
            </div>
          </div>
        )}

        {/* ── Local Import ── */}
        {tab === "local" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            <div style={{ fontSize: 13, color: "#9a8fa0", lineHeight: 1.7, marginBottom: 24 }}>
              Already have a model downloaded? Point it to the right ComfyUI folder.
            </div>

            {/* Drag & Drop zone */}
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) setLocalPath(file.name);
              }}
              style={{
                border: "2px dashed #3d2850", borderRadius: 12,
                padding: "40px 24px", textAlign: "center", marginBottom: 24,
                background: "#12091e", cursor: "pointer"
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }}>◈</div>
              <div style={{ fontSize: 13, color: "#9a8fa0", marginBottom: 6 }}>
                Drag & drop a model file here
              </div>
              <div style={{ fontSize: 11, color: "#6b5878" }}>
                .safetensors, .ckpt, .pt, .pth, .bin
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".safetensors,.ckpt,.pt,.pth,.bin"
                style={{ display: "none" }}
                onChange={e => { if (e.target.files[0]) setLocalPath(e.target.files[0].name); }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Or enter full path</div>
              <input
                value={localPath}
                onChange={e => setLocalPath(e.target.value)}
                placeholder="/Users/you/Downloads/model.safetensors"
                style={{
                  width: "100%", background: "#1a0f24", color: "#e8d5ff",
                  border: "1px solid #3d2850", borderRadius: 6, padding: "9px 12px",
                  fontSize: 12, fontFamily: "monospace"
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#9a8fa0", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>Model Type</div>
              <select value={localType} onChange={e => setLocalType(e.target.value)} style={{
                width: "100%", background: "#1a0f24", color: "#e8d5ff",
                border: "1px solid #3d2850", borderRadius: 6, padding: "9px 12px",
                fontSize: 12, fontFamily: "monospace"
              }}>
                {HF_MODEL_TYPES.map(t => <option key={t.id} value={t.id}>{t.label} → models/{t.folder}/</option>)}
              </select>
            </div>

            {localPath && (
              <div style={{
                background: "#12091e", border: "1px solid #2a1f35",
                borderRadius: 8, padding: "12px 14px", marginBottom: 16, fontSize: 11, fontFamily: "monospace"
              }}>
                <div style={{ color: "#6b5878", marginBottom: 4 }}>Destination:</div>
                <div style={{ color: "#c084fc" }}>
                  ComfyUI/models/{HF_MODEL_TYPES.find(t => t.id === localType)?.folder}/{localPath.split(/[\\/]/).pop()}
                </div>
              </div>
            )}

            <button
              onClick={handleLocalImport}
              disabled={!localPath}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                background: !localPath ? "#1a0f24" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: !localPath ? "#6b5878" : "#fff",
                fontSize: 13, cursor: !localPath ? "not-allowed" : "pointer",
                fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.08em",
                marginBottom: 24
              }}
            >◈ Show Import Instructions</button>

            {/* Installed models list */}
            <div>
              <div style={{ fontSize: 10, color: "#6b5878", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Installed Checkpoints ({installedModels.length})
              </div>
              {installedModels.length === 0 ? (
                <div style={{ color: "#6b5878", fontSize: 12 }}>No models detected — connect to your ComfyUI server first.</div>
              ) : (
                installedModels.map((m, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", borderRadius: 7, background: "#1a0f24",
                    border: "1px solid #2a1f35", marginBottom: 6,
                    fontSize: 12, color: "#c084fc", fontFamily: "monospace",
                    display: "flex", alignItems: "center", gap: 10
                  }}>
                    <span style={{ color: "#22c55e", fontSize: 10 }}>●</span>
                    {m}
                  </div>
                ))
              )}
              {installedModels.length > 0 && (
                <button onClick={onRefresh} style={{
                  marginTop: 10, padding: "7px 16px", borderRadius: 6,
                  border: "1px solid #3d2850", background: "#1a0f24",
                  color: "#9a8fa0", fontSize: 11, cursor: "pointer", fontFamily: "monospace"
                }}>⟳ Refresh from server</button>
              )}
            </div>
          </div>
        )}

        {/* ── Downloads ── */}
        {tab === "downloads" && (
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {downloads.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#6b5878" }}>No downloads yet</div>
            ) : (
              <>
                <div style={{ fontSize: 10, color: "#6b5878", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                  {downloads.filter(d => d.status === "downloading").length} active · {downloads.filter(d => d.status === "done").length} complete
                </div>
                {downloads.map(d => (
                  <DownloadItem key={d.id} {...d} onCancel={() => cancelDownload(d.id)} />
                ))}
                <div style={{
                  marginTop: 16, padding: "14px 16px", borderRadius: 8,
                  background: "#12091e", border: "1px solid #2a1f35",
                  fontSize: 12, color: "#9a8fa0", lineHeight: 1.7
                }}>
                  <div style={{ color: "#c084fc", marginBottom: 6, fontSize: 11, fontFamily: "monospace" }}>📁 After downloading:</div>
                  Move the file to your ComfyUI models folder, then click <strong style={{ color: "#e8d5ff" }}>Refresh Models</strong> in the main panel.
                  <br /><br />
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#6b5878" }}>
                    Checkpoints → ComfyUI/models/checkpoints/<br />
                    LoRAs → ComfyUI/models/loras/<br />
                    VAE → ComfyUI/models/vae/<br />
                    ControlNet → ComfyUI/models/controlnet/
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
