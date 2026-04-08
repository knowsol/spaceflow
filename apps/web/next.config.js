/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker standalone 빌드: NEXT_OUTPUT=standalone 환경변수로 활성화
  // Vercel 배포 시에는 설정하지 않음
  ...(process.env.NEXT_OUTPUT === 'standalone' && { output: 'standalone' }),
}
module.exports = nextConfig
