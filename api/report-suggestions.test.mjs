import test from 'node:test'
import assert from 'node:assert/strict'
import { createReportSuggester, validateSuggestionInput } from './report-suggestions.mjs'

const categories = [{ categoryId: 1, categoryName: 'Water and sanitation' }]

test('sends only the title and approved detection labels and validates the suggestion', async () => {
  const suggester = createReportSuggester({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    fetchImpl: async (url, options) => {
      const request = JSON.parse(options.body)
      const input = JSON.parse(request.messages[1].content)
      assert.deepEqual(input, { title: 'Water leak', uncertainPhotoLabels: ['a water leak'], categories })
      assert.match(request.messages[0].content, /uncertain/)
      return Response.json({ choices: [{ message: { content: JSON.stringify({ categoryId: 1, description: 'Possible water leak.' }) } }] })
    },
  })
  const input = validateSuggestionInput({ title: ' Water leak ', photoLabels: ['a water leak', 'a water leak'], language: 'en', photo: 'not sent' })
  assert.deepEqual(await suggester(input, categories), { categoryId: 1, description: 'Possible water leak.' })
})

test('rejects invalid inputs and malformed or unsupported model suggestions', async () => {
  assert.throws(() => validateSuggestionInput({ title: '', photoLabels: [], language: 'en' }), /Enter a title/)
  assert.throws(() => validateSuggestionInput({ title: 'Test', photoLabels: ['private image data'], language: 'en' }), /valid title/)
  assert.throws(() => validateSuggestionInput({ title: 'Test', photoLabels: [], language: 'fr' }), /supported interface language/)
  for (const result of [{ categoryId: 99, description: 'Test' }, { categoryId: 1, description: 'x'.repeat(5001) }, { categoryId: 1 }, 'invalid']) {
    const suggester = createReportSuggester({
      endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
      fetchImpl: async () => Response.json({ choices: [{ message: { content: typeof result === 'string' ? result : JSON.stringify(result) } }] }),
    })
    await assert.rejects(suggester({ title: 'Test', photoLabels: [], language: 'en' }, categories), /invalid suggestion/)
  }
})
