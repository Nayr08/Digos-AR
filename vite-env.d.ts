/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENFREEMAP_STYLE_URL?: string;
  readonly VITE_VALHALLA_ROUTE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
