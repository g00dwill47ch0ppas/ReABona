const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export function createTelegramBot({ token, allowedUserIds, state, categories, submit, persist, fetchImpl = fetch }) {
  const allowed = new Set(allowedUserIds)
  let running = false
  let controller
  let dirty = false
  const apiUrl = `https://api.telegram.org/bot${token}/`

  async function telegram(method, body, signal) {
    const response = await fetchImpl(apiUrl + method, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(45_000)]), redirect: 'error',
    })
    if (!response.ok) throw new Error(`Telegram request failed (${response.status}).`)
    const result = await response.json()
    if (!result.ok) throw new Error('Telegram rejected a bot request.')
    return result.result
  }

  async function downloadPhoto(photo, signal) {
    if (photo.file_size > 10 * 1024 * 1024) throw new Error('Photo too large.')
    const file = await telegram('getFile', { file_id: photo.file_id }, signal)
    if (typeof file.file_path !== 'string' || !/^photos\/[A-Za-z0-9_-]+\.jpg$/.test(file.file_path)) throw new Error('Unsupported Telegram photo.')
    const response = await fetchImpl(`https://api.telegram.org/file/bot${token}/${file.file_path}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(45_000)]), redirect: 'error' })
    if (!response.ok || !response.body) throw new Error('Photo download failed.')
    const chunks = []
    let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > 10 * 1024 * 1024) throw new Error('Photo too large.')
      chunks.push(chunk)
    }
    const bytes = Buffer.concat(chunks)
    if (bytes.length < 3 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error('Invalid JPEG photo.')
    return `data:image/jpeg;base64,${bytes.toString('base64')}`
  }

  const prompt = step => ({
    title: 'What is the report title? (up to 200 characters)',
    category: `Choose a category by number:\n${categories.map(item => `${item.categoryId}. ${item.categoryName}`).join('\n')}`,
    description: 'Describe the issue. Do not include sensitive personal information.',
    location: 'Type the location or share a Telegram location pin.',
    photo: 'Send one photo, or type /skip to continue without one.',
    confirm: 'Type YES to submit this report, or /cancel to discard it.',
  })[step]

  async function handle(update, signal) {
    const message = update.message
    const id = message?.from?.id
    if (!message || message.chat?.type !== 'private' || message.chat.id !== id || !allowed.has(String(id))) return null
    const key = String(id)
    const text = typeof message.text === 'string' ? message.text.trim() : ''
    let draft = state.drafts[key]
    if (text === '/cancel') {
      delete state.drafts[key]
      return 'Report cancelled. Send /start to begin again.'
    }
    if (text === '/start' || text === '/report') {
      state.drafts[key] = { step: 'title' }
      return `ReaBona demo: do not send sensitive information. Review your answers before submission. Send /cancel at any time.\n\n${prompt('title')}`
    }
    if (!draft) return 'Send /start to begin a report.'
    if (draft.step === 'title') {
      if (!text || text.length > 200) return prompt('title')
      draft.title = text; draft.step = 'category'
    } else if (draft.step === 'category') {
      const categoryId = Number(text)
      if (!/^\d+$/.test(text) || !categories.some(item => item.categoryId === categoryId)) return prompt('category')
      draft.categoryId = categoryId; draft.step = 'description'
    } else if (draft.step === 'description') {
      if (!text || text.length > 5000) return prompt('description')
      draft.description = text; draft.step = 'location'
    } else if (draft.step === 'location') {
      const location = message.location
      if (location && Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
          Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180) {
        draft.location = `GPS: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
      } else if (text && text.length <= 300) draft.location = text
      else return prompt('location')
      draft.step = 'photo'
    } else if (draft.step === 'photo') {
      if (text === '/skip') draft.photo = null
      else if (Array.isArray(message.photo) && message.photo.length) {
        try { draft.photo = await downloadPhoto(message.photo[message.photo.length - 1], signal) }
        catch (error) {
          if (signal.aborted) throw error
          return 'Could not load the photo. Send a JPEG photo under 10 MB, or type /skip.'
        }
      } else return prompt('photo')
      draft.step = 'confirm'
      const category = categories.find(item => item.categoryId === draft.categoryId)?.categoryName
      return `Please review:\nTitle: ${draft.title}\nCategory: ${category}\nDescription: ${draft.description}\nLocation: ${draft.location}\nPhoto: ${draft.photo ? 'Attached' : 'None'}\n\n${prompt('confirm')}`
    } else if (draft.step === 'confirm') {
      if (text.toUpperCase() !== 'YES') return prompt('confirm')
      const reference = submit(key, draft)
      delete state.drafts[key]
      return `Report submitted. Your reference number is ${reference}. Send /start to submit another report.`
    }
    return prompt(draft.step)
  }

  async function flush(signal) {
    if (dirty) { persist(); dirty = false }
    let index = 0
    while (index < state.outbox.length) {
      const message = state.outbox[index]
      if (!allowed.has(String(message.chatId))) {
        index++
        continue
      }
      await telegram('sendMessage', { chat_id: message.chatId, text: message.text }, signal)
      state.outbox.splice(index, 1)
      dirty = true
      persist()
      dirty = false
    }
  }

  async function run(signal) {
    while (running && !signal.aborted) {
      try {
        await flush(signal)
        const updates = await telegram('getUpdates', { offset: state.offset, timeout: 25, allowed_updates: ['message'] }, signal)
        for (const update of updates) {
          if (update.update_id < state.offset) continue
          const text = await handle(update, signal)
          state.offset = update.update_id + 1
          if (text) {
            const characters = Array.from(text)
            for (let index = 0; index < characters.length; index += 3500) {
              state.outbox.push({ chatId: update.message.chat.id, text: characters.slice(index, index + 3500).join('') })
            }
          }
          dirty = true
          await flush(signal)
        }
      } catch {
        if (signal.aborted) break
        console.error('Telegram bot could not process updates; it will retry. Check the token, allowlist, network and webhook configuration.')
        await delay(5000)
      }
    }
  }

  return {
    start() {
      if (!token || !allowed.size) throw new Error('Telegram bot requires a token and an explicit allowlist.')
      if (running) return
      running = true
      controller = new AbortController()
      void run(controller.signal)
    },
    stop() { running = false; controller?.abort() },
    handle,
  }
}
