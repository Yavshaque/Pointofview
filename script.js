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

let currentIndex = 0;
let articlesData = [];
let slideInterval = null;

const DEFAULT_ARTICLES = [
    {
        id: 0,
        title: "Demographic collapse to the formation of new racial classes?",
        author: "Ali Mert Bayar",
        date: "2026-16-9",
        image: "images/spanish colonisation.png",
        readTime: 5,
        description: "The Spanish and Portuguese monarchies' pursuit of short-term wealth during the Age of Exploration had profound and far-reaching consequences. This quest for riches, driven by the desire for gold, silver, and other valuable resources, led to a series of events that reshaped societies across the globe.",
        body: "The Spanish and Portuguese monarchies' pursuit of short-term wealth during the Age of Exploration had profound and far-reaching consequences. This quest for riches, driven by the desire for gold, silver, and other valuable resources, led to a series of events that reshaped societies across the globe.\n\nUpon arriving in the Americas, European powers encountered established empires and indigenous populations. Through warfare, forced labor systems such as the encomienda, and crucially, the introduction of Old World pathogens like smallpox, measles, and typhus, native populations suffered unprecedented demographic collapse.\n\nIn response to labor shortages and the desire to maintain extractive economies in silver mines and sugar plantations, imperial powers turned to the transatlantic slave trade. This convergence of indigenous, European, and African populations under stratified colonial systems gradually gave rise to intricate socio-racial classification hierarchies, notably the casta system.\n\nThese structures not only dictated social mobility, taxation, and legal rights in colonial Latin America, but established enduring socioeconomic inequalities that persisted long after the collapse of imperial rule.",
        keywords: ["History", "World"],
        bibliography: "Crosby, Alfred W. (1972). The Columbian Exchange: Biological and Cultural Consequences of 1492. Greenwood Publishing Group.\nLockhart, James, & Schwartz, Stuart B. (1983). Early Latin America: A History of Colonial Spanish America and Brazil. Cambridge University Press.\nCook, Noble David (1998). Born to Die: Disease and New World Conquest, 1492–1650. Cambridge University Press."
    },
    {
        id: 1,
        title: "Mercantilism and the Global Silver Trade",
        author: "Ali Mert Bayar",
        date: "2026-16-9",
        image: "images/spanish colonisation.png",
        readTime: 4,
        description: "How the flow of silver from Potosí transformed European monarchies, altered international trade balances with Ming dynasty China, and spurred early modern global capitalism.",
        body: "During the sixteenth and seventeenth centuries, the mountain of Potosí in Upper Peru yielded silver in quantities unimaginable to earlier generations. Under mercantilist economic doctrine, European powers measured sovereign strength by their bullion reserves.\n\nHowever, the sudden influx of precious metals triggered the infamous Price Revolution across Europe, eroding wages and inflating commodity prices. Simultaneously, silver became the lifeblood of Pacific trade via the Manila Galleons, flowing directly into China where Ming fiscal reforms demanded tax payments in pure silver.\n\nThis global circuit of wealth stimulated early financial markets, joint-stock enterprises, and maritime insurance systems, demonstrating that the globalized economy began far earlier than the Industrial Revolution.",
        keywords: ["Economy", "World"],
        bibliography: "Flynn, Dennis O., & Giráldez, Arturo (1995). Born with a 'Silver Spoon': The Origin of World Trade in 1571. Journal of World History, 6(2), 201-221.\nFrank, Andre Gunder (1998). ReORIENT: Global Economy in the Asian Age. University of California Press.\nElliott, John H. (2006). Empires of the Atlantic World: Britain and Spain in America 1492–1830. Yale University Press."
    },
    {
        id: 2,
        title: "Racial classes and social stratification in colonial societies",
        author: "Ceren Onursal",
        date: "2026-16-9",
        image: "images/orthaxis.jpg",
        readTime: 5,
        description: "This quest for riches, driven by the desire for gold, silver, and other valuable resources, led to a series of events that reshaped societies across the globe.",
        body: "Colonial expansion did not merely extract resources; it radically restructured human relationships. In the Spanish viceroyalties, colonial authorities sought to categorize and regulate the emerging multi-ethnic population through legal codes and artistic representations known as casta paintings.\n\nThese detailed depictions illustrated families of mixed heritage—peninsulares, criollos, mestizos, mulattos, and indios—each assigned distinct societal roles and privileges. While intended to enforce rigid hierarchies, everyday life often saw individuals negotiating, challenging, and subverting these boundaries through marriage, commerce, and legal appeals.\n\nUnderstanding these mechanisms provides vital insights into modern institutional patterns across the Americas and how cultural identities coalesce in times of rapid geopolitical upheaval.",
        keywords: ["Culture", "World"],
        bibliography: "Katzew, Ilona (2004). Casta Painting: Images of Race in Eighteenth-Century Mexico. Yale University Press.\nSeed, Patricia (1988). To Love, Honor, and Obey in Colonial Mexico: Conflicts over Marriage Choice, 1574–1821. Stanford University Press."
    },
    {
        id: 3,
        title: "Technological and Cultural Exchanges in Maritime Empires",
        author: "Ceren Onursal",
        date: "2026-16-9",
        image: "images/orthaxis.jpg",
        readTime: 4,
        description: "Navigational breakthroughs, astrolabes, and the blending of architectural traditions that emerged along transatlantic and transpacific trade networks.",
        body: "The expansion of maritime empires relied on a synthesis of technological knowledge from across the Mediterranean, Arab, and Asian worlds. Caravel designs, lateen sails, and refined astrolabes allowed navigators to traverse open oceans with newfound reliability.\n\nAlongside navigation, cultural syncretism flourished in port cities and inland capitals. Baroque architecture incorporated indigenous motifs, while botanical exchanges fundamentally altered agricultural practices and diets across Europe, Africa, and the Americas.\n\nExamining these exchanges highlights how modern globalization is rooted in centuries of reciprocal—though often coerced—cultural and scientific integration.",
        keywords: ["Culture", "Technology"],
        bibliography: "Parry, J. H. (1981). The Age of Reconnaissance: Discovery, Exploration, and Settlement, 1450 to 1650. University of California Press.\nChaudhuri, K. N. (1985). Trade and Civilisation in the Indian Ocean: An Economic History from the Rise of Islam to 1750. Cambridge University Press."
    }
];

const baselineArticles = (typeof window !== 'undefined' && Array.isArray(window.ARTICLES_DATABASE) && window.ARTICLES_DATABASE.length > 0)
    ? window.ARTICLES_DATABASE
    : DEFAULT_ARTICLES;

function initializeArticles(baseData) {
    const map = new Map();
    baselineArticles.forEach(a => map.set(String(a.id), a));
    if (Array.isArray(baseData)) {
        baseData.forEach(a => map.set(String(a.id), a));
    }
    const defaultData = Array.from(map.values());

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

    const deletedIds = (typeof DB !== 'undefined' && DB.getDeletedArticleIds) ? DB.getDeletedArticleIds() : new Set();
    const customIds = new Set(customArticles.map(a => String(a.id)));
    const filteredBase = defaultData.filter(a => !customIds.has(String(a.id)));
    articlesData = [...customArticles, ...filteredBase].filter(a => !deletedIds.has(String(a.id)));

    if (articlesData.length === 0) {
        articlesData = [...baselineArticles];
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

// Immediate initial render using baseline synchronous articles
initializeArticles(baselineArticles);

// Also fetch base articles and merge with custom articles from database
fetch('articles.json')
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    })
    .then(data => {
        initializeArticles(data);
    })
    .catch(error => {
        // Safe fallback - articles already initialized from baseline
        console.info('articles.json fetch info:', error.message);
    });

function startAutoSlide() {
    if (slideInterval) clearInterval(slideInterval);
    slideInterval = setInterval(() => {
        if (!articlesData.length) return;
        currentIndex++;
        // If at the last article, loop back
        if (currentIndex >= articlesData.length) {
            currentIndex = 0;
        }
        updateDOM(currentIndex);
    }, 4000);
}

if (leftButton) {
    leftButton.addEventListener('click', () => {
        if (!articlesData.length) return;
        currentIndex = (currentIndex - 1 + articlesData.length) % articlesData.length;
        updateDOM(currentIndex);
        startAutoSlide();
    });
}

if (rightButton) {
    rightButton.addEventListener('click', () => {
        if (!articlesData.length) return;
        currentIndex = (currentIndex + 1) % articlesData.length;
        updateDOM(currentIndex);
        startAutoSlide();
    });
}

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
    if (lower === 'ceren onursal') {
        return 'images/orthaxis.jpg';
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
    if (!articlesData[index]) return;
    const currentArticle = articlesData[index];
    const articleHref = `article.html?id=${encodeURIComponent(currentArticle.id)}`;

    // Update hero image, title, and description
    if (thumbnailImage) {
        thumbnailImage.src = currentArticle.image;
        thumbnailImage.alt = currentArticle.title;
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
        articleDesc.textContent = currentArticle.description;
    }

    // Update author and read time parameters
    if (parametersDiv) {
        const authorName = currentArticle.author || 'Ali Mert Bayar';
        const avatarHtml = renderMiniAvatarHTML(authorName, 'heroAuthorAvatar');
        parametersDiv.innerHTML = `
            <div class="infoCard heroAuthorPill" id="infoCard">
                <a href="profile.html?author=${encodeURIComponent(authorName)}" class="heroAuthorLink" title="View ${authorName}'s profile">
                    ${avatarHtml}
                    <span class="heroAuthorName">By ${authorName}</span>
                </a>
            </div>
            <p class="infoCard" id="readTime">${currentArticle.readTime} min read</p>
        `;
    }

    // Update category keywords, edit pill, and delete pill
    if (keyInfoDiv) {
        let keyHtml = '';
        if (currentArticle.keywords && Array.isArray(currentArticle.keywords)) {
            keyHtml += currentArticle.keywords
                .filter(keyword => keyword.toLowerCase() !== 'published')
                .slice(0, 2)
                .map(keyword => `<p class="infoCard">${keyword}</p>`)
                .join('');
        }
        if (typeof DB !== 'undefined' && DB.canEditArticle && DB.canEditArticle(currentArticle)) {
            keyHtml += `<a href="publish.html?edit=${encodeURIComponent(currentArticle.id)}" class="heroEditPill" title="Edit this article">
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

    articles.forEach(article => {
        const articleCard = document.createElement('div');
        articleCard.classList.add('articleCard');

        const articleHref = `article.html?id=${encodeURIComponent(article.id)}`;
        const canEdit = typeof DB !== 'undefined' && DB.canEditArticle && DB.canEditArticle(article);
        const authorName = article.author || 'Ali Mert Bayar';
        const avatarHtml = renderMiniAvatarHTML(authorName, 'cardAuthorAvatar');

        const editPill = canEdit ? `
            <a href="publish.html?edit=${encodeURIComponent(article.id)}" class="cardEditLink" title="Edit this article">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
            </a>
        ` : '';

        const mainCategory = (article.keywords && article.keywords.find(k => k.toLowerCase() !== 'published')) || 'World';
        const readTime = article.readTime || 4;

        articleCard.innerHTML = `
            <a href="${articleHref}" style="text-decoration: none; color: inherit; display: flex; flex-direction: column; flex: 1;">
                <div class="articleCardImage">
                    <img src="${article.image}" alt="${article.title}">
                </div>
                <div class="articleCardContent">
                    <div class="cardMeta"><span class="cardMetaCat">${mainCategory}</span><span class="cardMetaSep">·</span>${readTime} min read</div>
                    <h2>${article.title}</h2>
                    <p>${article.description}</p>
                </div>
            </a>
            <div class="articleCardFooter" style="margin-top: auto;">
                <div class="cardAuthorRow">
                    <a href="profile.html?author=${encodeURIComponent(authorName)}" class="cardAuthorLink" title="View ${authorName}'s profile">
                        ${avatarHtml}
                        <span class="cardAuthorName">${authorName}</span>
                    </a>
                </div>
                ${editPill ? `<div class="cardEditWrapper">${editPill}</div>` : ''}
            </div>
        `;

        latestArticlesContainer.appendChild(articleCard);
    });
}

function deleteArticlePrompt(id) {
    const target = articlesData.find(a => String(a.id) === String(id));
    const displayName = (target && target.title) ? `"${target.title}"` : 'this article';
    if (confirm(`Are you sure you want to permanently delete ${displayName}? This action cannot be undone.`)) {
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

function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll('.filterBtn');
    if (!filterButtons.length) return;

    const allBtn = Array.from(filterButtons).find(btn => btn.getAttribute('data-category') === 'all');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');

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
}

function renderHeroCompanion(articles) {
    const container = document.getElementById('companionList');
    if (!container || !articles || !articles.length) return;

    // Show/hide the "Edit Picks" settings button for admins/editors
    const editBtn = document.getElementById('editPicksBtn');
    if (editBtn) {
        editBtn.style.display = (typeof DB !== 'undefined' && DB.isAdmin && DB.isAdmin()) ? 'inline-flex' : 'none';
    }

    // Build a lookup map of all articles by id (handles both numeric and string ids)
    const allArticlesMap = {};
    articles.forEach(a => { allArticlesMap[String(a.id)] = a; });

    // Resolve editorial picks from DB (falls back to [1, 2, 3])
    let pickIds = ['1', '2', '3'];
    if (typeof DB !== 'undefined' && DB.getEditorialPicks) {
        pickIds = DB.getEditorialPicks();
    }

    // Map picks to article objects, fall back to next available article if not found
    let featured = pickIds
        .map(id => allArticlesMap[String(id)])
        .filter(Boolean);

    // Backfill if fewer than 3 picks found
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
                avatar: 'images/orthaxis.jpg',
                role: 'Co-Founder'
            }
        ];
    }

    container.innerHTML = coFounders.map(member => {
        const name = member.name || 'Ali Mert Bayar';
        const isAliMert = name.trim().toLowerCase() === 'ali mert bayar';
        const profileHref = `profile.html?author=${encodeURIComponent(name)}`;
        const roleText = member.role || 'Co-Founder';
        const emailLink = member.email ? `mailto:${member.email}` : 'mailto:contact@articlewebsite.com';
        const initialChar = name.trim().charAt(0).toUpperCase() || 'C';

        let imgHtml = '';
        if (member.avatar) {
            imgHtml = `<img class="memberImage" src="${member.avatar}" alt="${name}" onerror="this.outerHTML='<div class=\\'memberImage memberImageFallback\\'>${initialChar}</div>'">`;
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
                    <a href="#" title="Instagram"><img src="images/instagram logo.png" alt="instagram" class="social-icon"></a>
                    <a href="#" title="LinkedIn"><img src="images/linkedin logo.png" alt="linkedin" class="social-icon"></a>
                    <a href="${emailLink}" title="Email"><img src="images/email logo.png" alt="email" class="social-icon"></a>
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSmoothScrollLinks);
} else {
    initSmoothScrollLinks();
}