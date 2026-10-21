import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The text of one inline <script> or <style> of a ported page (src/legacy/<page>/<file>), read at build time and written into the page as it was. */
export const inline = (page: string, file: string): string => readFileSync(join(process.cwd(), "src/legacy", page, file), "utf8");
