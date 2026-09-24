#!/usr/bin/env node
/**
 * Re-import the small, user-authorized public Jin Fu Ying test-site image set.
 * Run from any directory: node /path/to/PBQuote/tools/import-public-assets.mjs
 * Node.js 20+; built-ins only. No login, cookies, API keys, or private endpoints.
 * Public availability is not a copyright license: reuse only with authorization.
 */
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceOrigin = 'http://jfy.app-test1.com'
const sourcePage = sourceOrigin + '/index.html?cate_id=4&sub_cate_id=5'
const productApi = sourceOrigin + '/api/product/product/5'
const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../client/public/merchant/default')
const maxImageBytes = 8 * 1024 * 1024
const assets = [
  { id: 'logo', file: 'logo.png', path: '/images/logo.png', kind: 'branding', discoveredAt: sourceOrigin + '/components/header.js?v=1.0.3' },
  { id: 'foldingBox', file: 'folding-box.jpg', path: '/storage/product/20211105/a44ab2d9de798b3be9f3d3b1d5b28c24.png', kind: 'product', discoveredAt: productApi },
  { id: 'foldingBoxDetail1', file: 'folding-box-detail-1.jpg', path: '/storage/editor/20210924/6bb9f0d805b0aaea637d33ef3c8fafa7.jpg', kind: 'content', discoveredAt: productApi },
  { id: 'foldingBoxDetail2', file: 'folding-box-detail-2.jpg', path: '/storage/editor/20210924/553961824d0a0f1ea92f3f1242025469.jpg', kind: 'content', discoveredAt: productApi },
]

async function downloadImage(asset) {
  const url = sourceOrigin + asset.path
  const response = await fetch(url, {
    redirect: 'error',
    credentials: 'omit',
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: 'image/png,image/jpeg', 'User-Agent': 'PBQuote-Public-Asset-Importer/1.0' },
  })
  if (!response.ok) throw new Error(url + ': HTTP ' + response.status)
  const sourceContentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()
  // The public product URL ends in .png and declares PNG, but its bytes are JPEG.
  // Accept only these raster types and verify the actual signature below.
  const contentType = asset.file.endsWith('.png') ? 'image/png' : 'image/jpeg'
  if (!['image/png', 'image/jpeg'].includes(sourceContentType)) throw new Error(url + ': unexpected content type ' + sourceContentType)
  if (Number(response.headers.get('content-length')) > maxImageBytes) throw new Error(url + ': exceeds 8 MiB limit')
  if (!response.body) throw new Error(url + ': empty response body')
  const chunks = []
  let bytes = 0
  for await (const chunk of response.body) {
    bytes += chunk.length
    if (bytes > maxImageBytes) throw new Error(url + ': exceeds 8 MiB limit')
    chunks.push(chunk)
  }
  const buffer = Buffer.concat(chunks)
  const signature = contentType === 'image/png' ? Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) : Buffer.from([255, 216, 255])
  if (!buffer.subarray(0, signature.length).equals(signature)) throw new Error(url + ': invalid image signature')
  return { buffer, record: { id: asset.id, kind: asset.kind, file: asset.file, localPath: '/merchant/default/' + asset.file, sourceUrl: url, discoveredAt: asset.discoveredAt, sourceContentType, contentType, bytes, sha256: createHash('sha256').update(buffer).digest('hex') } }
}

async function importAssets() {
  // Fetch only this fixed allowlist; never crawl links or download customer data.
  const downloaded = []
  for (const asset of assets) {
    console.log('Downloading ' + sourceOrigin + asset.path)
    downloaded.push(await downloadImage(asset))
  }
  const manifest = {
    schemaVersion: 1,
    sourceSite: sourceOrigin,
    sourcePage,
    product: { id: 1, name: '卡纸盒-双插盒', publicApi: productApi },
    authorization: "Imported at the user's request for this project from the supplied public test site; no independent license or redistribution rights are asserted.",
    command: 'node tools/import-public-assets.mjs',
    assets: downloaded.map(({ record }) => record),
  }
  await mkdir(outputDirectory, { recursive: true })
  const staging = await mkdtemp(join(outputDirectory, '.import-'))
  try {
    const files = downloaded.map(({ buffer, record }) => ({ file: record.file, buffer }))
    files.push({ file: 'manifest.json', buffer: Buffer.from(JSON.stringify(manifest, null, 2) + '\n') })
    // Validate all downloads first and publish each complete file with an atomic rename.
    for (const { file, buffer } of files) await writeFile(join(staging, file), buffer)
    for (const { file, buffer } of files) {
      const destination = join(outputDirectory, file)
      let existing
      try { existing = await readFile(destination) } catch (error) { if (error.code !== 'ENOENT') throw error }
      if (existing?.equals(buffer)) console.log('Unchanged ' + destination)
      else {
        await rename(join(staging, file), destination)
        console.log('Imported ' + destination)
      }
    }
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

const args = process.argv.slice(2)
if (args.length === 1 && args[0] === '--help') {
  console.log('Usage: node tools/import-public-assets.mjs\nDownloads four authorized public images and a provenance manifest into client/public/merchant/default. Requires Node.js 20+ and network access; no credentials.')
} else if (args.length) {
  console.error('Unknown arguments. Use --help for usage.')
  process.exitCode = 1
} else {
  importAssets().catch(error => {
    console.error('Jin Fu Ying asset import failed: ' + error.message)
    process.exitCode = 1
  })
}
