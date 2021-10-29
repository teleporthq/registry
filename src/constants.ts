export const APPLICATION_TYPE = "application/javascript";

export const CACHE_CONTROL = "max-age=3600";

export const camelCaseToDashCase = (str: string): string =>
  str.replace(/([a-zA-Z])(?=[A-Z])/g, "$1-").toLowerCase();
