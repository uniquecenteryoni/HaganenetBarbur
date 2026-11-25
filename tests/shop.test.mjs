import test from "node:test";
import assert from "node:assert/strict";
import { session, withStorageErrors } from "../server/cover-service.mjs";
import {
  shopProducts,
  shopMedia,
  driveProducts,
  driveFileId,
} from "../server/shop-service.mjs";
const origin = "https://shop.test";
function setup() {
  const records = new Map();
  const env = {
    ADMIN_PASSWORD: "test-only-secret-password",
    COVER_IMAGES: {
      async put(key, value, options = {}) {
        assert.ok(
          Buffer.byteLength(JSON.stringify(options.metadata || {})) < 1024,
        );
        records.set(key, { value, metadata: options.metadata });
      },
      async get(key, options) {
        const type = typeof options === "string" ? options : options?.type;
        const read = (k) => {
          const record = records.get(k);
          return record
            ? type === "json"
              ? JSON.parse(record.value)
              : record.value
            : null;
        };
        return Array.isArray(key)
          ? new Map(key.map((k) => [k, read(k)]))
          : read(key);
      },
      async getWithMetadata(key, { type }) {
        const record = records.get(key);
        return {
          value: !record
            ? null
            : type === "stream"
              ? new Blob([record.value]).stream()
              : record.value,
          metadata: record?.metadata,
        };
      },
      async list({ prefix }) {
        return {
          keys: [...records.entries()]
            .filter(([name]) => name.startsWith(prefix))
            .map(([name, record]) => ({ name, metadata: record.metadata })),
          list_complete: true,
        };
      },
    },
  };
  return { env, records };
}
async function login(env) {
  const r = await session({
    env,
    request: new Request(origin + "/api/cover-session", {
      method: "POST",
      headers: { Origin: origin },
      body: JSON.stringify({ password: env.ADMIN_PASSWORD }),
    }),
  });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
const product = {
  key: "general-custom-test-123",
  category: "general",
  title: "כותרת שונה משם הקובץ",
  shortDescription: "תיאור קצר",
  longDescription: "תיאור מלא ".repeat(500),
  price: "25",
  isGift: false,
  imageName: "aviv.svg",
  videoName: "",
  driveUrl: "https://drive.google.com/file/d/ABCDEFGHIJKLMN12345/view",
};
const request = (path, method = "GET", cookie = "", data) =>
  new Request(origin + path, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
test("saving a product publishes metadata but keeps Drive links private", async () => {
  const { env } = setup();
  const cookie = await login(env);
  const saved = await shopProducts({
    env,
    request: request("/api/shop-products", "PUT", cookie, product),
  });
  assert.equal(saved.status, 200);
  const publicList = await (
    await shopProducts({ env, request: request("/api/shop-products") })
  ).json();
  assert.equal(publicList.entries[product.key].title, product.title);
  assert.ok(!JSON.stringify(publicList).includes("ABCDEFGHIJKLMN"));
  assert.equal(
    publicList.entries[product.key].longDescription,
    product.longDescription,
  );
  const adminList = await (
    await shopProducts({
      env,
      request: request("/api/shop-products", "GET", cookie),
    })
  ).json();
  assert.equal(adminList.entries[product.key].driveUrl, product.driveUrl);
  const denied = await driveProducts({
    env,
    request: request("/api/drive-products", "POST"),
  });
  assert.equal(denied.status, 401);
  const delivered = await driveProducts({
    env,
    request: new Request(origin + "/api/drive-products", {
      method: "POST",
      headers: { "X-Barbur-Key": env.ADMIN_PASSWORD },
    }),
  });
  assert.equal(
    (await delivered.json()).files[product.title],
    "ABCDEFGHIJKLMN12345",
  );
});
test("rejects unauthenticated product edits, foreign links, invalid price and missing Drive link", async () => {
  const { env, records } = setup();
  const cookie = await login(env);
  assert.equal(
    (
      await shopProducts({
        env,
        request: request("/api/shop-products", "PUT", "", product),
      })
    ).status,
    401,
  );
  for (const patch of [
    { driveUrl: "https://evil.test/file/d/ABCDEFGHIJKLMN12345/view" },
    { driveUrl: "" },
    { price: "NaN" },
    { imageName: "javascript:bad" },
  ])
    assert.equal(
      (
        await shopProducts({
          env,
          request: request("/api/shop-products", "PUT", cookie, {
            ...product,
            ...patch,
          }),
        })
      ).status,
      400,
    );
  assert.equal(records.size, 0);
});
test("a gift may cost zero; partial state changes retain data and remove deleted items from delivery map", async () => {
  const { env } = setup();
  const cookie = await login(env);
  assert.equal(
    (
      await shopProducts({
        env,
        request: request("/api/shop-products", "PUT", cookie, {
          ...product,
          isGift: true,
          price: "0",
        }),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await shopProducts({
        env,
        request: request("/api/shop-products", "PATCH", cookie, {
          key: product.key,
          deleted: true,
        }),
      })
    ).status,
    200,
  );
  const list = await (
    await shopProducts({ env, request: request("/api/shop-products") })
  ).json();
  assert.equal(list.entries[product.key].title, product.title);
  assert.equal(list.entries[product.key].deleted, true);
  const map = await (
    await driveProducts({
      env,
      request: new Request(origin + "/api/drive-products", {
        method: "POST",
        headers: { "X-Barbur-Key": env.ADMIN_PASSWORD },
      }),
    })
  ).json();
  assert.deepEqual(map.files, {});
});
test("media upload verifies type and permissions, serves bytes, and handles quota errors", async () => {
  const { env } = setup();
  const cookie = await login(env);
  const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const upload = (cookie, body = bytes) =>
    shopMedia({
      env,
      request: new Request(origin + "/api/shop-media?kind=cover", {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: cookie,
          "Content-Type": "image/png",
        },
        body,
      }),
    });
  assert.equal((await upload("")).status, 401);
  assert.equal((await upload(cookie, "bad")).status, 415);
  const saved = await upload(cookie);
  assert.equal(saved.status, 200);
  const { url } = await saved.json();
  const image = await shopMedia({ env, request: request(url) });
  assert.deepEqual(new Uint8Array(await image.arrayBuffer()), bytes);
  const result = await shopProducts({
    env,
    request: request("/api/shop-products", "PUT", cookie, {
      ...product,
      imageName: url,
    }),
  });
  assert.equal(result.status, 200);
  env.COVER_IMAGES.put = async () => {
    throw new Error("free quota");
  };
  assert.equal(
    (
      await withStorageErrors(shopProducts)({
        env,
        request: request("/api/shop-products", "PUT", cookie, product),
      })
    ).status,
    503,
  );
});
test("Drive IDs support file and open links and reject folders or deceptive domains", () => {
  assert.equal(driveFileId(product.driveUrl), "ABCDEFGHIJKLMN12345");
  assert.equal(
    driveFileId("https://drive.google.com/open?id=ABCDEFGHIJKLMN12345"),
    "ABCDEFGHIJKLMN12345",
  );
  assert.equal(
    driveFileId("https://drive.google.com/drive/folders/ABCDEFGHIJKLMN12345"),
    null,
  );
  assert.equal(
    driveFileId(
      "https://drive.google.com.evil.test/file/d/ABCDEFGHIJKLMN12345/view",
    ),
    null,
  );
});
