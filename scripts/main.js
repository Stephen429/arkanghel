// ==========================================================================
// Ang Arkanghel - Master Application Controller (main.js)
// ==========================================================================

/* --------------------------------------------------------------------------
   1. Data Sources & Configuration
   -------------------------------------------------------------------------- */
const CONFIG = {
    ARTICLES_TSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=0&single=true&output=tsv',
    ARCHIVES_TSV: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=2103034515&single=true&output=tsv'
};

/* --------------------------------------------------------------------------
   2. Common Utilities & Shared Functions
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
            if (imgTag && imgTag.src) {
                return imgTag.src;
            }
        }
        return '';
    } catch (e) {
        console.error('Hindi nakuha ang larawan mula sa:', articleUrl, e);
        return '';
    }
}

/* --------------------------------------------------------------------------
   3. UI Features: Theme Toggle & Navigation Drawer
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

    initTheme();
}

/* --------------------------------------------------------------------------
   4. Universal Category Page Controller
   -------------------------------------------------------------------------- */
let categoryState = {
    articles: [],
    currentPage: 1,
    perPage: 10,
    targetCategory: ''
};

async function initCategoryPage() {
    const listContainer = document.getElementById('articles-list');
    if (!listContainer) return;

    const titleElement = document.querySelector('.category-title') || document.querySelector('.page-header h1');
    const detectedTitle = titleElement ? titleElement.textContent.trim().toUpperCase() : '';
    
    categoryState.targetCategory = detectedTitle;

    try {
        const response = await fetch(CONFIG.ARTICLES_TSV);
        if (!response.ok) throw new Error('Nabigo sa pagkonekta sa Google Sheets.');

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));

        if (rows.length <= 1) {
            listContainer.innerHTML = `<div class="state-container"><div class="state-title">Walang Nakitang Artikulo</div><div class="state-description">Walang nakitang artikulo sa kategoryang ito.</div></div>`;
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
                        date: formatDateToFilipino(rawDate),
                        title: cols[titleIdx] ? cols[titleIdx].trim() : 'Walang Pamagat',
                        lead: cols[leadIdx] ? cols[leadIdx].trim() : 'Mag-click upang basahin ang buong detalye ng artikulong ito.',
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
        console.error('Error sa pag-load ng kategorya:', error);
        listContainer.innerHTML = `
            <div class="state-container">
                <div class="state-title">Paumanhin</div>
                <div class="state-description">Hindi ma-load ang mga artikulo sa kasalukuyan. Suriin ang koneksyon o ang TSV URL ng Google Sheets.</div>
            </div>`;
    }
}

function isCategoryMatch(tsvCategory, pageCategory) {
    if (!tsvCategory || !pageCategory) return true;

    const target = pageCategory.toUpperCase();
    
    if (target.includes('BALITA')) {
        return tsvCategory === 'NEWS' || tsvCategory === 'BALITAAN' || tsvCategory === 'BALITA';
    }
    if (target.includes('OPINYO') || target.includes('OPINION')) {
        return tsvCategory === 'OPINION' || tsvCategory === 'OPINYON';
    }
    if (target.includes('LATHALAIN') || target.includes('FEATURE')) {
        return tsvCategory === 'FEATURE' || tsvCategory === 'LATHALAIN';
    }
    if (target.includes('AGHAM') || target.includes('AG-TEK') || target.includes('SCITECH')) {
        return tsvCategory === 'AGHAM' || tsvCategory === 'AG-TEK' || tsvCategory === 'SCITECH';
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
        listContainer.innerHTML = `<div class="state-container"><div class="state-title">Walang Nakitang Artikulo</div><div class="state-description">Walang nakitang artikulo sa kategoryang ito.</div></div>`;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (page - 1) * categoryState.perPage;
    const endIndex = startIndex + categoryState.perPage;
    const paginatedArticles = categoryState.articles.slice(startIndex, endIndex);

    let htmlContent = '';
    paginatedArticles.forEach(art => {
        const imageHTML = art.image 
            ? `<img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.title)}" class="compact-thumb">` 
            : '';
        
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

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
}

/* --------------------------------------------------------------------------
   5. Page Controller: Author Profile
   -------------------------------------------------------------------------- */
async function initAuthorPage() {
    const mainArea = document.getElementById('main-content-area');
    if (!mainArea) return;

    const urlParams = new URLSearchParams(window.location.search);
    const authorNameParam = urlParams.get('name') ? decodeURIComponent(urlParams.get('name')).trim() : '';

    if (!authorNameParam) {
        mainArea.innerHTML = `
            <div class="state-container">
                <div class="state-title">Walang Tinukoy na May-Akda</div>
                <div class="state-description">Ang pahinang ito ay nangangailangan ng structures na pangalan sa link.</div>
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
        <div class="compact-list" id="author-articles-container">
            <div class="state-container" style="margin-top: 0;">
                <div class="state-title">Kinukuha ang mga ulat...</div>
                <div class="state-description">Mangyaring maghintay habang hinahanap ang mga akda.</div>
            </div>
        </div>
    `;

    try {
        const response = await fetch(CONFIG.ARTICLES_TSV);
        if (!response.ok) throw new Error('Nabigo sa pagkonekta sa Google Sheets.');

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));

        if (rows.length === 0) throw new Error('Walang laman ang TSV data.');

        const headers = rows[0].map(h => h.trim().toUpperCase());
        const dateIdx = headers.indexOf('DATE');
        const titleIdx = headers.indexOf('HEADLINE/TITLE');
        const leadIdx = headers.indexOf('LEAD SENTENCE');
        const linkIdx = headers.indexOf('LINK');
        const authorIdx = headers.indexOf('AUTHOR');

        let rawArticles = [];
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (authorIdx !== -1 && cols[authorIdx]) {
                if (cols[authorIdx].trim().toLowerCase() === authorNameParam.toLowerCase()) {
                    rawArticles.push({
                        date: formatDateToFilipino(cols[dateIdx] ? cols[dateIdx].trim() : ''),
                        title: cols[titleIdx] ? cols[titleIdx].trim() : 'Walang Pamagat',
                        lead: cols[leadIdx] ? cols[leadIdx].trim() : '',
                        link: cols[linkIdx] ? cols[linkIdx].trim() : '#',
                        author: authorNameParam,
                        image: ''
                    });
                }
            }
        }

        const container = document.getElementById('author-articles-container');
        if (rawArticles.length > 0) {
            const authorArticles = await Promise.all(rawArticles.map(async (art) => {
                if (art.link && art.link !== '#') {
                    const fetchedImg = await fetchArticleThumbnail(art.link);
                    if (fetchedImg) art.image = fetchedImg;
                }
                return art;
            }));

            container.innerHTML = '';
            authorArticles.forEach(art => {
                const imageHTML = art.image 
                    ? `<img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.title)}" class="compact-thumb">` 
                    : '';
                const cardStyle = art.image ? '' : 'grid-template-columns: 1fr;';

                const card = document.createElement('a');
                card.href = art.link;
                card.className = 'compact-card';
                card.style.cssText = cardStyle;
                card.innerHTML = `
                    <div class="compact-info">
                        <div class="compact-meta">
                            <span>${escapeHtml(art.date)}</span>
                        </div>
                        <h2 class="compact-headline">${escapeHtml(art.title)}</h2>
                        <p class="compact-excerpt">${escapeHtml(art.lead)}</p>
                    </div>
                    ${imageHTML}
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = `
                <div class="state-container" style="margin-top: 0;">
                    <div class="state-title">Walang Nakitang Akda</div>
                    <div class="state-description">Wala pang naitalang nailathalang ulat mula kay <strong>${escapeHtml(authorNameParam)}</strong>.</div>
                </div>
            `;
        }

    } catch (error) {
        console.error("Error fetching author articles:", error);
        const container = document.getElementById('author-articles-container');
        if (container) {
            container.innerHTML = `
                <div class="state-container" style="margin-top: 0;">
                    <div class="state-title">Nabigo sa Pagkonekta</div>
                    <div class="state-description">Nagkaroon ng problema sa pagkuha ng mga datos.</div>
                </div>
            `;
        }
    }
}

/* --------------------------------------------------------------------------
   6. Page Controller: Archives / Silid-Aklatan
   -------------------------------------------------------------------------- */
let allArchivesList = [];
const archivesPerPage = 4;
let currentArchivePage = 1;

async function initArchivesPage() {
    const container = document.getElementById('archives-container');
    if (!container) return;

    try {
        const response = await fetch(CONFIG.ARCHIVES_TSV);
        if (!response.ok) throw new Error('Nabigo sa pagkonekta sa Archives Google Sheets.');

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));

        if (rows.length <= 1) {
            container.innerHTML = `
                <div class="state-container">
                    <div class="state-title">Walang Nakitang Isyu</div>
                    <div class="state-description">Wala pang nailagay na lumang isyu sa kasalukuyan.</div>
                </div>
            `;
            return;
        }

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

    } catch (error) {
        console.error("Error fetching archives:", error);
        container.innerHTML = `
            <div class="state-container">
                <div class="state-title">Nabigo sa Pagkonekta</div>
                <div class="state-description">Nagkaroon ng problema sa pagkuha ng mga datos ng silid-aklatan.</div>
            </div>
        `;
    }
}

function renderArchivePage(page) {
    currentArchivePage = page;
    const container = document.getElementById('archives-container');
    const paginationContainer = document.getElementById('pagination-container');

    if (!container) return;

    if (!allArchivesList || allArchivesList.length === 0) {
        container.innerHTML = `
            <div class="state-container">
                <div class="state-title">Walang Nakitang Arkibo</div>
                <div class="state-description">Wala pang nailagay na lumang isyu.</div>
            </div>
        `;
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    const startIndex = (page - 1) * archivesPerPage;
    const paginatedItems = allArchivesList.slice(startIndex, startIndex + archivesPerPage);

    container.innerHTML = '';
    paginatedItems.forEach(item => {
        const thumbPath = item.thumbnail.startsWith('assets/archive/') ? item.thumbnail : `assets/archive/${item.thumbnail}`;
        const card = document.createElement('a');
        card.href = item.link;
        card.className = 'archive-card';
        card.innerHTML = `
            <div class="archive-thumbnail-container">
                <img src="${escapeHtml(thumbPath)}" alt="${escapeHtml(item.publication)} - ${escapeHtml(item.volume)}" class="archive-thumbnail" onerror="this.src='assets/arkanghel.png'">
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
        if (allArchivesList.length > archivesPerPage) {
            const totalPages = Math.ceil(allArchivesList.length / archivesPerPage);
            let paginationHTML = '';
            
            for (let p = 1; p <= totalPages; p++) {
                paginationHTML += `<button class="page-btn ${p === currentArchivePage ? 'active' : ''}" onclick="renderArchivePage(${p})">${p}</button>`;
            }
            paginationContainer.innerHTML = paginationHTML;
        } else {
            paginationContainer.innerHTML = '';
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
}

/* --------------------------------------------------------------------------
   7. Application Initializer
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    setupGlobalNavigation();
    if (window.lucide) lucide.createIcons();

    initCategoryPage();
    initAuthorPage();
    initArchivesPage();
});
