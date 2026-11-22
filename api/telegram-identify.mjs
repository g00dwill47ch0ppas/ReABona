import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env = config({ path: resolve(root, '.env'), quiet: true })
if (env.error && env.error.code !== 'ENOENT') throw env.error
const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('TELEGRAM_BOT_TOKEN is not configured.')
  process.exitCode = 1
} else {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeout: 15, allowed_updates: ['message'] }),
      redirect: 'error', signal: AbortSignal.timeout(25_000),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    if (!result.ok || !Array.isArray(result.result)) throw new Error('Telegram rejected the request.')
    const ids = [...new Set(result.result.filter(item => item.message?.chat?.type === 'private' &&
      item.message.chat.id === item.message.from?.id && item.message.text === '/start').map(item => String(item.message.from.id)))]
    if (ids.length) console.log(`Telegram user ID(s) from private /start messages: ${ids.join(', ')}\nVerify the correct account before adding its ID to TELEGRAM_ALLOWED_USER_IDS in the root .env.`)
    else console.log('No private /start message found. Send /start to your bot, then run this command again.')
  } catch {
    console.error('Unable to check Telegram messages. Check the token and network, and ensure no webhook or other bot poller is active.')
    process.exitCode = 1
  }
}
