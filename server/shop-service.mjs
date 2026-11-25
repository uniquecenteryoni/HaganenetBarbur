import { authenticated, json } from "./cover-service.mjs";
const originMatches = (request) =>
  request.headers.get("Origin") === new URL(request.url).origin;
const keyValid = (key) =>
  typeof key === "string" &&
  /^[a-z\u0590-\u05ff][a-z0-9\u0590-\u05ff-]{0,119}$/.test(key);
const mediaValid = (value) =>
  typeof value === "string" &&
  /^\/api\/shop-media\?id=[a-f0-9-]{36}$/.test(value);
export function driveFileId(value) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["drive.google.com", "docs.google.com"].includes(url.hostname)
    )
      return null;
    const id =
      url.pathname.match(
        /\/(?:file|document|presentation|spreadsheets)\/d\/([\w-]+)/,
      )?.[1] ||
      (["/open", "/uc"].includes(url.pathname)
        ? url.searchParams.get("id")
        : null);
    return id && /^[\w-]{10,200}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
async function readJSON(request, limit = 40000) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty body");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Too large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const value of chunks) {
    bytes.set(value, offset);
    offset += value.length;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
export async function shopProducts({ request, env }) {
  if (!env.COVER_IMAGES) return json({ error: "אחסון החנות אינו זמין." }, 503);
  if (request.method === "GET") {
    const admin = await authenticated(request, env);
    const entries = {};
    let cursor;
    do {
      const page = await env.COVER_IMAGES.list({ prefix: "products/", cursor });
      for (const item of page.keys) {
        const value = item.metadata;
        if (!value) continue;
        entries[item.name.slice(9)] = value;
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
    const keys = Object.keys(entries);
    for (let offset = 0; offset < keys.length; offset += 100) {
      const chunk = keys.slice(offset, offset + 100);
      const products = await env.COVER_IMAGES.get(
        chunk.map((key) => `products/${key}`),
        { type: "json" },
      );
      const privateData = admin
        ? await env.COVER_IMAGES.get(
            chunk.map((key) => `drive/${key}`),
            { type: "json" },
          )
        : null;
      for (const key of chunk) {
        const product = products.get(`products/${key}`);
        if (product)
          entries[key] = {
            ...product,
            ...(privateData?.get(`drive/${key}`)?.driveUrl
              ? { driveUrl: privateData.get(`drive/${key}`).driveUrl }
              : {}),
          };
      }
    }
    return json({ entries });
  }
  if (!["PUT", "PATCH"].includes(request.method))
    return json({ error: "Method not allowed" }, 405);
  if (!originMatches(request) || !(await authenticated(request, env)))
    return json({ error: "נדרשת כניסה מחדש לפאנל." }, 401);
  let data;
  try {
    data = await readJSON(request);
  } catch {
    return json({ error: "פרטי המוצר אינם תקינים." }, 400);
  }
  const key = data.key;
  if (!keyValid(key)) return json({ error: "מזהה מוצר לא תקין." }, 400);
  const old = (await env.COVER_IMAGES.get(`products/${key}`, "json")) || {};
  if (request.method === "PATCH") {
    const state = {};
    for (const field of ["hidden", "deleted"])
      if (typeof data[field] === "boolean") state[field] = data[field];
    const product = { ...old, key, ...state };
    await savePublicProduct(env, key, product);
    return json({ product });
  }
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description =
    typeof data.shortDescription === "string"
      ? data.shortDescription.trim()
      : "";
  if (
    !title ||
    title.length > 160 ||
    !description ||
    description.length > 2000 ||
    typeof data.longDescription !== "string" ||
    data.longDescription.length > 12000
  )
    return json({ error: "יש למלא כותרת ותיאור תקינים." }, 400);
  if (
    !/^[a-z\u0590-\u05ff][a-z0-9\u0590-\u05ff-]{0,49}$/.test(
      data.category || "",
    )
  )
    return json({ error: "יש לבחור קטגוריה." }, 400);
  const amount = Number(data.price);
  if (
    data.price === "" ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > 100000
  )
    return json({ error: "יש להזין מחיר תקין." }, 400);
  if (
    typeof data.imageName !== "string" ||
    (!mediaValid(data.imageName) &&
      !/^(?:images\/Products\/)?[\w.-]+\.(?:png|webp|jpe?g|svg)$/.test(
        data.imageName,
      ))
  )
    return json({ error: "יש לבחור תמונת שער." }, 400);
  if (
    data.videoName &&
    !mediaValid(data.videoName) &&
    !/^(?:images\/Products\/)?[\w.-]+\.mp4$/.test(data.videoName)
  )
    return json({ error: "וידאו לא תקין." }, 400);
  const id = data.driveUrl ? driveFileId(data.driveUrl) : null;
  const privateOld = await env.COVER_IMAGES.get(`drive/${key}`, "json");
  if (
    (data.driveUrl && !id) ||
    (key.includes("-custom-") && !id && !privateOld)
  )
    return json({ error: "יש להזין קישור תקין לקובץ ב־Google Drive." }, 400);
  for (const url of [data.imageName, data.videoName].filter(mediaValid)) {
    const assetId = new URL(url, "https://shop.test").searchParams.get("id");
    const stored = await env.COVER_IMAGES.getWithMetadata(`media/${assetId}`, {
      type: "stream",
    });
    if (!stored.value)
      return json(
        { error: "אחד מקובצי המדיה עדיין לא זמין. נסי לשמור שוב בעוד כדקה." },
        409,
      );
    await stored.value.cancel();
  }
  const product = {
    key,
    category: data.category,
    title,
    shortDescription: description,
    longDescription: data.longDescription || description,
    imageName: data.imageName,
    videoName: data.videoName || "",
    price: `₪${amount.toFixed(2)}`,
    isGift: !!data.isGift,
    removeVideo: !data.videoName,
    hidden: !!old.hidden,
    deleted: !!old.deleted,
  };
  // KV metadata is limited to 1024 bytes. The full public record is read separately.
  if (id)
    await env.COVER_IMAGES.put(
      `drive/${key}`,
      JSON.stringify({
        title,
        driveFileId: id,
        driveUrl: `https://drive.google.com/file/d/${id}/view`,
      }),
    );
  else if (privateOld)
    await env.COVER_IMAGES.put(
      `drive/${key}`,
      JSON.stringify({ ...privateOld, title }),
    );
  await savePublicProduct(env, key, product);
  return json({
    product: {
      ...product,
      driveUrl: id
        ? `https://drive.google.com/file/d/${id}/view`
        : privateOld?.driveUrl || "",
    },
  });
}
async function savePublicProduct(env, key, product) {
  await env.COVER_IMAGES.put(`products/${key}`, JSON.stringify(product), {
    metadata: { key },
  });
}
export const loadShopProducts = shopProducts;
export async function shopMedia({ request, env }) {
  if (!env.COVER_IMAGES) return json({ error: "אחסון המדיה אינו זמין." }, 503);
  const url = new URL(request.url);
  if (["GET", "HEAD"].includes(request.method)) {
    const id = url.searchParams.get("id");
    if (!/^[a-f0-9-]{36}$/.test(id || ""))
      return new Response(null, { status: 400 });
    const item = await env.COVER_IMAGES.getWithMetadata(`media/${id}`, {
      type: "stream",
    });
    if (!item.value)
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    return new Response(request.method === "HEAD" ? null : item.value, {
      headers: {
        "Content-Type": item.metadata.type,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
        "Accept-Ranges": "none",
      },
    });
  }
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  if (!originMatches(request) || !(await authenticated(request, env)))
    return json({ error: "נדרשת כניסה מחדש לפאנל." }, 401);
  const kind = url.searchParams.get("kind");
  const type = request.headers.get("Content-Type");
  if (
    !(
      ["image/jpeg", "image/png", "image/webp"].includes(type) &&
      kind === "cover"
    ) &&
    !(type === "video/mp4" && kind === "video")
  )
    return json({ error: "פורמט הקובץ אינו נתמך." }, 415);
  const max = (kind === "cover" ? 5 : 10) * 1024 * 1024;
  const chunks = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (!reader) return json({ error: "לא נבחר קובץ." }, 400);
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      return json(
        { error: `הקובץ גדול מ־${kind === "cover" ? 5 : 10}MB.` },
        413,
      );
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder();
  const valid =
    type === "video/mp4"
      ? size >= 12 && text.decode(bytes.slice(4, 8)) === "ftyp"
      : type === "image/png"
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
        : type === "image/jpeg"
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : size >= 12 &&
            text.decode(bytes.slice(0, 4)) === "RIFF" &&
            text.decode(bytes.slice(8, 12)) === "WEBP";
  if (!valid) return json({ error: "תוכן הקובץ אינו תואם לפורמט שנבחר." }, 415);
  const id = crypto.randomUUID();
  await env.COVER_IMAGES.put(`media/${id}`, bytes.buffer, {
    metadata: { type },
  });
  return json({ url: `/api/shop-media?id=${id}` });
}
export async function driveProducts({ request, env }) {
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  // Only the owner's Apps Script receives private Drive references; visitors never do.
  const provided = request.headers.get("X-Barbur-Key");
  if (
    !provided ||
    typeof env.ADMIN_PASSWORD !== "string" ||
    provided !== env.ADMIN_PASSWORD
  )
    return json({ error: "Unauthorized" }, 401);
  const files = {};
  let cursor;
  do {
    const page = await env.COVER_IMAGES.list({ prefix: "drive/", cursor });
    for (let offset = 0; offset < page.keys.length; offset += 100) {
      const names = page.keys
        .slice(offset, offset + 100)
        .map((item) => item.name);
      const values = await env.COVER_IMAGES.get(names, { type: "json" });
      const products = await env.COVER_IMAGES.get(
        names.map((name) => name.replace("drive/", "products/")),
        { type: "json" },
      );
      for (const name of names) {
        const entry = values.get(name);
        const product = products.get(name.replace("drive/", "products/"));
        if (entry?.title && entry?.driveFileId && !product?.deleted)
          files[entry.title] = entry.driveFileId;
      }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ files });
}
