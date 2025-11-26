// Carousel Component - Image Carousel for Product Grid

class Carousel {
    constructor(container) {
        this.container = container;
        this.slides = container.querySelectorAll('.carousel-slide');
        this.indicators = container.querySelectorAll('.indicator');
        this.prevBtn = container.querySelector('.prev-btn');
        this.nextBtn = container.querySelector('.next-btn');
        this.currentSlide = 0;
        this.autoplayTimer = null;
        this.autoplayDelay = 4000;
        
        this.init();
    }
    
    init() {
        if (this.slides.length === 0) return;
        
        this.setupEventListeners();
        this.showSlide(0);
        this.startAutoplay();
        
        // Pause autoplay on hover
        this.container.addEventListener('mouseenter', () => this.pauseAutoplay());
        this.container.addEventListener('mouseleave', () => this.startAutoplay());
        
        // Handle touch events for mobile swiping
        this.setupTouchEvents();
        
        // Handle keyboard navigation
        this.setupKeyboardEvents();
    }
    
    setupEventListeners() {
        // Navigation buttons
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.previousSlide();
            });
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextSlide();
            });
        }
        
        // Indicator dots
        this.indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', (e) => {
                e.preventDefault();
                this.goToSlide(index);
            });
        });
    }
    
    setupTouchEvents() {
        let startX = 0;
        let startY = 0;
        let endX = 0;
        let endY = 0;
        
        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        this.container.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            endY = e.changedTouches[0].clientY;
            
            const deltaX = endX - startX;
            const deltaY = endY - startY;
            
            // Check if horizontal swipe is more significant than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                const threshold = 50; // Minimum swipe distance
                
                if (Math.abs(deltaX) > threshold) {
                    if (deltaX > 0) {
                        this.previousSlide(); // Swipe right (in RTL, this goes to previous)
                    } else {
                        this.nextSlide(); // Swipe left (in RTL, this goes to next)
                    }
                }
            }
        }, { passive: true });
    }
    
    setupKeyboardEvents() {
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.nextSlide(); // In RTL, left arrow goes to next
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.previousSlide(); // In RTL, right arrow goes to previous
            } else if (e.key === 'Home') {
                e.preventDefault();
                this.goToSlide(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                this.goToSlide(this.slides.length - 1);
            }
        });
        
        // Make container focusable for keyboard navigation
        if (!this.container.getAttribute('tabindex')) {
            this.container.setAttribute('tabindex', '0');
        }
    }
    
    showSlide(index) {
        // Remove active class from all slides and indicators
        this.slides.forEach(slide => slide.classList.remove('active'));
        this.indicators.forEach(indicator => indicator.classList.remove('active'));
        
        // Add active class to current slide and indicator
        if (this.slides[index]) {
            this.slides[index].classList.add('active');
        }
        if (this.indicators[index]) {
            this.indicators[index].classList.add('active');
        }
        
        this.currentSlide = index;
        
        // Update aria-live region for screen readers
        this.announceSlideChange(index);
    }
    
    nextSlide() {
        const nextIndex = (this.currentSlide + 1) % this.slides.length;
        this.goToSlide(nextIndex);
    }
    
    previousSlide() {
        const prevIndex = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.goToSlide(prevIndex);
    }
    
    goToSlide(index) {
        if (index >= 0 && index < this.slides.length) {
            this.showSlide(index);
            this.restartAutoplay();
        }
    }
    
    startAutoplay() {
        if (this.slides.length <= 1) return;
        
        this.autoplayTimer = setInterval(() => {
            this.nextSlide();
        }, this.autoplayDelay);
    }
    
    pauseAutoplay() {
        if (this.autoplayTimer) {
            clearInterval(this.autoplayTimer);
            this.autoplayTimer = null;
        }
    }
    
    restartAutoplay() {
        this.pauseAutoplay();
        this.startAutoplay();
    }
    
    announceSlideChange(index) {
        // Create or update aria-live region for accessibility
        let announcement = this.container.querySelector('.carousel-announcement');
        if (!announcement) {
            announcement = document.createElement('div');
            announcement.className = 'carousel-announcement';
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            this.container.appendChild(announcement);
        }
        
        announcement.textContent = `תמונה ${index + 1} מתוך ${this.slides.length}`;
    }
    
    destroy() {
        this.pauseAutoplay();
        // Remove event listeners and clean up
        this.container.removeEventListener('mouseenter', () => this.pauseAutoplay());
        this.container.removeEventListener('mouseleave', () => this.startAutoplay());
    }
}

// Carousel Manager - Initialize all carousels on the page
class CarouselManager {
    constructor() {
        this.carousels = [];
        this.init();
    }
    
    init() {
        // Initialize carousels on DOM content loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeCarousels());
        } else {
            this.initializeCarousels();
        }
        
        // Reinitialize when new content is added (for dynamic content)
        this.observeNewCarousels();
    }
    
    initializeCarousels() {
        const carouselContainers = document.querySelectorAll('.product-carousel');
        
        carouselContainers.forEach(container => {
            // Check if carousel is already initialized
            if (!container.hasAttribute('data-carousel-initialized')) {
                const carousel = new Carousel(container);
                this.carousels.push(carousel);
                container.setAttribute('data-carousel-initialized', 'true');
            }
        });
    }
    
    observeNewCarousels() {
        // Use MutationObserver to watch for dynamically added carousels
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if the added node contains carousels
                        const carousels = node.querySelectorAll ? 
                            node.querySelectorAll('.product-carousel') : [];
                        
                        carousels.forEach(container => {
                            if (!container.hasAttribute('data-carousel-initialized')) {
                                const carousel = new Carousel(container);
                                this.carousels.push(carousel);
                                container.setAttribute('data-carousel-initialized', 'true');
                            }
                        });
                        
                        // Check if the node itself is a carousel
                        if (node.classList && node.classList.contains('product-carousel') && 
                            !node.hasAttribute('data-carousel-initialized')) {
                            const carousel = new Carousel(node);
                            this.carousels.push(carousel);
                            node.setAttribute('data-carousel-initialized', 'true');
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    pauseAll() {
        this.carousels.forEach(carousel => carousel.pauseAutoplay());
    }
    
    resumeAll() {
        this.carousels.forEach(carousel => carousel.startAutoplay());
    }
    
    destroyAll() {
        this.carousels.forEach(carousel => carousel.destroy());
        this.carousels = [];
    }
}

// Utility function to create a carousel programmatically
function createCarousel(images, title, description, price) {
    const carouselHTML = `
        <div class="product-item">
            <div class="product-carousel">
                <div class="carousel-container">
                    ${images.map((image, index) => `
                        <div class="carousel-slide ${index === 0 ? 'active' : ''}">
                            <img src="${image.src}" alt="${image.alt || title}">
                        </div>
                    `).join('')}
                </div>
                <button class="carousel-btn prev-btn" aria-label="תמונה קודמת">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <button class="carousel-btn next-btn" aria-label="תמונה הבאה">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="carousel-indicators">
                    ${images.map((_, index) => `
                        <span class="indicator ${index === 0 ? 'active' : ''}" 
                              aria-label="עבור לתמונה ${index + 1}"></span>
                    `).join('')}
                </div>
            </div>
            <div class="product-content">
                <h3 class="product-title">${title}</h3>
                <p class="product-description">${description}</p>
                <div class="product-price">₪${price}</div>
                <button class="btn btn-primary product-buy-btn">רכישה</button>
            </div>
        </div>
    `;
    
    return carouselHTML;
}

// Handle page visibility changes to optimize performance
document.addEventListener('visibilitychange', function() {
    if (typeof window.carouselManager !== 'undefined') {
        if (document.hidden) {
            window.carouselManager.pauseAll();
        } else {
            window.carouselManager.resumeAll();
        }
    }
});

// Initialize carousel manager when script loads
window.carouselManager = new CarouselManager();

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Carousel, CarouselManager, createCarousel };
}