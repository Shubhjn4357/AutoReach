/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "@whiskeysockets/baileys",
    "whatsapp-rust-bridge",
    "libsignal",
  ],
};

export default nextConfig;
