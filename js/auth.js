// js/auth.js
class AuthManager {
    constructor() {
        this.app = window.app || new TechSynergyApp();
        this.init();
    }

    init() {
        this.setupLoginForm();
        this.setupRegisterForm();
        this.setupSkillsInput();
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (!loginForm) return;

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleLogin(e);
        });

        const googleLoginBtn = document.getElementById('googleLoginBtn');
        if (googleLoginBtn) {
            googleLoginBtn.addEventListener('click', () => this.handleGoogleAuth());
        }
    }

    setupRegisterForm() {
        const registerForm = document.getElementById('registerForm');
        if (!registerForm) return;

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleRegister(e);
        });

        const googleRegisterBtn = document.getElementById('googleRegisterBtn');
        if (googleRegisterBtn) {
            googleRegisterBtn.addEventListener('click', () => this.handleGoogleAuth(true));
        }

        // Password confirmation validation
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (password && confirmPassword) {
            confirmPassword.addEventListener('input', () => {
                const errorDiv = document.getElementById('confirm-password-error');
                if (password.value !== confirmPassword.value) {
                    errorDiv.textContent = 'Passwords do not match';
                } else {
                    errorDiv.textContent = '';
                }
            });
        }
    }

    setupSkillsInput() {
        const skillInput = document.getElementById('skillInput');
        const skillsTags = document.getElementById('skillsTags');
        
        if (!skillInput || !skillsTags) return;

        let skills = [];

        skillInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const skill = skillInput.value.trim();
                
                if (skill && !skills.includes(skill)) {
                    skills.push(skill);
                    this.renderSkillTags(skills, skillsTags);
                    skillInput.value = '';
                }
            }
        });

        // Store skills for form submission
        skillsTags.addEventListener('skill-removed', (e) => {
            skills = skills.filter(skill => skill !== e.detail.skill);
        });

        // Make skills available to form
        if (document.getElementById('registerForm')) {
            document.getElementById('registerForm').addEventListener('submit', () => {
                const hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.name = 'skills';
                hiddenInput.value = JSON.stringify(skills);
                document.getElementById('registerForm').appendChild(hiddenInput);
            });
        }
    }

    renderSkillTags(skills, container) {
        container.innerHTML = skills.map(skill => `
            <div class="skill-tag">
                ${skill}
                <span class="remove" onclick="this.removeSkill('${skill}')">&times;</span>
            </div>
        `).join('');
    }

    removeSkill(skill) {
        const event = new CustomEvent('skill-removed', { detail: { skill } });
        document.getElementById('skillsTags').dispatchEvent(event);
        
        const skillTag = Array.from(document.querySelectorAll('.skill-tag'))
            .find(tag => tag.textContent.includes(skill));
        if (skillTag) {
            skillTag.remove();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        
        // For demo purposes - directly redirect to dashboard
        window.location.href = 'dashboard.html';
    }

    async handleRegister(e) {
        e.preventDefault();
        
        // For demo purposes - directly redirect to login page
        window.location.href = 'login.html';
    }

    async handleGoogleAuth(isRegister = false) {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');

            const result = await firebase.auth().signInWithPopup(provider);
            const idToken = await result.user.getIdToken();

            const userData = {
                name: result.user.displayName,
                email: result.user.email,
                profilePicture: result.user.photoURL
            };

            const response = await this.app.makeRequest('/auth/firebase-auth', 'POST', {
                idToken,
                userData
            });

            this.app.setToken(response.token);
            this.app.user = response.user;
            this.app.showNotification(`Welcome${isRegister ? ' to TechSynergy' : ' back'}!`, 'success');
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } catch (error) {
            console.error('Google auth error:', error);
            this.app.showNotification('Authentication failed. Please try again.', 'error');
        }
    }

    getFirebaseErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/weak-password': 'Password should be at least 6 characters',
            'auth/invalid-email': 'Invalid email address',
            'auth/popup-closed-by-user': 'Sign in was cancelled',
            'auth/cancelled-popup-request': 'Only one popup request is allowed at a time',
            'auth/popup-blocked': 'Popup was blocked by the browser'
        };

        return errorMessages[errorCode] || 'An error occurred. Please try again.';
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.textContent = '';
        });
    }

    setLoading(buttonId, isLoading) {
        const button = document.getElementById(buttonId);
        if (!button) return;

        const btnText = button.querySelector('.btn-text');
        const btnLoader = button.querySelector('.btn-loader');

        if (isLoading) {
            button.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnLoader) btnLoader.classList.remove('hidden');
        } else {
            button.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnLoader) btnLoader.classList.add('hidden');
        }
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AuthManager();
});

// Global function for skill removal
function removeSkill(skill) {
    const authManager = window.authManager || new AuthManager();
    authManager.removeSkill(skill);
}

// Frontend authentication handling
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('loginBtn');
    const errorMessage = document.getElementById('general-error');

    // Show/hide password functionality
    window.togglePassword = function(inputId) {
        const input = document.getElementById(inputId);
        const icon = input.nextElementSibling.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    };

    // Form validation
    function validateForm() {
        let isValid = true;
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Reset previous error messages
        document.querySelectorAll('.error-message').forEach(el => el.textContent = '');

        // Email validation
        if (!email) {
            document.getElementById('email-error').textContent = 'Email is required';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById('email-error').textContent = 'Please enter a valid email address';
            isValid = false;
        }

        // Password validation
        if (!password) {
            document.getElementById('password-error').textContent = 'Password is required';
            isValid = false;
        }

        return isValid;
    }

    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        // Show loading state
        loginBtn.disabled = true;
        loginBtn.querySelector('.btn-text').style.display = 'none';
        loginBtn.querySelector('.btn-loader').classList.remove('hidden');

        try {
            const response = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: emailInput.value.trim(),
                    password: passwordInput.value
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Store token and user data
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(data.data.user));

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            errorMessage.textContent = error.message || 'An error occurred during login';
            errorMessage.style.display = 'block';
        } finally {
            // Reset button state
            loginBtn.disabled = false;
            loginBtn.querySelector('.btn-text').style.display = 'block';
            loginBtn.querySelector('.btn-loader').classList.add('hidden');
        }
    });

    // Google login handler
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', () => {
            // Implement Google login functionality here
            console.log('Google login clicked');
        });
    }
});

