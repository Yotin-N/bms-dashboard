function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function isLocalGateway(url: string) {
  return /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url) || /:3001$/i.test(url);
}

export function getGatewayUrl() {
  return trimTrailingSlash(import.meta.env.VITE_GATEWAY_URL || "http://localhost:3001");
}

export function getApiBaseUrl() {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit) return trimTrailingSlash(explicit);

  const gateway = getGatewayUrl();
  return isLocalGateway(gateway) ? `${gateway}/api` : `${gateway}/bms/api`;
}

export function getSocketBaseUrl() {
  const explicit = import.meta.env.VITE_SOCKET_BASE_URL as string | undefined;
  if (explicit) return trimTrailingSlash(explicit);
  return `${getGatewayUrl()}/bms`;
}
