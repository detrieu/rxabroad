import type { NextConfig } from "next";
import { MERGED_SYMPTOMS } from "./src/data/symptoms";

const nextConfig: NextConfig = {
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
