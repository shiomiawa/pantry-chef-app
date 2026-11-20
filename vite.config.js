import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 同期のデータ（サーバー側の上限は20万文字。日本語はUTF-8で1文字3バイトになりうる）も受け取れる大きさにする
const MAX_DEV_BODY_BYTES = 1024 * 1024
// サーバー側だけで使う環境変数（画面側のコードには渡さない）
const SERVER_ENV_KEYS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_MODEL',
  'DEMO_CODE',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SYNC_CODE',
]
// 開発サーバーで動かす Vercel関数（URL → ファイル）
const API_ROUTES = {
  '/api/suggest': '/api/suggest.js',
  '/api/sync': '/api/sync.js',
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_DEV_BODY_BYTES) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

// 開発用：`npm run dev` だけで api/ の Vercel関数を動かす。本番（Vercel）では使われない
function devApiPlugin(env) {
  return {
    name: 'pantry-chef-dev-api',
    apply: 'serve',
    configureServer(server) {
      for (const key of SERVER_ENV_KEYS) {
        if (env[key] && !process.env[key]) process.env[key] = env[key]
      }

      for (const [route, file] of Object.entries(API_ROUTES)) {
        server.middlewares.use(route, async (req, res) => {
          // Vercel の req.headers / req.body / res.status().json() に合わせた最小限の形
          const vercelRes = {
            setHeader: (name, value) => res.setHeader(name, value),
            status(code) {
              res.statusCode = code
              return vercelRes
            },
            json(data) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(data))
            },
          }
          try {
            const raw = req.method === 'POST' || req.method === 'PUT' ? await readBody(req) : ''
            const { default: handler } = await server.ssrLoadModule(file)
            await handler({ method: req.method, headers: req.headers, body: raw }, vercelRes)
          } catch {
            vercelRes.status(400).json({ error: '送られたデータを読み取れませんでした' })
          }
        })
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  // '' を指定すると VITE_ で始まらない変数も読める。ここで読んだ値は設定ファイル（サーバー側）の中だけで使う
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devApiPlugin(env)],
  }
})
