let coverURLs = {};
let coverPreviewURL = '';
let coverUploading = false;
function coverStatus(message) { document.getElementById('coverStatus').textContent = message; }
async function initCoverEditor() {
  const select = document.getElementById('coverProduct');
  const selected = select.value;
  select.replaceChildren();
  for (const item of Object.values(siteCatalogByKey)) {
    // Custom products are currently browser-local and cannot be published by this editor.
    if (item.key.includes('-custom-')) continue;
    select.add(new Option(item.title, item.key));
  }
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
  try {
    const response = await fetch('/api/covers', {cache: 'no-store'});
    if (!response.ok) throw new Error();
    coverURLs = (await response.json()).covers || {};
    document.getElementById('coverUpload').disabled = coverUploading || !select.value;
    coverStatus('');
  } catch {
    document.getElementById('coverUpload').disabled = true;
    coverStatus('שירות העלאת התמונות עדיין לא זמין. יש להשלים את החיבור לאחסון.');
  }
  updateCoverPreview();
}
function setCoverPreview(url) {
  const image = document.getElementById('coverPreview');
  image.style.display = url ? 'block' : 'none';
  if (url) image.src = url; else image.removeAttribute('src');
}
function clearCoverFile() {
  if (coverPreviewURL) URL.revokeObjectURL(coverPreviewURL);
  coverPreviewURL = '';
  document.getElementById('coverFile').value = '';
}
function updateCoverPreview() {
  clearCoverFile();
  const key = document.getElementById('coverProduct').value;
  const original = siteCatalogByKey[key]?.imageName;
  setCoverPreview(coverURLs[key] || (original ? `images/Products/${original}` : ''));
}
function previewCoverFile() {
  if (coverPreviewURL) URL.revokeObjectURL(coverPreviewURL);
  coverPreviewURL = '';
  const file = document.getElementById('coverFile').files[0];
  if (!file) { updateCoverPreview(); return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    updateCoverPreview();
    coverStatus('בחרי תמונת JPG, PNG או WebP בגודל עד 5MB.');
    return;
  }
  coverPreviewURL = URL.createObjectURL(file);
  setCoverPreview(coverPreviewURL);
  coverStatus('התמונה מוכנה. לחצי על שמירת תמונת השער באתר.');
}
async function uploadProductCover() {
  if (coverUploading) return;
  const file = document.getElementById('coverFile').files[0];
  const key = document.getElementById('coverProduct').value;
  if (!file || !key) { coverStatus('בחרי מוצר ותמונה לפני השמירה.'); return; }
  coverUploading = true;
  const controls = ['coverUpload', 'coverProduct', 'coverFile'].map(id => document.getElementById(id));
  controls.forEach(control => { control.disabled = true; });
  coverStatus('שומרת את התמונה באתר…');
  try {
    const response = await fetch(`/api/covers?key=${encodeURIComponent(key)}`, {
      method: 'PUT', headers: {'Content-Type': file.type}, body: file
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'השמירה לא הושלמה. נסי שוב.');
    coverURLs[key] = result.url;
    updateCoverPreview();
    coverStatus('תמונת השער נשמרה. העדכון עשוי לקחת כדקה עד שיופיע אצל כל המבקרים.');
  } catch (error) { coverStatus(error.message); }
  finally {
    coverUploading = false;
    controls.forEach(control => { control.disabled = false; });
  }
}
