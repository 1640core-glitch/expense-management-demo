export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | { [key: string]: unknown };

function toVal(mix: ClassValue): string {
  if (!mix) return '';
  if (typeof mix === 'string' || typeof mix === 'number') return String(mix);
  if (Array.isArray(mix)) {
    const parts: string[] = [];
    for (const item of mix) {
      const v = toVal(item);
      if (v) parts.push(v);
    }
    return parts.join(' ');
  }
  if (typeof mix === 'object') {
    const parts: string[] = [];
    for (const k in mix) {
      if (mix[k]) parts.push(k);
    }
    return parts.join(' ');
  }
  return '';
}

export function clsx(...inputs: ClassValue[]): string {
  const parts: string[] = [];
  for (const input of inputs) {
    const v = toVal(input);
    if (v) parts.push(v);
  }
  return parts.join(' ');
}

const PREFIX_RE = /^([a-z-]+):/i;

function getKey(token: string): string {
  let t = token;
  const prefixes: string[] = [];
  let m: RegExpMatchArray | null;
  while ((m = t.match(PREFIX_RE))) {
    prefixes.push(m[1]);
    t = t.slice(m[0].length);
  }
  const isNeg = t.startsWith('-');
  if (isNeg) t = t.slice(1);
  const dash = t.indexOf('-');
  const base = dash === -1 ? t : t.slice(0, dash);
  return `${prefixes.sort().join(':')}|${isNeg ? '-' : ''}${base}`;
}

export function twMerge(input: string): string {
  const tokens = input.split(/\s+/).filter(Boolean);
  const map = new Map<string, number>();
  tokens.forEach((tok, i) => {
    map.set(getKey(tok), i);
  });
  return tokens.filter((_, i) => {
    const key = getKey(tokens[i]);
    return map.get(key) === i;
  }).join(' ');
}

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(...inputs));
}
