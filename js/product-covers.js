// Cover overrides are public and fetched fresh on every page visit.
(() => {
  async function refresh() {
    try {
      await window.ShopCatalog?.ready;
      const response = await fetch('/api/covers', {cache: 'no-store', signal: AbortSignal.timeout(8000)});
      if (!response.ok) return;
      const {covers} = await response.json();
      if (!covers || typeof covers !== 'object') return;
      for (const card of document.querySelectorAll('.file-card')) {
        const link = card.querySelector('a[href*="product-detail.html"]');
        if (!link) continue;
        const params = new URL(link.href).searchParams;
        const key = `${params.get('cat')}-${params.get('file')}`;
        if (window.ShopCatalog?.entries[key]?.imageName) continue;
        const url = window.ShopCatalog?.entries[key]?.imageName ? null : covers[key];
        if (typeof url !== 'string' || !url.startsWith('/api/cover-image?')) continue;
        const img = card.querySelector('img');
        if (img) img.src = url;
        const container = card.querySelector('.product-image-container');
        if (container) container.dataset.coverUrl = url;
      }
      const params = new URL(location.href).searchParams;
      const key = `${params.get('cat')}-${params.get('file')}`;
      const url = window.ShopCatalog?.entries[key]?.imageName ? null : covers[key];
      if (typeof url === 'string' && url.startsWith('/api/cover-image?')) {
        const img = document.getElementById('productImage');
        if (img) img.src = url;
        const container = document.querySelector('.product-image-container');
        if (container) container.dataset.coverUrl = url;
        document.dispatchEvent(new CustomEvent('product-cover-updated', {detail: {key, url}}));
      }
    } catch { /* Keep the existing product image if storage is temporarily unavailable. */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
