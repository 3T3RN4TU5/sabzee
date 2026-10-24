/** "Aarav Mehta" → "Aarav_Mehta_Resume" — the name recruiters see in their downloads folder. */
export function printFilename(name: string, suffix = 'Resume'): string {
  const base = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|(?<!_)_+$/g, '')
  return base ? `${base}_${suffix}` : suffix
}
