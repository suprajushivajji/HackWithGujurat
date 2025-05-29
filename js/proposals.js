// js/proposals.js
// TechSynergy Proposals Management System

/**
 * ProposalManager Class - Handles all proposals functionality
 * Features: Proposal viewing, filtering, actions, real-time updates
 */
class ProposalManager {
    constructor() {
        // Core properties
        this.app = window.app || new TechSynergyApp();
        this.currentTab = 'received';
        this.proposals = {
            received: [],
            sent: []
        };
        this.filteredProposals = {
            received: [],
            sent: []
        };
        this.currentFilters = {
            status: '',
            sortBy: 'date_desc'
        };
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.isLoading = false;
        this.selectedProposal = null;

        // API endpoints
        this.API_BASE = this.app.API_BASE || 'http://localhost:3000/api';

        // Initialize
        this.init();
    }

    /**
     * Initialize the proposal manager
     */
    async init() {
        try {
            // Check authentication
            if (!this.app.isAuthenticated()) {
                window.location.href = '../login.html';
                return;
            }

            // Setup event listeners
            this.setupEventListeners();

            // Load initial data
            await this.loadProposals();

            // Setup real-time updates
            this.setupRealTimeUpdates();

            console.log('ProposalManager initialized successfully');
        } catch (error) {
            console.error('Error initializing ProposalManager:', error);
            this.showToast('Failed to initialize proposals page', 'error');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('[onclick^="switchTab"]') || e.target.closest('[onclick^="switchTab"]')) {
                const tab = e.target.getAttribute('onclick')?.match(/switchTab\('(\w+)'\)/)?.[1] || 
                           e.target.closest('[onclick^="switchTab"]')?.getAttribute('onclick')?.match(/switchTab\('(\w+)'\)/)?.[1];
                if (tab) {
                    e.preventDefault();
                    this.switchTab(tab);
                }
            }
        });

        // Filter changes
        const statusFilter = document.getElementById('statusFilter');
        const sortBy = document.getElementById('sortBy');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }

        if (sortBy) {
            sortBy.addEventListener('change', () => this.applyFilters());
        }

        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            let searchTimeout;
            globalSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.handleSearch(e.target.value);
                }, 300);
            });
        }

        // Modal close events
        document.addEventListener('click', (e) => {
            if (e.target.matches('.modal') || e.target.matches('.modal-close')) {
                this.closeAllModals();
            }
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Refresh button
        const refreshBtn = document.querySelector('[onclick="refreshProposals()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.refreshProposals();
            });
        }

        // Export button
        const exportBtn = document.querySelector('[onclick="exportProposals()"]');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportProposals();
            });
        }
    }

    /**
     * Load proposals data
     */
    async loadProposals() {
        try {
            this.setLoading(true);

            // Load both received and sent proposals
            const [receivedResponse, sentResponse] = await Promise.all([
                this.fetchWithAuth(`${this.API_BASE}/proposals/received`),
                this.fetchWithAuth(`${this.API_BASE}/proposals/sent`)
            ]);

            this.proposals.received = receivedResponse.proposals || [];
            this.proposals.sent = sentResponse.proposals || [];

            // Update UI
            this.updateTabCounts();
            this.applyFilters();

        } catch (error) {
            console.error('Error loading proposals:', error);
            this.showToast('Failed to load proposals', 'error');
            this.showEmptyState();
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        this.currentTab = tabName;
        this.currentPage = 1;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeTab = document.getElementById(`${tabName}Tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeContent = document.getElementById(`${tabName}Proposals`);
        if (activeContent) {
            activeContent.classList.add('active');
        }

        // Apply filters to current tab
        this.applyFilters();
    }

    /**
     * Apply filters and sorting
     */
    applyFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const sortBy = document.getElementById('sortBy');

        this.currentFilters = {
            status: statusFilter?.value || '',
            sortBy: sortBy?.value || 'date_desc'
        };

        let proposals = [...this.proposals[this.currentTab]];

        // Apply status filter
        if (this.currentFilters.status) {
            proposals = proposals.filter(proposal => 
                proposal.status === this.currentFilters.status
            );
        }

        // Apply sorting
        proposals.sort((a, b) => {
            switch (this.currentFilters.sortBy) {
                case 'date_desc':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                case 'date_asc':
                    return new Date(a.createdAt) - new Date(b.createdAt);
                case 'budget_desc':
                    return (b.budget || 0) - (a.budget || 0);
                case 'budget_asc':
                    return (a.budget || 0) - (b.budget || 0);
                default:
                    return 0;
            }
        });

        this.filteredProposals[this.currentTab] = proposals;
        this.renderProposals();
    }

    /**
     * Render proposals list
     */
    renderProposals() {
        const container = document.getElementById(`${this.currentTab}ProposalsList`);
        if (!container) return;

        const proposals = this.filteredProposals[this.currentTab];
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedProposals = proposals.slice(startIndex, endIndex);

        if (paginatedProposals.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = paginatedProposals.map(proposal => 
            this.renderProposalCard(proposal)
        ).join('');

        this.setupProposalCardListeners();
        this.renderPagination();
    }

    /**
     * Render empty state
     */
    renderEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No proposals found</h3>
                <p>${this.currentTab === 'received' ? 
                    'You haven\'t received any proposals yet.' : 
                    'You haven\'t sent any proposals yet.'}</p>
            </div>
        `;
    }

    /**
     * Set loading state
     */
    setLoading(isLoading) {
        this.isLoading = isLoading;
        const loadingIndicator = document.querySelector('.loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${this.getToastIcon(type)}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 100);
    }

    /**
     * Get toast icon based on type
     */
    getToastIcon(type) {
        switch (type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
    }

    /**
     * Fetch with authentication
     */
    async fetchWithAuth(url, options = {}) {
        const token = this.app.getAuthToken();
        if (!token) {
            throw new Error('No authentication token found');
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Render individual proposal card
     */
    renderProposalCard(proposal) {
        const isReceived = this.currentTab === 'received';
        const timeAgo = this.formatTimeAgo(proposal.createdAt);
        const budget = this.formatCurrency(proposal.budget);

        return `
            <div class="proposal-card" data-proposal-id="${proposal._id}">
                <div class="proposal-priority priority-${proposal.priority || 'medium'}"></div>
                
                <div class="proposal-header">
                    <div class="proposal-info">
                        <a href="../freelancing/gigs.html?id=${proposal.gigId}" class="proposal-gig-title">
                            ${this.sanitizeHtml(proposal.gigTitle)}
                        </a>
                        <div class="proposal-meta">
                            <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                            <span><i class="fas fa-calendar"></i> ${this.formatDate(proposal.createdAt)}</span>
                            ${proposal.timeline ? <span><i class="fas fa-hourglass-half"></i> ${proposal.timeline}</span> : ''}
                        </div>
                    </div>
                    <div class="proposal-status status-${proposal.status}">
                        ${proposal.status}
                    </div>
                </div>

                ${isReceived ? this.renderFreelancerInfo(proposal.freelancer) : ''}

                <div class="proposal-excerpt">
                    ${this.sanitizeHtml(proposal.coverLetter).substring(0, 200)}${proposal.coverLetter.length > 200 ? '...' : ''}
                </div>

                <div class="proposal-budget">
                    <i class="fas fa-dollar-sign"></i>
                    ${budget}
                </div>

                ${proposal.timeline ? `
                    <div class="proposal-timeline">
                        <i class="fas fa-clock"></i>
                        Delivery: ${proposal.timeline}
                    </div>
                ` : ''}

                ${proposal.skills && proposal.skills.length > 0 ? `
                    <div class="proposal-skills">
                        ${proposal.skills.slice(0, 5).map(skill => 
                            <span class="skill-tag">${this.sanitizeHtml(skill)}</span>
                        ).join('')}
                        ${proposal.skills.length > 5 ? <span class="skill-tag">+${proposal.skills.length - 5} more</span> : ''}
                    </div>
                ` : ''}

                ${proposal.attachments && proposal.attachments.length > 0 ? `
                    <div class="proposal-attachments">
                        ${proposal.attachments.map(attachment => `
                            <a href="${attachment.url}" class="attachment-icon" target="_blank">
                                <i class="fas fa-paperclip"></i>
                                ${this.sanitizeHtml(attachment.name)}
                            </a>
                        `).join('')}
                    </div>
                ` : ''}

                ${this.renderProposalActions(proposal, isReceived)}

                ${proposal.messagesCount > 0 ? this.renderCommunicationPreview(proposal) : ''}
            </div>
        `;
    }

    /**
     * Render freelancer info for received proposals
     */
    renderFreelancerInfo(freelancer) {
        if (!freelancer) return '';

        return `
            <div class="freelancer-info">
                <img src="${freelancer.avatar || '../images/default-avatar.jpg'}" 
                     alt="${this.sanitizeHtml(freelancer.name)}" 
                     class="freelancer-avatar">
                <div class="freelancer-details">
                    <h4>${this.sanitizeHtml(freelancer.name)}</h4>
                    <div class="freelancer-rating">
                        <span class="stars">
                            ${'★'.repeat(Math.floor(freelancer.rating || 0))}${'☆'.repeat(5 - Math.floor(freelancer.rating || 0))}
                        </span>
                        <span>(${freelancer.rating || 0}/5)</span>
                        <span>•</span>
                        <span>${freelancer.completedGigs || 0} gigs completed</span>
                        ${freelancer.badge ? <span class="freelancer-badge">${freelancer.badge}</span> : ''}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render proposal actions based on status and type
     */
    renderProposalActions(proposal, isReceived) {
        if (isReceived) {
            // Actions for received proposals
            switch (proposal.status) {
                case 'pending':
                    return `
                        <div class="proposal-actions">
                            <button class="btn btn-accept" onclick="proposalManager.acceptProposal('${proposal._id}')">
                                <i class="fas fa-check"></i> Accept
                            </button>
                            <button class="btn btn-reject" onclick="proposalManager.rejectProposal('${proposal._id}')">
                                <i class="fas fa-times"></i> Reject
                            </button>
                            <button class="btn btn-view-details" onclick="proposalManager.viewProposalDetails('${proposal._id}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                        </div>
                    `;
                case 'accepted':
                    return `
                        <div class="proposal-actions">
                            <button class="btn btn-view-details" onclick="proposalManager.viewProposalDetails('${proposal._id}')">
                                <i class="fas fa-eye"></i> View Project
                            </button>
                            <button class="btn btn-outline-primary" onclick="proposalManager.startChat('${proposal.freelancer._id}')">
                                <i class="fas fa-comments"></i> Message
                            </button>
                        </div>
                    `;
                default:
                    return `
                        <div class="proposal-actions">
                            <button class="btn btn-view-details" onclick="proposalManager.viewProposalDetails('${proposal._id}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                        </div>
                    `;
            }
        } else {
            // Actions for sent proposals
            switch (proposal.status) {
                case 'pending':
                    return `
                        <div class="proposal-actions">
                            <button class="btn btn-view-details" onclick="proposalManager.viewProposalDetails('${proposal._id}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                            <button class="btn btn-withdraw" onclick="proposalManager.withdrawProposal('${proposal._id}')">
                                <i class="fas fa-undo"></i> Withdraw
                            </button>
                        </div>
                    `;
                case 'accepted':
                    return `
                        <div class="proposal-actions">
                            <button class="btn btn-view-details" onclick="proposalManager.viewProposalDetails('${proposal._id}')">
                                <i class="fas fa-eye"></i> View Project
                            </button>
                            <button class="btn btn-outline-primary" onclick="proposalManager.startChat('${proposal.clientId}')">
                                <i class="fas fa-comments"></i> Message Client
                            </button>
                        </div>
                    `;
                default:
                    return `
                        <div class="proposal-actions">
                            <button class="btn btn-view-details" onclick="proposalManager.viewProposalDetails('${proposal._id}')">
                                <i class="fas fa-eye"></i> View Details
                            </button>
                        </div>
                    `;
            }
        }
    }

    /**
     * Render communication preview
     */
    renderCommunicationPreview(proposal) {
        return `
            <div class="communication-preview">
                <h4>
                    <i class="fas fa-comments"></i>
                    Communication
                    <span class="message-count">${proposal.messagesCount}</span>
                </h4>
                ${proposal.lastMessage ? `
                    <div class="recent-message">
                        <div class="message-meta">
                            <span>${this.sanitizeHtml(proposal.lastMessage.senderName)}</span>
                            <span>${this.formatTimeAgo(proposal.lastMessage.timestamp)}</span>
                        </div>
                        <div class="message-text">
                            ${this.sanitizeHtml(proposal.lastMessage.text).substring(0, 100)}...
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Setup event listeners for proposal cards
     */
    setupProposalCardListeners() {
        // Make proposal cards clickable (for details view)
        document.querySelectorAll('.proposal-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons or links
                if (!e.target.matches('button, a, .btn, .btn *')) {
                    const proposalId = card.dataset.proposalId;
                    this.viewProposalDetails(proposalId);
                }
            });
        });
    }

    /**
     * Accept a proposal
     */
    async acceptProposal(proposalId) {
        try {
            this.selectedProposal = this.findProposal(proposalId);
            if (!this.selectedProposal) {
                this.showToast('Proposal not found', 'error');
                return;
            }

            // Show accept modal
            this.showAcceptModal();

        } catch (error) {
            console.error('Error accepting proposal:', error);
            this.showToast('Failed to accept proposal', 'error');
        }
    }

    /**
     * Show accept proposal modal
     */
    showAcceptModal() {
        const modal = document.getElementById('acceptModal');
        if (modal) {
            // Set default deadline (30 days from now)
            const defaultDeadline = new Date();
            defaultDeadline.setDate(defaultDeadline.getDate() + 30);
            const deadlineInput = document.getElementById('projectDeadline');
            if (deadlineInput) {
                deadlineInput.value = defaultDeadline.toISOString().split('T')[0];
            }

            // Set default acceptance message
            const messageInput = document.getElementById('acceptMessage');
            if (messageInput && this.selectedProposal) {
                messageInput.value = `Congratulations! Your proposal for "${this.selectedProposal.gigTitle}" has been accepted. Looking forward to working with you!`;
            }

            modal.classList.add('active');
        }
    }

    /**
     * Confirm proposal acceptance
     */
    async confirmAcceptProposal() {
        try {
            if (!this.selectedProposal) return;

            const messageInput = document.getElementById('acceptMessage');
            const deadlineInput = document.getElementById('projectDeadline');
            
            const acceptData = {
                message: messageInput?.value || '',
                deadline: deadlineInput?.value || '',
                milestones: this.getMilestones()
            };

            const response = await this.fetchWithAuth(
                `${this.API_BASE}/proposals/${this.selectedProposal._id}/accept`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(acceptData)
                }
            );

            if (response.success) {
                this.showToast('Proposal accepted successfully!', 'success');
                this.closeAllModals();
                await this.refreshProposals();
            } else {
                throw new Error(response.message || 'Failed to accept proposal');
            }

        } catch (error) {
            console.error('Error confirming proposal acceptance:', error);
            this.showToast('Failed to accept proposal', 'error');
        }
    }

    /**
     * Get milestones from modal form
     */
    getMilestones() {
        const milestones = [];
        const milestoneItems = document.querySelectorAll('.milestone-item');
        
        milestoneItems.forEach(item => {
            const desc = item.querySelector('.milestone-desc')?.value;
            const date = item.querySelector('.milestone-date')?.value;
            const amount = item.querySelector('.milestone-amount')?.value;
            
            if (desc && date && amount) {
                milestones.push({
                    description: desc,
                    dueDate: date,
                    amount: parseFloat(amount)
                });
            }
        });
        
        return milestones;
    }

    /**
     * Add milestone to accept modal
     */
    addMilestone() {
        const container = document.getElementById('milestonesContainer');
        if (!container) return;

        const milestoneHtml = `
            <div class="milestone-item">
                <input type="text" placeholder="Milestone description" class="milestone-desc">
                <input type="date" class="milestone-date">
                <input type="number" placeholder="Amount" class="milestone-amount" min="0" step="0.01">
                <button type="button" class="milestone-remove" onclick="this.parentElement.remove()">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', milestoneHtml);
    }

    /**
     * Reject a proposal
     */
    async rejectProposal(proposalId) {
        try {
            this.selectedProposal = this.findProposal(proposalId);
            if (!this.selectedProposal) {
                this.showToast('Proposal not found', 'error');
                return;
            }

            // Show reject modal
            this.showRejectModal();

        } catch (error) {
            console.error('Error rejecting proposal:', error);
            this.showToast('Failed to reject proposal', 'error');
        }
    }

    /**
     * Show reject proposal modal
     */
    showRejectModal() {
        const modal = document.getElementById('rejectModal');
        if (modal) {
            // Clear previous values
            const reasonSelect = document.getElementById('rejectReason');
            const messageInput = document.getElementById('rejectMessage');
            
            if (reasonSelect) reasonSelect.value = '';
            if (messageInput) messageInput.value = '';

            modal.classList.add('active');
        }
    }

    /**
     * Confirm proposal rejection
     */
    async confirmRejectProposal() {
        try {
            if (!this.selectedProposal) return;

            const reasonSelect = document.getElementById('rejectReason');
            const messageInput = document.getElementById('rejectMessage');
            
            if (!reasonSelect?.value) {
                this.showToast('Please select a reason for rejection', 'warning');
                return;
            }

            const rejectData = {
                reason: reasonSelect.value,
                message: messageInput?.value || ''
            };

            const response = await this.fetchWithAuth(
                `${this.API_BASE}/proposals/${this.selectedProposal._id}/reject`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rejectData)
                }
            );

            if (response.success) {
                this.showToast('Proposal rejected', 'success');
                this.closeAllModals();
                await this.refreshProposals();
            } else {
                throw new Error(response.message || 'Failed to reject proposal');
            }

        } catch (error) {
            console.error('Error confirming proposal rejection:', error);
            this.showToast('Failed to reject proposal', 'error');
        }
    }

    /**
     * Withdraw a proposal
     */
    async withdrawProposal(proposalId) {
        try {
            const proposal = this.findProposal(proposalId);
            if (!proposal) {
                this.showToast('Proposal not found', 'error');
                return;
            }

            const confirmed = confirm('Are you sure you want to withdraw this proposal? This action cannot be undone.');
            if (!confirmed) return;

            const response = await this.fetchWithAuth(
                `${this.API_BASE}/proposals/${proposalId}/withdraw`,
                { method: 'POST' }
            );

            if (response.success) {
                this.showToast('Proposal withdrawn successfully', 'success');
                await this.refreshProposals();
            } else {
                throw new Error(response.message || 'Failed to withdraw proposal');
            }

        } catch (error) {
            console.error('Error withdrawing proposal:', error);
            this.showToast('Failed to withdraw proposal', 'error');
        }
    }

    /**
     * View proposal details
     */
    async viewProposalDetails(proposalId) {
        try {
            const proposal = this.findProposal(proposalId);
            if (!proposal) {
                this.showToast('Proposal not found', 'error');
                return;
            }

            // Load full proposal details
            const response = await this.fetchWithAuth(
                `${this.API_BASE}/proposals/${proposalId}`
            );

            if (response.success) {
                this.showProposalDetailModal(response.proposal);
            } else {
                throw new Error(response.message || 'Failed to load proposal details');
            }

        } catch (error) {
            console.error('Error viewing proposal details:', error);
            this.showToast('Failed to load proposal details', 'error');
        }
    }

    /**
     * Show proposal detail modal
     */
    showProposalDetailModal(proposal) {
        const modal = document.getElementById('proposalModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        if (!modal || !modalBody) return;

        // Set title
        if (modalTitle) {
            modalTitle.textContent = `Proposal: ${proposal.gigTitle}`;
        }

        // Set body content
        modalBody.innerHTML = this.renderProposalDetailContent(proposal);

        // Set footer actions
        if (modalFooter) {
            modalFooter.innerHTML = this.renderProposalDetailActions(proposal);
        }

        modal.classList.add('active');
    }

    /**
     * Render proposal detail content
     */
    renderProposalDetailContent(proposal) {
        const isReceived = this.currentTab === 'received';
        
        return `
            <div class="proposal-detail">
                <div class="proposal-detail-header">
                    <div class="proposal-detail-meta">
                        <div class="meta-item budget">
                            <div class="label">Budget</div>
                            <div class="value">${this.formatCurrency(proposal.budget)}</div>
                        </div>
                        <div class="meta-item">
                            <div class="label">Timeline</div>
                            <div class="value">${proposal.timeline || 'Not specified'}</div>
                        </div>
                        <div class="meta-item">
                            <div class="label">Status</div>
                            <div class="value">
                                <span class="proposal-status status-${proposal.status}">
                                    ${proposal.status}
                                </span>
                            </div>
                        </div>
                        <div class="meta-item">
                            <div class="label">Submitted</div>
                            <div class="value">${this.formatDate(proposal.createdAt)}</div>
                        </div>
                    </div>
                </div>

                ${isReceived && proposal.freelancer ? this.renderFreelancerInfo(proposal.freelancer) : ''}

                <div class="proposal-section">
                    <h3>Cover Letter</h3>
                    <div class="proposal-content">
                        ${this.sanitizeHtml(proposal.coverLetter).replace(/\n/g, '<br>')}
                    </div>
                </div>

                ${proposal.skills && proposal.skills.length > 0 ? `
                    <div class="proposal-section">
                        <h3>Relevant Skills</h3>
                        <div class="proposal-skills">
                            ${proposal.skills.map(skill => 
                                <span class="skill-tag">${this.sanitizeHtml(skill)}</span>
                            ).join('')}
                        </div>
                    </div>
                ` : ''}

                ${proposal.portfolio && proposal.portfolio.length > 0 ? `
                    <div class="proposal-section">
                        <h3>Portfolio Items</h3>
                        <div class="portfolio-items">
                            ${proposal.portfolio.map(item => `
                                <div class="portfolio-item">
                                    <h4>${this.sanitizeHtml(item.title)}</h4>
                                    <p>${this.sanitizeHtml(item.description)}</p>
                                    ${item.url ? <a href="${item.url}" target="_blank" class="btn btn-outline-primary">View Project</a> : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${proposal.attachments && proposal.attachments.length > 0 ? `
                    <div class="proposal-section">
                        <h3>Attachments</h3>
                        <div class="proposal-attachments">
                            ${proposal.attachments.map(attachment => `
                                <a href="${attachment.url}" class="attachment-icon" target="_blank">
                                    <i class="fas fa-paperclip"></i>
                                    ${this.sanitizeHtml(attachment.name)}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${proposal.milestones && proposal.milestones.length > 0 ? `
                    <div class="proposal-section">
                        <h3>Project Milestones</h3>
                        <div class="milestones-list">
                            ${proposal.milestones.map((milestone, index) => `
                                <div class="milestone-display">
                                    <div class="milestone-number">${index + 1}</div>
                                    <div class="milestone-details">
                                        <h4>${this.sanitizeHtml(milestone.description)}</h4>
                                        <div class="milestone-meta">
                                            <span><i class="fas fa-calendar"></i> ${this.formatDate(milestone.dueDate)}</span>
                                            <span><i class="fas fa-dollar-sign"></i> ${this.formatCurrency(milestone.amount)}</span>
                                        </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${proposal.questions && proposal.questions.length > 0 ? `
                    <div class="proposal-section">
                        <h3>Additional Questions</h3>
                        <div class="questions-list">
                            ${proposal.questions.map(qa => `
                                <div class="question-item">
                                    <div class="question">${this.sanitizeHtml(qa.question)}</div>
                                    <div class="answer">${this.sanitizeHtml(qa.answer)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render proposal detail modal actions
     */
    renderProposalDetailActions(proposal) {
        const isReceived = this.currentTab === 'received';
        
        let actions = `
            <button class="btn btn-outline" onclick="proposalManager.closeAllModals()">
                Close
            </button>
        `;

        if (isReceived && proposal.status === 'pending') {
            actions += `
                <button class="btn btn-reject" onclick="proposalManager.rejectProposal('${proposal._id}')">
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="btn btn-accept" onclick="proposalManager.acceptProposal('${proposal._id}')">
                    <i class="fas fa-check"></i> Accept
                </button>
            `;
        } else if (!isReceived && proposal.status === 'pending') {
            actions += `
                <button class="btn btn-withdraw" onclick="proposalManager.withdrawProposal('${proposal._id}')">
                    <i class="fas fa-undo"></i> Withdraw
                </button>
            `;
        }

        if (proposal.status === 'accepted') {
            const chatUserId = isReceived ? proposal.freelancer._id : proposal.clientId;
            actions += `
                <button class="btn btn-primary" onclick="proposalManager.startChat('${chatUserId}')">
                    <i class="fas fa-comments"></i> Message
                </button>
            `;
        }

        return actions;
    }

    /**
     * Start chat with user
     */
    startChat(userId) {
        if (!userId) {
            this.showToast('User ID not found', 'error');
            return;
        }

        // Redirect to chat page with user ID
        window.location.href = `../chat/chat.html?user=${userId}`;
    }

    /**
     * Handle global search
     */
    async handleSearch(query) {
        if (!query || query.length < 2) {
            // Reset to show all proposals
            this.applyFilters();
            return;
        }

        try {
            const searchResults = await this.fetchWithAuth(
                `${this.API_BASE}/search?q=${encodeURIComponent(query)}&type=proposals`
            );

            if (searchResults.success) {
                this.displaySearchResults(searchResults.results);
            }

        } catch (error) {
            console.error('Error searching:', error);
            // Fall back to local search
            this.performLocalSearch(query);
        }
    }

    /**
     * Perform local search on proposals
     */
    performLocalSearch(query) {
        const searchTerm = query.toLowerCase();
        let proposals = [...this.proposals[this.currentTab]];

        proposals = proposals.filter(proposal => {
            return (
                proposal.gigTitle.toLowerCase().includes(searchTerm) ||
                proposal.coverLetter.toLowerCase().includes(searchTerm) ||
                (proposal.skills && proposal.skills.some(skill => 
                    skill.toLowerCase().includes(searchTerm)
                )) ||
                (proposal.freelancer && proposal.freelancer.name.toLowerCase().includes(searchTerm))
            );
        });

        this.filteredProposals[this.currentTab] = proposals;
        this.renderProposals();
    }

    /**
     * Display search results in dropdown
     */
    displaySearchResults(results) {
        const dropdown = document.getElementById('searchResults');
        if (!dropdown || !results) return;

        if (results.length === 0) {
            dropdown.innerHTML = '<div class="search-no-results">No results found</div>';
            dropdown.style.display = 'block';
            return;
        }

        const html = results.map(result => {
            switch (result.type) {
                case 'proposal':
                    return `
                        <div class="search-result-item" onclick="proposalManager.viewProposalDetails('${result._id}')">
                            <div class="search-result-title">${this.sanitizeHtml(result.gigTitle)}</div>
                            <div class="search-result-meta">Proposal • ${this.formatCurrency(result.budget)}</div>
                        </div>
                    `;
                case 'gig':
                    return `
                        <div class="search-result-item" onclick="window.location.href='../freelancing/gigs.html?id=${result._id}'">
                            <div class="search-result-title">${this.sanitizeHtml(result.title)}</div>
                            <div class="search-result-meta">Gig • ${this.formatCurrency(result.budget)}</div>
                        </div>
                    `;
                case 'user':
                    return `
                        <div class="search-result-item" onclick="window.location.href='../profile.html?id=${result._id}'">
                            <div class="search-result-title">${this.sanitizeHtml(result.name)}</div>
                            <div class="search-result-meta">User • ${result.title || 'Freelancer'}</div>
                        </div>
                    `;
                default:
                    return '';
            }
        }).join('');

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';

        // Hide dropdown when clicking outside
        setTimeout(() => {
            const handleClickOutside = (e) => {
                if (!dropdown.contains(e.target) && !document.getElementById('globalSearch').contains(e.target)) {
                    dropdown.style.display = 'none';
                    document.removeEventListener('click', handleClickOutside);
                }
            };
            document.addEventListener('click', handleClickOutside);
        }, 100);
    }

    /**
     * Refresh proposals data
     */
    async refreshProposals() {
        try {
            this.showToast('Refreshing proposals...', 'info');
            await this.loadProposals();
            this.showToast('Proposals refreshed successfully', 'success');
        } catch (error) {
            console.error('Error refreshing proposals:', error);
            this.showToast('Failed to refresh proposals', 'error');
        }
    }

    /**
     * Export proposals data
     */
    async exportProposals() {
        try {
            const proposals = this.filteredProposals[this.currentTab];
            if (proposals.length === 0) {
                this.showToast('No proposals to export', 'warning');
                return;
            }

            // Prepare data for export
            const exportData = proposals.map(proposal => ({
                'Gig Title': proposal.gigTitle,
                'Status': proposal.status,
                'Budget': proposal.budget,
                'Timeline': proposal.timeline,
                'Freelancer': proposal.freelancer?.name || 'N/A',
                'Submitted': this.formatDate(proposal.createdAt),
                'Cover Letter': proposal.coverLetter.substring(0, 100) + '...'
            }));

            // Convert to CSV
            const csv = this.convertToCSV(exportData);
            
            // Download file
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `proposals_${this.currentTab}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showToast('Proposals exported successfully', 'success');

        } catch (error) {
            console.error('Error exporting proposals:', error);
            this.showToast('Failed to export proposals', 'error');
        }
    }

    /**
     * Convert data to CSV format
     */
    convertToCSV(data) {
        if (!data || data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => {
            return headers.map(header => {
                const value = row[header] || '';
                // Escape quotes and wrap in quotes if contains comma
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? "${escaped}" : escaped;
            }).join(',');
        });

        return [csvHeaders, ...csvRows].join('\n');
    }

    /**
     * Update tab counts
     */
    updateTabCounts() {
        const receivedCount = document.getElementById('receivedCount');
        const sentCount = document.getElementById('sentCount');

        if (receivedCount) {
            receivedCount.textContent = this.proposals.received.length;
        }

        if (sentCount) {
            sentCount.textContent = this.proposals.sent.length;
        }
    }

    /**
     * Update pagination
     */
    updatePagination(totalItems) {
        const container = document.getElementById('paginationContainer');
        const pagination = document.getElementById('pagination');
        
        if (!container || !pagination) return;

        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'flex';

        let paginationHtml = '';

        // Previous button
        paginationHtml += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="proposalManager.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHtml += <button onclick="proposalManager.goToPage(1)">1</button>;
            if (startPage > 2) {
                paginationHtml += <span class="pagination-ellipsis">...</span>;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button ${i === this.currentPage ? 'class="active"' : ''} 
                        onclick="proposalManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += <span class="pagination-ellipsis">...</span>;
            }
            paginationHtml += <button onclick="proposalManager.goToPage(${totalPages})">${totalPages}</button>;
        }

        // Next button
        paginationHtml += `
            <button ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="proposalManager.goToPage(${this.currentPage + 1})">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHtml;
    }

    /**
     * Go to specific page
     */
    goToPage(page) {
        const totalPages = Math.ceil(this.filteredProposals[this.currentTab].length / this.itemsPerPage);
        
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.renderProposals();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Setup real-time updates
     */
    setupRealTimeUpdates() {
        // Check for updates every 30 seconds
        setInterval(async () => {
            try {
                await this.checkForUpdates();
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        }, 30000);

        // Setup WebSocket if available
        if (window.io && this.app.user) {
            const socket = window.io();
            
            socket.on('proposalUpdate', (data) => {
                this.handleRealTimeUpdate(data);
            });

            socket.on('newProposal', (data) => {
                this.handleNewProposal(data);
            });
        }
    }

    /**
     * Check for proposal updates
     */
    async checkForUpdates() {
        try {
            const response = await this.fetchWithAuth(
                `${this.API_BASE}/proposals/updates?lastCheck=${this.lastUpdateCheck || 0}`
            );

            if (response.success && response.updates.length > 0) {
                response.updates.forEach(update => {
                    this.handleRealTimeUpdate(update);
                });
                this.lastUpdateCheck = Date.now();
            }

        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }

    /**
     * Handle real-time proposal updates
     */
    handleRealTimeUpdate(update) {
        const { proposalId, type, data } = update;

        switch (type) {
            case 'status_change':
                this.updateProposalStatus(proposalId, data.status);
                break;
            case 'new_message':
                this.updateProposalMessages(proposalId, data.messageCount);
                break;
            case 'proposal_updated':
                this.refreshSingleProposal(proposalId);
                break;
        }
    }

    /**
     * Handle new proposal notification
     */
    handleNewProposal(data) {
        if (this.currentTab === 'received') {
            this.showToast(`New proposal received for "${data.gigTitle}"`, 'info');
            this.refreshProposals();
        }
    }

    /**
     * Update proposal status in UI
     */
    updateProposalStatus(proposalId, newStatus) {
        // Update in data
        ['received', 'sent'].forEach(tab => {
            const proposal = this.proposals[tab].find(p => p._id === proposalId);
            if (proposal) {
                proposal.status = newStatus;
            }
        });

        // Update in UI
        const statusElement = document.querySelector(`[data-proposal-id="${proposalId}"] .proposal-status`);
        if (statusElement) {
            statusElement.className = `proposal-status status-${newStatus}`;
            statusElement.textContent = newStatus;
        }

        // Re-apply filters to reflect changes
        this.applyFilters();
    }

    /**
     * Utility Functions
     */

    /**
     * Find proposal by ID
     */
    findProposal(proposalId) {
        return this.proposals.received.find(p => p._id === proposalId) ||
               this.proposals.sent.find(p => p._id === proposalId);
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Format time ago
     */
    formatTimeAgo(dateString) {
        if (!dateString) return '';
        
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        
        return this.formatDate(dateString);
    }
}

// Global functions for onclick handlers
window.switchTab = function(tab) {
    if (window.proposalManager) {
        window.proposalManager.switchTab(tab);
    }
};

window.applyFilters = function() {
    if (window.proposalManager) {
        window.proposalManager.applyFilters();
    }
};

window.refreshProposals = function() {
    if (window.proposalManager) {
        window.proposalManager.refreshProposals();
    }
};

window.exportProposals = function() {
    if (window.proposalManager) {
        window.proposalManager.exportProposals();
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};

window.addMilestone = function() {
    if (window.proposalManager) {
        window.proposalManager.addMilestone();
    }
};

window.confirmAcceptProposal = function() {
    if (window.proposalManager) {
        window.proposalManager.confirmAcceptProposal();
    }
};

window.confirmRejectProposal = function() {
    if (window.proposalManager) {
        window.proposalManager.confirmRejectProposal();
    }
};

// User dropdown functions
window.toggleUserDropdown = function() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
};

window.logout = function() {
    if (window.app) {
        window.app.logout();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ProposalManager !== 'undefined') {
        window.proposalManager = new ProposalManager();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ProposalManager };
}