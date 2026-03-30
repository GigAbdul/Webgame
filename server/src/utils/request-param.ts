export function getSingleParam(param: string | string[] | undefined, name: string) {
  if (!param) {
    throw new Error(`Missing route param: ${name}`);
  }

  return Array.isArray(param) ? param[0] : param;
}

