/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override the API base URL (default: /api/v1). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
