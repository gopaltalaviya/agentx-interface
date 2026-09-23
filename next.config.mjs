/** @type {import('next').NextConfig} */
const nextConfig = {
  // The API lives in agentx-backend and is deployed separately, so the
  // browser talks to it directly. Kept as one env var rather than scattered
  // literals — the same page has to work against localhost, a Railway URL and
  // a judge's fork without a rebuild of anything but this value.
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8080',
  },
};

export default nextConfig;
