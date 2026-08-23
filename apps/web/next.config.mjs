/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Avatar tu Google OAuth.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Anh the tu Supabase Storage (P2).
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'http', hostname: '127.0.0.1' },
    ],
  },
};

export default nextConfig;
