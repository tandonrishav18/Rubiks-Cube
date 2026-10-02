import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const galleryDirectory = fileURLToPath(new URL('../public/gallery/', import.meta.url))
const manifestPath = path.join(galleryDirectory, 'manifest.json')
const slotPattern = /^[UDLRFB]-[0-2]-[0-2]$/
const maxImageBytes = 12 * 1024 * 1024
const imageTypes = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/tiff': 'tif',
  'image/webp': 'webp',
  'image/x-icon': 'ico',
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

function sendJson(response, status, data) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(data))
}

async function readRequestBody(request) {
  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxImageBytes) throw Object.assign(new Error('Image exceeds 12 MB.'), { status: 413 })
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function saveManifest(manifest) {
  await mkdir(galleryDirectory, { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

export default function galleryPlugin() {
  return {
    name: 'cube-gallery-storage',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url, 'http://localhost')
        if (!url.pathname.startsWith('/api/gallery')) return next()

        try {
          if (url.pathname === '/api/gallery' && request.method === 'GET') {
            return sendJson(response, 200, await readManifest())
          }

          const textureMatch = url.pathname.match(/^\/api\/gallery\/texture\/([UDLRFB]-[0-2]-[0-2])$/)
          if (textureMatch) {
            const slot = textureMatch[1]
            if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' })
            const contentType = request.headers['content-type']?.split(';')[0].toLowerCase()
            if (contentType !== 'image/webp') return sendJson(response, 415, { error: 'Use a WebP cube texture.' })
            const contents = await readRequestBody(request)
            if (!contents.length) return sendJson(response, 400, { error: 'The cube texture is empty.' })
            const textureDirectory = path.join(galleryDirectory, 'textures')
            await mkdir(textureDirectory, { recursive: true })
            await writeFile(path.join(textureDirectory, `${slot}.webp`), contents)
            return sendJson(response, 200, { key: slot, saved: true })
          }

          const match = url.pathname.match(/^\/api\/gallery\/([UDLRFB]-[0-2]-[0-2])$/)
          if (!match) return sendJson(response, 404, { error: 'Gallery slot not found.' })
          const slot = match[1]
          const manifest = await readManifest()

          if (request.method === 'POST') {
            const contentType = request.headers['content-type']?.split(';')[0].toLowerCase()
            const extension = imageTypes[contentType]
            if (!extension) return sendJson(response, 415, { error: 'Use a supported browser image format.' })
            const contents = await readRequestBody(request)
            if (!contents.length) return sendJson(response, 400, { error: 'The uploaded image is empty.' })

            await mkdir(galleryDirectory, { recursive: true })
            const filename = `${slot}.${extension}`
            const previousUrl = manifest[slot]
            await writeFile(path.join(galleryDirectory, filename), contents)
            manifest[slot] = `/gallery/${filename}`
            await saveManifest(manifest)

            if (previousUrl && previousUrl !== manifest[slot]) {
              await unlink(path.join(galleryDirectory, path.basename(previousUrl))).catch(() => {})
            }
            return sendJson(response, 200, { key: slot, url: manifest[slot] })
          }

          if (request.method === 'DELETE') {
            const previousUrl = manifest[slot]
            if (previousUrl) await unlink(path.join(galleryDirectory, path.basename(previousUrl))).catch(() => {})
            await unlink(path.join(galleryDirectory, 'textures', `${slot}.webp`)).catch(() => {})
            delete manifest[slot]
            await saveManifest(manifest)
            return sendJson(response, 200, { key: slot, removed: true })
          }

          return sendJson(response, 405, { error: 'Method not allowed.' })
        } catch (error) {
          return sendJson(response, error.status ?? 500, { error: error.message ?? 'Gallery storage failed.' })
        }
      })
    },
  }
}