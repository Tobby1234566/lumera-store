import { config } from '@/config.js';

export async function GET() {
  const base = config.appUrl.replace(/\/$/, '');
  const text = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /checkout',
    'Disallow: /cart',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(text, { headers: { 'content-type': 'text/plain' } });
}
