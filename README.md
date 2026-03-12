# 🌿 Hermit Purple Studio

> *"These vines reach out and pull the truth from anywhere."*
> — Joseph Joestar

A sleek, modern GUI frontend for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — built with React + Vite. Just as Joseph Joestar's Stand could reach across the world to find what he needed, Hermit Purple Studio reaches out to your ComfyUI server, to HuggingFace, and to your local file system — bringing everything together in one place.

![Hermit Purple Studio](https://img.shields.io/badge/Hermit%20Purple-Studio-7c3aed?style=flat-square)
![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✦ What It Does

Hermit Purple Studio gives you a clean, dark UI to control ComfyUI without ever touching a node graph.

### ⚡ Generate
- Write your prompt and negative prompt
- Choose a workflow: **Text → Image**, **Image → Image**, **Inpaint**, **Upscale**, or **ControlNet**
- Tune every parameter: model, sampler, scheduler, steps, CFG scale, denoise strength, resolution, seed, and batch size
- Watch generation progress **live**, step by step, via WebSocket
- Hit **■ Stop** to interrupt mid-generation
- Click any output image to see its full metadata and reuse its exact settings

### ⬡ Model Manager
- **Browse** a curated library of popular HuggingFace models (checkpoints, VAEs, ControlNets, LoRAs…)
- **Filter** by tag: `popular`, `xl`, `realistic`, `fast`, `controlnet`, and more
- **Download directly** from HuggingFace with a real-time progress bar and cancel button
- **Custom HF URL**: paste any repo + filename, pick the model type, and optionally supply a HF access token for gated models
- **Local import**: drag & drop a `.safetensors` / `.ckpt` / `.pt` file or enter its path
- See all **installed models** fetched live from your connected server

### 📋 Server Queue
- View running and pending jobs on your ComfyUI server in real time

### 🗂 History
- Every generated image is saved in-session with its full parameters
- Click any image to view metadata or restore its settings instantly

### 🖥 Console Log
- Live feed of all API events, generation steps, errors, and download activity

---

## 🚀 Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or newer
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) installed and running

### 1. Clone the repo

```bash
git clone https://github.com/DeadByDawn101/hermit-purple-studio.git
cd hermit-purple-studio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start ComfyUI

```bash
# In your ComfyUI directory:
python main.py

# If you run into CORS issues, add:
python main.py --enable-cors-header
```

### 4. Start Hermit Purple Studio

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Remote Access via Tailscale

Want to run ComfyUI on your powerful home/studio machine and access it from **anywhere** — your laptop, a café, another country — without port forwarding, VPNs, or pixel-streaming tools like Parsec? Tailscale makes this effortless.

> **Why Tailscale over Parsec/Remote Desktop?**
> Parsec and RDP stream *pixels* — you're watching a video of your desktop, which adds latency and compression artifacts. Tailscale gives Hermit Purple Studio a **direct, encrypted connection** to the ComfyUI API. The UI runs natively in your browser at full speed; only the image data travels the wire. No lag, no fuzzy pixels, works on any device with a browser.

### How It Works

```
[ Your Laptop / Phone / Anywhere ]
        │
    Tailscale (WireGuard, end-to-end encrypted)
        │
[ Home Machine: ComfyUI GPU rig ]
```

Tailscale assigns each device a stable private IP (like `100.x.x.x`) that works across any network, forever — no dynamic DNS, no port forwarding needed.

### Step 1 — Install Tailscale on both machines

Download from [tailscale.com/download](https://tailscale.com/download) for your OS (Windows, Mac, Linux, iOS, Android).

```bash
# Linux (on your ComfyUI server machine):
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Sign in with the same account on both devices (Google, GitHub, or email — free for personal use).

### Step 2 — Find your server's Tailscale IP

On the machine running ComfyUI:

```bash
tailscale ip -4
# Output: 100.xx.xx.xx  ← your stable private IP
```

Or check [login.tailscale.com/admin/machines](https://login.tailscale.com/admin/machines).

### Step 3 — Start ComfyUI with network listening enabled

```bash
cd ComfyUI
python main.py --listen 0.0.0.0 --enable-cors-header
```

`--listen 0.0.0.0` lets ComfyUI accept connections from your Tailscale IP (not just localhost).

### Step 4 — Connect from anywhere

**Option A — Run the Studio locally, point at remote ComfyUI:**

Open Hermit Purple Studio on your laptop, enter the following in the top address bar, and hit **Connect**:

```
http://100.xx.xx.xx:8188
```

That's it. Your laptop's browser talks directly to your home GPU over the encrypted Tailscale tunnel.

**Option B — Run the Studio on the server, access it remotely:**

```bash
# On your server machine:
npm run dev -- --host
```

Then from your laptop, open:

```
http://100.xx.xx.xx:3000
```

### Step 5 — Generate from anywhere 🌍

The full Studio experience — model loading, live WebSocket progress, downloads, history — works exactly the same over Tailscale as it does locally.

### Tailscale Tips

| Tip | Details |
|-----|---------|
| **Stable IPs** | Tailscale IPs never change, even if your home IP rotates |
| **No port forwarding** | Nothing to open in your router — Tailscale punches through NAT |
| **MagicDNS** | Enable in Tailscale settings to use `http://my-rig.tail12345.ts.net:8188` instead of a raw IP |
| **Mobile** | Install Tailscale on your phone, use the Studio in Safari/Chrome |
| **Free tier** | Free for personal use, up to 100 devices |
| **Boot on startup** | See below |

### Auto-start Tailscale on Boot

**Linux:**
```bash
sudo systemctl enable --now tailscaled
```

**Mac:** Tailscale auto-starts after install via the menu bar app.

**Windows:** Installed as a system service automatically.

---

## 🔧 Configuration

### CORS

If ComfyUI and Hermit Purple Studio are on the same machine:

```bash
python main.py --enable-cors-header
```

Or use the built-in Vite proxy by setting your server address to `http://localhost:3000/comfy` — already configured in `vite.config.js`, forwarding to `127.0.0.1:8188`.

### Server Address Reference

| Setup | Address to enter in the app |
|-------|-----------------------------|
| Local (same machine) | `http://127.0.0.1:8188` |
| Local network | `http://192.168.1.100:8188` |
| Tailscale (IP) | `http://100.xx.xx.xx:8188` |
| Tailscale (MagicDNS) | `http://my-rig.tail12345.ts.net:8188` |

---

## 📁 Where Models Go

After downloading a model, move it to the correct ComfyUI folder:

| Type | Folder |
|------|--------|
| Checkpoint | `ComfyUI/models/checkpoints/` |
| LoRA | `ComfyUI/models/loras/` |
| VAE | `ComfyUI/models/vae/` |
| ControlNet | `ComfyUI/models/controlnet/` |
| Upscaler | `ComfyUI/models/upscale_models/` |
| Embedding | `ComfyUI/models/embeddings/` |

Then click **⟳ Refresh Models** in the Models tab to reload the list from your server.

### HuggingFace Access Tokens

For gated models (Flux, some SDXL variants):

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a token with **read** access
3. Paste it into the **HF Access Token** field in the Custom HF URL tab

---

## 🏗 Build for Production

```bash
npm run build
npm run preview
```

To serve the built app on a remote machine permanently:

```bash
npm run build
npx serve dist -l 3000
```

---


## 🧠 Local ANE Inference (Apple Silicon)

Hermit Purple Studio is designed to work with the [ANE project](https://github.com/DeadByDawn101/ANE) — a reverse-engineered bridge to Apple's Neural Engine — for **local, private LLM inference** on Apple Silicon Macs.

### Tiered Inference Architecture

```
Your Prompt
    │
    ├─► ANE (Apple Neural Engine) ── Small/fast tasks, runs locally, free & private
    │         │
    │         └─ Too large? ──────── Anthropic API → Claude Opus
    │
    └─► ComfyUI (GPU) ──────────────── Image generation (existing)
```

### Why ANE?

| | ANE | GPU | Anthropic API |
|-|-----|-----|---------------|
| Cost | Free | Free | Per token |
| Privacy | 100% local | 100% local | Cloud |
| Power | ~1W | 15–75W | N/A |
| Speed (≤1B) | Fast | Faster | Network-bound |
| Models >7B | ❌ Not yet | ✅ | ✅ |

The ANE runs at extremely low power, is always-on, and never leaves your Mac. For anything that exceeds local capacity, the system automatically routes to Claude Opus via the Anthropic API.

### Setup

1. Follow the [ANE setup guide](https://github.com/DeadByDawn101/ANE#-getting-started) to build `libane_bridge.dylib`
2. Point Hermit Purple Studio at your ANE server (same Tailscale setup as ComfyUI)
3. Set your `ANTHROPIC_API_KEY` for Opus fallback

> ANE integration is in active development. See the [ANE repo](https://github.com/DeadByDawn101/ANE) for current status.

---

## 🌿 Tech Stack

| Layer | Tech |
|-------|------|
| UI | React 18 + Vite |
| Styling | Inline styles, Space Mono + Syne fonts |
| API | ComfyUI REST (`/prompt`, `/queue`, `/history`, `/view`, `/interrupt`) |
| Realtime | Native WebSocket (`/ws`) for live step progress |
| Model downloads | HuggingFace `resolve/main` URLs via browser `fetch` |
| Remote access | Tailscale (WireGuard mesh VPN) |
| Local LLM inference | ANE bridge (`libane_bridge.dylib`) |
| Cloud LLM fallback | Anthropic API (Claude Opus) |

---

## 🎴 The Stand

> **Hermit Purple** — User: Joseph Joestar
> Destructive Power: E | Speed: E | Range: A | Persistence: A | Precision: C | Developmental Potential: E

The Stand manifests as thorny vines that extend across great distances to capture images, transmit messages, and reveal hidden truths. This app does the same — it extends your reach across servers, model hubs, and file systems, and brings everything back to you in one clear picture. Even from a thousand miles away.

---

## 📄 License

MIT — do whatever you want with it, just don't use it to summon DIO.
