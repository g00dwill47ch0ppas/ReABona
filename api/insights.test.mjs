import test from 'node:test'
import assert from 'node:assert/strict'
import { createInsights, validateCaseInsightInput } from './insights.mjs'

test('case insights accept only reviewed text and approved local detection labels', async () => {
  assert.throws(() => validateCaseInsightInput({ reviewedText: '', photoLabels: [] }), /reviewed case text/)
  assert.throws(() => validateCaseInsightInput({ reviewedText: 'Test', photoLabels: ['image bytes'] }), /valid title/)
  const input = validateCaseInsightInput({ reviewedText: ' Reviewed issue ', photoLabels: ['a water leak'], language: 'en', photo: 'never sent' })
  const insights = createInsights({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    fetchImpl: async (url, options) => {
      const request = JSON.parse(options.body)
      assert.deepEqual(JSON.parse(request.messages[1].content), { reviewedText: 'Reviewed issue', uncertainPhotoLabels: ['a water leak'] })
      return Response.json({ choices: [{ message: { content: JSON.stringify({ insights: ['Inspect with a qualified team.'] }) } }] })
    },
  })
  assert.deepEqual(await insights('case', { reviewedText: input.reviewedText, uncertainPhotoLabels: input.photoLabels }, input.language), { insights: ['Inspect with a qualified team.'] })
})

test('rejects invalid AI insight results', async () => {
  const insights = createInsights({
    endpoint: 'https://example.openai.azure.com/', key: 'test-key', deployment: 'demo',
    fetchImpl: async () => Response.json({ choices: [{ message: { content: '{"insights":[]}' } }] }),
  })
  await assert.rejects(insights('dashboard', { total: 1 }, 'en'), /invalid insights/)
})
