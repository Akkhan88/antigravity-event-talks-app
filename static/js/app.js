// Application State
let allNotes = [];
let filteredNotes = [];
let categoryCounts = {};
let selectedCategories = new Set();
let searchQuery = "";
let sortOrder = "newest";
let currentNoteForTweet = null;
let currentTab = "notes"; // 'notes' or 'timeline'

// On Document Load
document.addEventListener("DOMContentLoaded", () => {
    fetchReleaseNotes();
    
    // Set up modal outside click close listener
    const modal = document.getElementById("tweet-modal");
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeTweetModal();
        }
    });

    // Auto-update character count on load
    updateCharCount();
});

// Fetch Release Notes from API
async function fetchReleaseNotes() {
    toggleRefreshState(true);
    
    try {
        const response = await fetch("/api/release-notes");
        const data = await response.json();
        
        if (data.success) {
            allNotes = data.notes;
            
            // Set Feed Metadata
            document.getElementById("feed-last-updated").textContent = `Feed Date: ${data.last_updated || "Just now"}`;
            
            // Analyze Categories and Counts
            calculateCategories();
            
            // Populate Sidebar Filter Checkboxes
            renderCategoryFilters();
            
            // Apply Filters and Render
            filterNotes();
            
            showToast("Release notes loaded successfully!");
        } else {
            showToast(data.error || "Failed to load release notes", "error");
        }
    } catch (error) {
        console.error("Error fetching release notes:", error);
        showToast("Network error occurred while fetching notes.", "error");
        renderEmptyState("notes-container", "⚠️", "Connection Error", "Could not fetch release notes. Check your network or try again.");
    } finally {
        toggleRefreshState(false);
    }
}

// Toggle refresh button spinner
function toggleRefreshState(isLoading) {
    const refreshBtn = document.getElementById("refresh-btn");
    const spinner = document.getElementById("spinner-icon");
    const icon = document.getElementById("refresh-icon");
    
    if (isLoading) {
        refreshBtn.disabled = true;
        spinner.style.display = "inline-block";
        icon.style.display = "none";
    } else {
        refreshBtn.disabled = false;
        spinner.style.display = "none";
        icon.style.display = "inline-block";
    }
}

// Calculate counts of unique categories
function calculateCategories() {
    categoryCounts = {};
    allNotes.forEach(note => {
        const cat = note.category || "Update";
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });
}

// Render Checkboxes in Sidebar
function renderCategoryFilters() {
    const container = document.getElementById("category-filters");
    container.innerHTML = "";
    
    // Get sorted category names
    const sortedCats = Object.keys(categoryCounts).sort();
    
    sortedCats.forEach(cat => {
        const count = categoryCounts[cat];
        const isChecked = selectedCategories.has(cat) ? "checked" : "";
        
        const checkboxItem = document.createElement("label");
        checkboxItem.className = "checkbox-item";
        checkboxItem.innerHTML = `
            <input type="checkbox" value="${cat}" ${isChecked} onchange="toggleCategoryFilter('${cat}')">
            <span>${cat}</span>
            <span class="badge-count">${count}</span>
        `;
        container.appendChild(checkboxItem);
    });
}

// Handle checkbox toggle
function toggleCategoryFilter(category) {
    if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
    } else {
        selectedCategories.add(category);
    }
    filterNotes();
}

// Filter and Sort Release Notes
function filterNotes() {
    searchQuery = document.getElementById("search-input").value.toLowerCase().trim();
    sortOrder = document.getElementById("sort-select").value;
    
    filteredNotes = allNotes.filter(note => {
        // Category Filter
        if (selectedCategories.size > 0 && !selectedCategories.has(note.category)) {
            return false;
        }
        
        // Search Filter
        if (searchQuery) {
            const matchesSearch = 
                note.category.toLowerCase().includes(searchQuery) ||
                note.date_str.toLowerCase().includes(searchQuery) ||
                note.content_text.toLowerCase().includes(searchQuery);
            return matchesSearch;
        }
        
        return true;
    });
    
    // Sort
    filteredNotes.sort((a, b) => {
        const dateA = a.date_iso || "";
        const dateB = b.date_iso || "";
        
        if (sortOrder === "newest") {
            return dateB.localeCompare(dateA) || b.id.localeCompare(a.id);
        } else {
            return dateA.localeCompare(dateB) || a.id.localeCompare(b.id);
        }
    });
    
    // Update dashboard stats
    updateStatsBanner();
    
    // Render
    renderNotes();
}

// Update upper counts
function updateStatsBanner() {
    // Total count of original notes vs category groupings
    document.getElementById("stat-total").textContent = filteredNotes.length;
    
    let features = 0;
    let changed = 0;
    let issues = 0;
    
    filteredNotes.forEach(note => {
        const cat = note.category.toLowerCase();
        if (cat.includes("feature")) features++;
        else if (cat.includes("change") || cat.includes("update")) changed++;
        else if (cat.includes("issue") || cat.includes("bug") || cat.includes("deprecated")) issues++;
    });
    
    document.getElementById("stat-features").textContent = features;
    document.getElementById("stat-changed").textContent = changed;
    document.getElementById("stat-issues").textContent = issues;
}

// Render list of release notes
function renderNotes() {
    const container = document.getElementById("notes-container");
    container.innerHTML = "";
    
    if (filteredNotes.length === 0) {
        renderEmptyState("notes-container", "🔍", "No Results Found", "Try adjusting your search query or removing filters to view release notes.");
        return;
    }
    
    filteredNotes.forEach(note => {
        const card = document.createElement("div");
        // Style class depending on category
        const catClass = getCategoryClass(note.category);
        card.className = `note-card ${catClass}`;
        
        card.innerHTML = `
            <div class="note-header">
                <div class="note-meta">
                    <span class="category-tag ${note.category.toLowerCase()}">${note.category}</span>
                    <span class="note-date">${note.date_str}</span>
                </div>
                <a href="${note.link}" target="_blank" title="View official release documentation">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
            </div>
            
            <div class="note-body">
                ${note.content_html}
            </div>
            
            <div class="note-footer">
                <button class="btn btn-secondary btn-sm" onclick="window.open('${note.link}', '_blank')">
                    Read Docs
                </button>
                <button class="btn btn-twitter btn-sm" onclick="openTweetComposer('${note.id}')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet Update
                </button>
            </div>
        `;
        
        // Ensure any dynamic links in note body open in new tab
        const links = card.querySelectorAll(".note-body a");
        links.forEach(link => {
            link.setAttribute("target", "_blank");
            link.setAttribute("rel", "noopener noreferrer");
        });
        
        container.appendChild(card);
    });
}

// Map categories to style classes
function getCategoryClass(category) {
    const cat = category.toLowerCase();
    if (cat.includes("feature")) return "category-feature";
    if (cat.includes("change") || cat.includes("update")) return "category-changed";
    if (cat.includes("deprecated")) return "category-deprecated";
    if (cat.includes("issue") || cat.includes("bug") || cat.includes("disable")) return "category-issue";
    return "category-general";
}

// Render empty state template
function renderEmptyState(containerId, emoji, title, subtitle) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${emoji}</div>
            <h3 class="empty-title">${title}</h3>
            <p class="empty-subtitle">${subtitle}</p>
        </div>
    `;
}

// Tweet Composer Logic
function openTweetComposer(noteId) {
    currentNoteForTweet = allNotes.find(note => note.id === noteId);
    if (!currentNoteForTweet) return;
    
    // Set source note reference previews in modal
    const sourceText = document.getElementById("source-note-text");
    sourceText.textContent = currentNoteForTweet.content_text;
    
    const sourceCat = document.getElementById("source-note-category");
    sourceCat.textContent = currentNoteForTweet.category;
    sourceCat.className = `category-tag ${currentNoteForTweet.category.toLowerCase()}`;
    
    // Draft tweet text
    // Build draft using: Header, clean truncated body text, and reference URL.
    const header = `🚀 [BigQuery ${currentNoteForTweet.category}] `;
    const link = `\n\nDocs: ${currentNoteForTweet.link}`;
    const hashtags = `\n#BigQuery #GoogleCloud`;
    
    const constantPartsLen = header.length + link.length + hashtags.length;
    const maxBodyLen = 280 - constantPartsLen;
    
    let bodyText = currentNoteForTweet.content_text;
    if (bodyText.length > maxBodyLen) {
        bodyText = bodyText.substring(0, maxBodyLen - 3) + "...";
    }
    
    const draftText = `${header}${bodyText}${hashtags}${link}`;
    
    // Populate textarea
    const textarea = document.getElementById("tweet-text");
    textarea.value = draftText;
    
    // Show Modal
    document.getElementById("tweet-modal").classList.add("active");
    
    // Focus and select textarea
    textarea.focus();
    
    updateCharCount();
}

function closeTweetModal() {
    document.getElementById("tweet-modal").classList.remove("active");
    currentNoteForTweet = null;
}

// Character counter and visual ring
function updateCharCount() {
    const textarea = document.getElementById("tweet-text");
    const count = textarea.value.length;
    const remaining = 280 - count;
    
    const wrapper = document.getElementById("char-progress-wrapper");
    const fill = document.getElementById("char-progress-fill");
    const textDigit = document.getElementById("char-count-digit");
    const postBtn = document.getElementById("post-tweet-btn");
    
    // Total stroke-dasharray is 88 (circumference)
    const maxVal = 280;
    const percentage = Math.min(count / maxVal, 1);
    const offset = 88 - (88 * percentage);
    
    fill.style.strokeDashoffset = offset;
    
    // Digits update
    textDigit.textContent = remaining;
    
    // Highlight near and over limit states
    wrapper.className = "char-progress-wrapper";
    if (remaining <= 20 && remaining >= 0) {
        wrapper.classList.add("near-limit");
    } else if (remaining < 0) {
        wrapper.classList.add("over-limit");
    }
    
    // Enable/disable Post Button
    if (count === 0 || remaining < 0) {
        postBtn.disabled = true;
        postBtn.style.opacity = 0.5;
        postBtn.style.pointerEvents = "none";
    } else {
        postBtn.disabled = false;
        postBtn.style.opacity = 1;
        postBtn.style.pointerEvents = "auto";
    }
}

// Post / Submit composed tweet
async function submitTweet() {
    const text = document.getElementById("tweet-text").value.trim();
    if (!text || text.length > 280) {
        showToast("Tweet must be between 1 and 280 characters.", "error");
        return;
    }
    
    const shareSimulated = document.getElementById("share-simulated").checked;
    const shareReal = document.getElementById("share-real").checked;
    
    let postedSimulated = false;
    let openedReal = false;
    
    if (!shareSimulated && !shareReal) {
        showToast("Please choose at least one posting method.", "error");
        return;
    }
    
    // 1. Post to Simulated Timeline
    if (shareSimulated) {
        try {
            const response = await fetch("/api/tweets", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    text: text,
                    release_note_id: currentNoteForTweet ? currentNoteForTweet.id : ""
                })
            });
            const data = await response.json();
            
            if (data.success) {
                postedSimulated = true;
            } else {
                showToast("Failed to post to simulated feed: " + data.error, "error");
            }
        } catch (e) {
            console.error("Error posting simulated tweet:", e);
            showToast("Failed to connect to backend simulated database.", "error");
        }
    }
    
    // 2. Open Real Web Intent
    if (shareReal) {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, "_blank", "noopener,noreferrer");
        openedReal = true;
    }
    
    // Close composer
    closeTweetModal();
    
    // Success Messages
    if (postedSimulated && openedReal) {
        showToast("Tweet posted to simulated feed & X Intent opened!");
        // Switch tab to timeline to let them see it
        switchTab("timeline");
    } else if (postedSimulated) {
        showToast("Tweet posted to simulated timeline!");
        switchTab("timeline");
    } else if (openedReal) {
        showToast("X Twitter Intent opened!");
    }
}

// Fetch Simulated Timeline Tweets
async function fetchTweets() {
    const container = document.getElementById("tweets-container");
    container.innerHTML = `
        <div class="note-card skeleton" style="height: 100px;"></div>
        <div class="note-card skeleton" style="height: 100px;"></div>
    `;
    
    try {
        const response = await fetch("/api/tweets");
        const data = await response.json();
        
        if (data.success) {
            renderTweets(data.tweets);
        } else {
            showToast("Failed to fetch simulated tweets", "error");
        }
    } catch (e) {
        console.error("Error loading tweets:", e);
        showToast("Error connecting to tweets database.", "error");
        renderEmptyState("tweets-container", "❌", "Error Loading Feed", "Could not retrieve tweets. Check backend status.");
    }
}

// Render Tweets list
function renderTweets(tweets) {
    const container = document.getElementById("tweets-container");
    container.innerHTML = "";
    
    if (!tweets || tweets.length === 0) {
        renderEmptyState("tweets-container", "🐦", "Your Timeline is Empty", "Draft release updates on the Notes tab and click Post to populate this timeline!");
        return;
    }
    
    tweets.forEach(tweet => {
        const timeAgo = formatTime(tweet.timestamp);
        const card = document.createElement("div");
        card.className = "tweet-card";
        
        card.innerHTML = `
            <div class="avatar-mock">BQ</div>
            <div class="tweet-content-wrapper">
                <div class="tweet-user-info">
                    <span class="tweet-display-name">BigQuery Alerts</span>
                    <span class="tweet-username">@BigQueryAlerts</span>
                    <span class="tweet-dot">·</span>
                    <span class="tweet-time" title="${tweet.timestamp}">${timeAgo}</span>
                </div>
                <div class="tweet-text">${escapeHTML(tweet.text)}</div>
                <div class="tweet-actions">
                    <div class="tweet-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>0</span>
                    </div>
                    <div class="tweet-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="17 1 21 5 17 9"></polyline>
                            <path d="M3 11V9a4 4 0 0 1 4-4h14M7 23 3 19 7 15"></path>
                            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                        </svg>
                        <span>0</span>
                    </div>
                    <div class="tweet-action-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>0</span>
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// Tab switcher control
function switchTab(tab) {
    if (tab === currentTab) return;
    currentTab = tab;
    
    const notesBtn = document.getElementById("tab-notes");
    const timelineBtn = document.getElementById("tab-timeline");
    const notesView = document.getElementById("notes-view");
    const timelineView = document.getElementById("timeline-view");
    const statsBanner = document.getElementById("stats-banner");
    const sidebar = document.getElementById("filters-sidebar");
    
    if (tab === "notes") {
        notesBtn.classList.add("active");
        timelineBtn.classList.remove("active");
        notesView.style.display = "block";
        timelineView.style.display = "none";
        statsBanner.style.display = "grid";
        sidebar.style.display = "block";
    } else {
        notesBtn.classList.remove("active");
        timelineBtn.classList.add("active");
        notesView.style.display = "none";
        timelineView.style.display = "block";
        statsBanner.style.display = "none";
        sidebar.style.display = "none"; // Hide filters on timeline tab for cleanliness
        fetchTweets();
    }
}

// Format date time string as "2m", "3h", "1d" etc.
function formatTime(isoString) {
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);
    
    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHr < 24) return `${diffHr}h`;
    return `${diffDay}d`;
}

// Toast Display Controller
function showToast(message, type = "success") {
    const toast = document.getElementById("toast-notification");
    const toastMsg = document.getElementById("toast-message");
    
    toastMsg.textContent = message;
    
    // Style toast depending on status
    if (type === "error") {
        toast.style.backgroundColor = "#ef4444";
    } else {
        toast.style.backgroundColor = "var(--accent-blue)";
    }
    
    toast.classList.add("active");
    
    // Auto hide
    setTimeout(() => {
        toast.classList.remove("active");
    }, 3500);
}

// Basic HTML Escaping to prevent injection
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
