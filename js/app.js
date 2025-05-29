// js/app.js
class TechSynergyApp {
    constructor() {
        this.API_BASE = 'http://localhost:3000/api';
        this.token = localStorage.getItem('token');
        this.user = null;
        this.init();
    }

    async init() {
        // For demo purposes - skip all authentication
        this.setupEventListeners();
        this.updateNavigation();
    }

    setupEventListeners() {
        // Navigation toggle for mobile
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default button behavior
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });
        }

        // User dropdown
        const userAvatar = document.getElementById('user-avatar');
        const userDropdown = document.getElementById('user-dropdown');
        
        if (userAvatar && userDropdown) {
            userAvatar.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default behavior
                userDropdown.style.display = 
                    userDropdown.style.display === 'block' ? 'none' : 'block';
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!userAvatar.contains(e.target)) {
                    userDropdown.style.display = 'none';
                }
            });
        }

        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.getElementById('navbar');
            if (navbar) {
                if (window.scrollY > 50) {
                    navbar.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                    navbar.style.backdropFilter = 'blur(10px)';
                } else {
                    navbar.style.backgroundColor = 'white';
                    navbar.style.backdropFilter = 'none';
                }
            }
        });

        // Remove focus outline for all buttons and interactive elements
        document.querySelectorAll('button, a, [role="button"], [tabindex="0"]').forEach(element => {
            element.addEventListener('mousedown', (e) => {
                e.preventDefault();
                element.style.outline = 'none';
            });
            
            element.addEventListener('mouseup', () => {
                element.style.outline = '';
            });

            // Add focus styles for keyboard navigation
            element.addEventListener('focus', () => {
                if (document.activeElement === element) {
                    element.style.outline = '2px solid var(--primary-color)';
                    element.style.outlineOffset = '2px';
                }
            });

            element.addEventListener('blur', () => {
                element.style.outline = '';
            });
        });
    }

    async loadUser() {
        try {
            const response = await this.makeRequest('/auth/me', 'GET');
            this.user = response;
            this.updateNavigation();
            return response;
        } catch (error) {
            console.error('Failed to load user:', error);
            this.logout();
            return null;
        }
    }

    updateNavigation() {
        const navAuth = document.getElementById('nav-auth');
        const navUser = document.getElementById('nav-user');
        
        if (this.user && this.token) {
            if (navAuth) navAuth.classList.add('hidden');
            if (navUser) navUser.classList.remove('hidden');
            
            // Update user avatar with initials or image
            const userAvatar = document.getElementById('user-avatar');
            if (userAvatar) {
                if (this.user.profilePicture) {
                    userAvatar.innerHTML = `<img src="${this.user.profilePicture}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                } else {
                    const initials = this.user.name.split(' ').map(n => n[0]).join('').toUpperCase();
                    userAvatar.innerHTML = `<span>${initials}</span>`;
                }
            }
        } else {
            if (navAuth) navAuth.classList.remove('hidden');
            if (navUser) navUser.classList.add('hidden');
        }
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.API_BASE}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (this.token) {
            options.headers.Authorization = `Bearer ${this.token}`;
        }

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.updateNavigation();
        
        // Redirect to home page if not already there
        if (window.location.pathname !== '/' && window.location.pathname !== '/index.html') {
            window.location.href = '/';
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: inherit; cursor: pointer; padding: 0; margin-left: 1rem;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
        return `${Math.ceil(diffDays / 365)} years ago`;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    validatePassword(password) {
        return password.length >= 8;
    }

    sanitizeInput(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
}

// Initialize the app
const app = new TechSynergyApp();

// Global functions
function logout() {
    app.logout();
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TechSynergyApp;
}