import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Los avisos pasan por core/notifications (DESIGN-SYSTEM §9.4): ahí viven la
    // traducción de tono/título/duración y los overrides de accesibilidad. Un
    // módulo que llame a sileo directo se los salta.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/core/notifications/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "sileo",
              message: "Usa useAlert().showAlert o notify de @/core/notifications (DESIGN-SYSTEM §9.4).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
