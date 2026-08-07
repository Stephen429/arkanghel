// ==========================================================================
// Ang Arkanghel - Master Application Controller (main.js)
// ==========================================================================

/* --------------------------------------------------------------------------
   1. Configuration & Data Sources
   -------------------------------------------------------------------------- */
const CONFIG = {
    ARTICLES_TSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=0&single=true&output=tsv',
    ARCHIVES_TSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=2103034515&single=true&output=tsv'
};

/* --------------------------------------------------------------------------
   2. Common Utilities
   -------------------------------------------------------------------------- */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDateToFilipino(dateInput) {
    if (!dateInput) return '';
    const cleanStr = dateInput.trim();
    const parts = cleanStr.split(/[-/]/);
    
    let dateObj;
    if (parts.length === 3) {
        if (parts[0].length === 4) {
            dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
        } else {
            dateObj = new Date(parts[2], parts[0] - 1, parts[1]);
        }
    } else {
        dateObj = new Date(cleanStr);
    }

    if (isNaN(dateObj.getTime())) return cleanStr;

    const monthsTagalog = [
        "Enero", "Pebrero", "Marso", "Abril", "Mayo", "Hunyo",
        "Hulyo", "Agosto", "Setyembre", "Oktubre", "Nobyembre", "Disyembre"
    ];

    return `${monthsTagalog[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
}

async function fetchArticleThumbnail(articleUrl) {
    if (!articleUrl || articleUrl === '#' || articleUrl === '') return '';
    try {
        const response = await fetch(articleUrl);
        if (!response.ok) return '';
        const htmlText = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        
        const imageBox = doc.querySelector('.article-image-box');
        if (imageBox) {
            const imgTag = imageBox.querySelector('img');
            if (imgTag && imgTag.src) return imgTag.src;
        }
        return '';
    } catch (e) {
        return '';
    }
}

/* --------------------------------------------------------------------------
   3. Global Navigation & Theme
   -------------------------------------------------------------------------- */
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
        const isDarkMode = document.body.classList.contains('dark-mode');
        icon.setAttribute('data-lucide', isDarkMode ? 'moon' : 'sun');
        if (window.lucide) lucide.createIcons();
    }
}

function setupGlobalNavigation() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDarkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme_preference', isDarkMode ? 'dark' : 'light');
            updateThemeIcon();
        });
    }

    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const mobilePanel = document.getElementById('mobile-panel');

    if (menuToggle && mobilePanel) {
        menuToggle.addEventListener('click', () => mobilePanel.classList.add('open'));
    }
    if (menuClose && mobilePanel) {
        menuClose.addEventListener('click', () => mobilePanel.classList.remove('open'));
    }

    // Dynamic active page link highlighting
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.desktop-nav a, .mobile-nav-links a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && (href === currentPath || (currentPath === '' && href === 'index.html'))) {
            link.classList.add('active-link');
        }
    });

    initTheme();
}

/* --------------------------------------------------------------------------
   4. Index / Homepage Controller
   -------------------------------------------------------------------------- */
async function initHomePage() {
    const homepageGrids = document.querySelectorAll('.category-preview-grid, [data-category]');
    const featuredContainer = document.getElementById('featured-articles-container') || document.getElementById('homepage-feed');
    
    if (homepageGrids.length === 0 && !featuredContainer) return;

    try {
        const response = await fetch(CONFIG.ARTICLES_TSV);
        if (!response.ok) return;

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));
        if (rows.length <= 1) return;

        const headers = rows[0].map(h => h.trim().toUpperCase());
        const typeIdx = headers.indexOf('TYPE');
        const dateIdx = headers.indexOf('DATE');
        const titleIdx = headers.indexOf('HEADLINE/TITLE');
        const leadIdx = headers.indexOf('LEAD SENTENCE');
        const linkIdx = headers.indexOf('LINK');
        const authorIdx = headers.indexOf('AUTHOR');

        const articlesByCategory = {};
        const allArticles = [];

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (cols.length >= headers.length) {
                const typeVal = cols[typeIdx] ? cols[typeIdx].trim().toUpperCase() : '';
                const item = {
                    type: typeVal,
                    title: cols[titleIdx] ? cols[titleIdx].trim() : 'Walang Pamagat',
                    lead: cols[leadIdx] ? cols[leadIdx].trim() : '',
                    link: cols[linkIdx] ? cols[linkIdx].trim() : '#',
                    date: formatDateToFilipino(cols[dateIdx] ? cols[dateIdx].trim() : ''),
                    author: cols[authorIdx] ? cols[authorIdx].trim() : 'Patnugutan'
                };

                if (!articlesByCategory[typeVal]) articlesByCategory[typeVal] = [];
                articlesByCategory[typeVal].push(item);
                allArticles.push(item);
            }
        }

        // Render category-specific grids
        homepageGrids.forEach(grid => {
            const cat = grid.getAttribute('data-category');
            if (!cat) return;

            const categoryArticles = articlesByCategory[cat.toUpperCase()] || [];
            if (categoryArticles.length === 0) {
                grid.innerHTML = `<div class="state-container" style="grid-column: 1/-1;"><div class="state-description">Walang kasalukuyang ulat sa kategoryang ito.</div></div>`;
                return;
            }

            const topArticles = categoryArticles.slice(0, 2);
            let html = '';
            topArticles.forEach(art => {
                html += `
                    <a href="${escapeHtml(art.link)}" class="article-card">
                        <div>
                            <div class="article-category">${escapeHtml(cat)}</div>
                            <h3 class="article-title">${escapeHtml(art.title)}</h3>
                            <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.4;">${escapeHtml(art.lead)}</p>
                        </div>
                        <div class="article-meta">
                            <span>${escapeHtml(art.date)}</span>
                            <span class="article-read-text">Basahin &rarr;</span>
                        </div>
                    </a>
                `;
            });
            grid.innerHTML = html;
        });

        // Render general featured feed if element exists
        if (featuredContainer && allArticles.length > 0) {
            let feedHtml = '';
            allArticles.slice(0, 4).forEach(art => {
                feedHtml += `
                    <a href="${escapeHtml(art.link)}" class="article-card">
                        <div>
                            <div class="article-category">${escapeHtml(art.type || 'Balita')}</div>
                            <h3 class="article-title">${escapeHtml(art.title)}</h3>
                            <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.4;">${escapeHtml(art.lead)}</p>
                        </div>
                        <div class="article-meta">
                            <span>${escapeHtml(art.date)} • ${escapeHtml(art.author)}</span>
                            <span class="article-read-text">Basahin &rarr;</span>
                        </div>
                    </a>
                `;
            });
            featuredContainer.innerHTML = feedHtml;
        }

    } catch (e) {
        console.error("Error loading homepage contents:", e);
    }
}

/* --------------------------------------------------------------------------
   5. Category Pages Controller (Balitaan, Opinyon, Lathalain, etc.)
   -------------------------------------------------------------------------- */
let categoryState = { articles: [], currentPage: 1, perPage: 10, targetCategory: '' };

async function initCategoryPage() {
    const listContainer = document.getElementById('articles-list');
    if (!listContainer) return;

    const titleElement = document.querySelector('.category-title') || document.querySelector('.page-header h1');
    const detectedTitle = titleElement ? titleElement.textContent.trim().toUpperCase() : '';
    categoryState.targetCategory = detectedTitle;

    try {
        const response = await fetch(CONFIG.ARTICLES_TSV);
        if (!response.ok) throw new Error('Nabigo sa pagkonekta.');

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));
        if (rows.length <= 1) {
            listContainer.innerHTML = `<div class="state-container"><div class="state-title">Walang Nakitang Artikulo</div></div>`;
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
                    rawArticles.push({
                        type: typeVal,
                        date: formatDateToFilipino(cols[dateIdx] ? cols[dateIdx].trim() : ''),
                        title: cols[titleIdx] ? cols[titleIdx].trim() : 'Walang Pamagat',
                        lead: cols[leadIdx] ? cols[leadIdx].trim() : '',
                        link: cols[linkIdx] ? cols[linkIdx].trim() : '#',
                        author: cols[authorIdx] ? cols[authorIdx].trim() : 'Patnugutan',
                        image: ''
                    });
                }
            }
        }

        categoryState.articles = await Promise.all(rawArticles.map(async (art) => {
            if (art.link && art.link !== '#') {
                const fetchedImg = await fetchArticleThumbnail(art.link);
                if (fetchedImg) art.image = fetchedImg;
            }
            return art;
        }));

        renderCategoryPage(1);

    } catch (error) {
        listContainer.innerHTML = `<div class="state-container"><div class="state-title">Paumanhin</div><div class="state-description">Hindi ma-load ang mga artikulo sa kasalukuyan.</div></div>`;
    }
}

function isCategoryMatch(tsvCategory, pageCategory) {
    if (!tsvCategory || !pageCategory) return true;
    const target = pageCategory.toUpperCase();
    if (target.includes('BALITA')) return ['NEWS', 'BALITAAN', 'BALITA'].includes(tsvCategory);
    if (target.includes('OPINYO') || target.includes('OPINION')) return ['OPINION', 'OPINYON'].includes(tsvCategory);
    if (target.includes('LATHALAIN') || target.includes('FEATURE')) return ['FEATURE', 'LATHALAIN'].includes(tsvCategory);
    if (target.includes('AGHAM') || target.includes('AG-TEK') || target.includes('SCITECH')) return ['AGHAM', 'AG-TEK', 'SCITECH'].includes(tsvCategory);
    if (target.includes('ISPORTS') || target.includes('SPORTS')) return ['SPORTS', 'ISPORTS'].includes(tsvCategory);
    return tsvCategory === target;
}

function renderCategoryPage(page) {
    categoryState.currentPage = page;
    const listContainer = document.getElementById('articles-list');
    const paginationContainer = document.getElementById('pagination-controls');
    if (!listContainer) return;

    if (categoryState.articles.length === 0) {
        listContainer.innerHTML = `<div class="state-container"><div class="state-title">Walang Nakitang Artikulo</div></div>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (page - 1) * categoryState.perPage;
    const paginatedArticles = categoryState.articles.slice(startIndex, startIndex + categoryState.perPage);

    let htmlContent = '';
    paginatedArticles.forEach(art => {
        const imageHTML = art.image ? `<img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.title)}" class="compact-thumb">` : '';
        const cardStyle = art.image ? '' : 'grid-template-columns: 1fr;';

        htmlContent += `
            <a href="${escapeHtml(art.link)}" class="compact-card" style="${cardStyle}">
                <div class="compact-info">
                    <div class="compact-meta">
                        <span>${escapeHtml(art.date)}</span>
                        <span>•</span>
                        <span>Mula kay ${escapeHtml(art.author)}</span>
                    </div>
                    <h2 class="compact-headline">${escapeHtml(art.title)}</h2>
                    <p class="compact-excerpt">${escapeHtml(art.lead)}</p>
                </div>
                ${imageHTML}
            </a>
        `;
    });

    listContainer.innerHTML = htmlContent;

    if (paginationContainer) {
        if (categoryState.articles.length > categoryState.perPage) {
            const totalPages = Math.ceil(categoryState.articles.length / categoryState.perPage);
            let paginationHTML = '';
            for (let p = 1; p <= totalPages; p++) {
                paginationHTML += `<button class="page-btn ${p === categoryState.currentPage ? 'active' : ''}" onclick="renderCategoryPage(${p})">${p}</button>`;
            }
            paginationContainer.innerHTML = paginationHTML;
        } else {
            paginationContainer.innerHTML = '';
        }
    }
    if (window.lucide) lucide.createIcons();
}

/* --------------------------------------------------------------------------
   6. Writer Profile Controller (manunulat.html)
   -------------------------------------------------------------------------- */
function initAuthorPage() {
    const authorContainer = document.getElementById('author-profile-container') || 
                            document.getElementById('main-content-area') || 
                            document.querySelector('main.author-page');

    if (!authorContainer && !window.location.href.includes('manunulat')) return;

    const targetDiv = authorContainer || document.querySelector('main');
    if (!targetDiv) return;

    const urlParams = new URLSearchParams(window.location.search);
    const authorQuery = (urlParams.get('author') || 'tristan').toLowerCase();

    const authorDatabase = {
        'tristan': {
            name: 'Tristan Lhoyd Tabligan',
            role: 'Punong Patnugot / Editorial Writer',
            bio: 'Mag-aaral na mamamahayag mula sa Lydia D. Villangca Trade School. Punong Patnugot ng Ang Arkanghel at pinarangalan ng Student Journalist Impact Award.',
            articles: [
                { title: 'Project GLASS: Ang Hamon ng Transparansya sa SSLG 2026', category: 'Opinyon', date: 'Mayo 10, 2026', readTime: '4 min read', link: '#' },
                { title: '11th Moving-Up Ceremony ng LDVTS, Matagumpay na Naisagawa', category: 'Balita', date: 'Abril 28, 2026', readTime: '3 min read', link: '#' }
            ]
        },
        'gift': {
            name: 'Gift O. Amparo',
            role: 'Protocol Officer / Contributor',
            bio: 'Kasapi ng Lupon ng Patnugutan at opisyal ng SSLG na nag-aambag ng mga ulat at artikulo ukol sa pamumuno at kaganapan sa paaralan.',
            articles: [
                { title: 'Pagtataguyod ng Disiplina at Pananagutan sa Pamayang Pangkampus', category: 'Lathalain', date: 'Abril 15, 2026', readTime: '5 min read', link: '#' }
            ]
        }
    };

    const authorData = authorDatabase[authorQuery] || authorDatabase['tristan'];
    const initials = authorData.name.split(' ').map(n => n[0]).join('').substring(0, 2);

    targetDiv.innerHTML = `
        <section class="author-header-card">
            <div class="author-avatar">${initials.toUpperCase()}</div>
            <div class="author-info">
                <span class="author-role-badge">${escapeHtml(authorData.role)}</span>
                <h1 class="author-name">${escapeHtml(authorData.name)}</h1>
                <p class="author-bio">${escapeHtml(authorData.bio)}</p>
            </div>
        </section>

        <section>
            <h2 class="author-articles-heading">
                <i data-lucide="pen-tool" style="color:var(--maroon-light); width:20px; height:20px;"></i>
                Mga Inilathalang Akda
            </h2>
            <div class="articles-grid">
                ${authorData.articles.map(art => `
                    <a href="${escapeHtml(art.link)}" class="article-card">
                        <div>
                            <div class="article-category">${escapeHtml(art.category)}</div>
                            <h3 class="article-title">${escapeHtml(art.title)}</h3>
                        </div>
                        <div class="article-meta">
                            <span>${escapeHtml(art.date)}</span>
                            <span class="article-read-text">${escapeHtml(art.readTime)}</span>
                        </div>
                    </a>
                `).join('')}
            </div>
        </section>
    `;

    if (window.lucide) lucide.createIcons();
}

/* --------------------------------------------------------------------------
   7. Editorial Board Controller (patnugutan.html)
   -------------------------------------------------------------------------- */
function initPatnugutanPage() {
    const container = document.getElementById('editorial-board-container') || 
                      document.getElementById('patnugutan-container') || 
                      document.getElementById('editorial-container');
                      
    if (!container && !window.location.href.includes('patnugutan')) return;
    const targetDiv = container || document.querySelector('main');
    if (!targetDiv) return;

    const boardMembers = [
        { name: 'Tristan Lhoyd Tabligan', role: 'Punong Patnugot', grade: 'Baitang 10', slug: 'tristan' },
        { name: 'Gift O. Amparo', role: 'Pangalawang Patnugot', grade: 'Baitang 10', slug: 'gift' },
        { name: 'Kasapi ng Patnugutan', role: 'Patnugot sa Balita', grade: 'Baitang 10', slug: '#' },
        { name: 'Kasapi ng Patnugutan', role: 'Patnugot sa Lathalain', grade: 'Baitang 10', slug: '#' },
        { name: 'Kasapi ng Patnugutan', role: 'Patnugot sa Agham at Teknolohiya', grade: 'Baitang 10', slug: '#' },
        { name: 'Kasapi ng Patnugutan', role: 'Patnugot sa Isports', grade: 'Baitang 10', slug: '#' },
        { name: 'Gng. Gemalyn S. Cruz', role: 'Tagapayo / Modulator', grade: 'Kagawaran ng Filipino', slug: '#' }
    ];

    let gridHtml = `
        <div class="page-header">
            <span class="page-kicker">Lupong Patnugutan</span>
            <h1>Ang Mga Mamamahayag</h1>
            <p style="color:var(--text-muted); margin-top:0.5rem; font-family:var(--font-google-sans);">
                Ang opisyal na lupon ng mga mamamahayag ng Ang Arkanghel sa Lydia D. Villangca Trade School para sa Taong Panuruan 2025–2026.
            </p>
        </div>
        <div class="articles-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
    `;

    boardMembers.forEach(member => {
        const initials = member.name.split(' ').map(n => n[0]).join('').substring(0, 2);
        const profileLink = member.slug !== '#' ? `manunulat.html?author=${member.slug}` : '#';

        gridHtml += `
            <a href="${profileLink}" class="article-card" style="text-align:center; align-items:center; padding: 2rem 1.5rem;">
                <div class="author-avatar" style="width:80px; height:80px; font-size:1.4rem; margin-bottom:1rem;">${initials.toUpperCase()}</div>
                <div class="article-category">${escapeHtml(member.role)}</div>
                <h3 class="article-title" style="margin-bottom:0.3rem;">${escapeHtml(member.name)}</h3>
                <span style="font-size:0.8rem; color:var(--text-muted); font-family:var(--font-google-sans);">${escapeHtml(member.grade)}</span>
            </a>
        `;
    });

    gridHtml += `</div>`;
    targetDiv.innerHTML = gridHtml;

    if (window.lucide) lucide.createIcons();
}

/* --------------------------------------------------------------------------
   8. About Page Controller (tungkol.html)
   -------------------------------------------------------------------------- */
function initAboutPage() {
    const container = document.getElementById('about-content') || 
                      document.getElementById('tungkol-container');

    if (!container && !window.location.href.includes('tungkol')) return;
    const targetDiv = container || document.querySelector('main');
    if (!targetDiv) return;

    targetDiv.innerHTML = `
        <div class="page-header">
            <span class="page-kicker">Tungkol Sa Pahayagan</span>
            <h1>Ang Arkanghel</h1>
        </div>

        <div class="content-box">
            <h2>Layunin at Pananaw</h2>
            <p style="color:var(--text); line-height:1.7; margin-bottom:1rem;">
                Ang <strong>Ang Arkanghel</strong> ay ang opisyal na pahayagang pampaaralan ng <strong>Lydia D. Villangca Trade School (LDVTS)</strong>. Layunin nitong magsilbing matapat, malaya, at makabuluhang boses ng mga mag-aaral at ng buong pamayang pangkampus.
            </p>
            <p style="color:var(--text); line-height:1.7;">
                Sa pamamagitan ng responsible at de-kalidad na pamamahayag sa Balita, Opinyon, Lathalain, Agham at Teknolohiya, at Isports, patuloy na itinaguyod ng pahayagan ang katotohanan, transparansya, at kahusayan sa pagsulat.
            </p>

            <div class="callout-box">
                <strong style="color:var(--maroon-main); display:block; margin-bottom:0.3rem;">Pamantayan sa Pamamahayag:</strong>
                "Matapat na Pagtatala, Mapanagutang Panulat, at Patuloy na Paglilingkod sa Pamayanan ng Paaralan."
            </div>
        </div>

        <div class="content-box">
            <h2>Kagawaran at Seksyon</h2>
            <ul style="list-style-type: square; padding-left: 1.2rem; color:var(--text-muted); line-height:1.8;">
                <li><strong>Balitaan:</strong> Mabilis at tumpak na ulat sa mga kaganapan sa LDVTS at pamayanan.</li>
                <li><strong>Opinyon:</strong> Mapanuring pananaw at kuro-kuro ukol sa mga napapanahong isyu ng mag-aaral.</li>
                <li><strong>Lathalain:</strong> Mga kwento ng inspirasyon, sining, at kultura ng paaralan.</li>
                <li><strong>Agham at Teknolohiya:</strong> Mga makabagong tuklas, pananaliksik, at kaalamang teknolohikal.</li>
                <li><strong>Isports:</strong> Mga balita at tampok na kwento sa mga palaro at atletang LDVTS.</li>
            </ul>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

/* --------------------------------------------------------------------------
   9. Archives Controller (aklatan.html / silid-aklatan)
   -------------------------------------------------------------------------- */
let allArchivesList = [];

async function initArchivesPage() {
    const container = document.getElementById('archives-container');
    if (!container) return;

    try {
        const response = await fetch(CONFIG.ARCHIVES_TSV);
        if (!response.ok) return;
        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));
        if (rows.length <= 1) return;

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
        renderArchivePage(1);
    } catch (e) {
        console.error("Error fetching archives:", e);
    }
}

function renderArchivePage(page) {
    const container = document.getElementById('archives-container');
    if (!container || allArchivesList.length === 0) return;

    const startIndex = (page - 1) * 4;
    const paginatedItems = allArchivesList.slice(startIndex, startIndex + 4);

    container.innerHTML = '';
    paginatedItems.forEach(item => {
        const card = document.createElement('a');
        card.href = item.link;
        card.className = 'archive-card';
        card.innerHTML = `
            <div class="archive-thumbnail-container">
                <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.publication)}" class="archive-thumbnail" onerror="this.src='assets/arkanghel.png'">
            </div>
            <div class="archive-content">
                <div>
                    <div class="archive-publication">${escapeHtml(item.publication)}</div>
                    <div class="archive-volume">${escapeHtml(item.volume)}</div>
                    <div class="archive-period">${escapeHtml(item.period)}</div>
                </div>
                <div class="archive-action">Tingnan ang Isyu &rarr;</div>
            </div>
        `;
        container.appendChild(card);
    });
}

/* --------------------------------------------------------------------------
   10. Master Initialization Loop
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    setupGlobalNavigation();
    if (window.lucide) lucide.createIcons();

    initHomePage();
    initCategoryPage();
    initAuthorPage();
    initPatnugutanPage();
    initAboutPage();
    initArchivesPage();
});
