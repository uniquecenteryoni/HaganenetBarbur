// Navigation toggle & active link highlight on scroll
(function(){
  const navToggle = document.getElementById('navToggle');
  const navList = document.querySelector('.nav-list');
  const links = [...navList.querySelectorAll('a')];
  navToggle.addEventListener('click', ()=>{
    navList.classList.toggle('open');
  });
  links.forEach(l=>l.addEventListener('click', ()=> navList.classList.remove('open')));

  function onScroll(){
    const scrollPos = window.scrollY + 120; // offset for header
    links.forEach(a=>{
      const id=a.getAttribute('href').slice(1);
      const sec=document.getElementById(id);
      if(!sec) return;
      const inView = scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight;
      a.classList.toggle('active', inView);
    });
  }
  document.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();


// Products search filter
// Shop category navigation (horizontal buttons)
(function(){
  const navButtons = [...document.querySelectorAll('.shop-cat-btn')];
  const panels = [...document.querySelectorAll('.product-panel')];
  if(navButtons.length===0) return;
  function showPanel(key){
    panels.forEach(p=> p.classList.toggle('hidden', p.dataset.panel!==key));
    navButtons.forEach(b=> b.classList.toggle('active', b.dataset.target===key));
  }
  navButtons.forEach(btn=> btn.addEventListener('click', ()=> showPanel(btn.dataset.target)));
  // Ensure first is visible
  const first = navButtons[0];
  if(first) showPanel(first.dataset.target);
})();