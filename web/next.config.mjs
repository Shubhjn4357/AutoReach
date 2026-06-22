/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "whatsapp-rust-bridge",
    "libsignal",
  ],
};

export default nextConfig;
