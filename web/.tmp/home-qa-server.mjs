import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = resolve(fileURLToPath(new URL('../dist/', import.meta.url)))
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4' }

createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store')
  const pathname = new URL(request.url, 'http://127.0.0.1:4174').pathname
  if (pathname.startsWith('/api/')) {
    let data = []
    if (pathname === '/api/status') data = { setup: true, system_name: 'New API', logo: '/logo.png', docs_link: 'https://docs.newapi.pro' }
    if (pathname === '/api/setup') data = { status: true }
    if (pathname === '/api/home_page_content' || pathname === '/api/notice') data = ''
    response.setHeader('Content-Type', 'application/json')
    if (pathname.includes('/auth/refresh')) {
      response.writeHead(401).end(JSON.stringify({ success: false }))
      return
    }
    response.end(JSON.stringify({ success: true, data }))
    return
  }
  let target = resolve(root, '.' + decodeURIComponent(pathname))
  if (target !== root && !target.startsWith(root + sep)) {
    response.writeHead(403).end()
    return
  }
  if (!extname(target)) target = resolve(root, 'index.html')
  try {
    const file = await readFile(target)
    if (extname(target) === '.mp4') {
      response.setHeader('Content-Type', 'video/mp4')
      response.setHeader('Accept-Ranges', 'bytes')
      const range = request.headers.range
      if (range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(range)
        const start = match?.[1] ? Number(match[1]) : Math.max(0, file.length - Number(match?.[2]))
        const end = match?.[1] && match[2] ? Math.min(Number(match[2]), file.length - 1) : file.length - 1
        if (!match || (!match[1] && !match[2]) || start > end || start >= file.length) {
          response.writeHead(416, { 'Content-Range': `bytes */${file.length}` }).end()
          return
        }
        response.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${file.length}`,
          'Content-Length': end - start + 1,
        })
        response.end(request.method === 'HEAD' ? undefined : file.subarray(start, end + 1))
        return
      }
      response.writeHead(200, { 'Content-Length': file.length })
      response.end(request.method === 'HEAD' ? undefined : file)
      return
    }
    const body = gzipSync(file)
    response.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream',
      'Content-Encoding': 'gzip' })
    response.end(body)
  } catch {
    response.writeHead(404).end()
  }
}).listen(4174, '127.0.0.1', () => console.log('Homepage QA fixture: http://127.0.0.1:4174'))
