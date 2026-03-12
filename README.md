# ⚡ ComfyUI Studio

A sleek, modern GUI frontend for [ComfyUI](https://github.com/comfyanonymous/ComfyUI) — built with React + Vite.

![ComfyUI Studio](https://img.shields.io/badge/ComfyUI-Studio-7c3aed?style=flat-square)

## Features

- **Real ComfyUI API integration** — HTTP + WebSocket for live progress tracking
- **Workflow selector** — txt2img, img2img, inpaint, upscale, ControlNet
- **Full parameter controls** — model, sampler, scheduler, steps, CFG, denoise, size, seed, batch
- **Auto-loads your models** from the connected ComfyUI server
- **Live progress bar** — step-by-step generation feedback via WebSocket
- **Server queue viewer** — see running and pending jobs
- **History gallery** — browse all generated images with metadata
- **Interrupt button** — stop generation mid-run
- **Reuse params** — click any past image to restore its exact settings
- **Console log** — live feed of all API events

## Getting Started

### 1. Start ComfyUI

Make sure ComfyUI is running (default: `http://127.0.0.1:8188`).

```bash
cd ComfyUI
python main.py
```

### 2. Install & Run ComfyUI Studio

```bash
git clone https://github.com/YOUR_USERNAME/comfyui-studio
cd comfyui-studio
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Connect

Enter your ComfyUI server address in the top bar (default `http://127.0.0.1:8188`) and click **Connect**. Your installed models will load automatically.

## Build for Production

```bash
npm run build
npm run preview
```

## CORS Note

If you run ComfyUI and this app on the same machine, you may need to start ComfyUI with:

```bash
python main.py --enable-cors-header
```

Or use the built-in Vite proxy (already configured in `vite.config.js`) by setting the server address to `http://localhost:3000/comfy`.

## Tech Stack

- React 18 + Vite
- Native WebSocket (ComfyUI `/ws` endpoint)
- ComfyUI REST API (`/prompt`, `/queue`, `/history`, `/view`, `/interrupt`)

## License

MIT
