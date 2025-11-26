(function(){
  function initCarousel(root){
    const track = root.querySelector('[data-track]');
    const slides = Array.from(track.children);
    const dotsContainer = root.querySelector('[data-dots]');
    let index = 0;

    // Remove arrows if exist
    const prevBtn = root.querySelector('[data-prev]');
    const nextBtn = root.querySelector('[data-next]');
    if(prevBtn) prevBtn.remove();
    if(nextBtn) nextBtn.remove();

    slides.forEach((_,i)=>{
      const b=document.createElement('button');
      b.setAttribute('aria-label','Slide '+(i+1));
      if(i===0) b.classList.add('active');
      b.addEventListener('click',()=>goTo(i));
      dotsContainer.appendChild(b);
    });
    const dots=[...dotsContainer.children];

    function update(){
      slides.forEach((s,i)=>s.classList.toggle('active', i===index));
      dots.forEach((d,i)=>d.classList.toggle('active', i===index));
    }
    function goTo(i){ index=(i+slides.length)%slides.length; update(); }
    function next(){ goTo(index+1); }

    // Advance on click anywhere on visible slide
    slides.forEach(sl=> sl.addEventListener('click', next));
    update();
  }
  document.querySelectorAll('[data-carousel]').forEach(initCarousel);
})();