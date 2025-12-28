import type { VercelRequest, VercelResponse } from '@vercel/node';

const ENGINE_VERSION = '1.0.0';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'ok',
    engine_version: ENGINE_VERSION,
    timestamp: new Date().toISOString()
  });
}
