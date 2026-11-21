import type { NextConfig } from "next";
import { MERGED_SYMPTOMS } from "./src/data/symptoms";

const nextConfig: NextConfig = {
  // The service worker must never be served stale, or a fix to it could take days to reach people.
  headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
  // Merged symptom pages keep their old addresses working.
  redirects() {
    return Object.entries(MERGED_SYMPTOMS).map(([from, to]) => ({
      source: `/symptom/${from}`,
      destination: `/symptom/${to}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
