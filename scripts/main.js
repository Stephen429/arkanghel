// --- CONFIGURATION URLS ---
const ARTICLES_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=0&single=true&output=tsv';
const ARCHIVES_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=2103034515&single=true&output=tsv';
const EDITORIAL_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=1368403362&single=true&output=tsv';

// Initialize Lucide Icons
if (window.lucide) lucide.createIcons();

// --- 🌙 SMART DARK MODE ENGINE ---
function initTheme() {
    const savedTheme = localStorage.getItem('theme_preference');
    const hour = new Date().getHours();
    const isNight = hour >= 18 || hour < 6;

    if (savedTheme === 'dark' || (!savedTheme && isNight)) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.setAttribute('data-lucide', document.body.classList.contains('dark-mode') ? 'moon' : 'sun');
        if (window.lucide) lucide.createIcons();
    }
}

const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme_preference', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        updateThemeIcon();
    });
}
initTheme();

// --- 📱 MOBILE DRAWER & BACKDROP HANDLERS ---
const menuToggle = document.getElementById('menu-toggle');
const menuClose = document.getElementById('menu-close');
const mobilePanel = document.getElementById('mobile-panel');
const mobileOverlay = document.getElementById('mobile-overlay');

function openMobileMenu() {
    if (mobilePanel) mobilePanel.classList.add('open');
    if (mobileOverlay) mobileOverlay.classList.add('open');
}

function closeMobileMenu() {
    if (mobilePanel) mobilePanel.classList.remove('open');
    if (mobileOverlay) mobileOverlay.classList.remove('open');
}

if (menuToggle) menuToggle.addEventListener('click', openMobileMenu);
if (menuClose) menuClose.addEventListener('click', closeMobileMenu);
if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileMenu);

// --- 📅 DATE FORMATTER ENGINE ---
function formatFilipinoDate(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;

    const months = [
        "Enero", "Pebrero", "Marso", "Abril", "Mayo", "Hunyo", 
        "Hulyo", "Agosto", "Setyembre", "Oktubre", "Nobyembre", "Disyembre"
    ];
    
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Utility Helper for HTML Escaping
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// --- 🖼️ IMAGE FETCHER FROM INDIVIDUAL PAGES ---
async function fetchArticleThumbnail(articleUrl) {
    if (!articleUrl || articleUrl === '#' || articleUrl.startsWith('http')) return '';
    try {
        const response = await fetch(articleUrl);
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        const imageBox = doc.querySelector('.article-image-box img');
        if (imageBox && imageBox.src) {
            return imageBox.getAttribute('src');
        }
        return '';
    } catch (e) {
        return '';
    }
}

// --- 📰 ARTICLES & HOMEPAGE ENGINE ---
async function loadSheetData() {
    const carouselContainer = document.getElementById('carousel-slides');
    if (!carouselContainer) return; // Exit kung wala sa Homepage

    try {
        const res = await fetch(ARTICLES_TSV_URL);
        const text = await res.text();
        
        const lines = text.split('\n').map(row => row.split('\t'));
        let rawArticles = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].length >= 3) {
                const [type, dateStr, headline, lead, link, author] = lines[i];
                if (type && headline) {
                    rawArticles.push({
                        type: type.trim().toUpperCase(),
                        dateFormatted: formatFilipinoDate(dateStr ? dateStr.trim() : ''),
                        dateObj: dateStr ? new Date(dateStr.trim()) : new Date(0),
                        headline: headline.trim(),
                        lead: lead ? lead.trim() : '',
                        link: link ? link.trim() : '#',
                        author: author ? author.trim() : 'Patnugutan',
                        image: ''
                    });
                }
            }
        }

        // Sort by Date (Most Recent First)
        rawArticles.sort((a, b) => b.dateObj - a.dateObj);

        // Fetch thumbnails for top articles
        const articles = await Promise.all(rawArticles.map(async (art) => {
            if (art.link && art.link !== '#') {
                const fetchedImg = await fetchArticleThumbnail(art.link);
                if (fetchedImg) art.image = fetchedImg;
            }
            return art;
        }));

        renderTopStories(articles);
        renderCategoryFeeds(articles);

        hideCarouselLoader();

    } catch (err) {
        console.error("Failed to load Google Sheets TSV Data:", err);
        hideCarouselLoader();
    }
}

function hideCarouselLoader() {
    const carouselLoader = document.getElementById('carousel-loader');
    const carouselContent = document.getElementById('carousel-main-content');
    if (carouselLoader && carouselContent) {
        carouselLoader.classList.add('fade-out');
        carouselContent.classList.add('loaded');
    }
}

function renderTopStories(articles) {
    if (!articles.length) return;
    
    const selectedHeadliners = articles.slice(0, Math.min(4, articles.length));
    const container = document.getElementById('carousel-slides');
    const indicators = document.getElementById('carousel-indicators');
    if (!container || !indicators) return;

    container.innerHTML = '';
    indicators.innerHTML = '';

    selectedHeadliners.forEach((item, index) => {
        const slide = document.createElement('a');
        slide.href = item.link;
        slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
        
        const bgStyle = item.image 
            ? `linear-gradient(180deg, rgba(8,3,4,0.2) 0%, rgba(8,3,4,0.9) 100%), url('${item.image}') center/cover no-repeat` 
            : `linear-gradient(180deg, rgba(8,3,4,0.1) 0%, rgba(8,3,4,0.95) 100%), #4a000b`;
        
        slide.style.background = bgStyle;
        
        let badgeText = item.type;
        if (item.type === 'NEWS') badgeText = 'Balita';
        else if (item.type === 'OPINION') badgeText = 'Opinyon';
        else if (item.type === 'FEATURE') badgeText = 'Lathalain';
        else if (item.type === 'SCI-TECH') badgeText = 'Ag-Tek';
        else if (item.type === 'SPORTS') badgeText = 'Isports';

        slide.innerHTML = `
            <div class="carousel-content">
                <span class="badge">${badgeText}</span>
                <h2 class="carousel-title">${escapeHtml(item.headline)}</h2>
                <p class="carousel-lead">${escapeHtml(item.lead)}</p>
                <div class="meta-info">
                    <span><i data-lucide="user" style="width:13px;height:13px;"></i> ${escapeHtml(item.author)}</span>
                    ${item.dateFormatted ? `<span><i data-lucide="calendar" style="width:13px;height:13px;"></i> ${item.dateFormatted}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        indicators.appendChild(dot);
    });

    if (window.lucide) lucide.createIcons();
    startCarousel();
}

let currentSlide = 0;
function startCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length <= 1) return;

    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        if (dots[currentSlide]) dots[currentSlide].classList.remove('active');
        
        currentSlide = (currentSlide + 1) % slides.length;
        
        slides[currentSlide].classList.add('active');
        if (dots[currentSlide]) dots[currentSlide].classList.add('active');
    }, 7000);
}

function renderCategoryFeeds(articles) {
    const map = {
        'NEWS': { id: 'feed-news', label: 'Balita' },
        'BALITA': { id: 'feed-news', label: 'Balita' },
        'OPINION': { id: 'feed-opinion', label: 'Opinyon' },
        'OPINYON': { id: 'feed-opinion', label: 'Opinyon' },
        'FEATURE': { id: 'feed-feature', label: 'Lathalain' },
        'LATHALAIN': { id: 'feed-feature', label: 'Lathalain' },
        'SCI-TECH': { id: 'feed-scitech', label: 'Ag-Tek' },
        'AG-TEK': { id: 'feed-scitech', label: 'Ag-Tek' },
        'SPORTS': { id: 'feed-sports', label: 'Isports' },
        'ISPORTS': { id: 'feed-sports', label: 'Isports' }
    };

    const feedIds = ['feed-news', 'feed-opinion', 'feed-feature', 'feed-scitech', 'feed-sports'];
    feedIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    const categorized = {};
    articles.forEach(item => {
        const mappingInfo = map[item.type];
        if (mappingInfo) {
            const targetFeedKey = mappingInfo.id;
            if (!categorized[targetFeedKey]) categorized[targetFeedKey] = [];
            item.displayType = mappingInfo.label;
            categorized[targetFeedKey].push(item);
        }
    });

    const MAX_ARTICLES_PER_CATEGORY = 4;

    feedIds.forEach(feedId => {
        let items = categorized[feedId] || [];
        items = items.slice(0, MAX_ARTICLES_PER_CATEGORY);
        const container = document.getElementById(feedId);
            
            if (container && items.length > 0) {
                items.forEach((item, index) => {
                    if (index === 0) {
                        // Large Featured Card Layout
                        const card = document.createElement('a');
                        card.href = item.link;
                        card.className = 'featured-card';
                        
                        const imgHTML = item.image 
                            ? `<img src="${item.image}" alt="${item.headline}" style="width:100%; height:100%; object-fit:cover;">`
                            : `<i data-lucide="image" style="width:36px;height:36px; color:var(--text-muted);"></i>`;

                        card.innerHTML = `
                            <div class="featured-img-container">
                                ${imgHTML}
                            </div>
                            <div>
                                <div class="meta-info" style="color:var(--maroon-light); font-weight:600; margin-bottom:6px;">
                                    <span>${item.displayType}</span>
                                    ${item.dateFormatted ? `• <span>${item.dateFormatted}</span>` : ''}
                                </div>
                                <h3>${item.headline}</h3>
                                <p>${item.lead}</p>
                                <span class="author-tag">Akda ni ${item.author}</span>
                            </div>
                        `;
                        container.appendChild(card);
                    } else {
                        // Compact Card Layout
                        const card = document.createElement('a');
                        card.href = item.link;
                        card.className = 'compact-card';

                        const imgHTML = item.image 
                            ? `<img src="${item.image}" alt="${item.headline}" style="width:100%; height:100%; object-fit:cover;">`
                            : `<i data-lucide="file-text" style="width:24px;height:24px; color:var(--text-muted);"></i>`;

                        card.innerHTML = `
                            <div class="compact-img-container">
                                ${imgHTML}
                            </div>
                            <div>
                                <h3>${item.headline}</h3>
                                <p>${item.lead}</p>
                                <span class="author-tag">Akda ni ${item.author}</span>
                            </div>
                        `;
                        container.appendChild(card);
                    }
                });
            }
    });
    
    if (window.lucide) lucide.createIcons();
}

// --- 📚 ARCHIVES PAGE ENGINE ---
let allArchivesList = [];
const articlesPerPage = 4;
let currentPage = 1;

async function initArchivesPage() {
    const container = document.getElementById('archives-container');
    if (!container) return; // Exit kung wala sa Archives Page

    try {
        const response = await fetch(ARCHIVES_TSV_URL);
        if (!response.ok) throw new Error('Nabigo sa pagkonekta sa Archives Google Sheets.');

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));

        allArchivesList = [];
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (cols.length >= 5 && cols[0].trim()) {
                allArchivesList.push({
                    publication: cols[0].trim(),
                    volume: cols[1].trim(),
                    period: cols[2].trim(),
                    thumbnail: cols[3].trim(),
                    link: cols[4].trim()
                });
            }
        }
        renderPage(1);
    } catch (error) {
        console.error("Error fetching archives:", error);
        container.innerHTML = `
            <div class="state-container">
                <div class="state-title">Nabigo sa Pagkonekta</div>
                <div class="state-description">Nagkaroon ng problema sa pagkuha ng datos ng silid-aklatan.</div>
            </div>
        `;
    }
}

function renderPage(page) {
    currentPage = page;
    const container = document.getElementById('archives-container');
    const paginationContainer = document.getElementById('pagination-container');
    if (!container) return;

    if (!allArchivesList || allArchivesList.length === 0) {
        container.innerHTML = `
            <div class="state-container">
                <div class="state-title">Walang Nakitang Arkibo</div>
                <div class="state-description">Wala pang nailalagay na mga lumang isyu sa kasalukuyan.</div>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (page - 1) * articlesPerPage;
    const paginatedItems = allArchivesList.slice(startIndex, startIndex + articlesPerPage);

    container.innerHTML = '';
    paginatedItems.forEach(item => {
        const thumbPath = item.thumbnail.startsWith('http') || item.thumbnail.startsWith('assets/') 
            ? item.thumbnail 
            : `assets/archive/${item.thumbnail}`;

        const card = document.createElement('a');
        card.href = item.link;
        card.className = 'archive-card';
        card.innerHTML = `
            <div class="archive-thumbnail-container">
                <img src="${escapeHtml(thumbPath)}" alt="${escapeHtml(item.publication)}" class="archive-thumbnail" onerror="this.src='assets/arkanghel.png'">
            </div>
            <div class="archive-content">
                <div>
                    <div class="archive-publication">${escapeHtml(item.publication)}</div>
                    <div class="archive-volume">${escapeHtml(item.volume)}</div>
                    <div class="archive-period">${escapeHtml(item.period)}</div>
                </div>
                <div class="archive-action">
                    <span>Tingnan ang Isyu</span> <i data-lucide="arrow-right" style="width:16px; height:16px;"></i>
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    if (paginationContainer) {
        const totalPages = Math.ceil(allArchivesList.length / articlesPerPage);
        if (totalPages > 1) {
            let paginationHTML = '';
            for (let p = 1; p <= totalPages; p++) {
                paginationHTML += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="renderPage(${p})">${p}</button>`;
            }
            paginationContainer.innerHTML = paginationHTML;
        } else {
            paginationContainer.innerHTML = '';
        }
    }

    if (window.lucide) lucide.createIcons();
}
window.renderPage = renderPage;

// --- 🏷️ CATEGORY PAGES ENGINE ---
let categoryState = {
    articles: [],
    currentPage: 1,
    perPage: 10,
    targetCategory: ''
};

async function initCategoryPage() {
    const listContainer = document.getElementById('articles-list');
    if (!listContainer) return;

    // Determine target category dynamically from HTML header or filename
    const titleElement = document.querySelector('.category-title') || document.querySelector('.page-header h1');
    const detectedTitle = titleElement ? titleElement.textContent.trim().toUpperCase() : '';
    
    categoryState.targetCategory = detectedTitle;

    try {
        const response = await fetch(ARTICLES_TSV_URL);
        if (!response.ok) throw new Error('Nabigo sa pagkonekta.');

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));

        if (rows.length <= 1) {
            listContainer.innerHTML = `<div style="text-align:center; padding: 3rem; color:var(--text-muted);">Walang nakitang artikulo sa kategoryang ito.</div>`;
            return;
        }

        const headers = rows[0].map(h => h.trim().toUpperCase());
        const typeIdx = headers.indexOf('TYPE');
        const dateIdx = headers.indexOf('DATE');
        const titleIdx = headers.indexOf('HEADLINE/TITLE');
        const leadIdx = headers.indexOf('LEAD SENTENCE');
        const linkIdx = headers.indexOf('LINK');
        const authorIdx = headers.indexOf('AUTHOR');

        let rawArticles = [];

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (cols.length >= headers.length) {
                const typeVal = cols[typeIdx] ? cols[typeIdx].trim().toUpperCase() : '';

                if (isCategoryMatch(typeVal, categoryState.targetCategory)) {
                    const rawDate = cols[dateIdx] ? cols[dateIdx].trim() : '';
                    rawArticles.push({
                        type: typeVal,
                        date: formatFilipinoDate(rawDate),
                        title: cols[titleIdx] ? cols[titleIdx].trim() : 'Walang Pamagat',
                        lead: cols[leadIdx] ? cols[leadIdx].trim() : 'Mag-click upang basahin ang buong detalye ng artikulong ito.',
                        link: cols[linkIdx] ? cols[linkIdx].trim() : '#',
                        author: cols[authorIdx] ? cols[authorIdx].trim() : 'Patnugutan',
                        image: ''
                    });
                }
            }
        }

        // Parallel thumbnail fetching
        categoryState.articles = await Promise.all(rawArticles.map(async (art) => {
            if (art.link && art.link !== '#') {
                const fetchedImg = await fetchArticleThumbnail(art.link);
                if (fetchedImg) art.image = fetchedImg;
            }
            return art;
        }));

        renderCategoryPage(1);

    } catch (error) {
        console.error('Error sa pag-load ng kategorya:', error);
        listContainer.innerHTML = `
            <div style="text-align:center; padding: 3rem; color:var(--maroon-light);">
                <strong>Paumanhin, hindi ma-load ang mga artikulo sa kasalukuyan.</strong><br>
                <span style="font-size:0.85rem; color:var(--text-muted);">Suriin ang iyong koneksyon.</span>
            </div>`;
    }
}

function isCategoryMatch(tsvCategory, pageCategory) {
    if (!tsvCategory || !pageCategory) return true;

    const target = pageCategory.toUpperCase();
    
    if (target.includes('BALITA')) {
        return tsvCategory === 'NEWS' || tsvCategory === 'BALITAAN' || tsvCategory === 'BALITA';
    }
    if (target.includes('OPINYON') || target.includes('OPINION')) {
        return tsvCategory === 'OPINION' || tsvCategory === 'OPINYON';
    }
    if (target.includes('LATHALAIN') || target.includes('FEATURE')) {
        return tsvCategory === 'FEATURE' || tsvCategory === 'LATHALAIN';
    }
    if (target.includes('AGHAM') || target.includes('AG-TEK') || target.includes('SCI-TECH')) {
        return tsvCategory === 'AGHAM' || tsvCategory === 'AG-TEK' || tsvCategory === 'SCI-TECH';
    }
    if (target.includes('ISPORTS') || target.includes('SPORTS')) {
        return tsvCategory === 'SPORTS' || tsvCategory === 'ISPORTS';
    }

    return tsvCategory === target;
}

function renderCategoryPage(page) {
    categoryState.currentPage = page;
    const listContainer = document.getElementById('articles-list');
    const paginationContainer = document.getElementById('pagination-controls');

    if (!listContainer) return;

    if (categoryState.articles.length === 0) {
        listContainer.innerHTML = `<div style="text-align:center; padding: 3rem; color:var(--text-muted);">Walang nakitang artikulo sa kategoryang ito.</div>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (page - 1) * categoryState.perPage;
    const endIndex = startIndex + categoryState.perPage;
    const paginatedArticles = categoryState.articles.slice(startIndex, endIndex);

    let htmlContent = '';
    paginatedArticles.forEach(art => {
        const imageHTML = art.image 
            ? `<img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.title)}" class="featured-img-container">` 
            : '';
        
        const cardStyle = art.image ? '' : 'grid-template-columns: 1fr;';

        htmlContent += `
            <a href="${escapeHtml(art.link)}" class="compact-art-card" style="${cardStyle}">
                <div class="compact-info">
                    <div class="compact-meta">
                        <span>${escapeHtml(art.date)}</span>
                        <span>•</span>
                        <span>Ulat ni ${escapeHtml(art.author)}</span>
                    </div>
                    <h2 class="compact-headline">${escapeHtml(art.title)}</h2>
                    <p class="compact-excerpt">${escapeHtml(art.lead)}</p>
                </div>
                ${imageHTML}
            </a>
        `;
    });

    listContainer.innerHTML = htmlContent;
}
    
// --- 👥 EDITORIAL STAFF PAGE ENGINE ---
async function fetchEditorialStaff() {
    const container = document.getElementById('editorial-container');
    if (!container) return; // Exit kung wala sa Editorial Page

    try {
        const response = await fetch(EDITORIAL_TSV_URL); // Ginagamit na ang tamang GID Sheet
        if (!response.ok) throw new Error('Hindi nakuhang basahin ang Google Sheets data.');
        
        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));
        
        container.innerHTML = ''; 
        let gridWrapperOpen = false;
        let htmlContent = '';

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length === 0) continue;

            const name = cols[0] ? cols[0].trim() : '';
            const position = cols[1] ? cols[1].trim() : '';
            const photoUrl = cols[2] ? cols[2].trim() : '';

            if (!name && !position && !photoUrl) continue;

            // Section Header detection (Merged Rows)
            const isMergedHeader = name && (!position && !photoUrl);

            if (isMergedHeader) {
                if (gridWrapperOpen) {
                    htmlContent += `</div>`;
                    gridWrapperOpen = false;
                }
                htmlContent += `
                    <h2 class="editorial-section-title">
                        <i data-lucide="bookmark" style="width:20px; height:20px; color:var(--maroon-light);"></i> 
                        ${escapeHtml(name)}
                    </h2>
                `;
            } else {
                if (!gridWrapperOpen) {
                    htmlContent += `<div class="staff-grid">`;
                    gridWrapperOpen = true;
                }

                let avatarHTML = position ? position.substring(0, 3).toUpperCase() : 'STAFF';
                if (photoUrl) {
                    const imgPath = photoUrl.startsWith('http') || photoUrl.startsWith('assets/') ? photoUrl : `assets/staff/${photoUrl}`;
                    avatarHTML = `<img src="${escapeHtml(imgPath)}" alt="${escapeHtml(name)}">`;
                }

                htmlContent += `
                    <div class="staff-card">
                        <div class="avatar-container">${avatarHTML}</div>
                        <div class="staff-role">${escapeHtml(position)}</div>
                        <div class="staff-name">${escapeHtml(name || 'Bakante')}</div>
                    </div>
                `;
            }
        }

        if (gridWrapperOpen) htmlContent += `</div>`;
        container.innerHTML = htmlContent;
        if (window.lucide) lucide.createIcons();

    } catch (err) {
        console.error("Failed to load editorial staff:", err);
        container.innerHTML = `
            <div class="state-container">
                <div class="state-title">Hindi Ma-load ang Talaan ng Patnugutan</div>
                <div class="state-description">Nagkaroon ng problema sa pagkuha ng datos mula sa Google Sheets.</div>
            </div>
        `;
    }
}

const urlParams = new URLSearchParams(window.location.search);
        const authorNameParam = urlParams.get('name') ? decodeURIComponent(urlParams.get('name')).trim() : '';

async function initAuthorPage() {
            const mainArea = document.getElementById('main-content-area');

            if (!authorNameParam) {
                mainArea.innerHTML = `
                    <div class="state-container">
                        <div class="state-title">Walang Tinukoy na May-Akda</div>
                        <div class="state-description">Ang pahinang ito ay nangangailangan ng wastong pangalan sa link upang maipakita ang profile at mga akda.</div>
                    </div>
                `;
                return;
            }

            mainArea.innerHTML = `
                <div class="page-header">
                    <span class="page-kicker">May-Akda / Manunulat</span>
                    <h1 id="author-name-heading">${escapeHtml(authorNameParam)}</h1>
                </div>

                <h2 class="section-title">Mga Inilathalang Akda</h2>
                
                <div class="articles-grid" id="author-articles-container">
                    <div class="state-container" style="grid-column: span 2; margin-top: 0;">
                        <div class="state-title">Kinukuha ang mga ulat...</div>
                        <div class="state-description">Mangyaring maghintay habang hinahanap namin ang mga naisulat na akda.</div>
                    </div>
                </div>
            `;

            try {
                const response = await fetch(ARTICLES_TSV_URL);
                if (!response.ok) throw new Error('Nabigo sa pagkonekta.');

                const tsvText = await response.text();
                const rows = tsvText.split('\n').map(row => row.split('\t'));

                if (rows.length === 0) throw new Error('Walang laman ang data.');

                // Pagkuha ng mga column index (Column 1 = index 0 para sa Category, Column 5 = index 4 para sa Link/Slug, atbp.)
                const colsHeader = rows[0].map(h => h.trim().toLowerCase());
                
                const categoryIdx = 0; // Column 1
                const titleIdx = colsHeader.findIndex(h => h.includes('title') || h.includes('pamagat'));
                const authorIdx = colsHeader.findIndex(h => h.includes('author') || h.includes('may-akda') || h.includes('manunulat'));
                const dateIdx = colsHeader.findIndex(h => h.includes('date') || h.includes('petsa'));
                const slugIdx = 4; // Column 5

                let authorArticles = [];

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i];
                    if (authorIdx !== -1 && cols[authorIdx]) {
                        const rowAuthor = cols[authorIdx].trim();
                        if (rowAuthor.toLowerCase() === authorNameParam.toLowerCase()) {
                            authorArticles.push({
                                category: cols[categoryIdx] ? cols[categoryIdx].trim() : 'Pangkalahatan',
                                title: titleIdx !== -1 && cols[titleIdx] ? cols[titleIdx].trim() : 'Walang Pamagat',
                                date: dateIdx !== -1 && cols[dateIdx] ? formatDateToFilipino(cols[dateIdx]) : '',
                                link: cols[slugIdx] ? cols[slugIdx].trim() : '#'
                            });
                        }
                    }
                }

                const container = document.getElementById('author-articles-container');
                if (authorArticles.length > 0) {
                    container.innerHTML = '';
                    authorArticles.forEach(art => {
                        const card = document.createElement('a');
                        card.href = art.link;
                        card.className = 'article-card';
                        card.innerHTML = `
                            <div>
                                <div class="article-category">${escapeHtml(art.category)}</div>
                                <div class="article-title">${escapeHtml(art.title)}</div>
                            </div>
                            <div class="article-meta">
                                <span>${escapeHtml(art.date)}</span>
                                <span class="article-read-text">Basahin ang ulat</span>
                            </div>
                        `;
                        container.appendChild(card);
                    });
                } else {
                    container.innerHTML = `
                        <div class="state-container" style="grid-column: span 2; margin-top: 0;">
                            <div class="state-title">Walang Nakitang Akda</div>
                            <div class="state-description">Wala pang naitalang nailathalang ulat o artikulo mula kay <strong>${escapeHtml(authorNameParam)}</strong> sa kasalukuyan.</div>
                        </div>
                    `;
                }

            } catch (error) {
                console.error("Error fetching author articles:", error);
                const container = document.getElementById('author-articles-container');
                if (container) {
                    container.innerHTML = `
                        <div class="state-container" style="grid-column: span 2; margin-top: 0;">
                            <div class="state-title">Nabigo sa Pagkonekta</div>
                            <div class="state-description">Nagkaroon ng problema sa pagkuha ng mga datos. Mangyaring subukang muli mamaya.</div>
                        </div>
                    `;
                }
            }
        }

        function escapeHtml(str) {
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
            }

// --- INITIALIZE ALL ENGINES SAFELY ---
document.addEventListener('DOMContentLoaded', () => {
    loadSheetData();
    initArchivesPage();
    initAuthorPage();
    initCategoryPage();
    fetchEditorialStaff();
});
