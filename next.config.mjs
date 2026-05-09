/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: '/about',   destination: '/', permanent: false },
      { source: '/contact', destination: '/', permanent: false },
      { source: '/work',    destination: '/', permanent: false },
      { source: '/lanyard', destination: '/', permanent: false },
      { source: '/resume',  destination: '/', permanent: false },
    ]
  },
}

export default nextConfig
