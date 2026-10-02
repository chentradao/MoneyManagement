/** @type {import('next').NextConfig} */
// Keep the development cache separate so a production build cannot corrupt a
// dev server that is still running locally.
const nextConfig = {
  poweredByHeader: false,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};
export default nextConfig;
