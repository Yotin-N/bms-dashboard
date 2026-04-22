function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function ensureBmsNamespace(url: string) {
  const trimmed = trimTrailingSlash(url);
  return /\/bms$/i.test(trimmed) ? trimmed : `${trimmed}/bms`;
}

function isLocalGateway(url: string) {
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url) || /:3001$/i.test(url);
}

function isLocalHostname(hostname: string) {
  return /^(localhost|127\.0\.0\.1)$/i.test(hostname);
}

function getHostedGatewayUrl() {
  if (typeof window === "undefined") return null;
  if (isLocalHostname(window.location.hostname)) return null;
  return trimTrailingSlash(window.location.origin);
}

export function getGatewayUrl() {
  const hosted = getHostedGatewayUrl();
  if (hosted) return hosted;

  const explicit = import.meta.env.VITE_GATEWAY_URL as string | undefined;
  if (explicit) return trimTrailingSlash(explicit);

  return "http://localhost:3001";
}

export function getApiBaseUrl() {
  const hosted = getHostedGatewayUrl();
  if (hosted) return `${hosted}/bms/api`;

  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return trimTrailingSlash(explicit);

  const gateway = getGatewayUrl();
  if (isLocalGateway(gateway)) return `${gateway}/api`;
  return `${gateway}/bms/api`;
}

export function getSocketBaseUrl() {
  const hosted = getHostedGatewayUrl();
  if (hosted) return ensureBmsNamespace(hosted);

  const explicit = import.meta.env.VITE_SOCKET_BASE_URL as string | undefined;
  if (explicit) return ensureBmsNamespace(explicit);

  return ensureBmsNamespace(getGatewayUrl());
}
