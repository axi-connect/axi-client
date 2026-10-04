import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Importaciones vetadas y dónde sí se permiten. En flat config dos bloques con
// la misma regla no se suman (gana el último), así que cada zona declara la
// lista completa que le toca.
const SILEO = {
  name: "sileo",
  message: "Usa useAlert().showAlert o notify de @/core/notifications (DESIGN-SYSTEM §9.4).",
};
// La película de la home es la única que puede cargar GSAP y Lenis: en
// cualquier otro sitio entrarían al JS del panel o de /platform (programa
// landing cinematográfica, D13 y D15).
const FILM_LIBS_MESSAGE = "GSAP y Lenis solo se usan en la película de la home (src/modules/landing/ui/film/).";
const FILM_LIBS = [
  { name: "gsap", message: FILM_LIBS_MESSAGE },
  { name: "lenis", message: FILM_LIBS_MESSAGE },
];
const FILM_LIB_PATTERNS = [{ group: ["gsap/*", "lenis/*"], message: FILM_LIBS_MESSAGE }];
// `no-restricted-imports` no ve el `import()` dinámico (auditoría de la landing,
// m7): un `await import("gsap")` fuera de la película se colaba sin aviso.
const FILM_LIB_DYNAMIC = {
  selector: "ImportExpression[source.value=/^(gsap|lenis)(\\u002F|$)/]",
  message: FILM_LIBS_MESSAGE,
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Los avisos pasan por core/notifications (DESIGN-SYSTEM §9.4): ahí viven la
    // traducción de tono/título/duración y los overrides de accesibilidad. Un
    // módulo que llame a sileo directo se los salta.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/core/notifications/**", "src/modules/landing/ui/film/**"],
    rules: {
      "no-restricted-imports": ["error", { paths: [SILEO, ...FILM_LIBS], patterns: FILM_LIB_PATTERNS }],
      "no-restricted-syntax": ["error", FILM_LIB_DYNAMIC],
    },
  },
  {
    files: ["src/modules/landing/ui/film/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { paths: [SILEO] }] },
  },
  {
    files: ["src/core/notifications/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: FILM_LIBS, patterns: FILM_LIB_PATTERNS }],
      "no-restricted-syntax": ["error", FILM_LIB_DYNAMIC],
    },
  },
];

export default eslintConfig;
