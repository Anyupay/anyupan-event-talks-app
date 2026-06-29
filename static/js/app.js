document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // APPLICATION STATE
    // ---------------------------------------------------------
    let releasesState = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedRelease = null;

    // ---------------------------------------------------------
    // DOM ELEMENTS
    // ---------------------------------------------------------
    // Header & Actions
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshBtnText = refreshBtn.querySelector('.refresh-btn-text');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    
    // Search & Filters
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const filterCategories = document.getElementById('filterCategories');
    const feedStatusBanner = document.getElementById('feedStatusBanner');
    const statusTime = document.getElementById('statusTime');
    
    // Content Areas
    const releasesList = document.getElementById('releasesList');
    const skeletonLoader = document.getElementById('skeletonLoader');
    const errorDisplay = document.getElementById('errorDisplay');
    const errorMessage = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryBtn');
    const emptyDisplay = document.getElementById('emptyDisplay');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    
    // Tweet Modal
    const tweetModal = document.getElementById('tweetModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const tweetContent = document.getElementById('tweetContent');
    const previewBadge = document.getElementById('previewBadge');
    const previewDate = document.getElementById('previewDate');
    const charProgressRing = document.getElementById('charProgressRing');
    const charCountText = document.getElementById('charCountText');
    const postTweetBtn = document.getElementById('postTweetBtn');
    
    // Toast Container
    const toastContainer = document.getElementById('toastContainer');

    // ---------------------------------------------------------
    // INITS & EVENT LISTENERS
    // ---------------------------------------------------------
    function init() {
        // Theme initialization
        const savedTheme = localStorage.getItem('theme') || 'dark';
        applyTheme(savedTheme);
        
        // Load initial data
        fetchReleases(false);

        // Event Listeners
        refreshBtn.addEventListener('click', () => fetchReleases(true));
        themeToggleBtn.addEventListener('click', toggleTheme);
        exportCsvBtn.addEventListener('click', exportToCSV);
        retryBtn.addEventListener('click', () => fetchReleases(true));
        resetFiltersBtn.addEventListener('click', resetFilters);
        
        // Search inputs
        searchInput.addEventListener('input', handleSearchInput);
        clearSearchBtn.addEventListener('click', clearSearch);
        
        // Category Filters
        filterCategories.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', () => handleFilterChange(tab));
        });

        // Tweet Modal events
        closeModalBtn.addEventListener('click', closeTweetModal);
        tweetContent.addEventListener('input', updateCharProgress);
        postTweetBtn.addEventListener('click', submitTweet);
        
        // Close modal when clicking overlay
        tweetModal.addEventListener('click', (e) => {
            if (e.target === tweetModal) closeTweetModal();
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
                closeTweetModal();
            }
        });
    }

    // ---------------------------------------------------------
    // THEME HANDLING
    // ---------------------------------------------------------
    function applyTheme(theme) {
        if (theme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
        }
        localStorage.setItem('theme', theme);
    }

    function toggleTheme() {
        const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
        showToast(`Switched to ${nextTheme} theme`, 'info');
    }

    // ---------------------------------------------------------
    // DATA FETCHING
    // ---------------------------------------------------------
    async function fetchReleases(forceRefresh = false) {
        // Update UI states
        setLoadingState(true);
        
        const refreshParam = forceRefresh ? '?refresh=true' : '';
        try {
            const response = await fetch(`/api/releases${refreshParam}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.success) {
                releasesState = data.releases;
                renderReleases();
                updateStatusBanner(data.cached_at, data.from_cache);
                showToast(forceRefresh ? 'Release notes updated successfully' : 'Loaded release notes', 'success');
            } else {
                throw new Error(data.error || 'Unknown server error');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            setErrorState(error.message);
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtn.disabled = true;
            refreshBtnText.textContent = 'Refreshing...';
            
            skeletonLoader.classList.remove('hidden');
            releasesList.classList.add('hidden');
            errorDisplay.classList.add('hidden');
            emptyDisplay.classList.add('hidden');
            feedStatusBanner.classList.add('hidden');
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtn.disabled = false;
            refreshBtnText.textContent = 'Refresh Feed';
            
            skeletonLoader.classList.add('hidden');
            releasesList.classList.remove('hidden');
        }
    }

    function setErrorState(msg) {
        errorMessage.textContent = msg || 'There was an issue loading the release notes feed.';
        errorDisplay.classList.remove('hidden');
        releasesList.classList.add('hidden');
        emptyDisplay.classList.add('hidden');
        feedStatusBanner.classList.add('hidden');
    }

    function updateStatusBanner(timestamp, fromCache) {
        if (!timestamp) {
            feedStatusBanner.classList.add('hidden');
            return;
        }

        const date = new Date(timestamp * 1000);
        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = date.toLocaleDateString();
        
        statusTime.textContent = `Last sync: ${dateString} at ${timeString}`;
        
        const statusMsg = feedStatusBanner.querySelector('.status-message');
        if (fromCache) {
            statusMsg.textContent = 'Showing cached feed';
            feedStatusBanner.style.borderColor = 'rgba(99, 102, 241, 0.2)';
            feedStatusBanner.style.background = 'rgba(99, 102, 241, 0.05)';
        } else {
            statusMsg.textContent = 'Fetched live updates';
            feedStatusBanner.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            feedStatusBanner.style.background = 'rgba(16, 185, 129, 0.05)';
        }
        
        feedStatusBanner.classList.remove('hidden');
    }

    // ---------------------------------------------------------
    // FILTERING, SEARCHING & RENDERING
    // ---------------------------------------------------------
    function handleSearchInput(e) {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery.length > 0) {
            clearSearchBtn.style.display = 'block';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        renderReleases();
    }

    function clearSearch() {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderReleases();
        searchInput.focus();
    }

    function handleFilterChange(selectedTab) {
        filterCategories.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        selectedTab.classList.add('active');
        activeFilter = selectedTab.dataset.filter;
        renderReleases();
    }

    function resetFilters() {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterCategories.querySelectorAll('.filter-tab').forEach(tab => {
            if (tab.dataset.filter === 'all') {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        activeFilter = 'all';
        renderReleases();
    }

    function getNormalizedType(type) {
        const t = type.toLowerCase();
        if (t.includes('feature')) return 'feature';
        if (t.includes('change')) return 'change';
        if (t.includes('deprecation') || t.includes('deprecated')) return 'deprecation';
        return 'other';
    }

    function getFilteredReleases() {
        return releasesState.filter(release => {
            // Category filter
            const normType = getNormalizedType(release.type);
            const matchesFilter = activeFilter === 'all' || normType === activeFilter;
            
            // Search query filter
            const matchesSearch = searchQuery === '' || 
                release.date.toLowerCase().includes(searchQuery) ||
                release.type.toLowerCase().includes(searchQuery) ||
                release.description_text.toLowerCase().includes(searchQuery);
                
            return matchesFilter && matchesSearch;
        });
    }

    function renderReleases() {
        releasesList.innerHTML = '';
        
        // 1. Filter the releases
        const filtered = getFilteredReleases();

        // 2. Update category badges based on current search & full data
        updateCategoryCounts();

        // 3. Check for empty state
        if (filtered.length === 0) {
            emptyDisplay.classList.remove('hidden');
            releasesList.classList.add('hidden');
            return;
        }
        
        emptyDisplay.classList.add('hidden');
        releasesList.classList.remove('hidden');

        // 4. Render cards
        filtered.forEach((release, index) => {
            const card = createReleaseCardDOM(release, index);
            releasesList.appendChild(card);
        });
    }

    function updateCategoryCounts() {
        // Calculate counts based on current state (or full state depending on design preference,
        // here we calculate based on full search query matches, to show filter counts within search)
        const counts = {
            all: 0,
            feature: 0,
            change: 0,
            deprecation: 0,
            other: 0
        };

        releasesState.forEach(release => {
            // Count must respect search query
            const matchesSearch = searchQuery === '' || 
                release.date.toLowerCase().includes(searchQuery) ||
                release.type.toLowerCase().includes(searchQuery) ||
                release.description_text.toLowerCase().includes(searchQuery);

            if (matchesSearch) {
                counts.all++;
                const type = getNormalizedType(release.type);
                if (counts[type] !== undefined) {
                    counts[type]++;
                } else {
                    counts.other++;
                }
            }
        });

        // Update DOM elements
        document.getElementById('count-all').textContent = counts.all;
        document.getElementById('count-feature').textContent = counts.feature;
        document.getElementById('count-change').textContent = counts.change;
        document.getElementById('count-deprecation').textContent = counts.deprecation;
        document.getElementById('count-other').textContent = counts.other;
    }

    function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function createReleaseCardDOM(release, index) {
        const normType = getNormalizedType(release.type);
        
        const card = document.createElement('article');
        card.className = `release-card type-${normType} fade-in-item`;
        card.style.animationDelay = `${Math.min(index * 0.05, 1)}s`;
        card.dataset.id = release.id;

        // Header section
        const header = document.createElement('header');
        header.className = 'card-header';

        const titleSection = document.createElement('div');
        titleSection.className = 'card-title-section';
        
        const date = document.createElement('span');
        date.className = 'card-date';
        date.textContent = release.date;

        const badge = document.createElement('span');
        badge.className = `card-badge badge-${normType}`;
        badge.textContent = release.type;

        titleSection.appendChild(date);
        titleSection.appendChild(badge);

        // Selection checkbox
        const selectWrapper = document.createElement('div');
        selectWrapper.className = 'card-select-wrapper';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'card-checkbox';
        checkbox.title = 'Select to highlight update';
        checkbox.ariaLabel = 'Select release note';
        
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        selectWrapper.appendChild(checkbox);

        header.appendChild(titleSection);
        header.appendChild(selectWrapper);

        // Body section
        const body = document.createElement('div');
        body.className = 'card-body';
        
        // Description html rendering (Google feed returns HTML, whichbs4 sanitized)
        // If query is present, we can render the HTML normally. 
        body.innerHTML = release.description_html;

        // Actions section
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const copyTextBtn = document.createElement('button');
        copyTextBtn.className = 'card-btn';
        copyTextBtn.title = 'Copy full update text';
        copyTextBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
            </svg>
            <span>Copy Text</span>
        `;
        copyTextBtn.addEventListener('click', () => {
            const formattedText = `BigQuery Release (${release.date}) [${release.type.toUpperCase()}]:\n${release.description_text}\n\nLink: ${release.link}`;
            copyToClipboard(formattedText, 'Update text copied!');
        });

        const copyBtn = document.createElement('button');
        copyBtn.className = 'card-btn';
        copyBtn.title = 'Copy original release link';
        copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy Link</span>
        `;
        copyBtn.addEventListener('click', () => {
            copyToClipboard(release.link, 'Link copied!');
        });

        const tweetBtn = document.createElement('button');
        tweetBtn.className = 'card-btn card-btn-primary';
        tweetBtn.title = 'Draft a tweet about this update';
        tweetBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
            </svg>
            <span>Tweet</span>
        `;
        tweetBtn.addEventListener('click', () => {
            openTweetModal(release);
        });

        actions.appendChild(copyTextBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(tweetBtn);

        card.appendChild(header);
        card.appendChild(body);
        card.appendChild(actions);

        return card;
    }

    // ---------------------------------------------------------
    // CLIPBOARD ACTIONS
    // ---------------------------------------------------------
    async function copyToClipboard(text, successMessage = 'Link copied to clipboard!') {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMessage, 'success');
        } catch (err) {
            console.error('Clipboard copy failed:', err);
            // Fallback copy method
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed'; // Prevent scrolling
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast(successMessage, 'success');
            } catch (fallbackErr) {
                showToast('Failed to copy content', 'error');
            }
            document.body.removeChild(textarea);
        }
    }

    // ---------------------------------------------------------
    // EXPORT TO CSV
    // ---------------------------------------------------------
    function exportToCSV() {
        const filtered = getFilteredReleases();
        if (filtered.length === 0) {
            showToast('No release notes found to export', 'error');
            return;
        }

        const headers = ['ID', 'Date', 'Type', 'Link', 'Description (Plain Text)'];
        
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            let str = String(val);
            str = str.replace(/"/g, '""');
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                str = `"${str}"`;
            }
            return str;
        };

        const rows = filtered.map(r => [
            r.id,
            r.date,
            r.type,
            r.link,
            r.description_text
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(escapeCSV).join(','))
        ].join('\n');

        try {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `bigquery_releases_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast(`Exported ${filtered.length} updates to CSV`, 'success');
        } catch (err) {
            console.error('CSV Export failed:', err);
            showToast('Failed to export to CSV', 'error');
        }
    }

    // ---------------------------------------------------------
    // TWEET MODAL & CHARACTER COUNT COMPOSER
    // ---------------------------------------------------------
    function generateInitialTweetText(release) {
        const maxChars = 280;
        const date = release.date;
        const type = release.type.toUpperCase();
        const link = release.link;
        
        // Trim double spaces/newlines from raw text
        let rawText = release.description_text
            .replace(/\s+/g, ' ')
            .trim();
        
        const prefix = `BigQuery Update (${date}) [${type}]: `;
        const suffix = `\n\n${link} #BigQuery`;
        const reservedLength = prefix.length + suffix.length;
        const availableLength = maxChars - reservedLength;
        
        if (rawText.length > availableLength) {
            rawText = rawText.substring(0, availableLength - 3) + '...';
        }
        
        return `${prefix}${rawText}${suffix}`;
    }

    function openTweetModal(release) {
        selectedRelease = release;
        const initialText = generateInitialTweetText(release);
        
        tweetContent.value = initialText;
        previewBadge.textContent = release.type;
        previewBadge.className = `preview-badge badge-${getNormalizedType(release.type)}`;
        previewDate.textContent = release.date;

        updateCharProgress();
        
        // Show modal with opacity transition
        tweetModal.classList.remove('hidden');
        // Let browser register class removal before adding active for transition
        setTimeout(() => {
            tweetModal.classList.add('active');
            tweetModal.setAttribute('aria-hidden', 'false');
            tweetContent.focus();
            // Put cursor at end of text
            tweetContent.setSelectionRange(tweetContent.value.length, tweetContent.value.length);
        }, 10);
    }

    function closeTweetModal() {
        tweetModal.classList.remove('active');
        tweetModal.setAttribute('aria-hidden', 'true');
        setTimeout(() => {
            tweetModal.classList.add('hidden');
            selectedRelease = null;
        }, 200); // match transition duration
    }

    function updateCharProgress() {
        const textLength = tweetContent.value.length;
        const maxLength = 280;
        const remaining = maxLength - textLength;

        // Update character counter text
        charCountText.textContent = remaining;

        // Circular progress ring calculation
        const circumference = 2 * Math.PI * 10; // r=10, circ=62.83
        const progressPercent = Math.min(textLength / maxLength, 1);
        const strokeOffset = circumference - (progressPercent * circumference);
        charProgressRing.style.strokeDashoffset = strokeOffset;

        // Styling indicators based on length
        if (remaining < 0) {
            charCountText.className = 'char-count-text danger';
            charProgressRing.style.stroke = '#ef4444';
            postTweetBtn.disabled = true;
        } else if (remaining <= 20) {
            charCountText.className = 'char-count-text warning';
            charProgressRing.style.stroke = '#f59e0b';
            postTweetBtn.disabled = false;
        } else {
            charCountText.className = 'char-count-text';
            charProgressRing.style.stroke = '#38bdf8';
            postTweetBtn.disabled = false;
        }
        
        // Disable post button if text is empty
        if (textLength === 0) {
            postTweetBtn.disabled = true;
        }
    }

    function submitTweet() {
        const text = tweetContent.value;
        if (text.length > 280 || text.length === 0) {
            return;
        }
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        
        showToast('Opening Twitter/X compose window...', 'info');
        
        // Open link in new tab
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        
        closeTweetModal();
    }

    // ---------------------------------------------------------
    // TOAST NOTIFICATIONS
    // ---------------------------------------------------------
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Trigger show class for transition
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        // Self-destruct after 3.5s
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 300); // wait for fade transition
        }, 3500);
    }

    // Run app initialization
    init();
});
