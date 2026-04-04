/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/patient",
        destination: "/pharmacy-finder",
        permanent: true,
      },
      {
        source: "/patient/results",
        destination: "/pharmacy-finder/results",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
