import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from './server.mjs'

test('Telegram confirmation creates one persisted report for a separate citizen identity', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'reabona-telegram-'))
  const dataPath = join(directory, 'demo.json')
  const texts = ['/start', 'Synthetic water outage', '1', 'Synthetic description', 'Synthetic location', '/skip', 'YES']
  const updates = texts.map((text, index) => ({ update_id: index + 1, message: { from: { id: 123 }, chat: { id: 123, type: 'private' }, text } }))
  const sent = []
  let first = true
  const telegramFetch = async (url, options) => {
    if (url.endsWith('getUpdates')) {
      if (first) { first = false; return Response.json({ ok: true, result: updates }) }
      return new Promise((resolve, reject) => {
        if (options.signal.aborted) return reject(new Error('Stopped'))
        options.signal.addEventListener('abort', () => reject(new Error('Stopped')), { once: true })
      })

    }
    if (url.endsWith('sendMessage')) { sent.push(JSON.parse(options.body).text); return Response.json({ ok: true, result: {} }) }
    throw new Error('Unexpected request')
  }
  const server = createServer({ dataPath, telegramToken: 'test-token', telegramAllowedUserIds: ['123'], telegramFetch })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const deadline = Date.now() + 5000
    while (sent.length < texts.length && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(sent.length, texts.length)
    assert.match(sent.at(-1), /reference number/)
    const saved = JSON.parse(readFileSync(dataPath, 'utf8'))
    const reports = saved.reports.filter(report => report.title === 'Synthetic water outage')
    assert.equal(reports.length, 1)
    assert.notEqual(reports[0].submittedBy, saved.users.find(user => user.demoId === 'citizen').userId)
    assert.equal(saved.telegram.offset, 8)
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/me`)
    assert.equal(response.status, 401)
  } finally {
    await new Promise(resolve => server.close(resolve))
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Telegram backlog and status messages persist and reach only the originating private chat', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'reabona-telegram-status-'))
  const dataPath = join(directory, 'demo.json')
  let now = Date.now()
  let server = createServer({ dataPath, clock: () => now })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  await new Promise(resolve => server.close(resolve))
  try {
    const data = JSON.parse(readFileSync(dataPath, 'utf8'))
    const report = data.reports[0]
    report.submittedBy = 'telegram-citizen'
    report.submittedAt = new Date(now).toISOString()
    delete report.initialStatusReminderAt
    delete report.initialStatusEscalatedAt
    data.users.push({ userId: 'telegram-citizen', role: 'Citizen', fullName: 'Telegram resident', institutionId: null })
    data.telegram = { offset: 0, drafts: {}, identities: { 123: 'telegram-citizen' }, outbox: [] }
    writeFileSync(dataPath, JSON.stringify(data))
    server = createServer({ dataPath, clock: () => now })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const base = `http://127.0.0.1:${server.address().port}/api`
    const request = (role, path, body) => fetch(`${base}${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'X-Demo-User': role, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    now += 30 * 60_000
    await request('municipal-official', '/notifications')
    let saved = JSON.parse(readFileSync(dataPath, 'utf8'))
    assert.match(saved.telegram.outbox[0].text, /backlog/)
    const obstruction = `${dataPath}.${process.pid}.tmp`
    mkdirSync(obstruction)
    const failed = await request('municipal-official', `/cases/${report.referenceNumber}/status`, { status: 'Under review' })
    assert.equal(failed.status, 500)
    rmSync(obstruction, { recursive: true })
    assert.equal((await request('municipal-official', `/cases/${report.referenceNumber}/status`, { status: 'Under review' })).status, 200)
    assert.equal((await request('manager', `/cases/${report.referenceNumber}/status`, { status: 'Resolved' })).status, 200)
    saved = JSON.parse(readFileSync(dataPath, 'utf8'))
    assert.equal(saved.telegram.outbox.length, 3)
    assert.match(saved.telegram.outbox[1].text, new RegExp(`${report.referenceNumber}.*Under review`))
    assert.match(saved.telegram.outbox[2].text, new RegExp(`${report.referenceNumber}.*Resolved`))
    await new Promise(resolve => server.close(resolve))
    const sent = []
    const telegramFetch = async (url, options) => {
      if (url.endsWith('sendMessage')) {
        sent.push(JSON.parse(options.body))
        return Response.json({ ok: true, result: {} })
      }
      if (url.endsWith('getUpdates')) return new Promise((resolve, reject) => {
        if (options.signal.aborted) return reject(new Error('Stopped'))
        options.signal.addEventListener('abort', () => reject(new Error('Stopped')), { once: true })
      })
      throw new Error('Unexpected request')
    }
    server = createServer({ dataPath, clock: () => now, telegramToken: 'test-token', telegramAllowedUserIds: ['123'], telegramFetch })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const deadline = Date.now() + 5000
    while ((sent.length < 3 || JSON.parse(readFileSync(dataPath, 'utf8')).telegram.outbox.length) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(sent.length, 3)
    assert.deepEqual(sent.map(message => String(message.chat_id)), ['123', '123', '123'])
    assert.deepEqual(sent.map(message => message.text), saved.telegram.outbox.map(message => message.text))
    assert.equal(JSON.parse(readFileSync(dataPath, 'utf8')).telegram.outbox.length, 0)
  } finally {
    if (server.listening) await new Promise(resolve => server.close(resolve))
    rmSync(directory, { recursive: true, force: true })
  }
})
