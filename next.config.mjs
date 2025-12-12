/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint rules are already relaxed in .eslintrc.json
    // This ensures build doesn't fail on warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type checking is done separately
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
