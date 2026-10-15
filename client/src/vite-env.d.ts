/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FRONTEND_URL: string
  readonly VITE_BACKEND_URL: string
  // Add more custom env variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
