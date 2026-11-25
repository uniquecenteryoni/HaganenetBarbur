window.ShopCatalog = {
  entries: {},
  async refresh() {
    try {
      const response = await fetch("/api/shop-products", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error();
      this.entries = (await response.json()).entries || {};
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.entries;
  },
  overrides(local = {}) {
    const result = { ...local };
    for (const [key, entry] of Object.entries(this.entries))
      result[key] = { ...(local[key] || {}), ...entry };
    return result;
  },
  customProducts(local = []) {
    const result = new Map(
      local.map((item) => [`${item.category}-custom-${item.id}`, item]),
    );
    for (const [key, entry] of Object.entries(this.entries))
      if (key.includes("-custom-") && entry.title)
        result.set(key, { ...entry, id: key.split("-custom-")[1] });
    return [...result.values()];
  },
};
ShopCatalog.ready = ShopCatalog.refresh();
