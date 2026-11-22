import test from 'node:test'
import assert from 'node:assert/strict'
import { createUiTranslator } from './ui-translation.mjs'

test('translates only the fixed interface catalog and caches each language', async () => {
  let calls = 0
  const translate = createUiTranslator({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    messages: ['Report', 'Status'],
    fetchImpl: async (url, options) => {
      calls++
      const request = JSON.parse(options.body)
      assert.match(request.messages[0].content, /Setswana/)
      assert.deepEqual(JSON.parse(request.messages[1].content), [{ id: 0, text: 'Report' }, { id: 1, text: 'Status' }])
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ translations: [{ id: 1, text: 'Maemo' }, { id: 0, text: 'Pego' }] }) } }] }))
    },
  })
  const results = await Promise.all([translate('tn'), translate('tn')])
  assert.deepEqual(results, [{ Report: 'Pego', Status: 'Maemo' }, { Report: 'Pego', Status: 'Maemo' }])
  assert.equal(calls, 1)
  assert.deepEqual(await translate('en'), {})
  await assert.rejects(translate('fr'), /supported interface language/)
  assert.equal(calls, 1)
})

test('rejects incomplete translations and permits retry', async () => {
  let calls = 0
  const translate = createUiTranslator({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    messages: ['Report', 'Status'],
    fetchImpl: async () => {
      calls++
      const translations = calls === 1 ? [{ id: 0, text: 'Pego' }] : [{ id: 0, text: 'Pego' }, { id: 1, text: 'Maemo' }]
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ translations }) } }] }))
    },
  })
  await assert.rejects(translate('tn'), /incomplete translations/)
  assert.deepEqual(await translate('tn'), { Report: 'Pego', Status: 'Maemo' })
})

test('uses the civic glossary for key labels even when the model returns different text', async () => {
  const translate = createUiTranslator({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    messages: ['Report an issue', 'Electricity'],
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ translations: [
      { id: 0, text: 'Different text' }, { id: 1, text: 'Other text' },
    ] }) } }] })),
  })

  assert.deepEqual(await translate('tn'), { 'Report an issue': 'Bega bothata', Electricity: 'Motlakase' })
})

test('retries transient language-service rate limits before caching', async () => {
  let calls = 0
  const delays = []
  const translate = createUiTranslator({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo', messages: ['Status'],
    retryDelay: async ms => { delays.push(ms) },
    fetchImpl: async () => {
      calls++
      if (calls < 3) return new Response('', { status: 429 })
      return Response.json({ choices: [{ message: { content: JSON.stringify({ translations: [{ id: 0, text: 'Maemo' }] }) } }] })
    },
  })
  assert.deepEqual(await translate('tn'), { Status: 'Maemo' })
  assert.deepEqual(delays, [2000, 4000])
  await translate('tn')
  assert.equal(calls, 3)
})
