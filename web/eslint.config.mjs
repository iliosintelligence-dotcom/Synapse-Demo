import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Static export with unoptimized images (see next.config.ts): next/image adds nothing, and photos come from Supabase/Cloudinary.
  { rules: { "@next/next/no-img-element": "off" } },
  // `/` and the other ported pages are plain HTML (no React runtime), so a full-page <a> to them is the right link, not next/link.
  { rules: { "@next/next/no-html-link-for-pages": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "public/maplibre/**", // copied vendor files, not our code
    "public/**/*.js", // the static site copied in at cutover (scripts/assemble-static.mjs): the original site's code, not the Next app's
    "android/**", "ios/**", "native/**", // the Capacitor app projects and their offline page, not the Next app
    "src/legacy/**", // inline scripts and styles of the ported pages: the original site's code, character for character
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
