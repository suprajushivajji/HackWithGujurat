// js/profile.js
// TechSynergy Profile Management System

/**
 * Profile Management Class
 * Handles user profile viewing, editing, and data management
 */
class ProfileManager {
    constructor() {
        // Core properties
        this.app = window.app || new TechSynergyApp();
        this.isEditMode = false;
        this.currentUser = null;
        this.profileUserId = null;
        this.isOwnProfile = false;
        this.unsavedChanges = false;
        this.profileData = {};
        
        // Skills and technologies arrays
        this.userSkills = [];
        this.projectTechnologies = [];
        this.suggestedSkills = [
            'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C++', 'HTML', 'CSS',
            'Angular', 'Vue.js', 'TypeScript', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift',
            'Kotlin', 'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Docker', 'Kubernetes',
            'AWS', 'Azure', 'GCP', 'Git', 'Linux', 'Machine Learning', 'AI', 'Blockchain'
        ];
        
        // Activity data
        this.activityData = {
            gigs: [],
            events: [],
            proposals: []
        };
        
        // File upload handling
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        
        // Bind methods to preserve context
        this.handleSkillAdd = this.handleSkillAdd.bind(this);
        this.handleProjectTechAdd = this.handleProjectTechAdd.bind(this);
        this.handleFormChange = this.handleFormChange.bind(this);
        this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
        
        // Initialize profile manager
        this.init();
    }

    /**
     * Initialize the profile manager
     */
    async init() {
        try {
            console.log('🚀 Initializing Profile Manager...');
            
            // Check authentication
            if (!this.app.token) {
                this.redirectToLogin();
                return;
            }

            // Show loading state
            this.showLoadingState();

            // Get profile user ID from URL params
            this.profileUserId = this.getProfileUserIdFromURL();
            
            // Load current user data
            await this.app.loadUser();
            this.currentUser = this.app.user;
            
            // Check if viewing own profile
            this.isOwnProfile = !this.profileUserId || this.profileUserId === this.currentUser.id;
            
            // Load profile data
            await this.loadProfileData();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.initializeUIComponents();
            
            // Hide loading state
            this.hideLoadingState();
            
            console.log('✅ Profile Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ Profile Manager initialization failed:', error);
            this.hideLoadingState();
            this.showErrorMessage('Failed to load profile. Please try again.');
        }
    }

    /**
     * Get profile user ID from URL parameters
     */
    getProfileUserIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id') || urlParams.get('userId');
    }

    /**
     * Load profile data for the specified user
     */
    async loadProfileData() {
        try {
            const userId = this.profileUserId || this.currentUser.id;
            
            // Load user profile
            const profileData = await this.app.makeRequest(`/users/${userId}`, 'GET');
            this.profileData = profileData;
            
            // Load additional data for own profile
            if (this.isOwnProfile) {
                const [activityData, dashboardData] = await Promise.all([
                    this.loadUserActivity(),
                    this.app.makeRequest('/users/dashboard/data', 'GET')
                ]);
                
                this.activityData = activityData;
                this.updateProfileStats(dashboardData.stats);
            }
            
            // Render profile data
            this.renderProfileData();
            this.updatePageTitle();
            
        } catch (error) {
            console.error('Failed to load profile data:', error);
            throw error;
        }
    }

    /**
     * Load user activity data
     */
    async loadUserActivity() {
        try {
            const [gigsResponse, eventsResponse, proposalsResponse] = await Promise.all([
                this.app.makeRequest('/gigs?myGigs=true', 'GET'),
                this.app.makeRequest('/events?myEvents=true', 'GET'),
                this.app.makeRequest('/gigs?myProposals=true', 'GET')
            ]);
            
            return {
                gigs: gigsResponse.gigs || [],
                events: eventsResponse.events || [],
                proposals: proposalsResponse.gigs || []
            };
        } catch (error) {
            console.error('Failed to load user activity:', error);
            return { gigs: [], events: [], proposals: [] };
        }
    }

    /**
     * Render all profile data
     */
    renderProfileData() {
        this.renderBasicInfo();
        this.renderProfileImage();
        this.renderContactInfo();
        this.renderSkills();
        this.renderPortfolio();
        this.renderBadges();
        this.renderActivityHistory();
        this.updateEditControls();
    }

    /**
     * Render basic profile information
     */
    renderBasicInfo() {
        const nameElement = document.getElementById('profileName');
        const emailElement = document.getElementById('profileEmail');
        const joinDateElement = document.getElementById('profileJoinDate');
        const bioElement = document.getElementById('bio');
        const locationElement = document.getElementById('location');
        const websiteElement = document.getElementById('website');
        
        if (nameElement) nameElement.textContent = this.profileData.name || 'User Name';
        if (emailElement) emailElement.textContent = this.profileData.email || '';
        
        if (joinDateElement) {
            const joinDate = new Date(this.profileData.joinedAt);
            joinDateElement.innerHTML = `
                <i class="fas fa-calendar" aria-hidden="true"></i>
                Joined ${joinDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                })}
            `;
        }
        
        // Update form fields
        const displayNameInput = document.getElementById('displayName');
        const emailInput = document.getElementById('email');
        const bioTextarea = document.getElementById('bio');
        const locationInput = document.getElementById('location');
        const websiteInput = document.getElementById('website');
        
        if (displayNameInput) displayNameInput.value = this.profileData.name || '';
        if (emailInput) emailInput.value = this.profileData.email || '';
        if (bioTextarea) bioTextarea.value = this.profileData.bio || '';
        if (locationInput) locationInput.value = this.profileData.location || '';
        if (websiteInput) websiteInput.value = this.profileData.website || '';
    }

    /**
     * Render profile image
     */
    renderProfileImage() {
        const profileImage = document.getElementById('profileImage');
        const avatarPlaceholder = document.getElementById('avatarPlaceholder');
        
        if (this.profileData.profilePicture) {
            if (profileImage) {
                profileImage.src = this.profileData.profilePicture;
                profileImage.classList.remove('hidden');
            }
            if (avatarPlaceholder) {
                avatarPlaceholder.style.display = 'none';
            }
        } else {
            if (profileImage) {
                profileImage.classList.add('hidden');
            }
            if (avatarPlaceholder) {
                avatarPlaceholder.style.display = 'flex';
                // Show initials
                const initials = this.getInitials(this.profileData.name);
                avatarPlaceholder.innerHTML = <span style="font-size: 3rem; font-weight: 700;">${initials}</span>;
            }
        }
    }

    /**
     * Get user initials from name
     */
    getInitials(name) {
        if (!name) return 'U';
        return name.split(' ')
            .map(part => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    }

    /**
     * Update profile statistics
     */
    updateProfileStats(stats) {
        const elements = {
            profileActivityScore: document.getElementById('profileActivityScore'),
            profileBadges: document.getElementById('profileBadges'),
            profileRank: document.getElementById('profileRank'),
            profileCompletedGigs: document.getElementById('profileCompletedGigs')
        };
        
        if (elements.profileActivityScore) {
            elements.profileActivityScore.textContent = this.profileData.activityScore || 0;
        }
        
        if (elements.profileBadges) {
            elements.profileBadges.textContent = this.profileData.badges?.length || 0;
        }
        
        if (elements.profileRank && stats) {
            elements.profileRank.textContent = stats.rank || '-';
        }
        
        if (elements.profileCompletedGigs && stats) {
            elements.profileCompletedGigs.textContent = stats.completedGigs || 0;
        }
    }

    /**
     * Render contact information
     */
    renderContactInfo() {
        const contactEmail = document.getElementById('contactEmail');
        const contactLocation = document.getElementById('contactLocation');
        const contactWebsite = document.getElementById('contactWebsite');
        
        if (contactEmail) {
            contactEmail.textContent = this.profileData.email || '-';
        }
        
        if (contactLocation) {
            contactLocation.textContent = this.profileData.location || '-';
        }
        
        if (contactWebsite) {
            if (this.profileData.website) {
                contactWebsite.href = this.profileData.website;
                contactWebsite.textContent = this.formatWebsiteURL(this.profileData.website);
                contactWebsite.style.display = 'inline';
            } else {
                contactWebsite.textContent = '-';
                contactWebsite.removeAttribute('href');
            }
        }
    }

    /**
     * Format website URL for display
     */
    formatWebsiteURL(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }

    /**
     * Render skills section
     */
    renderSkills() {
        this.userSkills = this.profileData.skills || [];
        const skillsDisplay = document.getElementById('skillsDisplay');
        
        if (skillsDisplay) {
            if (this.userSkills.length === 0) {
                skillsDisplay.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-code"></i>
                        <p>No skills added yet.</p>
                        ${this.isOwnProfile ? '<p>Add your skills to help others find you!</p>' : ''}
                    </div>
                `;
            } else {
                skillsDisplay.innerHTML = this.userSkills.map(skill => `
                    <div class="skill-item" data-skill="${this.escapeHtml(skill)}">
                        <span>${this.escapeHtml(skill)}</span>
                        ${this.isEditMode ? <span class="skill-remove" onclick="removeSkill('${this.escapeHtml(skill)}')" aria-label="Remove ${skill}">&times;</span> : ''}
                    </div>
                `).join('');
            }
        }
        
        // Render suggested skills in edit mode
        this.renderSuggestedSkills();
    }

    /**
     * Render suggested skills
     */
    renderSuggestedSkills() {
        const suggestedSkillsContainer = document.getElementById('suggestedSkills');
        if (!suggestedSkillsContainer || !this.isEditMode) return;
        
        const availableSkills = this.suggestedSkills.filter(skill => 
            !this.userSkills.includes(skill)
        ).slice(0, 10);
        
        const suggestedHTML = availableSkills.map(skill => `
            <span class="suggested-skill" onclick="addSuggestedSkill('${this.escapeHtml(skill)}')" role="button" tabindex="0">
                ${this.escapeHtml(skill)}
            </span>
        `).join('');
        
        suggestedSkillsContainer.innerHTML = `
            <span class="suggested-label">Suggested:</span>
            ${suggestedHTML}
        `;
    }

    /**
     * Render portfolio section
     */
    renderPortfolio() {
        const portfolioDisplay = document.getElementById('portfolioDisplay');
        const portfolioDescription = document.getElementById('portfolioDescription');
        
        // Set portfolio description
        if (portfolioDescription) {
            portfolioDescription.value = this.profileData.portfolio?.description || '';
        }
        
        if (portfolioDisplay) {
            const portfolio = this.profileData.portfolio;
            
            if (!portfolio || (!portfolio.description && (!portfolio.projects || portfolio.projects.length === 0))) {
                portfolioDisplay.innerHTML = `
                    <div class="no-data">
                        <i class="fas fa-briefcase"></i>
                        <p>No portfolio information available.</p>
                        ${this.isOwnProfile ? '<p>Add your portfolio to showcase your work!</p>' : ''}
                    </div>
                `;
            } else {
                let html = '';
                
                if (portfolio.description) {
                    html += <div class="portfolio-description">${this.escapeHtml(portfolio.description)}</div>;
                }
                
                if (portfolio.projects && portfolio.projects.length > 0) {
                    html += '<div class="projects-section">';
                    html += '<h3>Projects</h3>';
                    html += portfolio.projects.map(project => this.renderProjectItem(project)).join('');
                    html += '</div>';
                }
                
                portfolioDisplay.innerHTML = html;
            }
        }
        
        // Render projects list for editing
        this.renderProjectsList();
    }

    /**
     * Render individual project item
     */
    renderProjectItem(project) {
        return `
            <div class="project-item" data-project-id="${project.id || Date.now()}">
                <div class="project-header">
                    <h4 class="project-title">${this.escapeHtml(project.title)}</h4>
                    ${project.url ? `
                        <a href="${this.escapeHtml(project.url)}" target="_blank" class="project-url" rel="noopener noreferrer">
                            <i class="fas fa-external-link-alt" aria-hidden="true"></i>
                            View Project
                        </a>
                    ` : ''}
                </div>
                <p class="project-description">${this.escapeHtml(project.description)}</p>
                ${project.technologies && project.technologies.length > 0 ? `
                    <div class="project-technologies">
                        ${project.technologies.map(tech => <span class="tech-tag">${this.escapeHtml(tech)}</span>).join('')}
                    </div>
                ` : ''}
                ${this.isEditMode ? `
                    <div class="project-actions">
                        <button class="btn btn-sm btn-outline" onclick="editProject('${project.id}')">
                            <i class="fas fa-edit" aria-hidden="true"></i>
                            Edit
                        </button>
                        <button class="btn btn-sm btn-outline" onclick="deleteProject('${project.id}')">
                            <i class="fas fa-trash" aria-hidden="true"></i>
                            Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Render projects list for editing
     */
    renderProjectsList() {
        const projectsList = document.getElementById('projectsList');
        if (!projectsList || !this.isEditMode) return;
        
        const projects = this.profileData.portfolio?.projects || [];
        
        if (projects.length === 0) {
            projectsList.innerHTML = '<p class="no-data">No projects added yet.</p>';
        } else {
            projectsList.innerHTML = projects.map(project => this.renderEditableProjectItem(project)).join('');
        }
    }

    /**
     * Render editable project item
     */
    renderEditableProjectItem(project) {
        return `
            <div class="project-edit-item" data-project-id="${project.id}">
                <div class="form-row">
                    <div class="form-group">
                        <label>Project Title</label>
                        <input type="text" class="form-input project-title-input" value="${this.escapeHtml(project.title)}" onchange="updateProject('${project.id}', 'title', this.value)">
                    </div>
                    <div class="form-group">
                        <label>Project URL</label>
                        <input type="url" class="form-input project-url-input" value="${this.escapeHtml(project.url || '')}" onchange="updateProject('${project.id}', 'url', this.value)">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea class="form-textarea project-description-input" rows="3" onchange="updateProject('${project.id}', 'description', this.value)">${this.escapeHtml(project.description)}</textarea>
                </div>
                <div class="form-group">
                    <label>Technologies</label>
                    <div class="technologies-input">
                        <input type="text" class="form-input" placeholder="Type technology and press Enter" onkeypress="addProjectTechnology(event, '${project.id}')">
                        <div class="technologies-tags" id="projectTech_${project.id}">
                            ${project.technologies ? project.technologies.map(tech => `
                                <span class="technology-tag">
                                    ${this.escapeHtml(tech)}
                                    <span class="remove" onclick="removeProjectTechnology('${project.id}', '${this.escapeHtml(tech)}')">&times;</span>
                                </span>
                            `).join('') : ''}
                        </div>
                    </div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-sm btn-outline" onclick="removeProject('${project.id}')">
                        <i class="fas fa-trash" aria-hidden="true"></i>
                        Remove Project
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render badges section
     */
    renderBadges() {
        const badgesGrid = document.getElementById('profileBadgesGrid');
        if (!badgesGrid) return;
        
        const badges = this.profileData.badges || [];
        
        if (badges.length === 0) {
            badgesGrid.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-trophy"></i>
                    <p>No badges earned yet.</p>
                    ${this.isOwnProfile ? '<p>Complete activities to earn your first badge!</p>' : ''}
                </div>
            `;
        } else {
            badgesGrid.innerHTML = badges.map(badge => `
                <div class="badge-card" title="${this.escapeHtml(badge.description)}">
                    <div class="badge-icon-large">
                        <i class="fas fa-trophy" aria-hidden="true"></i>
                    </div>
                    <h4 class="badge-name">${this.escapeHtml(badge.name)}</h4>
                    <p class="badge-description">${this.escapeHtml(badge.description)}</p>
                    <span class="badge-earned-date">Earned ${this.app.formatRelativeTime(badge.earnedAt)}</span>
                </div>
            `).join('');
        }
    }

    /**
     * Render activity history
     */
    renderActivityHistory() {
        this.renderUserGigs();
        this.renderUserEvents();
        this.renderUserProposals();
    }

    /**
     * Render user gigs
     */
    renderUserGigs() {
        const gigsList = document.getElementById('userGigsList');
        if (!gigsList) return;
        
        const gigs = this.activityData.gigs || [];
        
        if (gigs.length === 0) {
            gigsList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-briefcase"></i>
                    <p>No gigs posted yet.</p>
                    ${this.isOwnProfile ? '<p><a href="freelancing/gigs.html?action=create" class="btn btn-primary btn-sm">Post Your First Gig</a></p>' : ''}
                </div>
            `;
        } else {
            gigsList.innerHTML = gigs.map(gig => `
                <div class="activity-list-item" onclick="viewGig('${gig._id}')">
                    <div class="activity-icon-small gig">
                        <i class="fas fa-briefcase" aria-hidden="true"></i>
                    </div>
                    <div class="activity-item-content">
                        <h4 class="activity-item-title">${this.escapeHtml(gig.title)}</h4>
                        <div class="activity-item-meta">
                            <span>$${gig.budget.min} - $${gig.budget.max}</span>
                            <span>Posted ${this.app.formatRelativeTime(gig.createdAt)}</span>
                            <span class="activity-item-status status-${gig.status}">${this.formatStatus(gig.status)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    /**
     * Render user events
     */
    renderUserEvents() {
        const eventsList = document.getElementById('userEventsList');
        if (!eventsList) return;
        
        const events = this.activityData.events || [];
        
        if (events.length === 0) {
            eventsList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-calendar"></i>
                    <p>No events created yet.</p>
                    ${this.isOwnProfile ? '<p><a href="events/events.html?action=create" class="btn btn-secondary btn-sm">Create Your First Event</a></p>' : ''}
                </div>
            `;
        } else {
            eventsList.innerHTML = events.map(event => `
                <div class="activity-list-item" onclick="viewEvent('${event._id}')">
                    <div class="activity-icon-small event">
                        <i class="fas fa-calendar" aria-hidden="true"></i>
                    </div>
                    <div class="activity-item-content">
                        <h4 class="activity-item-title">${this.escapeHtml(event.title)}</h4>
                        <div class="activity-item-meta">
                            <span>${this.app.formatDate(event.date)}</span>
                            <span>${this.escapeHtml(event.location)}</span>
                            <span>${event.attendees?.length || 0} attendees</span>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    /**
     * Render user proposals
     */
    renderUserProposals() {
        const proposalsList = document.getElementById('userProposalsList');
        if (!proposalsList) return;
        
        const proposals = this.activityData.proposals || [];
        
        if (proposals.length === 0) {
            proposalsList.innerHTML = `
                <div class="no-data">
                    <i class="fas fa-paper-plane"></i>
                    <p>No proposals submitted yet.</p>
                    ${this.isOwnProfile ? '<p><a href="freelancing/gigs.html" class="btn btn-success btn-sm">Browse Gigs</a></p>' : ''}
                </div>
            `;
        } else {
            proposalsList.innerHTML = proposals.map(gig => {
                const userProposal = gig.proposals?.find(p => p.freelancer === this.currentUser.id);
                
                return `
                    <div class="activity-list-item" onclick="viewGig('${gig._id}')">
                        <div class="activity-icon-small proposal">
                            <i class="fas fa-paper-plane" aria-hidden="true"></i>
                        </div>
                        <div class="activity-item-content">
                            <h4 class="activity-item-title">${this.escapeHtml(gig.title)}</h4>
                            <div class="activity-item-meta">
                                <span>$${userProposal?.proposedBudget || gig.budget.min} - $${gig.budget.max}</span>
                                <span>Applied ${this.app.formatRelativeTime(userProposal?.submittedAt)}</span>
                                <span class="activity-item-status status-${userProposal?.status || 'pending'}">${this.formatStatus(userProposal?.status || 'pending')}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Format status for display
     */
    formatStatus(status) {
        const statusMap = {
            'open': 'Open',
            'in-progress': 'In Progress',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'pending': 'Pending',
            'accepted': 'Accepted',
            'rejected': 'Rejected'
        };
        
        return statusMap[status] || status;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Profile picture upload
        const profilePictureInput = document.getElementById('profilePicture');
        if (profilePictureInput) {
            profilePictureInput.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        }

        // Skills input
        const newSkillInput = document.getElementById('newSkillInput');
        if (newSkillInput) {
            newSkillInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSkill();
                }
            });
        }

        // Form change detection
        const formInputs = document.querySelectorAll('.form-input, .form-textarea, .form-select');
        formInputs.forEach(input => {
            input.addEventListener('change', this.handleFormChange);
            input.addEventListener('input', this.handleFormChange);
        });

        // Activity tab switching
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = button.getAttribute('data-tab');
                if (tabName) {
                    this.switchActivityTab(tabName);
                }
            });
        });

        // Prevent accidental navigation away with unsaved changes
        window.addEventListener('beforeunload', this.handleBeforeUnload);
        
        // Modal handling
        this.setupModalListeners();
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }

    /**
     * Setup modal event listeners
     */
    setupModalListeners() {
        // Add project form
        const addProjectForm = document.getElementById('addProjectForm');
        if (addProjectForm) {
            addProjectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProject();
            });
        }

        // Project technology input
        const projectTechInput = document.getElementById('projectTechInput');
        if (projectTechInput) {
            projectTechInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addProjectTechnology();
                }
            });
        }
    }

    /**
     * Initialize UI components
     */
    initializeUIComponents() {
        // Set up edit mode controls visibility
        this.updateEditControls();
        
        // Initialize tooltips
        this.initializeTooltips();
        
        // Set up lazy loading for images
        this.setupLazyLoading();
        
        // Initialize accessibility features
        this.initializeAccessibility();
    }

    /**
     * Update edit controls visibility and state
     */
    updateEditControls() {
        const editButton = document.getElementById('editProfileBtn');
        const saveActions = document.getElementById('saveActions');
        const skillsEdit = document.getElementById('skillsEdit');
        const portfolioEdit = document.getElementById('portfolioEdit');
        
        if (!this.isOwnProfile) {
            // Hide edit controls for other users' profiles
            if (editButton) editButton.style.display = 'none';
            if (saveActions) saveActions.style.display = 'none';
            return;
        }
        
        if (this.isEditMode) {
            if (editButton) {
                editButton.innerHTML = '<i class="fas fa-times"></i> Cancel Edit';
                editButton.classList.remove('btn-primary');
                editButton.classList.add('btn-outline');
            }
            if (saveActions) saveActions.classList.remove('hidden');
            if (skillsEdit) skillsEdit.classList.remove('hidden');
            if (portfolioEdit) portfolioEdit.classList.remove('hidden');
            
            // Make form fields editable
            this.toggleFormFields(false);
        } else {
            if (editButton) {
                editButton.innerHTML = '<i class="fas fa-edit"></i> Edit Profile';
                editButton.classList.add('btn-primary');
                editButton.classList.remove('btn-outline');
            }
            if (saveActions) saveActions.classList.add('hidden');
            if (skillsEdit) skillsEdit.classList.add('hidden');
            if (portfolioEdit) portfolioEdit.classList.add('hidden');
            
            // Make form fields read-only
            this.toggleFormFields(true);
        }
    }

    /**
     * Toggle form fields between editable and read-only
     */
    toggleFormFields(readOnly) {
        const formInputs = document.querySelectorAll('.form-input, .form-textarea');
        formInputs.forEach(input => {
            input.readOnly = readOnly;
            if (readOnly) {
                input.classList.add('readonly');
            } else {
                input.classList.remove('readonly');
            }
        });
    }

    /**
     * Toggle edit mode
     */
    toggleEditMode() {
        if (this.unsavedChanges && !this.isEditMode) {
            if (!confirm('You have unsaved changes. Are you sure you want to exit edit mode?')) {
                return;
            }
        }
        
        this.isEditMode = !this.isEditMode;
        this.updateEditControls();
        
        if (this.isEditMode) {
            this.enterEditMode();
        } else {
            this.exitEditMode();
        }
    }

    /**
     * Enter edit mode
     */
    enterEditMode() {
        console.log('Entering edit mode');
        
        // Re-render skills with edit controls
        this.renderSkills();
        
        // Re-render portfolio with edit controls
        this.renderPortfolio();
        
        // Focus first editable field
        const firstInput = document.querySelector('.form-input:not([readonly])');
        if (firstInput) {
            firstInput.focus();
        }
        
        // Show edit help text
        this.showToast('Edit mode activated. Make your changes and click Save.', 'info');
    }

    /**
     * Exit edit mode
     */
    exitEditMode() {
        console.log('Exiting edit mode');
        
        // Reset unsaved changes flag
        this.unsavedChanges = false;
        
        // Re-render without edit controls
        this.renderSkills();
        this.renderPortfolio();
        
        // Reload original data if needed
        this.loadProfileData();
    }

    /**
     * Handle profile picture upload
     */
    async handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            // Validate file
            if (!this.validateImageFile(file)) {
                return;
            }
            
            this.showLoadingState('Uploading profile picture...');
            
            // Create form data
            const formData = new FormData();
            formData.append('profilePicture', file);
            
            // Upload to server
            const response = await this.app.makeRequest('/users/profile-picture', 'POST', formData);
            
            // Update profile data
            this.profileData.profilePicture = response.profilePictureUrl;
            
            // Re-render profile image
            this.renderProfileImage();
            
            this.hideLoadingState();
            this.showToast('Profile picture updated successfully!', 'success');
            
        } catch (error) {
            console.error('Profile picture upload failed:', error);
            this.hideLoadingState();
            this.showToast('Failed to upload profile picture. Please try again.', 'error');
        }
        
        // Reset file input
        event.target.value = '';
    }

    /**
     * Validate image file
     */
    validateImageFile(file) {
        // Check file type
        if (!this.allowedImageTypes.includes(file.type)) {
            this.showToast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
            return false;
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            this.showToast('Image file size must be less than 5MB', 'error');
            return false;
        }
        
        return true;
    }

    /**
     * Add new skill
     */
    addSkill() {
        const skillInput = document.getElementById('newSkillInput');
        if (!skillInput) return;
        
        const skill = skillInput.value.trim();
        
        if (!skill) {
            this.showToast('Please enter a skill name', 'warning');
            return;
        }
        
        if (this.userSkills.includes(skill)) {
            this.showToast('This skill is already added', 'warning');
            skillInput.value = '';
            return;
        }
        
        if (this.userSkills.length >= 20) {
            this.showToast('Maximum 20 skills allowed', 'warning');
            return;
        }
        
        // Add skill to array
        this.userSkills.push(skill);
        
        // Re-render skills
        this.renderSkills();
        
        // Clear input
        skillInput.value = '';
        
        // Mark as changed
        this.markAsChanged();
        
        console.log('Added skill:', skill);
    }

    /**
     * Remove skill
     */
    removeSkill(skill) {
        const index = this.userSkills.indexOf(skill);
        if (index > -1) {
            this.userSkills.splice(index, 1);
            this.renderSkills();
            this.markAsChanged();
            console.log('Removed skill:', skill);
        }
    }

    /**
     * Add suggested skill
     */
    addSuggestedSkill(skill) {
        if (!this.userSkills.includes(skill)) {
            this.userSkills.push(skill);
            this.renderSkills();
            this.markAsChanged();
            console.log('Added suggested skill:', skill);
        }
    }

    /**
     * Add new project
     */
    addProject() {
        this.showAddProjectModal();
    }

    /**
     * Show add project modal
     */
    showAddProjectModal() {
        const modal = document.getElementById('addProjectModal');
        if (modal) {
            modal.classList.add('active');
            modal.setAttribute('aria-hidden', 'false');
            
            // Clear form
            const form = document.getElementById('addProjectForm');
            if (form) {
                form.reset();
            }
            
            // Clear technology tags
            const techTags = document.getElementById('projectTechTags');
            if (techTags) {
                techTags.innerHTML = '';
            }
            
            this.projectTechnologies = [];
            
            // Focus first input
            const firstInput = modal.querySelector('input');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    /**
     * Close add project modal
     */
    closeAddProjectModal() {
        const modal = document.getElementById('addProjectModal');
        if (modal) {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Save new project
     */
    saveProject() {
        const form = document.getElementById('addProjectForm');
        if (!form) return;
        
        const formData = new FormData(form);
        const projectData = {
            id: Date.now().toString(),
            title: formData.get('projectTitle')?.trim(),
            description: formData.get('projectDescription')?.trim(),
            url: formData.get('projectUrl')?.trim(),
            technologies: [...this.projectTechnologies]
        };
        
        // Validate project data
        if (!projectData.title) {
            this.showToast('Project title is required', 'error');
            return;
        }
        
        if (!projectData.description) {
            this.showToast('Project description is required', 'error');
            return;
        }
        
        // Add to portfolio
        if (!this.profileData.portfolio) {
            this.profileData.portfolio = { projects: [] };
        }
        
        if (!this.profileData.portfolio.projects) {
            this.profileData.portfolio.projects = [];
        }
        
        this.profileData.portfolio.projects.push(projectData);
        
        // Re-render portfolio
        this.renderPortfolio();
        
        // Close modal
        this.closeAddProjectModal();
        
        // Mark as changed
        this.markAsChanged();
        
        this.showToast('Project added successfully!', 'success');
        console.log('Added project:', projectData);
    }

    /**
     * Add project technology
     */
    addProjectTechnology() {
        const input = document.getElementById('projectTechInput');
        if (!input) return;
        
        const tech = input.value.trim();
        
        if (!tech) return;
        
        if (this.projectTechnologies.includes(tech)) {
            this.showToast('Technology already added', 'warning');
            input.value = '';
            return;
        }
        
        this.projectTechnologies.push(tech);
        this.renderProjectTechnologies();
        input.value = '';
    }

    /**
     * Render project technologies in modal
     */
    renderProjectTechnologies() {
        const container = document.getElementById('projectTechTags');
        if (!container) return;
        
        container.innerHTML = this.projectTechnologies.map(tech => `
            <span class="technology-tag">
                ${this.escapeHtml(tech)}
                <span class="remove" onclick="removeProjectTechnology('${this.escapeHtml(tech)}')">&times;</span>
            </span>
        `).join('');
    }

    /**
     * Remove project technology
     */
    removeProjectTechnology(tech) {
        const index = this.projectTechnologies.indexOf(tech);
        if (index > -1) {
            this.projectTechnologies.splice(index, 1);
            this.renderProjectTechnologies();
        }
    }

    /**
     * Remove project
     */
    removeProject(projectId) {
        if (!confirm('Are you sure you want to remove this project?')) {
            return;
        }
        
        if (this.profileData.portfolio?.projects) {
            this.profileData.portfolio.projects = this.profileData.portfolio.projects.filter(
                project => project.id !== projectId
            );
            
            this.renderPortfolio();
            this.markAsChanged();
            
            this.showToast('Project removed successfully', 'success');
        }
    }

    /**
     * Update project data
     */
    updateProject(projectId, field, value) {
        if (!this.profileData.portfolio?.projects) return;
        
        const project = this.profileData.portfolio.projects.find(p => p.id === projectId);
        if (project) {
            project[field] = value;
            this.markAsChanged();
        }
    }

    /**
     * Switch activity tab
     */
    switchActivityTab(tabName) {
        // Update tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('active');
            }
        });
        
        // Update tab content
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        
        const activeTab = document.getElementById(`${tabName}Tab`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
        
        console.log('Switched to tab:', tabName);
    }

    /**
     * Save profile changes
     */
    async saveProfile() {
        if (!this.isEditMode) return;
        
        try {
            this.showLoadingState('Saving profile...');
            
            // Gather form data
            const profileData = this.gatherProfileData();
            
            // Validate data
            const validation = this.validateProfileData(profileData);
            if (!validation.isValid) {
                this.showToast(validation.message, 'error');
                this.hideLoadingState();
                return;
            }
            
            // Save to server
            const response = await this.app.makeRequest('/users/profile', 'PATCH', profileData);
            
            // Update local data
            this.profileData = { ...this.profileData, ...response };
            this.app.user = { ...this.app.user, ...response };
            
            // Exit edit mode
            this.isEditMode = false;
            this.unsavedChanges = false;
            this.updateEditControls();
            
            // Re-render with updated data
            this.renderProfileData();
            
            this.hideLoadingState();
            this.showToast('Profile saved successfully!', 'success');
            
            console.log('Profile saved successfully');
            
        } catch (error) {
            console.error('Failed to save profile:', error);
            this.hideLoadingState();
            this.showToast('Failed to save profile. Please try again.', 'error');
        }
    }

    /**
     * Gather profile data from form
     */
    gatherProfileData() {
        return {
            name: document.getElementById('displayName')?.value?.trim(),
            bio: document.getElementById('bio')?.value?.trim(),
            location: document.getElementById('location')?.value?.trim(),
            website: document.getElementById('website')?.value?.trim(),
            skills: [...this.userSkills],
            portfolio: {
                description: document.getElementById('portfolioDescription')?.value?.trim(),
                projects: this.profileData.portfolio?.projects || []
            }
        };
    }

    /**
     * Validate profile data
     */
    validateProfileData(data) {
        if (!data.name || data.name.length < 2) {
            return { isValid: false, message: 'Name must be at least 2 characters long' };
        }
        
        if (data.name.length > 100) {
            return { isValid: false, message: 'Name must be less than 100 characters' };
        }
        
        if (data.bio && data.bio.length > 500) {
            return { isValid: false, message: 'Bio must be less than 500 characters' };
        }
        
        if (data.website && !this.isValidURL(data.website)) {
            return { isValid: false, message: 'Please enter a valid website URL' };
        }
        
        if (data.skills.length > 20) {
            return { isValid: false, message: 'Maximum 20 skills allowed' };
        }
        
        return { isValid: true };
    }

    /**
     * Check if URL is valid
     */
    isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Cancel profile editing
     */
    cancelEdit() {
        if (this.unsavedChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }
        
        this.toggleEditMode();
    }

    /**
     * Mark profile as changed
     */
    markAsChanged() {
        this.unsavedChanges = true;
        
        // Update save button state
        const saveButton = document.querySelector('#saveActions .btn-primary');
        if (saveButton && !saveButton.classList.contains('pulse')) {
            saveButton.classList.add('pulse');
        }
    }

    /**
     * Handle form changes
     */
    handleFormChange() {
        if (this.isEditMode) {
            this.markAsChanged();
        }
    }

    /**
     * Handle before unload event
     */
    handleBeforeUnload(event) {
        if (this.unsavedChanges) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    /**
     * Update page title
     */
    updatePageTitle() {
        document.title = `${this.profileData.name} - Profile | TechSynergy`;
    }

    /**
     * Initialize tooltips
     */
    initializeTooltips() {
        const tooltipElements = document.querySelectorAll('[title]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip);
            element.addEventListener('mouseleave', this.hideTooltip);
        });
    }

    /**
     * Setup lazy loading for images
     */
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    /**
     * Initialize accessibility features
     */
    initializeAccessibility() {
        // Add keyboard navigation for interactive elements
        const interactiveElements = document.querySelectorAll('[onclick], .clickable');
        interactiveElements.forEach(element => {
            if (!element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '0');
            }
            
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    element.click();
                }
            });
        });
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
        });
    }

    /**
     * Utility methods
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoadingState(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay') || this.createLoadingOverlay();
        const messageElement = overlay.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    hideLoadingState() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    createLoadingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                <span class="loading-message">Loading...</span>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}" aria-hidden="true"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close">
                <i class="fas fa-times" aria-hidden="true"></i>
            </button>
        `;

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

    showErrorMessage(message) {
        this.showToast(message, 'error');
    }

    // Navigation methods called from HTML
    viewGig(gigId) {
        window.location.href = `freelancing/gigs.html?id=${gigId}`;
    }

    viewEvent(eventId) {
        window.location.href = `events/events.html?id=${eventId}`;
    }

    // Cleanup method
    cleanup() {
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
        
        // Remove event listeners
        const formInputs = document.querySelectorAll('.form-input, .form-textarea, .form-select');
        formInputs.forEach(input => {
            input.removeEventListener('change', this.handleFormChange);
            input.removeEventListener('input', this.handleFormChange);
        });
    }
}

// Global functions for HTML onclick handlers
function toggleEditMode() {
    if (window.profileManager) {
        window.profileManager.toggleEditMode();
    }
}

function saveProfile() {
    if (window.profileManager) {
        window.profileManager.saveProfile();
    }
}

function cancelEdit() {
    if (window.profileManager) {
        window.profileManager.cancelEdit();
    }
}

function addSkill() {
    if (window.profileManager) {
        window.profileManager.addSkill();
    }
}

function removeSkill(skill) {
    if (window.profileManager) {
        window.profileManager.removeSkill(skill);
    }
}

function addSuggestedSkill(skill) {
    if (window.profileManager) {
        window.profileManager.addSuggestedSkill(skill);
    }
}

function addProject() {
    if (window.profileManager) {
        window.profileManager.addProject();
    }
}

function closeAddProjectModal() {
    if (window.profileManager) {
        window.profileManager.closeAddProjectModal();
    }
}

function saveProject() {
    if (window.profileManager) {
        window.profileManager.saveProject();
    }
}

function addProjectTechnology(event, projectId = null) {
    if (event && event.key === 'Enter') {
        event.preventDefault();
        if (window.profileManager) {
            if (projectId) {
                // Handle project-specific technology addition in edit mode
                const tech = event.target.value.trim();
                if (tech) {
                    window.profileManager.addProjectTechnologyToProject(projectId, tech);
                    event.target.value = '';
                }
            } else {
                window.profileManager.addProjectTechnology();
            }
        }
    }
}

function removeProjectTechnology(tech) {
    if (window.profileManager) {
        window.profileManager.removeProjectTechnology(tech);
    }
}

function removeProject(projectId) {
    if (window.profileManager) {
        window.profileManager.removeProject(projectId);
    }
}

function updateProject(projectId, field, value) {
    if (window.profileManager) {
        window.profileManager.updateProject(projectId, field, value);
    }
}

function switchActivityTab(tabName) {
    if (window.profileManager) {
        window.profileManager.switchActivityTab(tabName);
    }
}

function shareProfile() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: window.location.href
        });
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            if (window.profileManager) {
                window.profileManager.showToast('Profile link copied to clipboard!', 'success');
            }
        });
    }
}

// Initialize profile manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.profileManager = new ProfileManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.profileManager) {
        window.profileManager.cleanup();
    }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileManager;
}