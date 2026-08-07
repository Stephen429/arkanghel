const TSV_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=0&single=true&output=tsv';
const ARCHIVES_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=2103034515&single=true&output=tsv';

lucide.createIcons();

// 🌙 Smart Dark Mode Engine
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
        lucide.createIcons();
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

// Mobile Panel Handlers
const menuToggle = document.getElementById('menu-toggle');
const menuClose = document.getElementById('menu-close');
const mobilePanel = document.getElementById('mobile-panel');

if (menuToggle && mobilePanel) {
    menuToggle.addEventListener('click', () => mobilePanel.classList.add('open'));
}
if (menuClose && mobilePanel) {
    menuClose.addEventListener('click', () => mobilePanel.classList.remove('open'));
}

// Date Formatter Engine
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

// Image Fetcher mula sa article-image-box ng indibidwal na HTML page
async function fetchArticleThumbnail(articleUrl) {
    if (!articleUrl || articleUrl === '#') return '';
    try {
        const response = await fetch(articleUrl);
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

// TSV Fetching & Parsing
async function loadSheetData() {
    try {
        const res = await fetch(TSV_SHEET_URL);
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

        // Sort by Date Recent
        rawArticles.sort((a, b) => b.dateObj - a.dateObj);

        // Sabay-sabay na kukunin ang mga larawan para sa mga artikulong ipapakita sa homepage
        const articles = await Promise.all(rawArticles.map(async (art) => {
            if (art.link && art.link !== '#') {
                const fetchedImg = await fetchArticleThumbnail(art.link);
                if (fetchedImg) {
                    art.image = fetchedImg;
                }
            }
            return art;
        }));

        renderTopStories(articles);
        renderCategoryFeeds(articles);

        // Sabay na i-fade out ang carousel loader at i-fade in ang carousel content
        const carouselLoader = document.getElementById('carousel-loader');
        const carouselContent = document.getElementById('carousel-main-content');
        if (carouselLoader && carouselContent) {
            carouselLoader.classList.add('fade-out');
            carouselContent.classList.add('loaded');
        }

    } catch (err) {
        console.error("Failed to load Google Sheets TSV Data:", err);
        const carouselLoader = document.getElementById('carousel-loader');
        const carouselContent = document.getElementById('carousel-main-content');
        if (carouselLoader && carouselContent) {
            carouselLoader.classList.add('fade-out');
            carouselContent.classList.add('loaded');
        }
    }
}

// Dynamic Top Stories Carousel
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
        
        // Tukuyin ang display label para sa badge (Filipino mapping)
        let badgeText = item.type;
        if (item.type === 'NEWS') badgeText = 'Balita';
        else if (item.type === 'OPINION') badgeText = 'Opinyon';
        else if (item.type === 'FEATURE') badgeText = 'Lathalain';
        else if (item.type === 'SCI-TECH') badgeText = 'Ag-Tek';
        else if (item.type === 'SPORTS') badgeText = 'Isports';

        slide.innerHTML = `
            <div class="carousel-content">
                <span class="badge">${badgeText}</span>
                <h2 class="carousel-title">${item.headline}</h2>
                <p class="carousel-lead">${item.lead}</p>
                <div class="meta-info">
                    <span><i data-lucide="user" style="width:13px;height:13px;"></i> ${item.author}</span>
                    ${item.dateFormatted ? `<span><i data-lucide="calendar" style="width:13px;height:13px;"></i> ${item.dateFormatted}</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        indicators.appendChild(dot);
    });

    lucide.createIcons();
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

// Dynamic Category Feeds Renderer (Balita, Opinyon, Lathalain, Ag-Tek, Isports)
function renderCategoryFeeds(articles) {
    const map = {
        'NEWS': { id: 'feed-news', label: 'Balita' },
        'BALITA': { id: 'feed-news', label: 'Balita' },
        'OPINION': { id: 'feed-opinion', label: 'Opinyon' },
        'OPIYON': { id: 'feed-opinion', label: 'Opinyon' },
        'FEATURE': { id: 'feed-feature', label: 'Lathalain' },
        'LATHALAIN': { id: 'feed-feature', label: 'Lathalain' },
        'SCI-TECH': { id: 'feed-scitech', label: 'Ag-Tek' },
        'AG-TEK': { id: 'feed-scitech', label: 'Ag-Tek' },
        'AGHAM AT TEKNOLOHIYA': { id: 'feed-scitech', label: 'Ag-Tek' },
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
        const targetFeedKey = mappingInfo ? mappingInfo.id : null;
        if (targetFeedKey) {
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
    
    lucide.createIcons();
}

loadSheetData();

let allArchivesList = [];
const articlesPerPage = 4;
let currentPage = 1;

async function initArchivesPage() {
    const container = document.getElementById('archives-container');
    if (!container) return;

    try {
        if (ARCHIVES_TSV_URL.includes('PALITAN_')) {
            allArchivesList = [
                { publication: "Ang Arkanghel", volume: "Tomo I - Bilang I", period: "Hunyo 2025 - Enero 2026", thumbnail: "arkanghel-vol1-no1.jpg", link: "article.html?id=arkanghel-vol1-1" },
                { publication: "The Courier", volume: "Volume IV - Release I", period: "June 2018 - March 2019", thumbnail: "courier-vol4-rel1.jpg", link: "article.html?id=courier-vol4-1" },
            ];
            renderPage(1);
            return;
        }

        const response = await fetch(ARCHIVES_TSV_URL);
        if (!response.ok) throw new Error('Nabigo sa pagkonekta sa Archives Google Sheets.');

        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));

        if (rows.length <= 1) {
            container.innerHTML = `
                <div class="state-container">
                    <div class="state-title">Walang Nakitang Isyu</div>
                    <div class="state-description">Wala pang nailalagay o naipapalabas na mga lumang isyu sa kasalukuyan.</div>
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

        renderPage(1);

    } catch (error) {
        console.error("Error fetching archives:", error);
        container.innerHTML = `
            <div class="state-container">
                <div class="state-title">Nabigo sa Pagkonekta</div>
                <div class="state-description">Nagkaroon ng problema sa pagkuha ng mga datos ng silid-aklatan. Mangyaring subukang muli mamaya.</div>
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
    const endIndex = startIndex + articlesPerPage;
    const paginatedItems = allArchivesList.slice(startIndex, endIndex);

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
        if (allArchivesList.length > articlesPerPage) {
            const totalPages = Math.ceil(allArchivesList.length / articlesPerPage);
            let paginationHTML = '';
            
            for (let p = 1; p <= totalPages; p++) {
                paginationHTML += `<button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="renderPage(${p})">${p}</button>`;
            }
            paginationContainer.innerHTML = paginationHTML;
        } else {
            paginationContainer.innerHTML = '';
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    lucide.createIcons();
}

window.renderPage = renderPage;

initArchivesPage();

const SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=0&single=true&output=tsv';

async function fetchEditorialStaff() {
    const container = document.getElementById('editorial-container');
    if (!container) return;

    try {
        const response = await fetch(SHEET_TSV_URL);
        if (!response.ok) throw new Error('Hindi nakuhang basahin ang Google Sheets data.');
        
        const tsvText = await response.text();
        const rows = tsvText.split('\n').map(row => row.split('\t'));
        
        container.innerHTML = ''; 

        let gridWrapperOpen = false;
        let htmlContent = '';

        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (cols.length === 0) continue;

            const col0 = cols[0] ? cols[0].trim() : '';
            const col1 = cols[1] ? cols[1].trim() : '';
            const col2 = cols[2] ? cols[2].trim() : '';
            
            if (!col0 && !col1 && !col2) continue;

            const isMergedHeader = col0 && (!col1 && !col2);

            if (isMergedHeader) {
                if (gridWrapperOpen) {
                    htmlContent += `</div>`;
                    gridWrapperOpen = false;
                }

                htmlContent += `
                    <h2 class="editorial-section-title">
                        <i data-lucide="bookmark" style="width:20px; height:20px; color:var(--maroon-light);"></i> 
                        ${col0}
                    </h2>
                `;
            } else {
                if (!gridWrapperOpen) {
                    htmlContent += `<div class="staff-grid">`;
                    gridWrapperOpen = true;
                }

                let avatarContent = col1 ? col1.substring(0, 3).toUpperCase() : 'STAFF';
                if (col2) {
                    avatarContent = `<img src="assets/staff/${col2}" alt="${col0}">`;
                }

                htmlContent += `
                    <div class="staff-card">
                        <div class="avatar-container">${avatarContent}</div>
                        <div class="staff-role">${col1}</div>
          }
