// TechSynergy - Gigs JavaScript Module
// Handles gig creation, listing, filtering, proposals, and dashboard

class GigsManager {
    constructor() {
        this.currentUser = this.getCurrentUser();
        this.gigs = [];
        this.userProposals = [];
        this.userGigs = [];
        this.init();
    }

    init() {
        this.loadGigs();
        this.loadUserProposals();
        this.loadUserGigs();
        this.setupEventListeners();
        this.renderGigsList();
        this.renderDashboard();
    }

    // Get current user from localStorage
    getCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        return userData ? JSON.parse(userData) : null;
    }

    // Setup event listeners
    setupEventListeners() {
        // Gig creation form
        const gigForm = document.getElementById('gigForm');
        if (gigForm) {
            gigForm.addEventListener('submit', (e) => this.handleGigSubmission(e));
        }

        // Search functionality
        const searchInput = document.getElementById('searchFilter');
        const clearSearchBtn = document.getElementById('clearSearch');
        const searchIcon = document.querySelector('.search-input-container .search-icon');

        // Function to handle search input
        function handleSearch() {
            const searchValue = searchInput.value.trim();
            
            // Show/hide clear button based on input
            if (searchValue.length > 0) {
                clearSearchBtn.style.display = 'flex';
                searchIcon.style.display = 'none';
            } else {
                clearSearchBtn.style.display = 'none';
                searchIcon.style.display = 'block';
            }
            
            // Add your search filtering logic here
            this.handleSearch(searchValue);
        }

        // Function to clear search
        function clearSearch() {
            searchInput.value = '';
            clearSearchBtn.style.display = 'none';
            searchIcon.style.display = 'block';
            this.handleSearch('');
        }

        // Add event listeners
        searchInput.addEventListener('input', handleSearch);
        searchInput.addEventListener('focus', handleSearch);
        searchInput.addEventListener('blur', () => {
            if (searchInput.value.trim().length === 0) {
                clearSearchBtn.style.display = 'none';
                searchIcon.style.display = 'block';
            }
        });

        // Filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.filter));
        });

        // Sort dropdown
        const sortSelect = document.getElementById('sortGigs');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => this.handleSort(e.target.value));
        }

        // Proposal modal
        const proposalModal = document.getElementById('proposalModal');
        if (proposalModal) {
            this.setupProposalModal();
        }
    }

    // Handle gig creation form submission
    async handleGigSubmission(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showNotification('Please login to create a gig', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const gigData = {
            id: this.generateId(),
            title: formData.get('title'),
            description: formData.get('description'),
            budget: parseFloat(formData.get('budget')),
            skills: formData.get('skills').split(',').map(skill => skill.trim()),
            deadline: formData.get('deadline'),
            category: formData.get('category'),
            clientId: this.currentUser.id,
            clientName: this.currentUser.name,
            status: 'open',
            proposals: [],
            createdAt: new Date().toISOString(),
            views: 0
        };

        try {
            // In a real app, this would be an API call
            await this.createGig(gigData);
            this.showNotification('Gig created successfully!', 'success');
            e.target.reset();
            this.renderGigsList();
            this.renderDashboard();
        } catch (error) {
            this.showNotification('Failed to create gig. Please try again.', 'error');
            console.error('Error creating gig:', error);
        }
    }

    // Create a new gig
    async createGig(gigData) {
        // Simulate API call
        return new Promise((resolve) => {
            setTimeout(() => {
                this.gigs.push(gigData);
                this.saveGigs();
                resolve(gigData);
            }, 500);
        });
    }

    // Handle search functionality
    handleSearch(query) {
        const filteredGigs = this.gigs.filter(gig => 
            gig.title.toLowerCase().includes(query.toLowerCase()) ||
            gig.description.toLowerCase().includes(query.toLowerCase()) ||
            gig.skills.some(skill => skill.toLowerCase().includes(query.toLowerCase()))
        );
        this.renderGigsList(filteredGigs);
    }

    // Handle category filtering
    handleFilter(category) {
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        let filteredGigs = this.gigs;
        if (category !== 'all') {
            filteredGigs = this.gigs.filter(gig => gig.category === category);
        }
        this.renderGigsList(filteredGigs);
    }

    // Handle sorting
    handleSort(sortBy) {
        let sortedGigs = [...this.gigs];
        
        switch (sortBy) {
            case 'newest':
                sortedGigs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                sortedGigs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'budget-high':
                sortedGigs.sort((a, b) => b.budget - a.budget);
                break;
            case 'budget-low':
                sortedGigs.sort((a, b) => a.budget - b.budget);
                break;
            case 'deadline':
                sortedGigs.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
                break;
        }
        
        this.renderGigsList(sortedGigs);
    }

    // Render gigs list
    renderGigsList(gigsToRender = this.gigs) {
        const gigsContainer = document.getElementById('gigsContainer');
        if (!gigsContainer) return;

        if (gigsToRender.length === 0) {
            gigsContainer.innerHTML = `
                <div class="no-gigs">
                    <h3>No gigs found</h3>
                    <p>Try adjusting your search or filters</p>
                </div>
            `;
            return;
        }

        gigsContainer.innerHTML = gigsToRender.map(gig => this.createGigCard(gig)).join('');
        
        // Add event listeners to gig cards
        this.addGigCardListeners();
    }

    // Create gig card HTML
    createGigCard(gig) {
        const timeAgo = this.getTimeAgo(gig.createdAt);
        const skillsHtml = gig.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('');
        const isOwnGig = this.currentUser && gig.clientId === this.currentUser.id;
        
        return `
            <div class="gig-card" data-gig-id="${gig.id}">
                <div class="gig-header">
                    <h3 class="gig-title">${gig.title}</h3>
                    <span class="gig-status status-${gig.status}">${gig.status}</span>
                </div>
                
                <p class="gig-description">${gig.description.substring(0, 150)}${gig.description.length > 150 ? '...' : ''}</p>
                
                <div class="gig-skills">
                    ${skillsHtml}
                </div>
                
                <div class="gig-meta">
                    <div class="gig-budget">$${gig.budget}</div>
                    <div class="gig-deadline">Due: ${this.formatDate(gig.deadline)}</div>
                    <div class="gig-category">${gig.category}</div>
                </div>
                
                <div class="gig-footer">
                    <div class="gig-client">
                        <span class="client-name">${gig.clientName}</span>
                        <span class="posted-time">Posted ${timeAgo}</span>
                    </div>
                    
                    <div class="gig-actions">
                        ${isOwnGig ? `
                            <button class="btn btn-secondary" onclick="gigsManager.viewProposals('${gig.id}')">
                                View Proposals (${gig.proposals.length})
                            </button>
                        ` : `
                            <button class="btn btn-primary" onclick="gigsManager.showProposalModal('${gig.id}')" 
                                ${this.hasUserApplied(gig.id) ? 'disabled' : ''}>
                                ${this.hasUserApplied(gig.id) ? 'Applied' : 'Apply Now'}
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    // Add event listeners to gig cards
    addGigCardListeners() {
        const gigCards = document.querySelectorAll('.gig-card');
        gigCards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn')) {
                    const gigId = card.dataset.gigId;
                    this.viewGigDetails(gigId);
                }
            });
        });
    }

    // Submit proposal for a gig
    submitProposal(gigId) {
        if (!this.currentUser) {
            this.showNotification('Please login to submit a proposal', 'error');
            return;
        }

        const gig = this.gigs.find(g => g.id === gigId);
        if (!gig) return;

        // Show proposal modal
        this.showProposalModal(gig);
    }

    // Show proposal submission modal
    showProposalModal(gig) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('aria-hidden', 'false');
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Submit Proposal for "${gig.title}"</h2>
                    <button class="modal-close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="proposalForm" class="proposal-form">
                        <div class="form-group">
                            <label for="proposalAmount">Your Bid Amount ($)</label>
                            <input type="number" id="proposalAmount" name="amount" min="1" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="proposalDuration">Estimated Duration (days)</label>
                            <input type="number" id="proposalDuration" name="duration" min="1" required>
                        </div>
                        <div class="form-group">
                            <label for="proposalMessage">Cover Letter</label>
                            <textarea id="proposalMessage" name="message" rows="5" required></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">Submit Proposal</button>
                            <button type="button" class="btn btn-secondary" onclick="gigsManager.closeModal()">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners
        const form = modal.querySelector('#proposalForm');
        form.addEventListener('submit', (e) => this.handleProposalSubmission(e, gig.id));
        
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal());
    }

    // Handle proposal form submission
    async handleProposalSubmission(e, gigId) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const proposalData = {
            id: this.generateId(),
            gigId: gigId,
            freelancerId: this.currentUser.id,
            freelancerName: this.currentUser.name,
            bid: parseFloat(formData.get('amount')),
            duration: parseInt(formData.get('duration')),
            coverLetter: formData.get('message'),
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        try {
            await this.submitProposalData(proposalData);
            this.closeModal();
            this.showNotification('Proposal submitted successfully!', 'success');
            this.renderGigsList();
            this.renderDashboard();
        } catch (error) {
            this.showNotification('Failed to submit proposal. Please try again.', 'error');
            console.error('Error submitting proposal:', error);
        }
    }

    // Submit proposal data
    async submitProposalData(proposalData) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Add proposal to gig
                const gig = this.gigs.find(g => g.id === proposalData.gigId);
                if (gig) {
                    gig.proposals.push(proposalData);
                }
                
                // Add to user proposals
                this.userProposals.push(proposalData);
                
                this.saveGigs();
                this.saveUserProposals();
                resolve(proposalData);
            }, 500);
        });
    }

    // View gig details
    viewGigDetails(gigId) {
        const gig = this.gigs.find(g => g.id === gigId);
        if (!gig) return;

        // Increment view count
        gig.views++;
        this.saveGigs();

        // Show detailed view (could be a modal or navigation to detail page)
        this.showGigDetailModal(gig);
    }

    // Show gig detail modal
    showGigDetailModal(gig) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.setAttribute('aria-hidden', 'false');
        modal.innerHTML = `
            <div class="modal-content large">
                <div class="modal-header">
                    <h2>${gig.title}</h2>
                    <button class="modal-close" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="gig-detail-content">
                        <div class="gig-detail-header">
                            <div class="gig-detail-meta">
                                <span class="gig-budget">$${gig.budget}</span>
                                <span class="gig-category">${gig.category}</span>
                                <span class="gig-status status-${gig.status}">${gig.status}</span>
                            </div>
                            <div class="gig-detail-stats">
                                <span><i class="fas fa-eye"></i> ${gig.views} views</span>
                                <span><i class="fas fa-file-alt"></i> ${gig.proposals.length} proposals</span>
                            </div>
                        </div>
                        
                        <div class="gig-detail-description">
                            <h3>Description</h3>
                            <p>${gig.description}</p>
                        </div>
                        
                        <div class="gig-detail-skills">
                            <h3>Required Skills</h3>
                            <div class="skills-list">
                                ${gig.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                            </div>
                        </div>
                        
                        <div class="gig-detail-info">
                            <div class="info-item">
                                <i class="fas fa-calendar"></i>
                                <span>Posted: ${this.formatDate(gig.createdAt)}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-clock"></i>
                                <span>Deadline: ${this.formatDate(gig.deadline)}</span>
                            </div>
                            <div class="info-item">
                                <i class="fas fa-user"></i>
                                <span>Client: ${gig.clientName}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    ${this.currentUser && gig.clientId !== this.currentUser.id ? `
                        <button class="btn btn-primary" onclick="gigsManager.showProposalModal('${gig.id}')"
                            ${this.hasUserApplied(gig.id) ? 'disabled' : ''}>
                            ${this.hasUserApplied(gig.id) ? 'Already Applied' : 'Apply Now'}
                        </button>
                    ` : ''}
                    <button class="btn btn-secondary" onclick="gigsManager.closeModal()">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listener for close button
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => this.closeModal());
    }

    // View proposals for a gig (for gig owners)
    viewProposals(gigId) {
        const gig = this.gigs.find(g => g.id === gigId);
        if (!gig || gig.clientId !== this.currentUser.id) return;

        this.showProposalsModal(gig);
    }

    // Show proposals modal
    showProposalsModal(gig) {
        const modal = document.getElementById('proposalsModal') || this.createProposalsModal();
        const modalContent = modal.querySelector('.modal-content');
        
        const proposalsHtml = gig.proposals.length > 0 
            ? gig.proposals.map(proposal => this.createProposalCard(proposal)).join('')
            : '<p class="no-proposals">No proposals yet</p>';

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>Proposals for "${gig.title}"</h3>
                <button class="close-btn" onclick="gigsManager.closeModal()">&times;</button>
            </div>
            
            <div class="modal-body">
                <div class="proposals-list">
                    ${proposalsHtml}
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    // Create proposal card for proposals list
    createProposalCard(proposal) {
        const timeAgo = this.getTimeAgo(proposal.submittedAt);
        
        return `
            <div class="proposal-card">
                <div class="proposal-header">
                    <h4>${proposal.freelancerName}</h4>
                    <span class="proposal-status status-${proposal.status}">${proposal.status}</span>
                </div>
                
                <div class="proposal-details">
                    <div class="proposal-bid">
                        <strong>Bid:</strong> ₹${proposal.bid.toLocaleString()}
                    </div>
                    <div class="proposal-duration">
                        <strong>Delivery:</strong> ${proposal.duration} days
                    </div>
                    <div class="proposal-time">
                        <strong>Submitted:</strong> ${timeAgo}
                    </div>
                </div>
                
                <div class="proposal-cover">
                    <h5>Cover Letter:</h5>
                    <p>${proposal.coverLetter}</p>
                </div>
                
                <div class="proposal-actions">
                    <button class="btn btn-primary btn-sm" 
                            onclick="gigsManager.acceptProposal('${proposal.id}')">
                        Accept
                    </button>
                    <button class="btn btn-outline btn-sm" 
                            onclick="gigsManager.rejectProposal('${proposal.id}')">
                        Reject
                    </button>
                </div>
            </div>
        `;
    }

    // Create proposals modal if it doesn't exist
    createProposalsModal() {
        const modal = document.createElement('div');
        modal.id = 'proposalsModal';
        modal.className = 'modal';
        modal.innerHTML = '<div class="modal-content"></div>';
        document.body.appendChild(modal);
        return modal;
    }

    // Accept a proposal
    async acceptProposal(proposalId) {
        const proposal = this.findProposal(proposalId);
        if (!proposal) return;

        proposal.status = 'accepted';
        
        // Mark gig as in progress
        const gig = this.gigs.find(g => g.id === proposal.gigId);
        if (gig) {
            gig.status = 'in-progress';
            // Reject other proposals
            gig.proposals.forEach(p => {
                if (p.id !== proposalId && p.status === 'pending') {
                    p.status = 'rejected';
                }
            });
        }

        this.saveGigs();
        this.saveUserProposals();
        
        this.showNotification('Proposal accepted successfully!', 'success');
        this.closeModal();
        this.renderDashboard();
    }

    // Reject a proposal
    async rejectProposal(proposalId) {
        const proposal = this.findProposal(proposalId);
        if (!proposal) return;

        proposal.status = 'rejected';
        
        this.saveGigs();
        this.saveUserProposals();
        
        this.showNotification('Proposal rejected', 'info');
        this.viewProposals(proposal.gigId); // Refresh the proposals view
    }

    // Find proposal by ID
    findProposal(proposalId) {
        for (const gig of this.gigs) {
            const proposal = gig.proposals.find(p => p.id === proposalId);
            if (proposal) return proposal;
        }
        return null;
    }

    // Render dashboard
    renderDashboard() {
        this.renderMyGigs();
        this.renderMyProposals();
        this.renderGigStats();
    }

    // Render user's created gigs
    renderMyGigs() {
        const container = document.getElementById('myGigsContainer');
        if (!container || !this.currentUser) return;

        const myGigs = this.gigs.filter(gig => gig.clientId === this.currentUser.id);
        
        if (myGigs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No gigs created yet</h4>
                    <p>Create your first gig to get started</p>
                    <a href="#create-gig" class="btn btn-primary">Create Gig</a>
                </div>
            `;
            return;
        }

        container.innerHTML = myGigs.map(gig => `
            <div class="dashboard-gig-card">
                <div class="gig-info">
                    <h4>${gig.title}</h4>
                    <p>Budget: ₹${gig.budget.toLocaleString()}</p>
                    <span class="status status-${gig.status}">${gig.status}</span>
                </div>
                <div class="gig-stats">
                    <span>${gig.proposals.length} proposals</span>
                    <span>${gig.views} views</span>
                </div>
                <div class="gig-actions">
                    <button class="btn btn-sm btn-outline" 
                            onclick="gigsManager.viewProposals('${gig.id}')">
                        View Proposals
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Render user's proposals
    renderMyProposals() {
        const container = document.getElementById('myProposalsContainer');
        if (!container || !this.currentUser) return;

        const myProposals = this.userProposals.filter(
            proposal => proposal.freelancerId === this.currentUser.id
        );

        if (myProposals.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h4>No proposals submitted yet</h4>
                    <p>Browse gigs and submit your first proposal</p>
                    <a href="#browse-gigs" class="btn btn-primary">Browse Gigs</a>
                </div>
            `;
            return;
        }

        container.innerHTML = myProposals.map(proposal => {
            const gig = this.gigs.find(g => g.id === proposal.gigId);
            return `
                <div class="dashboard-proposal-card">
                    <div class="proposal-info">
                        <h4>${gig ? gig.title : 'Gig not found'}</h4>
                        <p>Bid: ₹${proposal.bid.toLocaleString()}</p>
                        <span class="status status-${proposal.status}">${proposal.status}</span>
                    </div>
                    <div class="proposal-meta">
                        <span>Delivery: ${proposal.duration} days</span>
                        <span>${this.getTimeAgo(proposal.submittedAt)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render gig statistics
    renderGigStats() {
        const statsContainer = document.getElementById('gigStatsContainer');
        if (!statsContainer || !this.currentUser) return;

        const myGigs = this.gigs.filter(gig => gig.clientId === this.currentUser.id);
        const myProposals = this.userProposals.filter(
            proposal => proposal.freelancerId === this.currentUser.id
        );

        const stats = {
            totalGigs: myGigs.length,
            activeGigs: myGigs.filter(gig => gig.status === 'open').length,
            totalProposals: myProposals.length,
            acceptedProposals: myProposals.filter(p => p.status === 'accepted').length
        };

        statsContainer.innerHTML = `
            <div class="stat-card">
                <h3>${stats.totalGigs}</h3>
                <p>Total Gigs</p>
            </div>
            <div class="stat-card">
                <h3>${stats.activeGigs}</h3>
                <p>Active Gigs</p>
            </div>
            <div class="stat-card">
                <h3>${stats.totalProposals}</h3>
                <p>Proposals Sent</p>
            </div>
            <div class="stat-card">
                <h3>${stats.acceptedProposals}</h3>
                <p>Accepted</p>
            </div>
        `;
    }

    // Check if user has already applied to a gig
    hasUserApplied(gigId) {
        if (!this.currentUser) return false;
        return this.userProposals.some(
            proposal => proposal.gigId === gigId && 
                       proposal.freelancerId === this.currentUser.id
        );
    }

    // Setup proposal modal
    setupProposalModal() {
        const modal = document.getElementById('proposalModal');
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    // Close modal
    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        const container = document.querySelector('.notification-container') || this.createNotificationContainer();
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Add close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.remove();
        });
    }

    getNotificationIcon(type) {
        switch(type) {
            case 'success': return 'check-circle';
            case 'error': return 'exclamation-circle';
            case 'warning': return 'exclamation-triangle';
            default: return 'info-circle';
        }
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    // Data persistence methods
    saveGigs() {
        localStorage.setItem('techsynergy_gigs', JSON.stringify(this.gigs));
    }

    loadGigs() {
        const savedGigs = localStorage.getItem('techsynergy_gigs');
        this.gigs = savedGigs ? JSON.parse(savedGigs) : this.getSampleGigs();
        if (!savedGigs) this.saveGigs();
    }

    saveUserProposals() {
        localStorage.setItem('techsynergy_user_proposals', JSON.stringify(this.userProposals));
    }

    loadUserProposals() {
        const savedProposals = localStorage.getItem('techsynergy_user_proposals');
        this.userProposals = savedProposals ? JSON.parse(savedProposals) : [];
    }

    loadUserGigs() {
        if (!this.currentUser) return;
        this.userGigs = this.gigs.filter(gig => gig.clientId === this.currentUser.id);
    }

    // Sample data for testing
    getSampleGigs() {
        return [
            {
                id: 'gig_001',
                title: 'Build a React E-commerce Website',
                description: 'Looking for an experienced React developer to build a modern e-commerce website with payment integration, user authentication, and admin panel.',
                budget: 50000,
                skills: ['React', 'Node.js', 'MongoDB', 'Payment Integration'],
                deadline: '2025-07-15',
                category: 'web-development',
                clientId: 'user_sample_1',
                clientName: 'TechCorp Solutions',
                status: 'open',
                proposals: [],
                createdAt: '2025-05-20T10:00:00Z',
                views: 25
            },
            {
                id: 'gig_002',
                title: 'Mobile App UI/UX Design',
                description: 'Need a creative designer to design a modern mobile app interface for a fitness tracking application. Should include wireframes, mockups, and prototypes.',
                budget: 30000,
                skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Mobile Design'],
                deadline: '2025-06-30',
                category: 'design',
                clientId: 'user_sample_2',
                clientName: 'FitLife Startup',
                status: 'open',
                proposals: [],
                createdAt: '2025-05-22T14:30:00Z',
                views: 18
            },
            {
                id: 'gig_003',
                title: 'Python Data Analysis Script',
                description: 'Develop a Python script to analyze sales data from CSV files, generate insights, and create visualizations using matplotlib and pandas.',
                budget: 15000,
                skills: ['Python', 'Data Analysis', 'Pandas', 'Matplotlib'],
                deadline: '2025-06-20',
                category: 'data-science',
                clientId: 'user_sample_3',
                clientName: 'DataDriven Ltd',
                status: 'open',
                proposals: [],
                createdAt: '2025-05-25T09:15:00Z',
                views: 12
            },
            {
                id: 'gig_004',
                title: 'WordPress Plugin Development',
                description: 'Create a custom WordPress plugin for appointment booking system with calendar integration, email notifications, and payment processing.',
                budget: 25000,
                skills: ['WordPress', 'PHP', 'JavaScript', 'MySQL'],
                deadline: '2025-07-10',
                category: 'web-development',
                clientId: 'user_sample_4',
                clientName: 'HealthCare Clinic',
                status: 'open',
                proposals: [],
                createdAt: '2025-05-23T16:45:00Z',
                views: 31
            },
            {
                id: 'gig_005',
                title: 'Logo and Brand Identity Design',
                description: 'Design a complete brand identity package including logo, business cards, letterhead, and brand guidelines for a new tech startup.',
                budget: 20000,
                skills: ['Logo Design', 'Brand Identity', 'Adobe Illustrator', 'Graphic Design'],
                deadline: '2025-06-25',
                category: 'design',
                clientId: 'user_sample_5',
                clientName: 'InnovateTech',
                status: 'open',
                proposals: [],
                createdAt: '2025-05-21T11:20:00Z',
                views: 22
            }
        ];
    }

    // Advanced filtering methods
    filterBySkills(skills) {
        return this.gigs.filter(gig => 
            skills.some(skill => 
                gig.skills.some(gigSkill => 
                    gigSkill.toLowerCase().includes(skill.toLowerCase())
                )
            )
        );
    }

    filterByBudgetRange(min, max) {
        return this.gigs.filter(gig => gig.budget >= min && gig.budget <= max);
    }

    filterByDeadline(days) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
        
        return this.gigs.filter(gig => new Date(gig.deadline) <= targetDate);
    }

    // AI-powered recommendations (simplified version)
    getRecommendedGigs(limit = 5) {
        if (!this.currentUser || !this.currentUser.skills) return [];

        const userSkills = this.currentUser.skills || [];
        const scoredGigs = this.gigs
            .filter(gig => gig.clientId !== this.currentUser.id) // Exclude own gigs
            .filter(gig => !this.hasUserApplied(gig.id)) // Exclude already applied
            .map(gig => ({
                ...gig,
                score: this.calculateGigScore(gig, userSkills)
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return scoredGigs;
    }

    calculateGigScore(gig, userSkills) {
        let score = 0;
        
        // Skill matching (40% weight)
        const matchingSkills = gig.skills.filter(skill => 
            userSkills.some(userSkill => 
                userSkill.toLowerCase().includes(skill.toLowerCase())
            )
        );
        score += (matchingSkills.length / gig.skills.length) * 40;
        
        // Budget attractiveness (30% weight)
        score += Math.min(gig.budget / 100000, 1) * 30;
        
        // Recency (20% weight)
        const daysSinceCreated = (new Date() - new Date(gig.createdAt)) / (1000 * 60 * 60 * 24);
        score += Math.max(0, (7 - daysSinceCreated) / 7) * 20;
        
        // Low competition (10% weight)
        score += Math.max(0, (10 - gig.proposals.length) / 10) * 10;
        
        return score;
    }

    // Render recommended gigs
    renderRecommendedGigs() {
        const container = document.getElementById('recommendedGigsContainer');
        if (!container) return;

        const recommendedGigs = this.getRecommendedGigs(3);
        
        if (recommendedGigs.length === 0) {
            container.innerHTML = `
                <div class="empty-recommendations">
                    <h4>No recommendations available</h4>
                    <p>Complete your profile to get personalized gig recommendations</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <h3>Recommended for You</h3>
            <div class="recommended-gigs">
                ${recommendedGigs.map(gig => `
                    <div class="recommended-gig-card">
                        <h4>${gig.title}</h4>
                        <p>₹${gig.budget.toLocaleString()}</p>
                        <div class="gig-skills">
                            ${gig.skills.slice(0, 3).map(skill => 
                                <span class="skill-tag">${skill}</span>
                            ).join('')}
                        </div>
                        <div class="match-score">
                            <span class="score">${Math.round(gig.score)}% match</span>
                        </div>
                        <button class="btn btn-sm btn-primary" 
                                onclick="gigsManager.viewGigDetails('${gig.id}')">
                            View Details
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Export methods for external use
    exportGigData(gigId) {
        const gig = this.gigs.find(g => g.id === gigId);
        if (!gig) return null;

        return {
            title: gig.title,
            description: gig.description,
            budget: gig.budget,
            skills: gig.skills,
            deadline: gig.deadline,
            proposals: gig.proposals.length,
            status: gig.status
        };
    }

    // Advanced search with multiple criteria
    advancedSearch(criteria) {
        let results = [...this.gigs];

        if (criteria.query) {
            results = results.filter(gig =>
                gig.title.toLowerCase().includes(criteria.query.toLowerCase()) ||
                gig.description.toLowerCase().includes(criteria.query.toLowerCase())
            );
        }

        if (criteria.category && criteria.category !== 'all') {
            results = results.filter(gig => gig.category === criteria.category);
        }

        if (criteria.minBudget) {
            results = results.filter(gig => gig.budget >= criteria.minBudget);
        }

        if (criteria.maxBudget) {
            results = results.filter(gig => gig.budget <= criteria.maxBudget);
        }

        if (criteria.skills && criteria.skills.length > 0) {
            results = results.filter(gig =>
                criteria.skills.some(skill =>
                    gig.skills.some(gigSkill =>
                        gigSkill.toLowerCase().includes(skill.toLowerCase())
                    )
                )
            );
        }

        if (criteria.deadline) {
            const deadlineDate = new Date(criteria.deadline);
            results = results.filter(gig => new Date(gig.deadline) <= deadlineDate);
        }

        return results;
    }

    // Bulk operations
    bulkUpdateGigStatus(gigIds, newStatus) {
        gigIds.forEach(gigId => {
            const gig = this.gigs.find(g => g.id === gigId);
            if (gig && gig.clientId === this.currentUser.id) {
                gig.status = newStatus;
            }
        });
        this.saveGigs();
        this.renderDashboard();
        this.renderGigsList();
    }

    // Analytics methods
    getGigAnalytics() {
        if (!this.currentUser) return null;

        const myGigs = this.gigs.filter(gig => gig.clientId === this.currentUser.id);
        const myProposals = this.userProposals.filter(p => p.freelancerId === this.currentUser.id);

        return {
            totalGigsPosted: myGigs.length,
            totalProposalsReceived: myGigs.reduce((sum, gig) => sum + gig.proposals.length, 0),
            totalProposalsSent: myProposals.length,
            successRate: myProposals.length > 0 ? 
                (myProposals.filter(p => p.status === 'accepted').length / myProposals.length * 100).toFixed(1) : 0,
            avgBudgetPosted: myGigs.length > 0 ? 
                myGigs.reduce((sum, gig) => sum + gig.budget, 0) / myGigs.length : 0,
            avgBidAmount: myProposals.length > 0 ? 
                myProposals.reduce((sum, p) => sum + p.bid, 0) / myProposals.length : 0,
            totalViews: myGigs.reduce((sum, gig) => sum + gig.views, 0)
        };
    }

    // Cleanup methods
    cleanup() {
        // Remove event listeners and cleanup resources
        const gigForm = document.getElementById('gigForm');
        if (gigForm) {
            gigForm.removeEventListener('submit', this.handleGigSubmission);
        }

        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // Initialize method to be called from other modules
    static initialize() {
        return new GigsManager();
    }
}

// Initialize the gigs manager when DOM is loaded
let gigsManager;

document.addEventListener('DOMContentLoaded', () => {
    gigsManager = GigsManager.initialize();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GigsManager;
}