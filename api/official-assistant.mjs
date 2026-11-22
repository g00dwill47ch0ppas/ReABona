import { createAzureChat } from './azure-chat.mjs'
import { interfaceLanguages, validateInterfaceLanguage } from './assistant.mjs'

const instructions = `You are ReaBona's assistant for public-service officials in a demonstration.
Give concise, practical general guidance about triaging and coordinating civic service reports.
You cannot access reports, photos, personal data or institutional systems, and must never claim
that you have inspected an image, verified a fact, or performed an action. Do not request personal
or confidential information. Recommend appropriately trained personnel for hazardous work, and
do not give unsafe instructions for handling electricity, damaged infrastructure or other hazards.
Reply in the language of the latest user message (English, Setswana, Sesotho or Afrikaans); use
the supplied interface language only when unclear. Return JSON with one property, "reply".`

export function createOfficialAssistant({ endpoint, key, deployment, fetchImpl = fetch }) {
  const chat = createAzureChat({ endpoint, key, deployment, fetchImpl })
  return async (messages, language = 'en') => {
    const fallback = interfaceLanguages[validateInterfaceLanguage(language)]
    const content = await chat([
      { role: 'system', content: instructions },
      { role: 'system', content: `Fallback interface language, only if the message language is unclear: ${fallback}.` },
      ...messages,
    ])
    let output
    try { output = JSON.parse(content) }
    catch { throw Object.assign(new Error('The AI service returned an invalid response. Please try again.'), { status: 502, expose: true }) }
    if (!output || typeof output.reply !== 'string' || !output.reply.trim()) {
      throw Object.assign(new Error('The AI service returned an invalid response. Please try again.'), { status: 502, expose: true })
    }
    return { reply: output.reply.trim() }
  }
}
