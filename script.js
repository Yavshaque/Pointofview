const thumbnailImage = document.querySelector('#thumbnailImage img');
const articleTitle = document.querySelector('#articleTitle h2');
const heroArrowLink = document.getElementById('heroArrowLink');
const articleDesc = document.querySelector('#articleDescription p');
const articleInfo = document.querySelector('#articleInfo');
const parametersDiv = document.querySelector('#parameters');
const keyInfoDiv = document.querySelector('#keyInfo');
const latestArticlesContainer = document.querySelector('#latestArticles');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const heroSlider = document.querySelector('.article');

let currentIndex = 0;
let articlesData = [];
let slideInterval = null;
let touchStartX = 0;
let touchStartY = 0;
let downsideCategoryBarObserver = null;

const DEFAULT_ARTICLES = [];

const baselineArticles = (typeof window !== 'undefined' && Array.isArray(window.ARTICLES_DATABASE))
    ? window.ARTICLES_DATABASE
    : [];

function initializeArticles(baseData) {
    let customArticles = [];
    try {
        if (typeof DB !== 'undefined' && DB.getCustomArticles) {
            customArticles = DB.getCustomArticles();
        } else {
            const stored = localStorage.getItem('custom_articles');
            if (stored) customArticles = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error reading custom articles:', e);
    }

    const databaseArticles = Array.isArray(baseData) ? baseData : [];
    const deletedIds = (typeof DB !== 'undefined' && DB.getDeletedArticleIds) ? DB.getDeletedArticleIds() : new Set();
    const customIds = new Set(customArticles.map(a => String(a.id)));
    
    // External base articles (only if explicitly supplied)
    const filteredBase = databaseArticles.filter(a => !customIds.has(String(a.id)));

    let activeProjects = [];
    if (typeof DB !== 'undefined' && DB.getProjects) {
        const projects = DB.getProjects();
        activeProjects = (projects || []).map(p => {
            const rawParts = p.parts;
            const partsList = Array.isArray(rawParts)
                ? rawParts
                : (typeof rawParts === 'string' ? (() => { try { return JSON.parse(rawParts); } catch(e){ return []; } })() : []);
            
            const firstPart = partsList[0] || {};
            const totalReadTime = partsList.reduce((acc, part) => {
                const rt = part && part.readTime ? parseInt(part.readTime, 10) : 4;
                return acc + (isNaN(rt) ? 4 : rt);
            }, 0) || 4;

            let categories = ['Series'];
            if (Array.isArray(p.categories) && p.categories.length) {
                categories = p.categories;
            } else if (typeof p.categories === 'string') {
                try { categories = JSON.parse(p.categories || '["Series"]'); } catch(e){ categories = ['Series']; }
            }

            return {
                id: p.id,
                title: p.title || 'Untitled Project',
                author: p.author || 'Anonymous',
                date: (firstPart && firstPart.date) || p.createdAt || '2026-01-01',
                image: p.cover || 'images/spanish colonisation.png',
                readTime: totalReadTime,
                description: p.subtitle || p.description || '',
                keywords: categories,
                isProject: true,
                collaboratorName: p.collaboratorName || null,
                collaboratorId: p.collaboratorId || null,
                isCollab: !!(p.collaboratorName)
            };
        });
    }

    // Both articles and projects are included in the hero slider, except articles linked to a project.
    // Cloud-synced database articles are merged through customArticles; static database articles
    // remain supported through baseData.
    const mergedItems = [...activeProjects, ...customArticles, ...filteredBase];
    articlesData = mergedItems.filter(a => {
        if (!a) return false;
        if (deletedIds.has(String(a.id))) return false;
        if (typeof DB !== 'undefined' && DB.isDummyItem && DB.isDummyItem(a)) return false;
        // Do not show articles linked to a project in the hero carousel or grid (the project is already displayed)
        const linkedPid = a.projectId ?? a.project_id;
        const normalizedProjectId = linkedPid == null ? '' : String(linkedPid).trim().toLowerCase();
        if (!a.isProject && normalizedProjectId && normalizedProjectId !== 'null' && normalizedProjectId !== 'undefined') return false;
        const title = (a.title || '').trim().toLowerCase();
        if (title.includes('demographic collapse')) return false;
        if (title.includes('mercantilism')) return false;
        if (title.includes('racial classes and social stratification')) return false;
        if (title.includes('technological and cultural exchanges')) return false;
        if (title.includes('the atlantic world')) return false;
        if (title.includes('colonial social orders')) return false;
        return true;
    });

    if (!articlesData.length) {
        currentIndex = 0;
    } else if (currentIndex >= articlesData.length) {
        currentIndex = 0;
    }

    updateDOM(currentIndex);
    renderHeroCompanion(articlesData);
    renderLatestArticles(articlesData);
    renderCategoryFilters(articlesData);
    renderTeamMembers();
    setupContactForm();

    // Re-align hash position if loaded with an anchor hash
    if (window.location.hash) {
        try {
            const hashEl = document.querySelector(window.location.hash);
            if (hashEl) {
                setTimeout(() => {
                    hashEl.scrollIntoView({ behavior: 'smooth' });
                }, 80);
            }
        } catch (e) {
            // Ignore invalid hash selector
        }
    }

    startAutoSlide();
}

// Initial render using database articles
initializeArticles(baselineArticles);

// Re-render when background cloud synchronization completes
if (typeof window !== 'undefined') {
    window.addEventListener('cloud_data_synced', () => {
        const base = (typeof window !== 'undefined' && Array.isArray(window.ARTICLES_DATABASE))
            ? window.ARTICLES_DATABASE
            : [];
        initializeArticles(base);
    });
}
if (typeof document !== 'undefined') {
    document.addEventListener('cloudDataSynced', () => {
        const base = (typeof window !== 'undefined' && Array.isArray(window.ARTICLES_DATABASE))
            ? window.ARTICLES_DATABASE
            : [];
        initializeArticles(base);
    });
}

let lastSlideTime = 0;

function goToNextSlide(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastSlideTime < 280) return;
    lastSlideTime = now;

    if (!articlesData || articlesData.length <= 1) return;
    currentIndex = (currentIndex + 1) % articlesData.length;
    updateDOM(currentIndex);
    startAutoSlide();
}

function goToPrevSlide(e) {
    if (e) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastSlideTime < 280) return;
    lastSlideTime = now;

    if (!articlesData || articlesData.length <= 1) return;
    currentIndex = (currentIndex - 1 + articlesData.length) % articlesData.length;
    updateDOM(currentIndex);
    startAutoSlide();
}

window.goToNextSlide = goToNextSlide;
window.goToPrevSlide = goToPrevSlide;

function startAutoSlide() {
    if (slideInterval) {
        clearInterval(slideInterval);
        slideInterval = null;
    }
    if (!articlesData || articlesData.length <= 1) return;
    slideInterval = setInterval(() => {
        if (!articlesData || articlesData.length <= 1) {
            if (slideInterval) clearInterval(slideInterval);
            return;
        }
        currentIndex = (currentIndex + 1) % articlesData.length;
        updateDOM(currentIndex);
    }, 4500);
}

if (leftButton) {
    leftButton.setAttribute('type', 'button');
    leftButton.onclick = (e) => {
        goToPrevSlide(e);
    };
    leftButton.addEventListener('touchend', (e) => {
        goToPrevSlide(e);
    }, { passive: false });
}

if (rightButton) {
    rightButton.setAttribute('type', 'button');
    rightButton.onclick = (e) => {
        goToNextSlide(e);
    };
    rightButton.addEventListener('touchend', (e) => {
        goToNextSlide(e);
    }, { passive: false });
}

const buttonsContainer = document.getElementById('buttonsContainer');
if (buttonsContainer) {
    buttonsContainer.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    buttonsContainer.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });
}

if (heroSlider) {
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        heroSlider.addEventListener('mouseenter', () => {
            if (slideInterval) clearInterval(slideInterval);
        });
        heroSlider.addEventListener('mouseleave', () => {
            startAutoSlide();
        });
    }

    heroSlider.addEventListener('touchstart', (event) => {
        const touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: true });

    heroSlider.addEventListener('touchend', (event) => {
        if (!articlesData || articlesData.length <= 1) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;

        // Only treat a deliberate horizontal gesture as carousel navigation.
        if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

        if (deltaX < 0) {
            goToNextSlide();
        } else {
            goToPrevSlide();
        }
        startAutoSlide();
    }, { passive: true });
}

// Arrow key navigation
document.addEventListener('keydown', (e) => {
    if (e.target && ['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) return;
    if (e.key === 'ArrowLeft') {
        goToPrevSlide();
    } else if (e.key === 'ArrowRight') {
        goToNextSlide();
    }
});

function getAuthorAvatar(authorName) {
    if (!authorName) return null;
    const clean = authorName.trim();
    if (typeof DB !== 'undefined' && DB.getAuthorAvatar) {
        const av = DB.getAuthorAvatar(clean);
        if (av) return av;
    }
    const lower = clean.toLowerCase();
    if (lower === 'ali mert bayar') {
        return 'images/mert_img.png';
    }
    return null;
}

function renderMiniAvatarHTML(authorName, className = 'cardAuthorAvatar') {
    const avatar = getAuthorAvatar(authorName);
    const cleanName = authorName ? authorName.trim() : 'Author';
    const initial = cleanName.charAt(0).toUpperCase() || 'A';
    if (avatar) {
        return `<img src="${avatar}" alt="${cleanName}" class="${className}">`;
    } else {
        return `<span class="${className} ${className}Fallback">${initial}</span>`;
    }
}

function updateDOM(index) {
    const buttonsContainer = document.getElementById('buttonsContainer');

    if (!articlesData || !articlesData.length) {
        if (thumbnailImage) {
            thumbnailImage.src = 'images/logo.png';
            thumbnailImage.alt = 'Point of View';
            thumbnailImage.onclick = null;
            thumbnailImage.style.cursor = 'default';
            thumbnailImage.style.opacity = '1';
        }
        if (articleTitle) {
            articleTitle.innerHTML = 'Point of View';
        }
        const arrowLink = document.getElementById('heroArrowLink');
        if (arrowLink) arrowLink.href = 'javascript:void(0);';
        if (articleDesc) {
            articleDesc.textContent = 'Articles published to the database will appear here.';
        }
        if (parametersDiv) parametersDiv.innerHTML = '';
        if (keyInfoDiv) keyInfoDiv.innerHTML = '';
        const heroProjectBadge = document.getElementById('heroProjectBadge');
        if (heroProjectBadge) heroProjectBadge.style.display = 'none';
        if (buttonsContainer) {
            buttonsContainer.style.display = 'none';
        }
        return;
    }

    // Clamp index cleanly
    if (index >= articlesData.length) {
        currentIndex = 0;
    } else if (index < 0) {
        currentIndex = Math.max(0, articlesData.length - 1);
    } else {
        currentIndex = index;
    }

    const currentArticle = articlesData[currentIndex] || articlesData[0];
    if (!currentArticle) return;
    const isProject = currentArticle.isProject === true;
    const articleHref = isProject ? `projects.html?id=${encodeURIComponent(currentArticle.id)}` : `article.html?id=${encodeURIComponent(currentArticle.id)}`;

    // Show/hide top-left project badge on hero grid
    const heroProjectBadge = document.getElementById('heroProjectBadge');
    if (heroProjectBadge) {
        heroProjectBadge.style.display = isProject ? 'inline-flex' : 'none';
    }

    // Show/hide navigation buttons depending on slide count
    if (buttonsContainer) {
        buttonsContainer.style.display = (articlesData && articlesData.length > 1) ? 'flex' : 'none';
    }

    // Update hero image with smooth crossfade
    if (thumbnailImage) {
        const nextSrc = currentArticle.image || 'images/logo.png';
        const currentSrc = thumbnailImage.getAttribute('src');
        if (currentSrc !== nextSrc) {
            thumbnailImage.style.opacity = '0.35';
            setTimeout(() => {
                thumbnailImage.src = nextSrc;
                thumbnailImage.alt = currentArticle.title || 'Point of View';
                thumbnailImage.style.opacity = '1';
            }, 80);
        } else {
            thumbnailImage.style.opacity = '1';
        }
        thumbnailImage.style.cursor = 'pointer';
        thumbnailImage.onclick = () => {
            window.location.href = articleHref;
        };
    }

    if (articleTitle) {
        articleTitle.innerHTML = `<a href="${articleHref}" style="text-decoration: none; color: inherit; transition: opacity 0.2s ease;">${currentArticle.title}</a>`;
    }

    const arrowLink = document.getElementById('heroArrowLink');
    if (arrowLink) {
        arrowLink.href = articleHref;
    }

    if (articleDesc) {
        articleDesc.textContent = currentArticle.description || '';
    }

    // Update author and read time parameters
    if (parametersDiv) {
        const authorName = currentArticle.author || 'Ali Mert Bayar';
        const avatarHtml = renderMiniAvatarHTML(authorName, 'heroAuthorAvatar');
        let authorDisplay = '';
        
        if (currentArticle.isCollab && currentArticle.collaboratorName) {
            const collabAvatarHtml = renderMiniAvatarHTML(currentArticle.collaboratorName, 'heroAuthorAvatar heroCollabAvatar');
            authorDisplay = `
                <div class="infoCard heroAuthorPill" id="infoCard">
                    <div class="heroAuthorsAvatarsGroup">
                        <a href="profile.html?author=${encodeURIComponent(authorName)}" class="heroAuthorAvatarLink" title="View ${authorName}'s profile">
                            ${avatarHtml}
                        </a>
                        <a href="profile.html?author=${encodeURIComponent(currentArticle.collaboratorName)}" class="heroAuthorAvatarLink" title="View ${currentArticle.collaboratorName}'s profile">
                            ${collabAvatarHtml}
                        </a>
                    </div>
                    <span class="heroAuthorName">By <a href="profile.html?author=${encodeURIComponent(authorName)}" class="heroAuthorInlineLink">${authorName}</a> &amp; <a href="profile.html?author=${encodeURIComponent(currentArticle.collaboratorName)}" class="heroAuthorInlineLink">${currentArticle.collaboratorName}</a></span>
                </div>
                <p class="infoCard" id="readTime">${currentArticle.readTime} min read</p>
            `;
        } else {
            authorDisplay = `
                <div class="infoCard heroAuthorPill" id="infoCard">
                    <a href="profile.html?author=${encodeURIComponent(authorName)}" class="heroAuthorAvatarLink" title="View ${authorName}'s profile">
                        ${avatarHtml}
                    </a>
                    <span class="heroAuthorName">By <a href="profile.html?author=${encodeURIComponent(authorName)}" class="heroAuthorInlineLink">${authorName}</a></span>
                </div>
                <p class="infoCard" id="readTime">${currentArticle.readTime} min read</p>
            `;
        }
        parametersDiv.innerHTML = authorDisplay;
    }

    // Update category keywords, edit pill, and delete pill
    if (keyInfoDiv) {
        if (currentArticle.isCollab) {
            keyInfoDiv.classList.add('heroCollabKeyInfo');
        } else {
            keyInfoDiv.classList.remove('heroCollabKeyInfo');
        }

        let keyHtml = '';
        if (currentArticle.keywords && Array.isArray(currentArticle.keywords)) {
            keyHtml += currentArticle.keywords
                .filter(keyword => keyword.toLowerCase() !== 'published')
                .slice(0, 2)
                .map(keyword => `<p class="infoCard">${keyword}</p>`)
                .join('');
        }
        if (typeof DB !== 'undefined' && DB.canEditArticle && DB.canEditArticle(currentArticle)) {
            keyHtml += `<a href="add-essay.html?edit=${encodeURIComponent(currentArticle.id)}" class="heroEditPill" title="Edit this article">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit Article
            </a>`;
        }
        keyInfoDiv.innerHTML = keyHtml;
    }
}

function renderLatestArticles(articles) {
    if (!latestArticlesContainer) return;
    latestArticlesContainer.innerHTML = '';

    if (!articles || !articles.length) {
        latestArticlesContainer.innerHTML = `
            <div class="emptyArticlesState" style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #888;">
                <p style="font-size: 16px; margin-bottom: 8px;">No articles available yet.</p>
                <p style="font-size: 13px; opacity: 0.7;">Articles published to the database will appear here.</p>
            </div>
        `;
        return;
    }

    articles.forEach(article => {
        const articleCard = document.createElement('div');
        articleCard.classList.add('articleCard');

        const isProject = article.isProject === true;
        const articleHref = isProject ? `projects.html?id=${encodeURIComponent(article.id)}` : `article.html?id=${encodeURIComponent(article.id)}`;
        const canEdit = typeof DB !== 'undefined' && DB.canEditArticle && DB.canEditArticle(article);
        const authorName = article.author || 'Ali Mert Bayar';
        const avatarHtml = renderMiniAvatarHTML(authorName, 'cardAuthorAvatar');

        const editPill = canEdit ? `
            <a href="add-essay.html?edit=${encodeURIComponent(article.id)}" class="cardEditLink" title="Edit this article">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
            </a>
        ` : '';

        const mainCategory = (article.keywords && article.keywords.find(k => k.toLowerCase() !== 'published')) || 'World';
        const readTime = article.readTime || 4;

        const projectContentBadge = isProject ? `<span class="sectionBadge" style="font-size: 9.5px; padding: 2px 9px; margin: 0px; align-self: flex-start;">Project</span>` : '';

        articleCard.innerHTML = `
            <a href="${articleHref}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1;">
                <div class="articleCardImage" style="position: relative;">
                    <img src="${article.image}" alt="${article.title}">
                </div>
                <div class="articleCardContent">
                    <div style="display: flex; align-items: flex-start; justify-content: space-between; white-space: nowrap; overflow: hidden; margin:0 ;">
                        <div class="cardMeta" style="margin: 0;">
                            <span class="cardMetaCat">${mainCategory}</span><span class="cardMetaSep">·</span><span class="cardReadTime">${readTime} min read</span>
                        </div>
                        ${projectContentBadge}
                    </div>
                    <h2>${article.title}</h2>
                    <p>${article.description}</p>
                </div>
            </a>
            <div class="articleCardFooter" style="margin-top: auto;">
                <div class="cardAuthorRow">
                    <a href="profile.html?author=${encodeURIComponent(authorName)}" class="cardAuthorLink" title="View ${authorName}'s profile">
                        ${avatarHtml}
                        <span class="cardAuthorName">${article.isCollab && article.collaboratorName ? `${authorName} & ${article.collaboratorName}` : authorName}</span>
                    </a>
                </div>
                ${editPill ? `<div class="cardEditWrapper">${editPill}</div>` : ''}
            </div>
        `;

        latestArticlesContainer.appendChild(articleCard);
    });
}

async function deleteArticlePrompt(id) {
    const target = articlesData.find(a => String(a.id) === String(id));
    const displayName = (target && target.title) ? `"${target.title}"` : 'this article';
    const ok = (typeof DB !== 'undefined' && DB.showConfirm)
        ? await DB.showConfirm(`Are you sure you want to permanently delete ${displayName}? This action cannot be undone.`)
        : confirm(`Are you sure you want to permanently delete ${displayName}? This action cannot be undone.`);
    if (ok) {
        try {
            if (typeof DB !== 'undefined' && DB.deleteArticle) {
                DB.deleteArticle(id);
            }
            articlesData = articlesData.filter(a => String(a.id) !== String(id));
            if (currentIndex >= articlesData.length) {
                currentIndex = Math.max(0, articlesData.length - 1);
            }
            if (articlesData.length > 0) {
                updateDOM(currentIndex);
                renderHeroCompanion(articlesData);
                renderLatestArticles(articlesData);
                renderCategoryFilters(articlesData);
            } else {
                window.location.reload();
            }
        } catch (e) {
            alert(e.message || 'Error deleting article.');
        }
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-/.]/);
    if (parts.length === 3 && parts[0].length === 4) {
        const year = parseInt(parts[0], 10);
        let month, day;
        if (parseInt(parts[1], 10) > 12) {
            day = parseInt(parts[1], 10);
            month = parseInt(parts[2], 10) - 1;
        } else {
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
        }
        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }
    return dateStr;
}

function renderCategoryFilters(articles) {
    const container = document.getElementById('categoryFilters');
    if (!container) return;

    // Collect all unique categories that have at least 1 article
    const catMap = new Map();
    const catCounts = {};

    (articles || []).forEach(art => {
        if (art.keywords && Array.isArray(art.keywords)) {
            art.keywords.forEach(kw => {
                const clean = (kw || '').trim();
                if (clean && clean.toLowerCase() !== 'published') {
                    const lower = clean.toLowerCase();
                    if (!catMap.has(lower)) {
                        catMap.set(lower, clean);
                    }
                    catCounts[lower] = (catCounts[lower] || 0) + 1;
                }
            });
        }
    });

    const activeCategories = Array.from(catMap.entries())
        .filter(([lower]) => catCounts[lower] > 0)
        .map(([, orig]) => orig)
        .sort((a, b) => a.localeCompare(b));

    // Determine current active filter to preserve active selection if possible
    const currentActiveBtn = container.querySelector('.filterBtn.active');
    const currentCategory = currentActiveBtn ? currentActiveBtn.getAttribute('data-category') : 'all';

    let html = `<button type="button" class="filterBtn ${currentCategory === 'all' || !activeCategories.some(c => c.toLowerCase() === currentCategory.toLowerCase()) ? 'active' : ''}" data-category="all">All</button>`;
    
    activeCategories.forEach(cat => {
        const isActive = currentCategory && currentCategory.toLowerCase() === cat.toLowerCase();
        html += `<button type="button" class="filterBtn ${isActive ? 'active' : ''}" data-category="${cat.replace(/"/g, '&quot;')}">${cat}</button>`;
    });

    container.innerHTML = html;
    setupCategoryFilters();
}

function initDownsideCategoryBar() {
    const categoryBar = document.getElementById('categoryFilters');
    const contentSec = document.getElementById('content');
    if (!categoryBar || !contentSec) return;

    const isMobileOrTablet = () => window.innerWidth <= 1024;

    if ('IntersectionObserver' in window) {
        if (downsideCategoryBarObserver) {
            downsideCategoryBarObserver.disconnect();
        }

        downsideCategoryBarObserver = new IntersectionObserver((entries) => {
            if (!isMobileOrTablet()) {
                categoryBar.classList.remove('downsideBarActive');
                return;
            }
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    categoryBar.classList.add('downsideBarActive');
                } else {
                    categoryBar.classList.remove('downsideBarActive');
                }
            });
        }, {
            root: null,
            threshold: 0.05,
            rootMargin: "-20px 0px -20px 0px"
        });

        downsideCategoryBarObserver.observe(contentSec);
    }
}

window.addEventListener('resize', () => {
    const categoryBar = document.getElementById('categoryFilters');
    if (categoryBar && window.innerWidth > 1024) {
        categoryBar.classList.remove('downsideBarActive');
    }
});

function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll('.filterBtn');
    if (!filterButtons.length) return;

    const allBtn = Array.from(filterButtons).find(btn => btn.getAttribute('data-category') === 'all');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');

            // Center clicked filter pill nicely inside category scroll container
            try {
                button.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            } catch (e) {}

            if (!category || category === 'all') {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                if (allBtn) allBtn.classList.add('active');
                renderLatestArticles(articlesData);
                return;
            }

            // Single category selection: if already active, toggle off to 'All'
            if (button.classList.contains('active')) {
                button.classList.remove('active');
                if (allBtn) allBtn.classList.add('active');
                renderLatestArticles(articlesData);
                return;
            }

            // Otherwise, deactivate ALL buttons and activate only this one
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const selectedCat = category.toLowerCase();
            const filtered = articlesData.filter(article =>
                article.keywords && article.keywords.some(k => k.toLowerCase() === selectedCat)
            );
            renderLatestArticles(filtered);
        });
    });

    initDownsideCategoryBar();
}

function renderHeroCompanion(articles) {
    const container = document.getElementById('companionList');
    if (!container) return;

    // Show/hide the "Edit Picks" settings button for admins/editors
    const editBtn = document.getElementById('editPicksBtn');
    if (editBtn) {
        editBtn.style.display = (typeof DB !== 'undefined' && DB.isAdmin && DB.isAdmin()) ? 'inline-flex' : 'none';
    }

    if (!articles || !articles.length) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.45); padding: 28px 16px; font-size: 13px; text-align: center;">No editorial picks available yet.</p>';
        return;
    }

    // Build a lookup map of all articles by id (handles both numeric and string ids)
    const allArticlesMap = {};
    articles.forEach(a => { allArticlesMap[String(a.id)] = a; });

    // Resolve editorial picks from DB
    let pickIds = [];
    if (typeof DB !== 'undefined' && DB.getEditorialPicks) {
        pickIds = DB.getEditorialPicks();
    }

    // Map picks to article objects
    let featured = pickIds
        .map(id => allArticlesMap[String(id)])
        .filter(Boolean);

    // Backfill with available articles if fewer than 3 picks found
    if (featured.length < 3) {
        const usedIds = new Set(featured.map(a => String(a.id)));
        for (const art of articles) {
            if (featured.length >= 3) break;
            if (!usedIds.has(String(art.id))) {
                featured.push(art);
                usedIds.add(String(art.id));
            }
        }
    }

    if (!featured.length) {
        container.innerHTML = '<p style="color: rgba(255,255,255,0.45); padding: 28px 16px; font-size: 13px; text-align: center;">No editorial picks available yet.</p>';
        return;
    }

    container.innerHTML = featured.map((art, idx) => {
        const rankNum = String(idx + 1).padStart(2, '0');
        const category = (art.keywords && art.keywords[0]) || 'Analysis';
        const readTime = art.readTime ? `${art.readTime} min read` : '4 min read';
        const href = `article.html?id=${encodeURIComponent(art.id)}`;

        return `
            <a href="${href}" class="companionCard">
                <div class="companionRank">${rankNum}</div>
                <div class="companionBody">
                    <div class="companionMetaRow">
                        <span class="companionTag">${category}</span>
                        <span class="companionReadTime">${readTime}</span>
                    </div>
                    <h3 class="companionTitle">${art.title}</h3>
                    <p class="companionAuthor">By ${art.author || 'Editorial Staff'}</p>
                </div>
            </a>
        `;
    }).join('');
}

// Re-render companion when editorial picks are saved
document.addEventListener('editorialPicksUpdated', () => {
    if (typeof articlesData !== 'undefined' && articlesData.length) {
        renderHeroCompanion(articlesData);
    }
});

// Re-render articles and hero slider when Supabase cloud data arrives
document.addEventListener('cloudDataSynced', () => {
    console.log('⚡ Supabase cloud sync completed - refreshing homepage feed...');
    if (typeof initializeArticles === 'function' && typeof baselineArticles !== 'undefined') {
        initializeArticles(baselineArticles);
    }
});

// Render dynamic team members (Ali Mert Bayar + all assigned Co-Founders)
function renderTeamMembers() {
    const container = document.getElementById('teamMembers');
    if (!container) return;

    let coFounders = [];
    if (typeof DB !== 'undefined' && DB.getCoFounders) {
        coFounders = DB.getCoFounders();
    }
    if (!coFounders || coFounders.length === 0) {
        coFounders = [
            {
                name: 'Ali Mert Bayar',
                avatar: 'images/mert_img.png',
                role: 'Co-Founder'
            },
            {
                name: 'Ceren Onursal',
                avatar: null,
                role: 'Co-Founder'
            }
        ];
    }

    container.innerHTML = coFounders.map(member => {
        const name = member.name || 'Ali Mert Bayar';
        const cleanLower = name.trim().toLowerCase();
        const isAliMert = cleanLower === 'ali mert bayar';
        const isCeren = cleanLower === 'ceren onursal';

        const profileHref = `profile.html?author=${encodeURIComponent(name)}`;
        const roleText = member.role || 'Co-Founder';
        const initialChar = name.trim().charAt(0).toUpperCase() || 'C';

        // Retrieve socials from author profile or defaults
        const authorProfile = (typeof DB !== 'undefined' && DB.getAuthorProfile) ? DB.getAuthorProfile(name) : null;
        
        let igVal = (authorProfile && authorProfile.instagram) || member.instagram || (isAliMert ? 'https://www.instagram.com/ali_mert_bayar/' : (isCeren ? 'https://www.instagram.com/ceren.onursal/' : ''));
        let liVal = (authorProfile && authorProfile.linkedin) || member.linkedin || (isAliMert ? 'https://www.linkedin.com/in/ali-mert-bayar/' : (isCeren ? 'https://www.linkedin.com/in/ceren-onursal/' : ''));
        let emVal = (authorProfile && (authorProfile.publicEmail || authorProfile.email)) || member.email || (isAliMert ? 'mert.bayar.200807@gmail.com' : (isCeren ? 'cerenonursal2008@gmail.com' : ''));

        let igHref = igVal ? (igVal.startsWith('http') ? igVal : `https://instagram.com/${igVal.replace(/^@/, '')}`) : (isAliMert ? 'https://www.instagram.com/ali_mert_bayar/' : (isCeren ? 'https://www.instagram.com/ceren.onursal/' : ''));
        let liHref = liVal ? (liVal.startsWith('http') ? liVal : `https://linkedin.com/in/${liVal.replace(/^@/, '')}`) : (isAliMert ? 'https://www.linkedin.com/in/ali-mert-bayar/' : (isCeren ? 'https://www.linkedin.com/in/ceren-onursal/' : ''));
        let emHref = emVal ? (emVal.startsWith('mailto:') ? emVal : `mailto:${emVal}`) : (isAliMert ? 'mailto:mert.bayar.200807@gmail.com' : (isCeren ? 'mailto:cerenonursal2008@gmail.com' : ''));

        let memberAvatar = member.avatar;
        if (memberAvatar && (memberAvatar.includes('orthaxis.jpg') || memberAvatar.includes('orthaxis.png'))) {
            memberAvatar = null;
        }

        let imgHtml = '';
        if (memberAvatar) {
            imgHtml = `<img class="memberImage" src="${memberAvatar}" alt="${name}" onerror="this.outerHTML='<div class=\\'memberImage memberImageFallback\\'>${initialChar}</div>'">`;
        } else if (isAliMert) {
            imgHtml = `<img class="memberImage" src="images/mert_img.png" alt="${name}">`;
        } else {
            imgHtml = `<div class="memberImage memberImageFallback">${initialChar}</div>`;
        }

        return `
            <div class="teamMember">
                <a href="${profileHref}" class="memberImageLink" title="View ${name}'s Profile">
                    ${imgHtml}
                </a>
                <a href="${profileHref}" style="text-decoration: none; color: inherit;" title="View ${name}'s Profile">
                    <h2>${name}</h2>
                </a>
                <p class="memberRoleRow"><span class="memberRoleBadge">${roleText}</span></p>
                <div class="socialIcons">
                    <a href="${igHref}" target="_blank" rel="noopener noreferrer" title="${name}'s Instagram"><img src="images/instagram logo.png" alt="instagram" class="social-icon"></a>
                    <a href="${liHref}" target="_blank" rel="noopener noreferrer" title="${name}'s LinkedIn"><img src="images/linkedin logo.png" alt="linkedin" class="social-icon"></a>
                    <a href="${emHref}" title="Email ${name}"><img src="images/email logo.png" alt="email" class="social-icon"></a>
                </div>
            </div>
        `;
    }).join('');
}

// Automatically re-render team cards when a Co-Founder role is assigned
document.addEventListener('coFoundersUpdated', () => {
    renderTeamMembers();
});

// Setup Contact Form submissions connected to DB notifications
function setupContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    // Remove obsolete inline onsubmit
    form.removeAttribute('onsubmit');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const nameInput = document.getElementById('contactName');
        const emailInput = document.getElementById('contactEmail');
        const subjectInput = document.getElementById('contactSubject');
        const messageInput = document.getElementById('contactMessage');

        const name = nameInput ? nameInput.value : '';
        const email = emailInput ? emailInput.value : '';
        const subject = subjectInput ? subjectInput.value : '';
        const message = messageInput ? messageInput.value : '';

        if (typeof DB !== 'undefined' && DB.submitContactMessage) {
            const result = DB.submitContactMessage({ name, email, subject, message });
            if (result.success) {
                showContactFeedback('success', result.message || 'Thank you! Your message has been sent to our leadership team.');
                form.reset();
            } else {
                showContactFeedback('error', result.error || 'Failed to send message. Please fill out all required fields.');
            }
        } else {
            showContactFeedback('success', 'Thank you for reaching out! We will get back to you soon.');
            form.reset();
        }
    });
}

function showContactFeedback(type, text) {
    const form = document.getElementById('contactForm');
    if (!form) return;

    let alertBox = document.getElementById('contactFeedbackAlert');
    if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'contactFeedbackAlert';
        form.parentNode.insertBefore(alertBox, form);
    }

    alertBox.className = `contactFeedbackBanner ${type}`;
    alertBox.innerHTML = `
        <span class="feedbackIcon">${type === 'success' ? '✓' : '⚠️'}</span>
        <span>${text}</span>
    `;
    alertBox.style.display = 'flex';
    alertBox.style.opacity = '1';

    setTimeout(() => {
        if (alertBox) {
            alertBox.style.transition = 'opacity 0.4s ease';
            alertBox.style.opacity = '0';
            setTimeout(() => {
                alertBox.style.display = 'none';
                alertBox.style.opacity = '1';
            }, 400);
        }
    }, 6000);
}


// In-page smooth scrolling for header, sidebar, and footer navigation links
function initSmoothScrollLinks() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#' || targetId.length < 2) return;

            if (targetId === '#mainContent' || targetId === '#top') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (window.history && window.history.pushState) {
                    window.history.pushState(null, null, targetId);
                }
                return;
            }

            try {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    if (window.history && window.history.pushState) {
                        window.history.pushState(null, null, targetId);
                    }
                }
            } catch (err) {
                // If invalid selector, fallback to default behavior
            }
        });
    });
}

function initAppEnhancements() {
    initSmoothScrollLinks();
    initDownsideCategoryBar();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAppEnhancements);
} else {
    initAppEnhancements();
}