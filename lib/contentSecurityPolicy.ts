export const buildContentSecurityPolicy = (input: { nonce: string; isDev?: boolean }) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${input.nonce}' 'strict-dynamic'${input.isDev ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: ws: wss:",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors *",
    "object-src 'none'",
  ].join('; ');
