/** @type {import('next').NextConfig} */
const nextConfig = {
  // Builds a self-contained bundle in .next/standalone so we can
  // host on environments without a managed Next runtime (cPanel,
  // VPS, Docker). Vercel ignores this and uses its own optimized
  // path, so it is safe to leave on.
  output: "standalone",
};

export default nextConfig;
