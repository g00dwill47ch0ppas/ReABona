export type VoiceStatus = { active: boolean; message: string; error: boolean }
export const idleVoice: VoiceStatus = { active: false, message: '', error: false }

export function appendTranscript(current: string, text: string, maxLength: number): string | null {
  const separator = current && !/\s$/.test(current) ? ' ' : ''
  const result = `${current}${separator}${text.trim()}`
  return result.length <= maxLength ? result : null
}
