import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // GitHub Pages menghidang laman di bawah /<nama-repo>; tetapkan NEXT_PUBLIC_BASE_PATH=/ukkm semasa bina.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  webpack(config) {
    // Alias eksplisit: resolusi `paths` tsconfig tidak boleh diharap dalam folder yang disegerakkan (cth. Google Drive).
    config.resolve.alias['@'] = path.join(root, 'src');
    return config;
  },
};
export default nextConfig;
