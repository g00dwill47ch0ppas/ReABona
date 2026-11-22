import test from 'node:test'
import assert from 'node:assert/strict'
import { createTelegramBot } from './telegram-bot.mjs'

test('allows only private allowlisted users and submits only after confirmation', async () => {
  const state = { offset: 0, drafts: {}, identities: {}, outbox: [] }
  const submissions = []
  const bot = createTelegramBot({
    token: 'test-token', allowedUserIds: ['123'], state, categories: [{ categoryId: 1, categoryName: 'Water' }],
    persist() {}, submit: (id, draft) => { submissions.push({ id, ...draft }); return 'RB-TEST' },
  })
  const message = (id, text, extras = {}) => ({ message: { from: { id }, chat: { id, type: 'private' }, text, ...extras } })
  assert.equal(await bot.handle(message(456, '/start'), new AbortController().signal), null)
  assert.equal(await bot.handle(message(123, '/start', { chat: { id: -1, type: 'group' } }), new AbortController().signal), null)
  for (const text of ['/start', 'Water outage', '1', 'No water', 'Demo street', '/skip']) {
    await bot.handle(message(123, text), new AbortController().signal)
  }
  assert.equal(submissions.length, 0)
  assert.match(await bot.handle(message(123, 'not yet'), new AbortController().signal), /YES/)
  assert.match(await bot.handle(message(123, 'YES'), new AbortController().signal), /RB-TEST/)
  assert.equal(submissions.length, 1)
  assert.equal(submissions[0].photo, null)
  await bot.handle(message(123, 'YES'), new AbortController().signal)
  assert.equal(submissions.length, 1)
})

test('accepts a Telegram photo and shared location without posting the image elsewhere', async () => {
  const state = { offset: 0, drafts: {}, identities: {}, outbox: [] }
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0x00])
  const calls = []
  const bot = createTelegramBot({
    token: 'test-token', allowedUserIds: ['123'], state, categories: [{ categoryId: 1, categoryName: 'Water' }],
    persist() {}, submit: () => 'RB-TEST',
    fetchImpl: async (url) => {
      calls.push(url)
      if (url.endsWith('getFile')) return Response.json({ ok: true, result: { file_path: 'photos/file_1.jpg' } })
      return new Response(jpeg)
    },
  })
  const update = (text, extra = {}) => ({ message: { from: { id: 123 }, chat: { id: 123, type: 'private' }, text, ...extra } })
  const signal = new AbortController().signal
  for (const text of ['/start', 'Test', '1', 'Details']) await bot.handle(update(text), signal)
  await bot.handle(update(undefined, { location: { latitude: -26.2, longitude: 28.1 } }), signal)
  assert.match(await bot.handle(update(undefined, { photo: [{ file_id: 'photo-id', file_size: 4 }] }), signal), /Photo: Attached/)
  assert.equal(state.drafts['123'].location, 'GPS: -26.200000, 28.100000')
  assert.equal(state.drafts['123'].photo, `data:image/jpeg;base64,${Buffer.from(jpeg).toString('base64')}`)
  assert.equal(calls.length, 2)
})

test('keeps unallowlisted messages pending without blocking allowed recipients', async () => {
  const state = {
    offset: 0, drafts: {}, identities: {},
    outbox: [{ chatId: '456', text: 'Pending' }, { chatId: '123', text: 'Allowed' }],
  }
  const sent = []
  const bot = createTelegramBot({
    token: 'test-token', allowedUserIds: ['123'], state, categories: [], persist() {}, submit() {},
    fetchImpl: async (url, options) => {
      if (url.endsWith('sendMessage')) {
        sent.push(JSON.parse(options.body))
        return Response.json({ ok: true, result: {} })
      }
      if (url.endsWith('getUpdates')) return new Promise((resolve, reject) => {
        if (options.signal.aborted) return reject(new Error('Stopped'))
        options.signal.addEventListener('abort', () => reject(new Error('Stopped')), { once: true })
      })
      throw new Error('Unexpected request')
    },
  })
  bot.start()
  try {
    const deadline = Date.now() + 5000
    while (state.outbox.length > 1 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20))
    assert.deepEqual(sent, [{ chat_id: '123', text: 'Allowed' }])
    assert.deepEqual(state.outbox, [{ chatId: '456', text: 'Pending' }])
  } finally {
    bot.stop()
  }
})
