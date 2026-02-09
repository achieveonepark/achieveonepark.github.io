import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // command가 'serve'(개발모드)일 때는 루트('/') 경로를 사용하고,
  // 그 외(빌드/배포)일 때는 GitHub Pages 레포지토리 이름('/achieveone-os/')을 사용하도록 설정
  base: command === 'serve' ? '/' : '/achieveone-os/',
}))