# 🌿 Hermit Purple

> *"These vines reach out and pull the truth from anywhere."*
> — Joseph Joestar

---

Hermit Purple is the Stand of **Hermit Purple Studio** — a beautiful, modern GUI frontend for [ComfyUI](https://github.com/comfyanonymous/ComfyUI). Just as Joseph Joestar's Stand could reach across the world to find what he needed, Hermit Purple Studio reaches out to your ComfyUI server, to HuggingFace, and to your local file system — bringing everything together in one place.

---

## ✦ What It Does

Hermit Purple Studio gives you a clean, dark UI to control ComfyUI without ever touching a node graph. Here's what it can do:

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
- **Local import**: drag & drop a `.safetensors` / `.ckpt` / `.pt` file or enter its path, and get shown exactly where to move it in your ComfyUI folder
- See all **installed models** fetched live from your connected server

### 📋 Server Queue
- View running and pending jobs on your ComfyUI server in real time
- Refresh on demand

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
git clone https://github.com/YOUR_USERNAME/hermit-purple-studio.git
cd hermit-purple-studio
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start ComfyUI

Make sure ComfyUI is running before launching the studio. By default it starts on `http://127.0.0.1:8188`.

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

## 🔧 Configuration

### CORS

If ComfyUI and Hermit Purple Studio are on the same machine, start ComfyUI with:

```bash
python main.py --enable-cors-header
```

Or use the built-in Vite proxy by setting your server address to:

```
http://localhost:3000/comfy
```

(The proxy is already configured in `vite.config.js` and forwards to `127.0.0.1:8188`.)

### Remote Server

You can point Hermit Purple at a remote ComfyUI instance — just enter its full URL in the address bar at the top of the app (e.g. `http://192.168.1.100:8188`).

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

For gated models (e.g. Flux, some SDXL variants), you'll need a HuggingFace access token:

1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Create a token with **read** access
3. Paste it into the **HF Access Token** field in the Custom HF URL tab

---

## 🏗 Build for Production

```bash
npm run build
npm run preview
```

---

## 🌿 Tech Stack

| Layer | Tech |
|-------|------|
| UI | React 18 + Vite |
| Styling | Inline styles, Space Mono + Syne fonts |
| API | ComfyUI REST (`/prompt`, `/queue`, `/history`, `/view`, `/interrupt`) |
| Realtime | Native WebSocket (`/ws`) for live step progress |
| Model downloads | HuggingFace `resolve/main` URLs via browser `fetch` |

---

## 🎴 The Stand

> **Hermit Purple** — User: Joseph Joestar
> Destructive Power: E | Speed: E | Range: A | Persistence: A | Precision: C | Developmental Potential: E

The Stand manifests as thorny vines that can extend across great distances to capture images, transmit messages, and reveal hidden truths. This app does the same: it extends your reach across servers, model hubs, and file systems — and brings everything back to you in one clear picture.

---

## 📄 License

MIT — do whatever you want with it, just don't use it to summon DIO.
