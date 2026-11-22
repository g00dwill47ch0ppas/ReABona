import { env, pipeline } from '@huggingface/transformers'
import wasmModule from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url'
import wasmBinary from '../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url'

env.allowLocalModels = true
env.allowRemoteModels = false
env.localModelPath = '/models/'
const wasm = env.backends.onnx.wasm
if (!wasm) throw new Error('The local speech runtime is unavailable.')
wasm.numThreads = 1
wasm.wasmPaths = { mjs: wasmModule, wasm: wasmBinary }

globalThis.addEventListener('message', async (event: MessageEvent<{ audio: Float32Array; language: string }>) => {
  try {
    const { audio, language } = event.data
    const rms = Math.sqrt(audio.reduce((sum, sample) => sum + sample * sample, 0) / audio.length)
    if (!Number.isFinite(rms) || rms < 0.0001) throw new Error('No speech was detected. Please try again.')
    globalThis.postMessage({ type: 'status', message: 'Loading the offline speech model…' })
    const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { dtype: 'q8', device: 'wasm' })
    globalThis.postMessage({ type: 'status', message: 'Transcribing locally…' })
    const result = await transcriber(audio, { language, task: 'transcribe' })
    const text = result.text.trim()
    if (!text) throw new Error('No speech was detected. Please try again.')
    globalThis.postMessage({ type: 'result', text })
  } catch (error) {
    const message = error instanceof Error && error.message === 'No speech was detected. Please try again.'
      ? error.message
      : 'Offline transcription failed. Check that the speech model is installed and try again.'
    globalThis.postMessage({ type: 'error', message })
  }
})
