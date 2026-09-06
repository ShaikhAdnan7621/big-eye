import type { IncomingMessage, ServerResponse } from 'http';

interface AuthSession {
  email: string;
  password: string;
  cookie: string;
  cookieExpiresAt: number;
}

let session: AuthSession = {
  email: process.env.SENTINEL_EMAIL || 'shaikhadnan7621@gmail.com',
  password: process.env.SENTINEL_PASSWORD || 'TD53-92X2-MWWT',
  cookie: '',
  cookieExpiresAt: 0
};


export function updateSentinelCredentials(email: string, password: string) {
  session.email = email;
  session.password = password;
  session.cookie = '';
  session.cookieExpiresAt = 0;
}

export function getSentinelStatus() {
  return {
    authenticated: Boolean(session.cookie && session.cookieExpiresAt > Date.now()),
    email: session.email ? session.email.replace(/(.{3}).*(@.*)/, '$1***$2') : '',
    hasCredentials: Boolean(session.email && session.password)
  };
}

async function getValidCookie(): Promise<string> {
  if (session.cookie && session.cookieExpiresAt > Date.now()) {
    return session.cookie;
  }

  if (!session.email || !session.password) {
    throw new Error('Sentinel credentials not configured');
  }

  const body = new URLSearchParams();
  body.append('email', session.email);
  body.append('password', session.password);

  const loginRes = await fetch('https://cctv.corp8.cloud/auth/login', {
    method: 'POST',
    body: body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    redirect: 'manual'
  });

  const setCookie = loginRes.headers.get('set-cookie');
  if (!setCookie || !setCookie.includes('sentinel=')) {
    throw new Error(`Sentinel login failed (status ${loginRes.status})`);
  }

  const cookieMatch = setCookie.match(/sentinel=[^;]+/);
  if (!cookieMatch) {
    throw new Error('Sentinel cookie not found in response');
  }

  session.cookie = cookieMatch[0];
  session.cookieExpiresAt = Date.now() + 24 * 3600 * 1000; // 24 hours
  return session.cookie;
}

export async function handleStreamProxy(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';

  // Auth endpoint
  if (url === '/api/sentinel/auth' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(rawBody || '{}');
        if (parsed.email && parsed.password) {
          updateSentinelCredentials(parsed.email, parsed.password);
          await getValidCookie();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Authenticated successfully' }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Email and password required' }));
        }
      } catch (err: any) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message || 'Login failed' }));
      }
    });
    return true;
  }

  // Status endpoint
  if (url === '/api/sentinel/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getSentinelStatus()));
    return true;
  }

  // Cameras catalogue endpoint
  if (url === '/api/cameras') {
    try {
      const cookie = await getValidCookie();
      const catRes = await fetch('https://cctv.corp8.cloud/cameras.json', {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });
      const data = await catRes.text();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch camera catalogue' }));
    }
    return true;
  }

  // Key endpoint: /enc.key or /api/stream/:camId/enc.key
  if (url === '/enc.key' || url.endsWith('/enc.key')) {
    try {
      const cookie = await getValidCookie();
      const keyRes = await fetch('https://cctv.corp8.cloud/enc.key', {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://cctv.corp8.cloud/'
        }
      });
      const buffer = await keyRes.arrayBuffer();
      res.writeHead(keyRes.status, {
        'Content-Type': 'application/octet-stream',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400'
      });
      res.end(Buffer.from(buffer));
    } catch {
      res.writeHead(500);
      res.end('Key error');
    }
    return true;
  }

  // Stream proxy endpoint: /api/stream/:camId/index.m3u8 or /api/stream/:camId/:segment
  const streamMatch = url.match(/^\/api\/stream\/([a-zA-Z0-9_-]+)\/(index\.m3u8|[a-zA-Z0-9_.-]+\.ts|enc\.key)$/);
  if (streamMatch) {
    const camId = streamMatch[1];
    const asset = streamMatch[2];

    try {
      const cookie = await getValidCookie();
      const targetUrl = `https://cctv.corp8.cloud/${camId}/${asset}`;

      const upstreamRes = await fetch(targetUrl, {
        headers: {
          'Cookie': cookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://cctv.corp8.cloud/'
        }
      });

      if (!upstreamRes.ok && upstreamRes.status !== 200) {
        // If auth expired, clear cookie once and retry
        if (upstreamRes.status === 302 || upstreamRes.status === 403) {
          session.cookie = '';
          const newCookie = await getValidCookie();
          const retryRes = await fetch(targetUrl, {
            headers: {
              'Cookie': newCookie,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              'Referer': 'https://cctv.corp8.cloud/'
            }
          });
          if (!retryRes.ok) {
            res.writeHead(retryRes.status);
            res.end();
            return true;
          }
          return pipeFetchResponse(retryRes, res, asset.endsWith('.m3u8'));
        }
        res.writeHead(upstreamRes.status);
        res.end();
        return true;
      }

      return pipeFetchResponse(upstreamRes, res, asset.endsWith('.m3u8'));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Stream Gateway Error');
      return true;
    }
  }

  return false;
}

async function pipeFetchResponse(upstreamRes: Response, res: ServerResponse, isManifest: boolean): Promise<boolean> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*'
  };

  if (isManifest) {
    headers['Content-Type'] = 'application/vnd.apple.mpegurl';
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    const text = await upstreamRes.text();
    res.writeHead(200, headers);
    res.end(text);
  } else {
    headers['Content-Type'] = 'video/mp2t';
    headers['Cache-Control'] = 'public, max-age=3600';
    res.writeHead(200, headers);
    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  }
  return true;
}
