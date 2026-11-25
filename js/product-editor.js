let productEditorBusy = false;
let productMediaURLs = [];
let productDialogOpener = null;
function escapeProductText(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function productMediaPath(value) {
  return !value
    ? ""
    : value.startsWith("/api/") || value.startsWith("images/")
      ? value
      : `images/Products/${value}`;
}
function productEditorStatus(text) {
  document.getElementById("productFormStatus").textContent = text;
}
function resetProductEditor() {
  const form = document.getElementById("productForm");
  form.reset();
  productMediaURLs.forEach((url) => URL.revokeObjectURL(url));
  productMediaURLs = [];
  for (const id of [
    "prodEditKey",
    "prodImageName",
    "prodVideoName",
    "prodTitle",
    "prodDriveUrl",
    "prodShortDesc",
    "prodLongDesc",
    "prodPrice",
  ])
    document.getElementById(id).value = "";
  refreshCategorySelect("");
  document.getElementById("prodCategory").value = "";
  document.getElementById("prodCategory").disabled = false;
  document.getElementById("prodPrice").required = true;
  document.getElementById("prodDriveUrl").required = true;
  document.getElementById("prodCoverUpload").required = true;
  document.getElementById("productLongDescription").open = false;
  for (const id of ["prodCoverPreview", "prodVideoPreview"]) {
    const el = document.getElementById(id);
    el.hidden = true;
    el.removeAttribute("src");
    if (el.tagName === "VIDEO") el.load();
  }
  document.getElementById("prodRemoveVideoRow").hidden = true;
  productEditorStatus("");
}
function openProductDialog(title) {
  productDialogOpener = document.activeElement;
  document.getElementById("productDialogTitle").textContent = title;
  const dialog = document.getElementById("productDialog");
  if (!dialog.open) dialog.showModal();
  document.getElementById("prodTitle").focus();
}
function openNewProductDialog() {
  if (productEditorBusy) return;
  resetProductEditor();
  document.getElementById("prodSaveBtn").textContent = "שמירה והוספה";
  openProductDialog("הוספת קובץ חדש");
}
function openExistingProductDialog(key) {
  if (productEditorBusy) return;
  const base = siteCatalogByKey[key];
  if (!base) return;
  resetProductEditor();
  const item = { ...base, ...getProductManagementConfig().items[key] };
  document.getElementById("prodEditKey").value = key;
  for (const [id, field] of [
    ["prodTitle", "title"],
    ["prodShortDesc", "shortDescription"],
    ["prodLongDesc", "longDescription"],
    ["prodDriveUrl", "driveUrl"],
    ["prodImageName", "imageName"],
    ["prodVideoName", "videoName"],
  ])
    document.getElementById(id).value = item[field] || "";
  document.getElementById("prodPrice").value = String(item.price || "").replace(
    /[^\d.]/g,
    "",
  );
  document.getElementById("prodIsGift").checked =
    item.isGift ?? /free-price|חינם|מתנה/.test(item.price || "");
  document.getElementById("prodRemoveVideoRow").hidden = !item.videoName;
  document.getElementById("prodCategory").value =
    item.category || base.category;
  document.getElementById("prodCategory").disabled = true;
  document.getElementById("prodDriveUrl").required = key.includes("-custom-");
  document.getElementById("prodCoverUpload").required = !item.imageName;
  for (const [id, field] of [
    ["prodCoverPreview", "imageName"],
    ["prodVideoPreview", "videoName"],
  ])
    if (item[field]) {
      const el = document.getElementById(id);
      el.src = productMediaPath(item[field]);
      el.hidden = false;
    }
  updateProductGiftState();
  document.getElementById("prodSaveBtn").textContent = "שמירת שינויים";
  openProductDialog("עריכת קובץ");
}
function closeProductDialog() {
  if (productEditorBusy) return;
  document.getElementById("prodVideoPreview").pause();
  document.getElementById("productDialog").close();
  productDialogOpener?.focus();
}
function updateProductGiftState() {
  const price = document.getElementById("prodPrice");
  price.required = !document.getElementById("prodIsGift").checked;
}
function removeProductVideo() {
  if (document.getElementById("prodRemoveVideo").checked) {
    document.getElementById("prodVideoUpload").value = "";
    document.getElementById("prodVideoPreview").pause();
    document.getElementById("prodVideoPreview").hidden = true;
  }
}
function previewProductMedia(kind) {
  const input = document.getElementById(
    kind === "cover" ? "prodCoverUpload" : "prodVideoUpload",
  );
  const file = input.files[0];
  if (!file) return;
  const allowed =
    kind === "cover"
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["video/mp4"];
  const max = (kind === "cover" ? 5 : 10) * 1024 * 1024;
  if (!allowed.includes(file.type) || file.size > max) {
    input.value = "";
    productEditorStatus(
      kind === "cover"
        ? "יש לבחור JPG, PNG או WebP עד 5MB."
        : "יש לבחור וידאו MP4 עד 10MB.",
    );
    return;
  }
  const url = URL.createObjectURL(file);
  productMediaURLs.push(url);
  const preview = document.getElementById(
    kind === "cover" ? "prodCoverPreview" : "prodVideoPreview",
  );
  preview.src = url;
  preview.hidden = false;
  if (kind === "video")
    document.getElementById("prodRemoveVideo").checked = false;
  productEditorStatus("");
}
async function uploadProductMedia(kind, file) {
  const response = await fetch(`/api/shop-media?kind=${kind}`, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "העלאת המדיה לא הושלמה.");
  return result.url;
}
async function saveProductEditor() {
  if (productEditorBusy) return;
  const form = document.getElementById("productForm");
  if (!form.reportValidity()) return;
  const editKey = document.getElementById("prodEditKey").value;
  const category = document.getElementById("prodCategory").value;
  const key = editKey || `${category}-custom-${crypto.randomUUID()}`;
  const fields = {
    key,
    category,
    title: document.getElementById("prodTitle").value.trim(),
    shortDescription: document.getElementById("prodShortDesc").value.trim(),
    longDescription: document.getElementById("prodLongDesc").value.trim(),
    driveUrl: document.getElementById("prodDriveUrl").value.trim(),
    price: document.getElementById("prodPrice").value || "0",
    isGift: document.getElementById("prodIsGift").checked,
    imageName: document.getElementById("prodImageName").value,
    videoName: document.getElementById("prodRemoveVideo").checked
      ? ""
      : document.getElementById("prodVideoName").value,
  };
  const cover = document.getElementById("prodCoverUpload").files[0];
  const video = document.getElementById("prodVideoUpload").files[0];
  const controls = [...form.elements].filter((el) => !el.disabled);
  controls.forEach((el) => {
    el.disabled = true;
  });
  productEditorBusy = true;
  productEditorStatus("שומרת את פרטי הקובץ…");
  try {
    if (cover) {
      fields.imageName = await uploadProductMedia("cover", cover);
      document.getElementById("prodImageName").value = fields.imageName;
      document.getElementById("prodCoverUpload").value = "";
      document.getElementById("prodCoverUpload").required = false;
    }
    if (video) {
      fields.videoName = await uploadProductMedia("video", video);
      document.getElementById("prodVideoName").value = fields.videoName;
      document.getElementById("prodVideoUpload").value = "";
    }
    const response = await fetch("/api/shop-products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "השמירה לא הושלמה.");
    ShopCatalog.entries[key] = result.product;
    productEditorBusy = false;
    closeProductDialog();
    // Keep the confirmed result available while KV propagates across locations.
    await loadSiteCatalogFromIndex();
    refreshCatalogCategoryFilterOptions(
      document.getElementById("catalogCategoryFilter").value || "all",
    );
    renderManagedProducts();
    showToast("הקובץ נשמר באתר. העדכון עשוי לקחת כדקה.", "success", 5000);
  } catch (error) {
    productEditorStatus(error.message);
  } finally {
    productEditorBusy = false;
    controls.forEach((el) => {
      el.disabled = false;
    });
    if (editKey) document.getElementById("prodCategory").disabled = true;
  }
}
function renderProductTable() {
  const container = document.getElementById("managedProductsList");
  if (!container) return;
  const config = getProductManagementConfig();
  const filter =
    document.getElementById("catalogCategoryFilter").value || "all";
  const rows = [];
  for (const [category, source] of Object.entries(siteCatalogByCategory)) {
    if (filter !== "all" && filter !== category) continue;
    const order = config.order[category] || [];
    const items = [...source].sort(
      (a, b) =>
        (order.includes(a.key) ? order.indexOf(a.key) : 1e6) -
        (order.includes(b.key) ? order.indexOf(b.key) : 1e6),
    );
    items.forEach((base, index) => {
      const item = { ...base, ...config.items[base.key] };
      const key = encodeURIComponent(base.key);
      const cat = encodeURIComponent(category);
      rows.push(
        `<tr><td><button class="product-name-button" type="button" onclick="startEditCatalogItem('${key}')">${escapeProductText(item.title)}</button></td><td>${escapeProductText(getCategoryLabel(category))}</td><td>${(item.isGift ?? /free-price|חינם|מתנה/.test(item.price || "")) ? "מתנה" : escapeProductText(item.price || "—")}</td><td>${item.deleted ? "נמחק" : item.hidden ? "מוסתר" : "מוצג"}</td><td><div class="table-actions"><button class="action-btn action-send" type="button" onclick="startEditCatalogItem('${key}')">עריכה</button><button class="action-btn" type="button" aria-label="הזזה למעלה" onclick="moveCatalogItem('${cat}','${key}',-1)" ${index === 0 ? "disabled" : ""}>↑</button><button class="action-btn" type="button" aria-label="הזזה למטה" onclick="moveCatalogItem('${cat}','${key}',1)" ${index === items.length - 1 ? "disabled" : ""}>↓</button><button class="action-btn" type="button" onclick="toggleCatalogItemHidden('${key}',${!item.hidden})">${item.hidden ? "הצגה" : "הסתרה"}</button><button class="action-btn" type="button" onclick="toggleCatalogItemDeleted('${key}',${!item.deleted})">${item.deleted ? "שחזור" : "מחיקה"}</button></div></td></tr>`,
      );
    });
  }
  container.innerHTML = rows.length
    ? `<table class="shop-products-table"><thead><tr><th scope="col">שם הקובץ</th><th scope="col">קטגוריה</th><th scope="col">מחיר</th><th scope="col">מצב</th><th scope="col">פעולות</th></tr></thead><tbody>${rows.join("")}</tbody></table>`
    : "<p>אין קבצים להצגה.</p>";
}
async function saveShopProductState(encodedKey, patch) {
  const key = decodeURIComponent(encodedKey);
  try {
    const response = await fetch("/api/shop-products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...patch }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    ShopCatalog.entries[key] = {
      ...ShopCatalog.entries[key],
      ...result.product,
    };
    renderManagedProducts();
    showToast("המצב עודכן באתר.", "success");
  } catch (error) {
    showToast(error.message || "השמירה לא הושלמה.", "error");
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.getElementById("productDialog");
  dialog.addEventListener("cancel", (event) => {
    if (productEditorBusy) event.preventDefault();
  });
  dialog.addEventListener("close", () =>
    document.getElementById("prodVideoPreview").pause(),
  );
});
