// js/dashboard.js

/**
 * Dashboard Management Class
 * Handles all dashboard functionality including data loading, recommendations, and UI interactions
 */
class Dashboard {
    constructor() {
        this.app = window.app || new TechSynergyApp();
        this.recommendations = null;
        this.notifications = [];
        this.pollingInterval = null;
        this.searchTimeout = null;
        this.isLoading = false;
        
        // Bind methods to preserve context
        this.handleNotificationClick = this.handleNotificationClick.bind(this);
        this.handleSearchInput = this.handleSearchInput.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        
        this.init();
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            // Check authentication
            if (!this.app.token) {
                this.redirectToLogin();
                return;
            }

            // Show loading overlay
            this.showLoadingOverlay('Loading dashboard...');

            // Load dashboard data
            await this.loadDashboardData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Start real-time features
            this.startNotificationPolling();
            
            // Hide loading overlay
            this.hideLoadingOverlay();
            
            console.log('Dashboard initialized successfully');
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.hideLoadingOverlay();
            this.showErrorMessage('Failed to load dashboard. Please refresh the page.');
        }
    }

    /**
     * Load all dashboard data
     */
    async loadDashboardData() {
        try {
            // Load user data first
            await this.app.loadUser();
            
            if (!this.app.user) {
                throw new Error('User data not available');
            }

            // Load dashboard-specific data
            const dashboardData = await this.app.makeRequest('/users/dashboard/data', 'GET');
            
            // Update UI sections
            this.updateWelcomeSection(this.app.user);
            this.updateQuickStats(dashboardData.stats);
            
            // Load asynchronous sections
            await Promise.all([
                this.loadRecommendations(),
                this.loadRecentActivity(dashboardData.recentActivity),
                this.loadBadges(this.app.user.badges),
                this.loadLeaderboardPreview(),
                this.loadNotifications()
            ]);
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            throw error;
        }
    }

    /**
     * Update welcome section with personalized greeting
     */
    updateWelcomeSection(user) {
        const welcomeMessage = document.querySelector('.welcome-message');
        const welcomeSubtext = document.querySelector('.welcome-subtext');
        
        if (welcomeMessage && user) {
            const hour = new Date().getHours();
            let greeting = 'Good evening';
            
            if (hour < 12) {
                greeting = 'Good morning';
            } else if (hour < 18) {
                greeting = 'Good afternoon';
            }
            
            const firstName = user.name.split(' ')[0];
            welcomeMessage.textContent = `${greeting}, ${firstName}!`;
        }
        
        if (welcomeSubtext) {
            welcomeSubtext.textContent = "Here's what's happening in your tech world";
        }
    }

    /**
     * Update quick stats in welcome card
     */
    updateQuickStats(stats) {
        const elements = {
            activeGigs: document.getElementById('activeGigs'),
            upcomingEvents: document.getElementById('upcomingEvents'),
            userRank: document.getElementById('userRank'),
            activityScore: document.getElementById('activityScore')
        };
        
        if (elements.activeGigs && stats) {
            elements.activeGigs.textContent = (stats.createdGigs || 0) + (stats.appliedGigs || 0);
        }
        
        if (elements.upcomingEvents && stats) {
            elements.upcomingEvents.textContent = stats.attendingEvents || 0;
        }
        
        if (elements.userRank && stats) {
            elements.userRank.textContent = stats.rank || '-';
        }
        
        if (elements.activityScore && this.app.user) {
            elements.activityScore.textContent = this.app.user.activityScore || 0;
        }
    }

    /**
     * Load AI-powered recommendations
     */
    async loadRecommendations() {
        try {
            const recommendations = await this.app.makeRequest('/users/recommendations', 'GET');
            this.recommendations = recommendations;
            
            this.renderGigRecommendations(recommendations.gigs || []);
            this.renderEventRecommendations(recommendations.events || []);
            
        } catch (error) {
            console.error('Failed to load recommendations:', error);
            this.renderRecommendationError('recommendedGigs');
            this.renderRecommendationError('recommendedEvents');
        }
    }

    /**
     * Render gig recommendations
     */
    renderGigRecommendations(gigs) {
        const container = document.getElementById('recommendedGigs');
        if (!container) return;

        if (!gigs || gigs.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-lightbulb" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary-color);"></i>
                    <p>No gig recommendations available yet.</p>
                    <p>Complete your profile and skills to get personalized suggestions!</p>
                    <a href="profile.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Complete Profile</a>
                </div>
            `;
            return;
        }

        container.innerHTML = gigs.map(gig => `
            <div class="recommendation-card gig-card" onclick="viewGigDetails('${gig._id}')" role="button" tabindex="0" aria-label="View gig: ${gig.title}">
                <div class="card-header">
                    <h4>${this.sanitizeHtml(gig.title)}</h4>
                    <span class="budget">$${gig.budget.min} - $${gig.budget.max}</span>
                </div>
                <p class="description">${this.sanitizeHtml(gig.description.substring(0, 120))}${gig.description.length > 120 ? '...' : ''}</p>
                <div class="card-tags">
                    ${gig.skills.slice(0, 3).map(skill => <span class="tag">${this.sanitizeHtml(skill)}</span>).join('')}
                    ${gig.skills.length > 3 ? <span class="tag">+${gig.skills.length - 3} more</span> : ''}
                </div>
                <div class="card-footer">
                    <span class="category">${this.formatCategory(gig.category)}</span>
                    <span class="proposals-count">${gig.proposals?.length || 0} proposals</span>
                </div>
                <div class="card-meta" style="margin-top: 0.5rem; font-size: 0.75rem; color: var(--text-secondary);">
                    <span>Posted ${this.app.formatRelativeTime(gig.createdAt)}</span>
                    <span>Due ${this.app.formatDate(gig.deadline)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render event recommendations
     */
    renderEventRecommendations(events) {
        const container = document.getElementById('recommendedEvents');
        if (!container) return;

        if (!events || events.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-calendar-plus" style="font-size: 2rem; margin-bottom: 1rem; color: var(--secondary-color);"></i>
                    <p>No event recommendations available yet.</p>
                    <p>Join events and set your interests to get personalized suggestions!</p>
                    <a href="events/events.html" class="btn btn-secondary btn-sm" style="margin-top: 1rem;">Browse Events</a>
                </div>
            `;
            return;
        }

        container.innerHTML = events.map(event => `
            <div class="recommendation-card event-card" onclick="viewEventDetails('${event._id}')" role="button" tabindex="0" aria-label="View event: ${event.title}">
                <div class="card-header">
                    <h4>${this.sanitizeHtml(event.title)}</h4>
                    <span class="date">${this.app.formatDate(event.date)}</span>
                </div>
                <p class="description">${this.sanitizeHtml(event.description.substring(0, 120))}${event.description.length > 120 ? '...' : ''}</p>
                <div class="card-meta">
                    <span class="location">
                        <i class="fas fa-map-marker-alt" aria-hidden="true"></i>
                        ${this.sanitizeHtml(event.location)}
                    </span>
                    <span class="category">${this.formatCategory(event.category)}</span>
                </div>
                <div class="card-footer">
                    <span class="attendees">${event.attendees?.length || 0} attending</span>
                    <span class="event-time">${this.app.formatTime(event.date)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load and render recent activity
     */
    loadRecentActivity(recentActivity) {
        const container = document.getElementById('activityFeed');
        if (!container) return;

        if (!recentActivity) {
            container.innerHTML = '<div class="no-data">No recent activity data available.</div>';
            return;
        }

        const activities = [];
        
        // Process different activity types
        if (recentActivity.gigs) {
            recentActivity.gigs.forEach(gig => {
                activities.push({
                    type: 'gig_created',
                    title: `Posted gig: ${gig.title}`,
                    timestamp: gig.createdAt,
                    icon: 'fas fa-briefcase',
                    color: 'primary',
                    url: `freelancing/gigs.html?id=${gig._id}`
                });
            });
        }

        if (recentActivity.events) {
            recentActivity.events.forEach(event => {
                activities.push({
                    type: 'event_created',
                    title: `Created event: ${event.title}`,
                    timestamp: event.createdAt,
                    icon: 'fas fa-calendar',
                    color: 'secondary',
                    url: `events/events.html?id=${event._id}`
                });
            });
        }

        if (recentActivity.applications) {
            recentActivity.applications.forEach(gig => {
                activities.push({
                    type: 'gig_applied',
                    title: `Applied to: ${gig.title}`,
                    timestamp: gig.proposals?.find(p => p.freelancer === this.app.user?.id)?.submittedAt || gig.createdAt,
                    icon: 'fas fa-paper-plane',
                    color: 'success',
                    url: `freelancing/gigs.html?id=${gig._id}`
                });
            });
        }

        // Sort by timestamp (newest first)
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (activities.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-rocket" style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary-color);"></i>
                    <p>No recent activity yet.</p>
                    <p>Start by posting a gig, joining an event, or connecting with the community!</p>
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
                        <a href="freelancing/gigs.html?action=create" class="btn btn-primary btn-sm">Post Gig</a>
                        <a href="events/events.html?action=create" class="btn btn-secondary btn-sm">Create Event</a>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = activities.slice(0, 5).map((activity, index) => `
            <div class="activity-item" onclick="navigateToActivity('${activity.url}')" role="button" tabindex="0" aria-label="${activity.title}">
                <div class="activity-icon ${activity.color}">
                    <i class="${activity.icon}" aria-hidden="true"></i>
                </div>
                <div class="activity-content">
                    <p class="activity-title">${this.sanitizeHtml(activity.title)}</p>
                    <span class="activity-time">${this.app.formatRelativeTime(activity.timestamp)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load and render user badges
     */
    loadBadges(badges) {
        const container = document.getElementById('badgesContainer');
        if (!container) return;

        if (!badges || badges.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-trophy" style="font-size: 2rem; margin-bottom: 1rem; color: var(--secondary-color);"></i>
                    <p>No badges earned yet.</p>
                    <p>Complete actions to earn your first badge and climb the leaderboard!</p>
                    <div style="margin-top: 1rem;">
                        <small style="color: var(--text-secondary);">
                            💡 Tip: Post gigs, attend events, and engage with the community to earn badges!
                        </small>
                    </div>
                </div>
            `;
            return;
        }

        // Show only the most recent 6 badges
        const recentBadges = badges.slice(-6).reverse();
        
        container.innerHTML = recentBadges.map(badge => `
            <div class="badge-item" role="listitem">
                <div class="badge-icon">
                    <i class="fas fa-trophy" aria-hidden="true"></i>
                </div>
                <div class="badge-info">
                    <h4>${this.sanitizeHtml(badge.name)}</h4>
                    <p>${this.sanitizeHtml(badge.description)}</p>
                    <span class="badge-date">Earned ${this.app.formatRelativeTime(badge.earnedAt)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Load leaderboard preview
     */
    async loadLeaderboardPreview() {
        try {
            const leaderboard = await this.app.makeRequest('/users/leaderboard/top?limit=5', 'GET');
            this.renderLeaderboardPreview(leaderboard);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            this.renderLeaderboardError();
        }
    }

    /**
     * Render leaderboard preview
     */
    renderLeaderboardPreview(leaderboard) {
        const container = document.getElementById('leaderboardPreview');
        if (!container) return;

        if (!leaderboard || leaderboard.length === 0) {
            container.innerHTML = '<div class="no-data">Leaderboard data not available.</div>';
            return;
        }

        container.innerHTML = leaderboard.map((user, index) => {
            const rank = index + 1;
            let rankClass = '';
            
            if (rank === 1) rankClass = 'gold';
            else if (rank === 2) rankClass = 'silver';
            else if (rank === 3) rankClass = 'bronze';

            return `
                <div class="leaderboard-item" onclick="viewUserProfile('${user._id}')" role="button" tabindex="0" aria-label="View ${user.name}'s profile">
                    <div class="rank-number ${rankClass}">${rank}</div>
                    <div class="user-info">
                        <div class="user-avatar-small">
                            <i class="fas fa-user" aria-hidden="true"></i>
                        </div>
                        <span class="user-name">${this.sanitizeHtml(user.name)}</span>
                    </div>
                    <span class="user-score">${user.activityScore} pts</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Load notifications
     */
    async loadNotifications() {
        try {
            const notifications = await this.app.makeRequest('/notifications?limit=20', 'GET');
            this.notifications = notifications || [];
            this.updateNotificationBadge();
            this.renderNotifications();
        } catch (error) {
            console.error('Failed to load notifications:', error);
            this.renderNotificationsError();
        }
    }

    /**
     * Update notification badge count
     */
    updateNotificationBadge() {
        const badge = document.getElementById('notificationBadge');
        if (!badge) return;
        
        const unreadCount = this.notifications.filter(n => !n.isRead).length;
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('hidden');
            badge.setAttribute('aria-label', `${unreadCount} unread notifications`);
        } else {
            badge.classList.add('hidden');
            badge.removeAttribute('aria-label');
        }
    }

    /**
     * Render notifications list
     */
    renderNotifications() {
        const container = document.getElementById('notificationsList');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-bell-slash" style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-secondary);"></i>
                    <p>No notifications yet.</p>
                    <p>You'll see updates about gigs, events, and community activity here.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.slice(0, 10).map(notification => `
            <div class="notification-item ${notification.isRead ? 'read' : 'unread'}" 
                 data-id="${notification._id}" 
                 onclick="handleNotificationClick('${notification._id}')"
                 role="button" 
                 tabindex="0"
                 aria-label="${notification.title}: ${notification.message}">
                <div class="notification-icon ${notification.type}">
                    <i class="fas fa-${this.getNotificationIcon(notification.type)}" aria-hidden="true"></i>
                </div>
                <div class="notification-content">
                    <h4>${this.sanitizeHtml(notification.title)}</h4>
                    <p>${this.sanitizeHtml(notification.message)}</p>
                    <span class="notification-time">${this.app.formatRelativeTime(notification.createdAt)}</span>
                </div>
                ${!notification.isRead ? '<div class="unread-indicator" aria-hidden="true"></div>' : ''}
            </div>
        `).join('');
    }

    /**
     * Get icon for notification type
     */
    getNotificationIcon(type) {
        const icons = {
            'gig': 'briefcase',
            'event': 'calendar',
            'chat': 'comments',
            'badge': 'trophy',
            'general': 'bell'
        };
        return icons[type] || 'bell';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', this.handleSearchInput);
            globalSearch.addEventListener('focus', () => {
                globalSearch.parentElement.classList.add('focused');
            });
            globalSearch.addEventListener('blur', () => {
                setTimeout(() => {
                    globalSearch.parentElement.classList.remove('focused');
                    this.hideSearchDropdown();
                }, 200);
            });
        }

        // Notifications panel
        const notificationsIcon = document.getElementById('notificationsIcon');
        const notificationsPanel = document.getElementById('notificationsPanel');
        
        if (notificationsIcon && notificationsPanel) {
            notificationsIcon.addEventListener('click', () => {
                this.toggleNotificationsPanel();
            });

            notificationsIcon.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleNotificationsPanel();
                }
            });
        }

        // User dropdown
        const userAvatar = document.getElementById('user-avatar');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', () => {
                this.toggleUserDropdown();
            });

            userAvatar.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleUserDropdown();
                }
            });
        }

        // Mobile navigation
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                this.toggleMobileNav();
            });
        }

        // Outside click handler
        document.addEventListener('click', this.handleOutsideClick);

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllDropdowns();
            }
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
    }

    /**
     * Handle search input with debouncing
     */
    handleSearchInput(e) {
        clearTimeout(this.searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length === 0) {
            this.hideSearchDropdown();
            return;
        }
        
        this.searchTimeout = setTimeout(() => {
            this.performGlobalSearch(query);
        }, 300);
    }

    /**
     * Perform global search
     */
    async performGlobalSearch(query) {
        if (!query || query.length < 2) {
            this.hideSearchDropdown();
            return;
        }

        try {
            const results = await this.app.makeRequest(`/users/search/global?q=${encodeURIComponent(query)}`, 'GET');
            this.displaySearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
            this.displaySearchError();
        }
    }

    /**
     * Display search results
     */
    displaySearchResults(results) {
        const dropdown = document.getElementById('searchDropdown');
        if (!dropdown) return;

        const totalResults = (results.users?.length || 0) + (results.gigs?.length || 0) + (results.events?.length || 0);

        if (totalResults === 0) {
            dropdown.innerHTML = '<div class="search-item">No results found</div>';
            dropdown.style.display = 'block';
            return;
        }

        let html = '';

        if (results.gigs?.length > 0) {
            html += '<div class="search-section"><h4>Gigs</h4>';
            results.gigs.forEach(gig => {
                html += `
                    <div class="search-item" onclick="navigateToGig('${gig._id}')" role="button" tabindex="0">
                        <i class="fas fa-briefcase"></i>
                        <div>
                            <span class="search-title">${this.sanitizeHtml(gig.title)}</span>
                            <span class="search-meta">${gig.budget.min} - ${gig.budget.max}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (results.events?.length > 0) {
            html += '<div class="search-section"><h4>Events</h4>';
            results.events.forEach(event => {
                html += `
                    <div class="search-item" onclick="navigateToEvent('${event._id}')" role="button" tabindex="0">
                        <i class="fas fa-calendar"></i>
                        <div>
                            <span class="search-title">${this.sanitizeHtml(event.title)}</span>
                            <span class="search-meta">${this.app.formatDate(event.date)}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        if (results.users?.length > 0) {
            html += '<div class="search-section"><h4>Users</h4>';
            results.users.forEach(user => {
                html += `
                    <div class="search-item" onclick="navigateToUser('${user._id}')" role="button" tabindex="0">
                        <i class="fas fa-user"></i>
                        <div>
                            <span class="search-title">${this.sanitizeHtml(user.name)}</span>
                            <span class="search-meta">${user.skills?.slice(0, 2).join(', ') || 'No skills listed'}</span>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    }

    /**
     * Handle notification click
     */
    async handleNotificationClick(notificationId) {
        try {
            // Mark as read
            await this.markNotificationAsRead(notificationId);
            
            // Handle navigation based on notification type
            const notification = this.notifications.find(n => n._id === notificationId);
            if (notification && notification.relatedId) {
                this.navigateToNotificationTarget(notification);
            }
        } catch (error) {
            console.error('Failed to handle notification click:', error);
        }
    }

    /**
     * Mark notification as read
     */
    async markNotificationAsRead(notificationId) {
        try {
            await this.app.makeRequest(`/notifications/${notificationId}/read`, 'PATCH');
            
            // Update local state
            const notification = this.notifications.find(n => n._id === notificationId);
            if (notification) {
                notification.isRead = true;
                this.updateNotificationBadge();
                
                // Update UI
                const notificationElement = document.querySelector(`[data-id="${notificationId}"]`);
                if (notificationElement) {
                    notificationElement.classList.remove('unread');
                    notificationElement.classList.add('read');
                    const indicator = notificationElement.querySelector('.unread-indicator');
                    if (indicator) {
                        indicator.remove();
                    }
                }
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    /**
     * Start notification polling
     */
    startNotificationPolling() {
        // Poll every 30 seconds
        this.pollingInterval = setInterval(async () => {
            try {
                const newNotifications = await this.app.makeRequest('/notifications?limit=20', 'GET');
                
                if (newNotifications && newNotifications.length > 0) {
                    const currentIds = this.notifications.map(n => n._id);
                    const hasNewNotifications = newNotifications.some(n => !currentIds.includes(n._id));
                    
                    if (hasNewNotifications) {
                        this.notifications = newNotifications;
                        this.updateNotificationBadge();
                        this.renderNotifications();
                        
                        // Show toast for new notifications
                        const newCount = newNotifications.filter(n => !currentIds.includes(n._id)).length;
                        if (newCount > 0) {
                            this.showToast(`You have ${newCount} new notification${newCount > 1 ? 's' : ''}`, 'info');
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to poll notifications:', error);
            }
        }, 30000);
    }

    /**
     * Stop notification polling
     */
    stopNotificationPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    /**
     * Utility Functions
     */
    
    sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatCategory(category) {
        return category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    showLoadingOverlay(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.querySelector('span').textContent = message;
            overlay.setAttribute('aria-hidden', 'false');
            overlay.style.display = 'flex';
        }
    }

    hideLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.setAttribute('aria-hidden', 'true');
            overlay.style.display = 'none';
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}" aria-hidden="true"></i>
                <span>${this.sanitizeHtml(message)}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close notification">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;

        // Add to document
        document.body.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    redirectToLogin() {
        window.location.href = 'login.html';
    }

    // Error rendering methods
    renderRecommendationError(containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                    Unable to load recommendations. Please try again later.
                </div>
            `;
        }
    }

    renderLeaderboardError() {
        const container = document.getElementById('leaderboardPreview');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                    Unable to load leaderboard. Please try again later.
                </div>
            `;
        }
    }

    renderNotificationsError() {
        const container = document.getElementById('notificationsList');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle" style="margin-right: 0.5rem;"></i>
                    Unable to load notifications. Please try again later.
                </div>
            `;
        }
    }

    displaySearchError() {
        const dropdown = document.getElementById('searchDropdown');
        if (dropdown) {
            dropdown.innerHTML = `
                <div class="search-item">
                    <i class="fas fa-exclamation-triangle" style="color: var(--error-color);"></i>
                    <div>
                        <span class="search-title">Search failed</span>
                        <span class="search-meta">Please try again</span>
                    </div>
                </div>
            `;
            dropdown.style.display = 'block';
        }
    }

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    // UI interaction methods
    toggleNotificationsPanel() {
        const panel = document.getElementById('notificationsPanel');
        const icon = document.getElementById('notificationsIcon');
        
        if (panel && icon) {
            const isActive = panel.classList.contains('active');
            
            if (isActive) {
                panel.classList.remove('active');
                panel.setAttribute('aria-hidden', 'true');
                icon.setAttribute('aria-expanded', 'false');
            } else {
                panel.classList.add('active');
                panel.setAttribute('aria-hidden', 'false');
                icon.setAttribute('aria-expanded', 'true');
                
                // Close other dropdowns
                this.hideUserDropdown();
                this.hideSearchDropdown();
            }
        }
    }

    toggleUserDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        const avatar = document.getElementById('user-avatar');
        
        if (dropdown && avatar) {
            const isVisible = dropdown.getAttribute('aria-hidden') === 'false';
            
            if (isVisible) {
                this.hideUserDropdown();
            } else {
                this.showUserDropdown();
                // Close other dropdowns
                this.hideNotificationsPanel();
                this.hideSearchDropdown();
            }
        }
    }

    showUserDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        const avatar = document.getElementById('user-avatar');
        
        if (dropdown && avatar) {
            dropdown.style.display = 'block';
            dropdown.setAttribute('aria-hidden', 'false');
            avatar.setAttribute('aria-expanded', 'true');
        }
    }

    hideUserDropdown() {
        const dropdown = document.getElementById('user-dropdown');
        const avatar = document.getElementById('user-avatar');
        
        if (dropdown && avatar) {
            dropdown.style.display = 'none';
            dropdown.setAttribute('aria-hidden', 'true');
            avatar.setAttribute('aria-expanded', 'false');
        }
    }

    hideNotificationsPanel() {
        const panel = document.getElementById('notificationsPanel');
        const icon = document.getElementById('notificationsIcon');
        
        if (panel && icon) {
            panel.classList.remove('active');
            panel.setAttribute('aria-hidden', 'true');
            icon.setAttribute('aria-expanded', 'false');
        }
    }

    hideSearchDropdown() {
        const dropdown = document.getElementById('searchDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
    }

    hideAllDropdowns() {
        this.hideUserDropdown();
        this.hideNotificationsPanel();
        this.hideSearchDropdown();
    }

    toggleMobileNav() {
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            const isActive = navMenu.classList.contains('active');
            
            if (isActive) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            } else {
                navMenu.classList.add('active');
                navToggle.classList.add('active');
                navToggle.setAttribute('aria-expanded', 'true');
            }
        }
    }

    handleOutsideClick(e) {
        // Close dropdowns when clicking outside
        const notificationsIcon = document.getElementById('notificationsIcon');
        const notificationsPanel = document.getElementById('notificationsPanel');
        const userAvatar = document.getElementById('user-avatar');
        const userDropdown = document.getElementById('user-dropdown');
        const searchContainer = document.querySelector('.search-container');

        if (notificationsIcon && notificationsPanel && 
            !notificationsIcon.contains(e.target) && 
            !notificationsPanel.contains(e.target)) {
            this.hideNotificationsPanel();
        }

        if (userAvatar && userDropdown && 
            !userAvatar.contains(e.target) && 
            !userDropdown.contains(e.target)) {
            this.hideUserDropdown();
        }

        if (searchContainer && !searchContainer.contains(e.target)) {
            this.hideSearchDropdown();
        }
    }

    handleWindowResize() {
        // Close mobile nav on resize to desktop
        if (window.innerWidth > 768) {
            const navMenu = document.getElementById('nav-menu');
            const navToggle = document.getElementById('nav-toggle');
            
            if (navMenu && navToggle) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        }
    }

    navigateToNotificationTarget(notification) {
        switch (notification.type) {
            case 'gig':
                if (notification.relatedId) {
                    window.location.href = `freelancing/gigs.html?id=${notification.relatedId}`;
                }
                break;
            case 'event':
                if (notification.relatedId) {
                    window.location.href = `events/events.html?id=${notification.relatedId}`;
                }
                break;
            case 'chat':
                window.location.href = 'chat/chat.html';
                break;
            default:
                // For general notifications, just close the panel
                this.hideNotificationsPanel();
        }
    }

    // Cleanup method
    cleanup() {
        this.stopNotificationPolling();
        document.removeEventListener('click', this.handleOutsideClick);
        
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }
}

// Global functions for HTML onclick handlers
function refreshActivity() {
    if (window.dashboardInstance) {
        window.dashboardInstance.loadDashboardData();
    }
}

function markAllNotificationsRead() {
    if (window.dashboardInstance) {
        // Implementation for marking all notifications as read
        console.log('Mark all notifications as read');
    }
}

function toggleNotificationsPanel() {
    if (window.dashboardInstance) {
        window.dashboardInstance.toggleNotificationsPanel();
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.setAttribute('aria-hidden', 'true');
        modal.style.display = 'none';
    }
}

function handleNotificationClick(notificationId) {
    if (window.dashboardInstance) {
        window.dashboardInstance.handleNotificationClick(notificationId);
    }
}

function viewGigDetails(gigId) {
    window.location.href = `freelancing/gigs.html?id=${gigId}`;
}

function viewEventDetails(eventId) {
    window.location.href = `events/events.html?id=${eventId}`;
}

function viewUserProfile(userId) {
    window.location.href = `profile.html?id=${userId}`;
}

function navigateToActivity(url) {
    if (url) {
        window.location.href = url;
    }
}

function navigateToGig(gigId) {
    window.location.href = `freelancing/gigs.html?id=${gigId}`;
}

function navigateToEvent(eventId) {
    window.location.href = `events/events.html?id=${eventId}`;
}

function navigateToUser(userId) {
    window.location.href = `profile.html?id=${userId}`;
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardInstance = new Dashboard();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboardInstance) {
        window.dashboardInstance.cleanup();
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Dashboard;
}