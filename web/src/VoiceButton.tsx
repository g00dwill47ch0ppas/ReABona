import { useEffect, useRef, useState } from 'react'
import { idleVoice, type VoiceStatus } from './voice'
import { useI18n } from './i18n-context'

type Phase = 'idle' | 'starting' | 'recording' | 'processing'
type WorkerMessage = { type: 'status'; message: string } | { type: 'result'; text: string } | { type: 'error'; message: string }
type AudioMessage = { type: 'audio'; samples: Float32Array } | { type: 'flushed' }

export function VoiceButton({ onText, onStatus, language, enabled = true, disabled = false, className = '' }: {
  onText: (text: string) => string | null
  onStatus: (status: VoiceStatus) => void
  language: string
  enabled?: boolean
  disabled?: boolean
  className?: string
}) {
  const { t } = useI18n()
  const [phase, setPhase] = useState<Phase>('idle')
  const callbacks = useRef({ onText, onStatus })
  const streamRef = useRef<MediaStream | null>(null)
  const contextRef = useRef<AudioContext | null>(null)
  const nodeRef = useRef<AudioWorkletNode | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const run = useRef(0)
  const mounted = useRef(false)

  useEffect(() => { callbacks.current = { onText, onStatus } }, [onText, onStatus])

  const releaseAudio = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    nodeRef.current?.disconnect()
    nodeRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    const context = contextRef.current
    contextRef.current = null
    if (context && context.state !== 'closed') void context.close()
  }

  const release = () => {
    run.current++
    releaseAudio()
    workerRef.current?.terminate()
    workerRef.current = null
  }

  const finish = (status: VoiceStatus) => {
    release()
    if (mounted.current) {
      setPhase('idle')
      callbacks.current.onStatus(status)
    }
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      release()
      callbacks.current.onStatus(idleVoice)
    }
  }, [])

  useEffect(() => {
    if (!enabled) finish(idleVoice)
  }, [enabled])

  const transcribe = async (chunks: Float32Array[], sampleRate: number, id: number) => {
    try {
      const length = chunks.reduce((total, chunk) => total + chunk.length, 0)
      if (!length) throw new Error('No audio was recorded. Please try again.')
      const offline = new OfflineAudioContext(1, Math.ceil(length * 16000 / sampleRate), 16000)
      const buffer = offline.createBuffer(1, length, sampleRate)
      let offset = 0
      for (const chunk of chunks) { buffer.getChannelData(0).set(chunk, offset); offset += chunk.length }
      const source = offline.createBufferSource()
      source.buffer = buffer
      source.connect(offline.destination)
      source.start()
      const audio = (await offline.startRendering()).getChannelData(0)
      if (id !== run.current) return
      const worker = new Worker(new URL('./speech.worker.ts', import.meta.url), { type: 'module' })
      workerRef.current = worker
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        if (id !== run.current) return
        if (event.data.type === 'status') callbacks.current.onStatus({ active: true, message: event.data.message, error: false })
        else if (event.data.type === 'error') finish({ active: false, message: event.data.message, error: true })
        else {
          const error = callbacks.current.onText(event.data.text)
          finish({ active: false, message: error || 'Transcription added. Please review it.', error: Boolean(error) })
        }
      }
      worker.onerror = () => finish({ active: false, message: 'Unable to start offline transcription. Please try again.', error: true })
      worker.postMessage({ audio, language }, [audio.buffer])
    } catch (error) {
      if (id === run.current) finish({ active: false, message: error instanceof Error ? error.message : 'Unable to process the recording.', error: true })
    }
  }

  const stopRecording = () => {
    if (!nodeRef.current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setPhase('processing')
    callbacks.current.onStatus({ active: true, message: 'Preparing the recording…', error: false })
    nodeRef.current.port.postMessage('flush')
    streamRef.current?.getTracks().forEach(track => track.stop())
    timerRef.current = setTimeout(() => finish({ active: false, message: 'Unable to finish recording. Please try again.', error: true }), 5000)
  }

  const start = async () => {
    setPhase('starting')
    callbacks.current.onStatus({ active: true, message: 'Requesting microphone access…', error: false })
    const id = ++run.current
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') throw new Error('Recording is unavailable in this browser. Use a supported browser and HTTPS or localhost.')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (id !== run.current) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      const context = new AudioContext()
      contextRef.current = context
      if (!context.audioWorklet) throw new Error('Recording is unavailable in this browser. Use a supported browser and HTTPS or localhost.')
      await context.audioWorklet.addModule('/audio-recorder.worklet.js')
      if (id !== run.current) return
      const node = new AudioWorkletNode(context, 'reabona-recorder')
      nodeRef.current = node
      const chunks: Float32Array[] = []
      node.port.onmessage = (event: MessageEvent<AudioMessage>) => {
        if (id !== run.current) return
        if (event.data.type === 'audio') chunks.push(event.data.samples)
        else {
          releaseAudio()
          void transcribe(chunks, context.sampleRate, id)
        }
      }
      node.onprocessorerror = () => { if (id === run.current) finish({ active: false, message: 'Recording failed. Please try again.', error: true }) }
      const muted = context.createGain()
      muted.gain.value = 0
      context.createMediaStreamSource(stream).connect(node).connect(muted).connect(context.destination)
      await context.resume()
      if (id !== run.current) return
      setPhase('recording')
      callbacks.current.onStatus({ active: true, message: 'Recording. Press the microphone to stop (30-second limit).', error: false })
      timerRef.current = setTimeout(stopRecording, 30_000)
    } catch (error) {
      if (id !== run.current) return
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow microphone access in your browser and try again.'
        : error instanceof Error && error.message.startsWith('Recording is unavailable')
          ? error.message
          : 'Unable to start the microphone. Check that it is connected and available.'
      finish({ active: false, message, error: true })
    }
  }

  const click = () => {
    if (phase === 'idle') void start()
    else if (phase === 'recording') stopRecording()
    else finish({ active: false, message: 'Recording cancelled.', error: false })
  }

  const label = phase === 'idle' ? 'Start voice recording' : phase === 'recording' ? 'Stop recording and transcribe' : 'Cancel voice recording'
  return <button type="button" className={`voice-button ${className} ${phase === 'recording' ? 'voice-recording' : ''}`} aria-label={t(label)} aria-pressed={phase !== 'idle'} title={t(label)} disabled={!enabled || (disabled && phase === 'idle')} onClick={click}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8" /></svg>
  </button>
}
