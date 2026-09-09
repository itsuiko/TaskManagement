import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // ポートが埋まっていたら別のポートに逃げず、起動そのものを失敗させる。
    // 黙って 5174 で立ち上がると、古いサーバーが 5173 に残ったまま
    // 「動いているのに変更が反映されない」状態になり、原因が分からなくなる。
    strictPort: true,
    proxy: {
      // ブラウザは 5173、バックエンドは 8080。ポートが違うとブラウザは
      // 「別のオリジン」とみなし、CORS で通信を弾く。
      //
      // Vite に中継させると、ブラウザからは同一オリジンへの要求に見えるため、
      // バックエンド側に @CrossOrigin を書いて受け入れ先を広げる必要がない。
      // 「API は同一オリジンからのリクエストのみ受け付ける」（requirements.md 6章）
      // という非機能要件とも一致する。
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
