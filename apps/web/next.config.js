/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@bet/fairness", "@bet/shared-types", "@bet/config"],
};

module.exports = nextConfig;