const MAX_BYTES = 5 * 1024 * 1024;
const encoder = new TextEncoder();
const cookieName = '__Host-cover_admin';
export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers}
});
const configured = env => !!env.COVER_IMAGES && typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 16 && env.ADMIN_PASSWORD.length <= 256;
const sameOrigin = request => request.headers.get('Origin') === new URL(request.url).origin;
async function signingKey(secret) {
  return crypto.subtle.importKey('raw', encoder.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}
async function signature(secret, value) {
  const bytes = await crypto.subtle.sign('HMAC', await signingKey(secret), encoder.encode(value));
  return Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, '0')).join('');
}
async function authenticated(request, env) {
  const token = request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token) return false;
  const [expires, mac] = token.split('.');
  if (!/^\d+$/.test(expires) || !/^[a-f0-9]{64}$/.test(mac || '') || Number(expires) <= Date.now() || Number(expires) > Date.now() + 8 * 3600000) return false;
  return crypto.subtle.verify('HMAC', await signingKey(env.ADMIN_PASSWORD), Uint8Array.from(mac.match(/../g), s => parseInt(s, 16)), encoder.encode(expires));
}
export async function session({request, env}) {
  if (!env.COVER_IMAGES) return json({error: 'אחסון התמונות עדיין לא חובר.'}, 503);
  if (typeof env.ADMIN_PASSWORD !== 'string' || !env.ADMIN_PASSWORD) return json({error: 'סיסמת המנהל עדיין לא הוגדרה באחסון האתר.'}, 503);
  if (!configured(env)) return json({error: 'סיסמת המנהל חייבת להכיל בין 16 ל־256 תווים. יש לעדכן את ADMIN_PASSWORD בהגדרות Cloudflare.'}, 503);
  if (request.method === 'GET') return json({authenticated: await authenticated(request, env)});
  if (!['POST', 'DELETE'].includes(request.method)) return json({error: 'Method not allowed'}, 405);
  if (!sameOrigin(request)) return json({error: 'Forbidden'}, 403);
  if (request.method === 'DELETE') return json({ok: true}, 200, {'Set-Cookie': `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});
  if (Number(request.headers.get('Content-Length')) > 2048) return json({error: 'Request too large'}, 413);
  let password;
  try { ({password} = await request.json()); } catch { return json({error: 'Invalid JSON'}, 400); }
  if (typeof password !== 'string' || password.length > 256 || await signature(env.ADMIN_PASSWORD, password) !== await signature(env.ADMIN_PASSWORD, env.ADMIN_PASSWORD)) {
    return json({error: 'סיסמה שגויה, נסי שוב.'}, 401);
  }
  const expires = String(Date.now() + 8 * 3600000);
  const token = `${expires}.${await signature(env.ADMIN_PASSWORD, expires)}`;
  return json({ok: true}, 200, {'Set-Cookie': `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`});
}
const validKey = key => typeof key === 'string' && /^[a-z][a-z0-9-]{0,99}$/.test(key);
const imageURL = (key, version) => `/api/cover-image?key=${encodeURIComponent(key)}&v=${encodeURIComponent(version)}`;
export async function covers({request, env}) {
  if (!env.COVER_IMAGES) return json({error: 'אחסון התמונות עדיין לא חובר.'}, 503);
  if (request.method === 'GET') {
    const covers = {};
    let cursor;
    do {
      const page = await env.COVER_IMAGES.list({prefix: 'covers/', cursor});
      for (const item of page.keys) {
        if (item.metadata?.version) covers[item.name.slice(7)] = imageURL(item.name.slice(7), item.metadata.version);
      }
      cursor = !page.list_complete ? page.cursor : undefined;
    } while (cursor);
    return json({covers});
  }
  if (request.method !== 'PUT') return json({error: 'Method not allowed'}, 405);
  if (!configured(env) || !sameOrigin(request) || !await authenticated(request, env)) return json({error: 'נדרשת כניסה מחדש לפאנל הניהול.'}, 401);
  const key = new URL(request.url).searchParams.get('key');
  if (!validKey(key)) return json({error: 'מזהה מוצר לא תקין.'}, 400);
  const type = request.headers.get('Content-Type');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return json({error: 'יש לבחור תמונת JPG, PNG או WebP.'}, 415);
  const length = Number(request.headers.get('Content-Length'));
  if (length > MAX_BYTES) return json({error: 'התמונה גדולה מ־5MB.'}, 413);
  // Bound memory even for uploads without a Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) return json({error: 'חסרה תמונה.'}, 400);
  const chunks = []; let size = 0;
  while (true) {
    const {value, done} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); return json({error: 'התמונה גדולה מ־5MB.'}, 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const matches = type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : type === 'image/png' ? [137,80,78,71,13,10,26,10].every((b,i) => bytes[i] === b)
    : size >= 12 && new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP';
  if (!matches) return json({error: 'הקובץ אינו תמונה בפורמט שנבחר.'}, 415);
  const version = crypto.randomUUID();
  await env.COVER_IMAGES.put(`covers/${key}`, bytes.buffer, {metadata: {contentType: type, version}});
  return json({key, url: imageURL(key, version)});
}
export async function image({request, env}) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405});
  const key = new URL(request.url).searchParams.get('key');
  if (!validKey(key)) return new Response(null, {status: 400});
  if (!env.COVER_IMAGES) return new Response(null, {status: 503});
  const object = await env.COVER_IMAGES.getWithMetadata(`covers/${key}`, {type: 'arrayBuffer'});
  if (!object.value) return new Response(null, {status: 404});
  return new Response(request.method === 'HEAD' ? null : object.value, {headers: {
    'Content-Type': object.metadata.contentType, 'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-cache', 'ETag': `"${object.metadata.version}"`
  }});
}

// A quota or storage failure must not become a false success or trigger a paid fallback.
export function withStorageErrors(handler) {
  return async context => {
    try { return await handler(context); }
    catch { return json({error: 'שירות התמונות אינו זמין כרגע או שהמכסה החינמית נוצלה. לא בוצע מעבר למסלול בתשלום. נסי שוב מאוחר יותר.'}, 503); }
  };
}
