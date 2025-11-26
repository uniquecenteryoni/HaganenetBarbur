// Products Data and Dynamic Loading

const productsData = [
    {
        id: 1,
        title: "פעילויות יצירה לגיל הרך",
        description: "אוסף מקיף של פעילויות יצירה מהנות ומפתחות לילדים בגילאי 2-4. כולל הוראות מפורטות, רשימת חומרים וטיפים להצלחה.",
        price: 25,
        images: [
            { src: "images/product-1-1.jpg", alt: "פעילויות יצירה - תמונה 1" },
            { src: "images/product-1-2.jpg", alt: "פעילויות יצירה - תמונה 2" },
            { src: "images/product-1-3.jpg", alt: "פעילויות יצירה - תמונה 3" }
        ],
        category: "יצירה",
        ageGroup: "2-4",
        downloadUrl: "#"
    },
    {
        id: 2,
        title: "חומרי למידה לגילאי 4-6",
        description: "חבילה עשירה של חומרי למידה המותאמים לקדם-בית ספר. כולל משחקי חשיבה, תרגילי כתיבה ופעילויות מתמטיקה בסיסית.",
        price: 35,
        images: [
            { src: "images/product-2-1.jpg", alt: "חומרי למידה - תמונה 1" },
            { src: "images/product-2-2.jpg", alt: "חומרי למידה - תמונה 2" },
            { src: "images/product-2-3.jpg", alt: "חומרי למידה - תמונה 3" }
        ],
        category: "למידה",
        ageGroup: "4-6",
        downloadUrl: "#"
    },
    {
        id: 3,
        title: "משחקים חברתיים וקבוצתיים",
        description: "רעיונות למשחקים המעודדים אינטראקציה חברתית, שיתוף פעולה ופיתוח כישורים רגשיים אצל ילדים.",
        price: 20,
        images: [
            { src: "images/product-3-1.jpg", alt: "משחקים חברתיים - תמונה 1" },
            { src: "images/product-3-2.jpg", alt: "משחקים חברתיים - תמונה 2" },
            { src: "images/product-3-3.jpg", alt: "משחקים חברתיים - תמונה 3" }
        ],
        category: "משחקים",
        ageGroup: "2-6",
        downloadUrl: "#"
    },
    {
        id: 4,
        title: "פעילויות למשפחה בבית",
        description: "רעיונות לפעילויות משפחתיות שניתן לבצע בבית, המחזקות את הקשר בין הורים לילדים ומעודדות למידה משותפת.",
        price: 18,
        images: [
            { src: "images/product-4-1.jpg", alt: "פעילויות משפחתיות - תמונה 1" },
            { src: "images/product-4-2.jpg", alt: "פעילויות משפחתיות - תמונה 2" },
            { src: "images/product-4-3.jpg", alt: "פעילויות משפחתיות - תמונה 3" }
        ],
        category: "משפחה",
        ageGroup: "2-6",
        downloadUrl: "#"
    },
    {
        id: 5,
        title: "תבניות והדפסות לחגים",
        description: "אוסף תבניות והדפסות מיוחדות לחגי השנה - ראש השנה, חנוכה, פורים ועוד. מתאים לעיצוב ויצירה חגיגית.",
        price: 22,
        images: [
            { src: "images/product-5-1.jpg", alt: "תבניות לחגים - תמונה 1" },
            { src: "images/product-5-2.jpg", alt: "תבניות לחגים - תמונה 2" },
            { src: "images/product-5-3.jpg", alt: "תבניות לחגים - תמונה 3" }
        ],
        category: "חגים",
        ageGroup: "2-6",
        downloadUrl: "#"
    },
    {
        id: 6,
        title: "מדריך לגננות מתחילות",
        description: "מדריך מקיף לגננות חדשות - טיפים למנהלת כיתה, פעילויות מומלצות, והתמודדות עם אתגרים יומיומיים בגן.",
        price: 40,
        images: [
            { src: "images/product-6-1.jpg", alt: "מדריך לגננות - תמונה 1" },
            { src: "images/product-6-2.jpg", alt: "מדריך לגננות - תמונה 2" },
            { src: "images/product-6-3.jpg", alt: "מדריך לגננות - תמונה 3" }
        ],
        category: "מדריכים",
        ageGroup: "מקצועי",
        downloadUrl: "#"
    }
];

class ProductsManager {
    constructor() {
        this.container = document.getElementById('products-grid');
        this.products = productsData;
        this.filteredProducts = [...this.products];
        this.currentFilter = 'all';
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        this.createFilterButtons();
        this.renderProducts();
        this.setupEventListeners();
    }
    
    createFilterButtons() {
        const filtersContainer = document.createElement('div');
        filtersContainer.className = 'products-filters';
        filtersContainer.innerHTML = `
            <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">הכל</button>
                <button class="filter-btn" data-filter="יצירה">יצירה</button>
                <button class="filter-btn" data-filter="למידה">למידה</button>
                <button class="filter-btn" data-filter="משחקים">משחקים</button>
                <button class="filter-btn" data-filter="משפחה">משפחה</button>
                <button class="filter-btn" data-filter="חגים">חגים</button>
                <button class="filter-btn" data-filter="מדריכים">מדריכים</button>
            </div>
        `;
        
        // Insert before the products grid
        this.container.parentNode.insertBefore(filtersContainer, this.container);
        
        // Add filter styles
        this.addFilterStyles();
    }
    
    addFilterStyles() {
        if (document.querySelector('#products-filter-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'products-filter-styles';
        styles.textContent = `
            .products-filters {
                margin-bottom: 2rem;
                text-align: center;
            }
            
            .filter-buttons {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .filter-btn {
                background: var(--white);
                border: 2px solid var(--primary-purple);
                color: var(--primary-purple);
                padding: 0.5rem 1rem;
                border-radius: var(--border-radius);
                cursor: pointer;
                transition: var(--transition);
                font-family: var(--font-family);
                font-weight: 500;
            }
            
            .filter-btn:hover,
            .filter-btn.active {
                background: var(--primary-purple);
                color: var(--white);
            }
            
            .products-grid {
                animation: fadeIn 0.5s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @media (max-width: 768px) {
                .filter-buttons {
                    gap: 0.25rem;
                }
                
                .filter-btn {
                    padding: 0.4rem 0.8rem;
                    font-size: 0.9rem;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    setupEventListeners() {
        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.setFilter(filter);
                
                // Update active button
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Purchase buttons
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('product-buy-btn')) {
                const productId = e.target.closest('.product-item').getAttribute('data-product-id');
                this.handlePurchase(productId);
            }
        });
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        
        if (filter === 'all') {
            this.filteredProducts = [...this.products];
        } else {
            this.filteredProducts = this.products.filter(product => 
                product.category === filter
            );
        }
        
        this.renderProducts();
    }
    
    renderProducts() {
        if (this.filteredProducts.length === 0) {
            this.container.innerHTML = `
                <div class="no-products">
                    <p>לא נמצאו קבצים בקטגוריה זו</p>
                </div>
            `;
            return;
        }
        
        const productsHTML = this.filteredProducts.map(product => 
            this.createProductHTML(product)
        ).join('');
        
        this.container.innerHTML = productsHTML;
        
        // Reinitialize carousels for new products
        if (window.carouselManager) {
            setTimeout(() => {
                window.carouselManager.initializeCarousels();
            }, 100);
        }
        
        // Add loading animation
        this.animateProducts();
    }
    
    createProductHTML(product) {
        return `
            <div class="product-item" data-product-id="${product.id}">
                <div class="product-carousel">
                    <div class="carousel-container">
                        ${product.images.map((image, index) => `
                            <div class="carousel-slide ${index === 0 ? 'active' : ''}">
                                <img src="${image.src}" 
                                     alt="${image.alt}"
                                     onerror="this.src='images/placeholder-product.jpg'"
                                     loading="lazy">
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
                        ${product.images.map((_, index) => `
                            <span class="indicator ${index === 0 ? 'active' : ''}" 
                                  aria-label="עבור לתמונה ${index + 1}"></span>
                        `).join('')}
                    </div>
                </div>
                
                <div class="product-content">
                    <div class="product-meta">
                        <span class="product-category">${product.category}</span>
                        <span class="product-age">${product.ageGroup}</span>
                    </div>
                    <h3 class="product-title">${product.title}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-footer">
                        <div class="product-price">₪${product.price}</div>
                        <button class="btn btn-primary product-buy-btn">רכישה</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    animateProducts() {
        const products = this.container.querySelectorAll('.product-item');
        products.forEach((product, index) => {
            product.style.opacity = '0';
            product.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                product.style.transition = 'all 0.5s ease';
                product.style.opacity = '1';
                product.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    handlePurchase(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) return;
        
        // Show purchase modal or redirect to payment
        this.showPurchaseModal(product);
    }
    
    showPurchaseModal(product) {
        const modal = document.createElement('div');
        modal.className = 'purchase-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <h3>רכישת ${product.title}</h3>
                <div class="purchase-details">
                    <img src="${product.images[0].src}" alt="${product.title}" class="purchase-image">
                    <div class="purchase-info">
                        <p><strong>מחיר:</strong> ₪${product.price}</p>
                        <p><strong>קטגוריה:</strong> ${product.category}</p>
                        <p><strong>גיל מומלץ:</strong> ${product.ageGroup}</p>
                        <p class="purchase-description">${product.description}</p>
                    </div>
                </div>
                <div class="purchase-actions">
                    <button class="btn btn-primary confirm-purchase">אישור רכישה</button>
                    <button class="btn btn-secondary cancel-purchase">ביטול</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        
        // Add modal styles
        this.addModalStyles();
        
        // Event listeners
        const closeModal = () => {
            document.body.removeChild(modal);
            document.body.style.overflow = '';
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
        modal.querySelector('.cancel-purchase').addEventListener('click', closeModal);
        
        modal.querySelector('.confirm-purchase').addEventListener('click', () => {
            // Here you would integrate with your payment system
            alert('תודה! נעביר אותך לעמוד התשלום');
            closeModal();
        });
        
        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);
    }
    
    addModalStyles() {
        if (document.querySelector('#purchase-modal-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'purchase-modal-styles';
        styles.textContent = `
            .purchase-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }
            
            .purchase-modal.show {
                opacity: 1;
                visibility: visible;
            }
            
            .modal-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
            }
            
            .modal-content {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--white);
                padding: 2rem;
                border-radius: var(--border-radius-lg);
                box-shadow: var(--shadow-lg);
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .modal-close {
                position: absolute;
                top: 1rem;
                right: 1rem;
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: var(--light-gray);
            }
            
            .purchase-details {
                display: flex;
                gap: 1rem;
                margin: 1rem 0;
            }
            
            .purchase-image {
                width: 100px;
                height: 100px;
                object-fit: cover;
                border-radius: var(--border-radius);
            }
            
            .purchase-info {
                flex: 1;
            }
            
            .purchase-description {
                font-size: 0.9rem;
                line-height: 1.5;
                color: var(--light-gray);
            }
            
            .purchase-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 2rem;
            }
            
            .product-meta {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
            }
            
            .product-category,
            .product-age {
                font-size: 0.8rem;
                padding: 0.25rem 0.5rem;
                border-radius: 12px;
                background: var(--cream);
                color: var(--primary-purple);
                font-weight: 500;
            }
            
            .product-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 1rem;
            }
            
            .no-products {
                grid-column: 1 / -1;
                text-align: center;
                padding: 3rem;
                color: var(--light-gray);
            }
            
            @media (max-width: 768px) {
                .purchase-details {
                    flex-direction: column;
                    text-align: center;
                }
                
                .purchase-actions {
                    flex-direction: column;
                }
            }
        `;
        
        document.head.appendChild(styles);
    }
}

// Initialize products when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    window.productsManager = new ProductsManager();
});

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProductsManager, productsData };
}