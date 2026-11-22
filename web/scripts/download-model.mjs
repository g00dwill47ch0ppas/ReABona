import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'

function hashFor(size, expected) {
  const hash = createHash(expected.length === 40 ? 'sha1' : 'sha256')
  if (expected.length === 40) hash.update(`blob ${size}\0`)
  return hash
}

export async function downloadModel(model, revision, files) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models', ...model.split('/'))
  for (const [file, size, expected] of files) {
    const path = join(root, ...file.split('/'))
    if (existsSync(path)) {
      const hash = hashFor(size, expected)
      let bytes = 0
      for await (const chunk of createReadStream(path)) { hash.update(chunk); bytes += chunk.length }
      if (bytes === size && hash.digest('hex') === expected) {
        console.log(`Verified ${file}`)
        continue
      }
    }
    console.log(`Downloading ${file}`)
    const response = await fetch(`https://huggingface.co/${model}/resolve/${revision}/${file}`)
    if (!response.ok || !response.body) throw new Error(`Failed to download ${file}: HTTP ${response.status}`)
    mkdirSync(dirname(path), { recursive: true })
    const temporary = `${path}.download`
    const hash = hashFor(size, expected)
    let bytes = 0
    try {
      const verify = new Transform({ transform(chunk, encoding, callback) { bytes += chunk.length; hash.update(chunk); callback(null, chunk) } })
      await pipeline(Readable.fromWeb(response.body), verify, createWriteStream(temporary))
      if (bytes !== size || hash.digest('hex') !== expected) throw new Error(`Checksum mismatch for ${file}`)
      if (existsSync(path)) rmSync(path)
      renameSync(temporary, path)
    } catch (error) {
      if (existsSync(temporary)) rmSync(temporary)
      throw error
    }
  }
}
