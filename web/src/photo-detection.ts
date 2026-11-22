type WorkerMessage = { type: 'status'; message: string } | { type: 'error'; message: string } |
  { type: 'result'; detections: { label: string }[] }

export function detectPhotoLabels(image: string, signal: AbortSignal, onStatus: (status: string) => void): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./vision.worker.ts', import.meta.url), { type: 'module' })
    const finish = () => { signal.removeEventListener('abort', abort); worker.terminate() }
    const abort = () => { finish(); reject(new DOMException('Cancelled', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === 'status') onStatus(event.data.message)
      else if (event.data.type === 'error') { finish(); reject(new Error(event.data.message)) }
      else { finish(); resolve([...new Set(event.data.detections.map(item => item.label))]) }
    }
    worker.onerror = () => { finish(); reject(new Error('Local photo analysis failed. Check that the offline photo model is installed and try again.')) }
    if (signal.aborted) abort()
    else worker.postMessage({ image })
  })
}
