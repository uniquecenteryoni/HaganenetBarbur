// Navigation toggle & active link highlight on scroll
(function(){
  const navToggle = document.getElementById('navToggle');
  const navList = document.querySelector('.nav-list');
  const links = [...navList.querySelectorAll('a')];
  
  navToggle.addEventListener('click', (e)=>{
    e.stopPropagation();
    navList.classList.toggle('open');
  });
  
  // Close menu when clicking a link
  links.forEach(l=>{
    l.addEventListener('click', (e)=> {
      navList.classList.remove('open');
      // All anchor navigation handled by CSS scroll-margin-top
      // No need for manual scroll handling
    });
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', (e)=>{
    if(!navList.contains(e.target) && !navToggle.contains(e.target)){
      navList.classList.remove('open');
    }
  });

  function onScroll(){
    const scrollPos = window.scrollY + 140; // offset for header
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
  
  // Fix scroll position when arriving with hash from external page
  if(window.location.hash){
    // Wait longer for Instagram widget and other dynamic content to load
    const correctScrollPosition = () => {
      const target = document.querySelector(window.location.hash);
      if(target){
        const offsetPosition = target.offsetTop - 140;
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    };
    
    // Try multiple times to ensure content is loaded
    setTimeout(correctScrollPosition, 100);
    setTimeout(correctScrollPosition, 500);
    setTimeout(correctScrollPosition, 1000);
  }
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
  
  // Check if returning from product detail page
  const returnToCategory = sessionStorage.getItem('returnToCategory');
  if (returnToCategory) {
    // Show the category panel that was active before
    showPanel(returnToCategory);
    // Clear the stored category
    sessionStorage.removeItem('returnToCategory');
  } else {
    // Ensure first is visible
    const first = navButtons[0];
    if(first) showPanel(first.dataset.target);
  }
})();