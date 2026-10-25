// Public business number already used in the main site's header and footer.
const STORYTIME_WHATSAPP_NUMBER = '972526419828';
const STORYTIME_WHATSAPP_MESSAGE = 'שלום בר, אשמח לשמוע פרטים נוספים על תוכנית שעת סיפור לגן שלנו.';
const storytimeWhatsappUrl = `https://wa.me/${STORYTIME_WHATSAPP_NUMBER}?text=${encodeURIComponent(STORYTIME_WHATSAPP_MESSAGE)}`;

document.querySelectorAll('[data-whatsapp], .st-floating').forEach((link) => {
  link.href = storytimeWhatsappUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
});

// Hide the floating shortcut while the full contact section is visible.
const storytimeContact = document.querySelector('#contact');
const storytimeFloating = document.querySelector('.st-floating');
if ('IntersectionObserver' in window && storytimeContact && storytimeFloating) {
  new IntersectionObserver(([entry]) => {
    storytimeFloating.style.visibility = entry.isIntersecting ? 'hidden' : '';
  }).observe(storytimeContact);
}
