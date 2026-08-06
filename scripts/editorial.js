document.addEventListener('DOMContentLoaded', () => {
    const SHEET_TSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ45lr5GfiSmKn6wyhGNcMngVCtuBO4SNXjoYiuHGUas_MMOS9mWCP_YUbdpDeYa0SqfLRxH2yUQoV5/pub?gid=1368403362&single=true&output=tsv';

    async function fetchEditorialStaff() {
        const container = document.getElementById('editorial-container');
        if (!container) return;

        try {
            const response = await fetch(SHEET_TSV_URL);
            if (!response.ok) throw new Error('Hindi nakuhang basahin ang data.');
            
            const tsvText = await response.text();
            const rows = tsvText.split('\n').map(row => row.split('\t'));
            
            container.innerHTML = ''; 

            let gridWrapperOpen = false;
            let htmlContent = '';

            for (let i = 1; i < rows.length; i++) {
                const cols = rows[i];
                if (!cols || cols.length === 0) continue;

                const col0 = cols[0] ? cols[0].trim() : '';
                const col1 = cols[1] ? cols[1].trim() : '';
                const col2 = cols[2] ? cols[2].trim() : '';
                
                if (!col0 && !col1 && !col2) continue;

                // Detect merged row headers from Google Sheets
                const isMergedHeader = col0 && (!col1 && !col2);

                if (isMergedHeader) {
                    if (gridWrapperOpen) {
                        htmlContent += `</div>`;
                        gridWrapperOpen = false;
                    }

                    htmlContent += `
                        <h2 class="editorial-section-title">
                            <i data-lucide="bookmark" class="section-title-icon"></i> 
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
                            <div class="staff-name">${col0 || 'Bakante'}</div>
                        </div>
                    `;
                }
            }

            if (gridWrapperOpen) {
                htmlContent += `</div>`;
            }

            container.innerHTML = htmlContent;

            if (window.lucide) {
                lucide.createIcons();
            }

        } catch (error) {
            console.error("Error loading editorial data:", error);
            container.innerHTML = `<p class="status-message" style="color: var(--maroon-light);">Nabigo sa pagkuha ng talaan.</p>`;
        }
    }

    fetchEditorialStaff();
});
