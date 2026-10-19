import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Static export with unoptimized images (see next.config.ts): next/image adds nothing, and photos come from Supabase/Cloudinary.
  { rules: { "@next/next/no-img-element": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "public/maplibre/**", // copied vendor files, not our code
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
