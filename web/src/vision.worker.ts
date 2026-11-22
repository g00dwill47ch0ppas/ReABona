import { env, pipeline } from '@huggingface/transformers'
import wasmModule from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url'
import wasmBinary from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url'
import labels from './vision-labels.json'

env.allowLocalModels = true
env.allowRemoteModels = false
env.useBrowserCache = false
env.localModelPath = '/models/'
const wasm = env.backends.onnx.wasm
if (!wasm) throw new Error('The local image runtime is unavailable.')
wasm.numThreads = 1
wasm.wasmPaths = { mjs: wasmModule, wasm: wasmBinary }

globalThis.addEventListener('message', async (event: MessageEvent<{ image: string }>) => {
  try {
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(event.data.image)) throw new Error('Invalid image.')
    globalThis.postMessage({ type: 'status', message: 'Loading the offline photo model…' })
    const detector = await pipeline('zero-shot-object-detection', 'Xenova/owlvit-base-patch32', { dtype: 'q8', device: 'wasm' })
    globalThis.postMessage({ type: 'status', message: 'Analyzing the photo locally…' })
    const detections = await detector(event.data.image, labels, { threshold: 0.1, top_k: 5, percentage: true })
    globalThis.postMessage({ type: 'result', detections })
  } catch {
    globalThis.postMessage({ type: 'error', message: 'Local photo analysis failed. Check that the offline photo model is installed and try again.' })
  }
})
