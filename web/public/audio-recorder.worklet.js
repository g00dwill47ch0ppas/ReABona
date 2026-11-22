class ReaBonaRecorder extends AudioWorkletProcessor {
  constructor() {
    super()
    this.port.onmessage = event => {
      if (event.data === 'flush') this.port.postMessage({ type: 'flushed' })
    }
  }

  process(inputs) {
    const channels = inputs[0]
    if (channels?.length) {
      const mono = new Float32Array(channels[0].length)
      for (const channel of channels) {
        for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length
      }
      this.port.postMessage({ type: 'audio', samples: mono }, [mono.buffer])
    }
    return true
  }
}

registerProcessor('reabona-recorder', ReaBonaRecorder)
