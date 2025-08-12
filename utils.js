export function extractChannelId(input) {
  input = (input || '').trim();
  if (!input) return null;
  if (input.startsWith('@')) return input;
  try {
    const u = new URL(input);
    if (u.hostname.includes('youtube.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts[0] === 'channel' && parts[1]) return parts[1];
      if (parts[0].startsWith('@')) return parts[0];
      if (parts[0] === 'c' || parts[0] === 'user') return '@' + parts[1];
    }
  } catch {}
  return input;
}
