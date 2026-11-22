import test from 'node:test'
import assert from 'node:assert/strict'
import { createAssistant, validateChatMessages, validateReportDraft } from './assistant.mjs'

const categories = [{ categoryId: 1, categoryName: 'Water and sanitation' }]

test('calls the Azure deployment with validated messages and returns its reply', async () => {
  let called = false
  const assistant = createAssistant({
    endpoint: 'https://example.cognitiveservices.azure.com/openai/deployments/demo/chat/completions?api-version=2024-10-21',
    key: 'test-key',
    deployment: 'demo',
    fetchImpl: async (url, options) => {
      called = true
      assert.equal(url.hostname, 'example.cognitiveservices.azure.com')
      assert.equal(options.headers['api-key'], 'test-key')
      const body = JSON.parse(options.body)
      assert.equal(body.messages[0].role, 'system')
      assert.deepEqual(body.messages[2], { role: 'user', content: 'How do I report?' })
      assert.deepEqual(body.response_format, { type: 'json_object' })
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ detectedLanguage: 'en', reply: 'Use the report form.', report: null }) } }] }), { status: 200 })
    },
  })
  assert.deepEqual(await assistant(validateChatMessages([{ role: 'user', content: 'How do I report?' }]), null, categories), { reply: 'Use the report form.', report: null })
  assert.ok(called)
})

test('passes the current draft and validates the proposed report', async () => {
  const draft = { title: 'Water outage', categoryId: 1, location: null, description: 'No water for two days.' }
  const assistant = createAssistant({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body)
      assert.match(body.messages[1].content, /Water outage/)
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ detectedLanguage: 'en', reply: 'Where is this?', report: draft }) } }] }))
    },
  })
  assert.deepEqual(await assistant([{ role: 'user', content: 'Report no water for two days.' }], draft, categories), { reply: 'Where is this?', report: draft })
  assert.throws(() => validateReportDraft({ ...draft, categoryId: 99 }, categories), /category/)
  assert.throws(() => validateReportDraft({ ...draft, location: 'x'.repeat(301) }, categories), /location/)
  const badAssistant = createAssistant({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"detectedLanguage":"en","reply":"Ready","report":{"categoryId":99}}' } }] })),
  })
  await assert.rejects(badAssistant([{ role: 'user', content: 'Report a problem' }], null, categories), /invalid response/)
})

test('rejects unsafe endpoints, mismatched deployments and invalid chat history', async () => {
  const unsafe = createAssistant({ endpoint: 'https://example.invalid/', key: 'test-key', deployment: 'demo' })
  await assert.rejects(unsafe([{ role: 'user', content: 'Hello' }]), /supported Azure HTTPS endpoint/)
  const mismatch = createAssistant({ endpoint: 'https://example.openai.azure.com/openai/deployments/other/chat/completions?api-version=2024-10-21', key: 'test-key', deployment: 'demo' })
  await assert.rejects(mismatch([{ role: 'user', content: 'Hello' }]), /do not match/)
  assert.throws(() => validateChatMessages([{ role: 'assistant', content: 'Hello' }]), /last chat message/)
  assert.throws(() => validateChatMessages([{ role: 'user', content: 'x'.repeat(2001) }]), /2000/)
})

test('requests replies in the latest message language with a selected-language fallback', async () => {
  const assistant = createAssistant({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    fetchImpl: async (url, options) => {
      const body = JSON.parse(options.body)
      assert.match(body.messages[0].content, /language of the\s+resident's latest message/)
      assert.match(body.messages[0].content, /answer an English message in English even if the\s+selected interface language is Afrikaans/)
      assert.match(body.messages[1].content, /Fallback interface language.*Sesotho/)
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ detectedLanguage: 'st', reply: 'Dumela', report: null }) } }] }))
    },
  })
  assert.equal((await assistant([{ role: 'user', content: 'Dumela' }], null, categories, 'st')).reply, 'Dumela')
  await assert.rejects(assistant([{ role: 'user', content: 'Hi' }], null, categories, 'invalid'), /supported interface language/)

  const invalidLanguageResponse = createAssistant({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ detectedLanguage: 'other', reply: 'Hello', report: null }) } }] })),
  })
  await assert.rejects(invalidLanguageResponse([{ role: 'user', content: 'Hi' }], null, categories), /invalid response/)
})
