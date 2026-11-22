import { createAzureChat } from './azure-chat.mjs'
import { interfaceLanguages, validateInterfaceLanguage } from './assistant.mjs'

const glossary = {
  tn: { Citizen: 'Moagi', Official: 'Modiredi', Manager: 'Molaodi', 'My reports': 'Dipego tsa me', 'Report an issue': 'Bega bothata', Water: 'Metsi', Roads: 'Ditsela', Electricity: 'Motlakase', Waste: 'Matlakala' },
  st: { Citizen: 'Moahi', Official: 'Mosebeletsi', Manager: 'Mookameli', 'My reports': 'Litlaleho tsa ka', 'Report an issue': 'Tlaleha bothata', Water: 'Metsi', Roads: 'Ditsela', Electricity: 'Motlakase', Waste: 'Ditšila' },
  af: { Citizen: 'Inwoner', Official: 'Beampte', Manager: 'Bestuurder', 'My reports': 'My verslae', 'Report an issue': "'n Probleem aanmeld", Water: 'Water', Roads: 'Paaie', Electricity: 'Elektrisiteit', Waste: 'Afval' },
}

export function createUiTranslator({ endpoint, key, deployment, messages, fetchImpl = fetch, retryDelay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  const chat = createAzureChat({ endpoint, key, deployment, fetchImpl })
  const cache = new Map()
  const translateBatch = async messages => {
    for (let attempt = 0; ; attempt++) {
      try { return await chat(messages, 90000) }
      catch (error) {
        if (error?.upstreamStatus !== 429 || attempt >= 3) throw error
        await retryDelay(2000 * (2 ** attempt))
      }
    }
  }
  return async language => {
    validateInterfaceLanguage(language)
    if (language === 'en') return {}
    if (!cache.has(language)) {
      const request = (async () => {
        const chunks = []
        for (let index = 0; index < messages.length; index += 40) chunks.push(messages.slice(index, index + 40))
        const translations = []
        for (let index = 0; index < chunks.length; index += 2) {
          const batch = await Promise.all(chunks.slice(index, index + 2).map(async chunk => {
            const content = await translateBatch([
              { role: 'system', content: `Translate these fixed user-interface labels from English to ${interfaceLanguages[language]}. They are from a South African public-service issue reporting application: a report is a citizen's submitted complaint or issue, not an explanation. Use this glossary: ${JSON.stringify(glossary[language])}. Use consistent civic terminology. Return JSON with exactly one property, "translations", containing an array of objects with the same numeric "id" and a translated "text" for each input item. Include every id exactly once. Preserve names, numbers, references and punctuation where appropriate. Do not add explanations or omit entries.` },
              { role: 'user', content: JSON.stringify(chunk.map((text, id) => ({ id, text }))) },
            ])
            let result
            try {
              result = JSON.parse(content)?.translations
            } catch {
              throw Object.assign(new Error('The language service returned an invalid response.'), { status: 502 })
            }
            if (!Array.isArray(result) || result.length !== chunk.length ||
                result.some(item => !item || !Number.isInteger(item.id) || item.id < 0 || item.id >= chunk.length ||
                  typeof item.text !== 'string' || !item.text.trim() || item.text.length > 2000) ||
                new Set(result.map(item => item.id)).size !== chunk.length) {
              throw Object.assign(new Error('The language service returned incomplete translations. Please try again.'), { status: 502 })
            }
            return result.sort((a, b) => a.id - b.id).map(item => item.text)
          }))
          translations.push(...batch.flat())
        }
        const dictionary = Object.fromEntries(messages.map((text, index) => [text, translations[index]]))
        for (const [text, translation] of Object.entries(glossary[language])) {
          if (Object.hasOwn(dictionary, text)) dictionary[text] = translation
        }
        return dictionary
      })()
      cache.set(language, request)
      request.catch(() => cache.delete(language))
    }
    return cache.get(language)
  }
}
