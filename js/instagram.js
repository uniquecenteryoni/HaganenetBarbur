// Instagram Feed Integration

class InstagramFeed {
    constructor(options = {}) {
        this.username = options.username || 'lapidotbar';
        this.container = document.getElementById(options.containerId || 'instagram-feed');
        this.maxPosts = options.maxPosts || 6;
        this.cacheDuration = options.cacheDuration || 3600000; // 1 hour in milliseconds
        this.fallbackImages = [
            'images/instagram-placeholder-1.jpg',
            'images/instagram-placeholder-2.jpg',
            'images/instagram-placeholder-3.jpg'
        ];
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        // Load posts immediately without showing loading state first
        this.loadFromCache()
            .then(posts => {
                if (posts && posts.length > 0) {
                    this.renderPosts(posts);
                } else {
                    this.loadInstagramPosts();
                }
            })
            .catch(() => {
                this.loadInstagramPosts();
            });
    }
    
    async loadInstagramPosts() {
        try {
            // Since Instagram Basic Display API requires authentication,
            // we'll implement a fallback method that shows placeholder content
            // In a real implementation, you would use a backend service
            // or Instagram Basic Display API with proper authentication
            
            // Load placeholder posts immediately - no loading state
            const mockPosts = this.createMockPosts();
            
            this.renderPosts(mockPosts);
            this.saveToCache(mockPosts);
            
        } catch (error) {
            console.error('Error loading Instagram posts:', error);
            this.showErrorState();
        }
    }
    
    createMockPosts() {
        // This would be replaced with actual Instagram API data
        return [
            {
                id: '1',
                permalink: `https://www.instagram.com/p/mock1/`,
                media_url: 'images/instagram-placeholder-1.jpg',
                caption: 'פעילות יצירה מהנה עם הילדים! 🎨 #גן_ילדים #יצירה',
                timestamp: new Date().toISOString(),
                media_type: 'IMAGE'
            },
            {
                id: '2',
                permalink: `https://www.instagram.com/p/mock2/`,
                media_url: 'images/instagram-placeholder-2.jpg',
                caption: 'למידה דרך משחק - הדרך הטובה ביותר ללמד ילדים! 📚',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                media_type: 'IMAGE'
            },
            {
                id: '3',
                permalink: `https://www.instagram.com/p/mock3/`,
                media_url: 'images/instagram-placeholder-3.jpg',
                caption: 'חומרי למידה חדשים לגיל הרך 🌟',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                media_type: 'IMAGE'
            },
            {
                id: '4',
                permalink: `https://www.instagram.com/p/mock4/`,
                media_url: 'images/instagram-placeholder-1.jpg',
                caption: 'כיף בגן! פעילויות שמפתחות דמיון ויצירתיות 🎭',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                media_type: 'IMAGE'
            },
            {
                id: '5',
                permalink: `https://www.instagram.com/p/mock5/`,
                media_url: 'images/instagram-placeholder-2.jpg',
                caption: 'סדנת הורים וילדים מוצלחת! תודה לכל המשתתפים 💕',
                timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                media_type: 'IMAGE'
            },
            {
                id: '6',
                permalink: `https://www.instagram.com/p/mock6/`,
                media_url: 'images/instagram-placeholder-3.jpg',
                caption: 'רעיונות לפעילויות בבית - קלים ומהנים! 🏠',
                timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                media_type: 'IMAGE'
            }
        ];
    }
    
    showLoadingState() {
        // Show a more subtle loading state without flickering text
        this.container.innerHTML = `
            <div class="instagram-loading">
                <div class="instagram-skeleton">
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                    <div class="skeleton-item"></div>
                </div>
            </div>
        `;
    }
    
    showErrorState() {
        this.container.innerHTML = `
            <div class="instagram-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>לא ניתן לטעון את הפוסטים מאינסטגרם כרגע</p>
                <button class="btn btn-secondary retry-btn" onclick="window.instagramFeed.loadInstagramPosts()">
                    נסה שוב
                </button>
            </div>
        `;
    }
    
    renderPosts(posts) {
        if (!posts || posts.length === 0) {
            this.showErrorState();
            return;
        }
        
        const postsHTML = posts.slice(0, this.maxPosts).map(post => {
            const caption = post.caption ? this.truncateCaption(post.caption) : '';
            const timeAgo = this.getTimeAgo(post.timestamp);
            
            return `
                <div class="instagram-post" data-post-id="${post.id}">
                    <div class="instagram-post-image">
                        <img src="${post.media_url}" 
                             alt="${caption}" 
                             onerror="this.src='${this.getRandomFallbackImage()}'"
                             loading="lazy">
                        <div class="instagram-overlay">
                            <a href="${post.permalink}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               class="instagram-link"
                               aria-label="צפה בפוסט באינסטגרם">
                                <i class="fab fa-instagram"></i>
                            </a>
                        </div>
                    </div>
                    <div class="instagram-post-info">
                        <p class="instagram-caption">${caption}</p>
                        <span class="instagram-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        this.container.innerHTML = postsHTML;
        this.addPostAnimations();
    }
    
    truncateCaption(caption, maxLength = 100) {
        if (caption.length <= maxLength) return caption;
        return caption.substring(0, maxLength) + '...';
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const postDate = new Date(timestamp);
        const diffInSeconds = Math.floor((now - postDate) / 1000);
        
        if (diffInSeconds < 60) return 'לפני רגע';
        if (diffInSeconds < 3600) return `לפני ${Math.floor(diffInSeconds / 60)} דקות`;
        if (diffInSeconds < 86400) return `לפני ${Math.floor(diffInSeconds / 3600)} שעות`;
        if (diffInSeconds < 604800) return `לפני ${Math.floor(diffInSeconds / 86400)} ימים`;
        return `לפני ${Math.floor(diffInSeconds / 604800)} שבועות`;
    }
    
    getRandomFallbackImage() {
        const randomIndex = Math.floor(Math.random() * this.fallbackImages.length);
        return this.fallbackImages[randomIndex];
    }
    
    addPostAnimations() {
        const posts = this.container.querySelectorAll('.instagram-post');
        
        // Remove loading state smoothly
        const loadingElement = this.container.querySelector('.instagram-loading');
        if (loadingElement) {
            loadingElement.style.opacity = '0';
            setTimeout(() => {
                if (loadingElement.parentNode) {
                    loadingElement.parentNode.removeChild(loadingElement);
                }
            }, 200);
        }
        
        posts.forEach((post, index) => {
            post.style.opacity = '0';
            post.style.transform = 'translateY(10px)';
            post.style.transition = 'all 0.4s ease';
            
            setTimeout(() => {
                post.style.opacity = '1';
                post.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
    
    async saveToCache(posts) {
        try {
            const cacheData = {
                posts: posts,
                timestamp: Date.now()
            };
            localStorage.setItem('instagram_cache', JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Could not save to cache:', error);
        }
    }
    
    async loadFromCache() {
        try {
            const cached = localStorage.getItem('instagram_cache');
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            const isExpired = (Date.now() - cacheData.timestamp) > this.cacheDuration;
            
            if (isExpired) {
                localStorage.removeItem('instagram_cache');
                return null;
            }
            
            return cacheData.posts;
        } catch (error) {
            console.warn('Could not load from cache:', error);
            return null;
        }
    }
    
    refresh() {
        localStorage.removeItem('instagram_cache');
        this.loadInstagramPosts();
    }
}

// Add Instagram-specific CSS styles
function addInstagramStyles() {
    if (document.querySelector('#instagram-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'instagram-styles';
    styles.textContent = `
        .instagram-loading {
            padding: 1rem;
        }
        
        .instagram-skeleton {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--spacing-md);
        }
        
        .skeleton-item {
            background: linear-gradient(90deg, 
                var(--cream) 25%, 
                rgba(139, 95, 191, 0.1) 50%, 
                var(--cream) 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: var(--border-radius);
            aspect-ratio: 1;
            min-height: 200px;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        .instagram-error {
            text-align: center;
            padding: 2rem;
            color: var(--light-gray);
        }
        
        .instagram-error i {
            font-size: 2rem;
            color: var(--primary-purple);
            margin-bottom: 1rem;
            display: block;
        }
        
        .retry-btn {
            margin-top: 1rem;
        }
        
        .instagram-post {
            background: var(--white);
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: var(--shadow-sm);
            transition: var(--transition);
        }
        
        .instagram-post:hover {
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }
        
        .instagram-post-image {
            position: relative;
            overflow: hidden;
            aspect-ratio: 1;
        }
        
        .instagram-post-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: var(--transition);
        }
        
        .instagram-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(139, 95, 191, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: var(--transition);
        }
        
        .instagram-post:hover .instagram-overlay {
            opacity: 1;
        }
        
        .instagram-link {
            color: var(--white);
            font-size: 1.5rem;
            text-decoration: none;
            padding: 1rem;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.2);
            transition: var(--transition);
        }
        
        .instagram-link:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: scale(1.1);
        }
        
        .instagram-post-info {
            padding: 1rem;
        }
        
        .instagram-caption {
            font-size: 0.9rem;
            line-height: 1.4;
            margin-bottom: 0.5rem;
            color: var(--dark-gray);
        }
        
        .instagram-time {
            font-size: 0.8rem;
            color: var(--light-gray);
        }
        
        @media (max-width: 768px) {
            .instagram-feed {
                grid-template-columns: repeat(2, 1fr);
                gap: var(--spacing-sm);
            }
            
            .instagram-post-info {
                padding: 0.75rem;
            }
            
            .instagram-caption {
                font-size: 0.85rem;
            }
        }
        
        @media (max-width: 480px) {
            .instagram-feed {
                grid-template-columns: 1fr;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

// Initialize Instagram feed immediately
function initInstagramFeed() {
    addInstagramStyles();
    
    // Initialize with default settings
    window.instagramFeed = new InstagramFeed({
        username: 'lapidotbar',
        containerId: 'instagram-feed',
        maxPosts: 6
    });
}

// Initialize as soon as possible
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstagramFeed);
} else {
    initInstagramFeed();
}

// Refresh feed every 30 minutes
setInterval(() => {
    if (window.instagramFeed && !document.hidden) {
        window.instagramFeed.refresh();
    }
}, 30 * 60 * 1000);

// Alternative implementation using Instagram oEmbed API (for public posts)
class InstagramOEmbed {
    constructor(postUrls) {
        this.postUrls = postUrls;
        this.container = document.getElementById('instagram-feed');
    }
    
    async loadPosts() {
        if (!this.container || !this.postUrls.length) return;
        
        try {
            const embedPromises = this.postUrls.map(url => this.getEmbedCode(url));
            const embeds = await Promise.all(embedPromises);
            
            const validEmbeds = embeds.filter(embed => embed !== null);
            this.renderEmbeds(validEmbeds);
            
        } catch (error) {
            console.error('Error loading Instagram embeds:', error);
        }
    }
    
    async getEmbedCode(postUrl) {
        try {
            const oembedUrl = `https://api.instagram.com/oembed/?url=${encodeURIComponent(postUrl)}`;
            const response = await fetch(oembedUrl);
            
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('Error fetching embed:', error);
            return null;
        }
    }
    
    renderEmbeds(embeds) {
        const embedsHTML = embeds.map(embed => `
            <div class="instagram-embed-container">
                ${embed.html}
            </div>
        `).join('');
        
        this.container.innerHTML = embedsHTML;
        
        // Load Instagram's embed script if not already loaded
        if (!document.querySelector('script[src*="instagram.com/embed"]')) {
            const script = document.createElement('script');
            script.async = true;
            script.src = '//www.instagram.com/embed.js';
            document.body.appendChild(script);
        }
    }
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { InstagramFeed, InstagramOEmbed };
}