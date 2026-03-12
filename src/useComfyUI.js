/**
 * useComfyUI - React hook for real ComfyUI API integration
 * Connects to a local or remote ComfyUI server via HTTP + WebSocket
 */

import { useState, useRef, useCallback } from "react";

export function buildWorkflow(workflow, params) {
  const seed = params.seed === -1 ? Math.floor(Math.random() * 2 ** 32) : params.seed;

  // Base txt2img workflow (ComfyUI API graph format)
  const base = {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: params.model }
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["1", 1] }
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.negative, clip: ["1", 1] }
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: params.width, height: params.height, batch_size: params.batchSize }
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
        seed,
        steps: params.steps,
        cfg: params.cfg,
        sampler_name: params.sampler,
        scheduler: params.scheduler,
        denoise: params.denoise
      }
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] }
    },
    "7": {
      class_type: "SaveImage",
      inputs: { images: ["6", 0], filename_prefix: "ComfyUI" }
    }
  };

  // img2img: swap EmptyLatentImage for LoadImage + VAEEncode
  if (workflow === "img2img" && params.inputImage) {
    delete base["4"];
    base["4a"] = { class_type: "LoadImage", inputs: { image: params.inputImage } };
    base["4b"] = { class_type: "VAEEncode", inputs: { pixels: ["4a", 0], vae: ["1", 2] } };
    base["5"].inputs.latent_image = ["4b", 0];
  }

  return { prompt: base };
}

export function useComfyUI() {
  const [status, setStatus] = useState("disconnected");
  const [models, setModels] = useState([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const wsRef = useRef(null);
  const clientId = useRef(`comfyui-studio-${Math.random().toString(36).slice(2)}`);

  const connect = useCallback(async (host) => {
    setStatus("connecting");
    try {
      // Test HTTP connection
      const res = await fetch(`${host}/system_stats`);
      if (!res.ok) throw new Error("Server unreachable");

      // Load models
      const objRes = await fetch(`${host}/object_info/CheckpointLoaderSimple`);
      const objData = await objRes.json();
      const ckpts = objData?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
      setModels(ckpts);

      // Connect WebSocket for progress updates
      const wsUrl = host.replace(/^http/, "ws") + `/ws?clientId=${clientId.current}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => setStatus("connected");
      wsRef.current.onerror = () => setStatus("error");
      wsRef.current.onclose = () => setStatus("disconnected");

      return { ok: true, models: ckpts };
    } catch (err) {
      setStatus("error");
      return { ok: false, error: err.message };
    }
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    setStatus("disconnected");
    setModels([]);
  }, []);

  const generate = useCallback(async (host, workflowType, params, onImage, onLog) => {
    if (running) return;
    setRunning(true);
    setProgress(0);
    setStatus("generating");

    const payload = buildWorkflow(workflowType, params);
    payload.client_id = clientId.current;

    try {
      // Submit prompt
      const res = await fetch(`${host}/prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const { prompt_id } = await res.json();
      onLog?.(`Job queued — prompt_id: ${prompt_id}`);

      // Listen for progress over WebSocket
      await new Promise((resolve, reject) => {
        const ws = wsRef.current;
        if (!ws) return reject(new Error("No WebSocket connection"));

        ws.onmessage = async (event) => {
          const msg = JSON.parse(event.data);

          if (msg.type === "progress" && msg.data.prompt_id === prompt_id) {
            const pct = Math.round((msg.data.value / msg.data.max) * 100);
            setProgress(pct);
            onLog?.(`Step ${msg.data.value}/${msg.data.max}`);
          }

          if (msg.type === "executed" && msg.data.prompt_id === prompt_id) {
            const outputImages = msg.data.output?.images ?? [];
            for (const img of outputImages) {
              const url = `${host}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
              const imgRes = await fetch(url);
              const blob = await imgRes.blob();
              const dataUrl = await new Promise(r => {
                const reader = new FileReader();
                reader.onload = () => r(reader.result);
                reader.readAsDataURL(blob);
              });
              onImage?.({ src: dataUrl, filename: img.filename });
              onLog?.(`✓ Image saved: ${img.filename}`);
            }
            resolve();
          }

          if (msg.type === "execution_error" && msg.data.prompt_id === prompt_id) {
            reject(new Error(msg.data.exception_message ?? "Execution error"));
          }
        };
      });

    } catch (err) {
      onLog?.(`✗ Error: ${err.message}`);
    } finally {
      setRunning(false);
      setProgress(0);
      setStatus("connected");
    }
  }, [running]);

  const getQueue = useCallback(async (host) => {
    const res = await fetch(`${host}/queue`);
    return res.json();
  }, []);

  const getHistory = useCallback(async (host) => {
    const res = await fetch(`${host}/history`);
    return res.json();
  }, []);

  const interrupt = useCallback(async (host) => {
    await fetch(`${host}/interrupt`, { method: "POST" });
  }, []);

  return { status, models, progress, running, connect, disconnect, generate, getQueue, getHistory, interrupt };
}
