import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {session, covers, image, withStorageErrors} from '../server/cover-service.mjs';
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const origin = 'https://shop.test';
function setup() {
  const objects = new Map();
  const env = {ADMIN_PASSWORD: 'test-only-long-secret-password', COVER_IMAGES: {
    async put(key, bytes, {metadata}) { objects.set(key, {bytes, metadata}); },
    async getWithMetadata(key) {
      const object = objects.get(key);
      return {value: object?.bytes || null, metadata: object?.metadata || null};
    },
    async list() { return {keys: [...objects.entries()].map(([name, object]) => ({name, metadata: object.metadata})), list_complete: true}; }
  }};
  return {env, objects};
}
async function login(env) {
  const response = await session({env, request: new Request(origin + '/api/cover-session', {
    method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({password: env.ADMIN_PASSWORD})
  })});
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
  return response.headers.get('set-cookie').split(';')[0];
}
const png = new Uint8Array([137,80,78,71,13,10,26,10,0]);
function upload(env, cookie, overrides = {}) {
  return covers({env, request: new Request(origin + '/api/covers?key=general-1', {
    method: 'PUT', headers: {Origin: origin, Cookie: cookie, 'Content-Type': 'image/png', ...overrides.headers}, body: overrides.body || png
  })});
}
test('authenticated upload is visible to a fresh visitor; replacement stays current', async () => {
  const {env, objects} = setup(); const cookie = await login(env);
  const saved = await upload(env, cookie); assert.equal(saved.status, 200);
  const firstURL = (await saved.json()).url;
  let listing = await covers({env, request: new Request(origin + '/api/covers')});
  assert.equal((await listing.json()).covers['general-1'], firstURL);
  const result = await image({env, request: new Request(origin + firstURL)});
  assert.equal(result.status, 200); assert.equal(result.headers.get('Content-Type'), 'image/png');
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), png);
  const replacement = await upload(env, cookie);
  assert.notEqual((await replacement.json()).url, firstURL);
  assert.equal(objects.size, 1);
});
test('rejects missing, forged and expired login cookies and cross-origin uploads', async () => {
  const {env, objects} = setup();
  assert.equal((await upload(env, '')).status, 401);
  assert.equal((await upload(env, '__Host-cover_admin=9999999999999.' + '0'.repeat(64))).status, 401);
  assert.equal((await upload(env, '__Host-cover_admin=1.' + '0'.repeat(64))).status, 401);
  const cookie = await login(env);
  assert.equal((await upload(env, cookie, {headers: {Origin: 'https://other.test'}})).status, 401);
  assert.equal(objects.size, 0);
});
test('rejects SVG, spoofed image bytes and oversized uploads before storing', async () => {
  const {env, objects} = setup(); const cookie = await login(env);
  assert.equal((await upload(env, cookie, {headers: {'Content-Type': 'image/svg+xml'}, body: '<svg/>'})).status, 415);
  assert.equal((await upload(env, cookie, {body: '<script>bad</script>'})).status, 415);
  assert.equal((await upload(env, cookie, {body: new Uint8Array(5 * 1024 * 1024 + 1)})).status, 413);
  assert.equal(objects.size, 0);
});
test('unconfigured storage fails closed, incorrect passwords cannot log in, logout clears cookie', async () => {
  const {env} = setup();
  assert.equal((await session({env: {}, request: new Request(origin + '/api/cover-session')})).status, 503);
  const response = await session({env, request: new Request(origin + '/api/cover-session', {
    method: 'POST', headers: {Origin: origin}, body: JSON.stringify({password: 'barbur2026'})
  })});
  assert.equal(response.status, 401);
  const cookie = await login(env);
  assert.equal((await (await session({env, request: new Request(origin + '/api/cover-session', {headers: {Cookie: cookie}})})).json()).authenticated, true);
  const logout = await session({env, request: new Request(origin + '/api/cover-session', {method: 'DELETE', headers: {Origin: origin}})});
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
});
test('lists all pages, rejects invalid product keys and returns missing image as 404', async () => {
  const {env} = setup(); let calls = 0;
  env.COVER_IMAGES.list = async ({cursor}) => {
    calls++;
    return cursor ? {keys: [{name: 'covers/body-2', metadata: {version:'b'}}], list_complete: true}
      : {keys: [{name: 'covers/body-1', metadata: {version:'a'}}], list_complete: false, cursor: 'next'};
  };
  const listing = await (await covers({env, request: new Request(origin + '/api/covers')})).json();
  assert.equal(Object.keys(listing.covers).length, 2); assert.equal(calls, 2);
  assert.equal((await image({env, request: new Request(origin + '/api/cover-image?key=../secret')})).status, 400);
  assert.equal((await image({env, request: new Request(origin + '/api/cover-image?key=general-1')})).status, 404);
});

test('free quota failures return a clear error without successful writes or paid fallback', async () => {
  const {env, objects} = setup(); const cookie = await login(env);
  env.COVER_IMAGES.put = async () => { throw new Error('KV free write limit exceeded'); };
  const request = new Request(origin + '/api/covers?key=general-1', {method:'PUT', headers:{Origin:origin,Cookie:cookie,'Content-Type':'image/png'},body:png});
  const response = await withStorageErrors(covers)({env,request});
  assert.equal(response.status,503); assert.equal(objects.size,0);
  assert.match((await response.json()).error,/מכסה/);
});

test('setup errors distinguish missing password and unsupported password length without revealing the secret', async () => {
  const {env} = setup();
  const request = new Request(origin + '/api/cover-session');
  const missing = await session({env:{...env, ADMIN_PASSWORD:''},request});
  assert.equal(missing.status,503); assert.match((await missing.json()).error,/לא הוגדרה/);
  const tooShort = await session({env:{...env, ADMIN_PASSWORD:'short'},request});
  assert.equal(tooShort.status,503);
  const body = (await tooShort.json()).error; assert.match(body,/16/); assert.ok(!body.includes('short'));
});
