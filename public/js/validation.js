/**
 * HoraCité - Validation côté client
 */

/**
 * Règles de validation du mot de passe
 */
const passwordRules = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true
};

/**
 * Valider un mot de passe
 */
function validatePassword(password) {
    const errors = [];

    if (!password || password.length < passwordRules.minLength) {
        errors.push(`Minimum ${passwordRules.minLength} caractères`);
    }

    if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Au moins une majuscule');
    }

    if (passwordRules.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Au moins une minuscule');
    }

    if (passwordRules.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Au moins un chiffre');
    }

    if (passwordRules.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Au moins un caractère spécial');
    }

    return {
        valid: errors.length === 0,
        errors,
        strength: calculatePasswordStrength(password)
    };
}

/**
 * Calculer la force du mot de passe (0-100)
 */
function calculatePasswordStrength(password) {
    if (!password) return 0;

    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 10;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 15;

    return Math.min(100, strength);
}

/**
 * Valider un email
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Valider un code de cours (XXXX0000)
 */
function validateCourseCode(code) {
    const codeRegex = /^[A-Z]{4}[0-9]{4}$/;
    return codeRegex.test(code);
}

/**
 * Valider une heure (HH:MM)
 */
function validateTime(time) {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
}

/**
 * Initialiser la validation en temps réel pour un champ mot de passe
 */
function initPasswordValidation(inputId, strengthBarId = null, feedbackId = null) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const strengthBar = strengthBarId ? document.getElementById(strengthBarId) : null;
    const feedback = feedbackId ? document.getElementById(feedbackId) : null;

    input.addEventListener('input', function() {
        const result = validatePassword(this.value);

        // Mettre à jour la barre de force
        if (strengthBar) {
            const bar = strengthBar.querySelector('.progress-bar');
            bar.style.width = result.strength + '%';

            // Couleur selon la force
            bar.className = 'progress-bar';
            if (result.strength < 40) {
                bar.classList.add('bg-danger');
            } else if (result.strength < 70) {
                bar.classList.add('bg-warning');
            } else {
                bar.classList.add('bg-success');
            }
        }

        // Mettre à jour le feedback
        if (feedback) {
            if (result.valid) {
                feedback.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> Mot de passe valide</span>';
            } else {
                feedback.innerHTML = '<span class="text-danger">' + result.errors.join(', ') + '</span>';
            }
        }

        // Classes de validation
        if (this.value.length > 0) {
            this.classList.remove('is-valid', 'is-invalid');
            this.classList.add(result.valid ? 'is-valid' : 'is-invalid');
        }
    });
}

/**
 * Initialiser la validation de confirmation de mot de passe
 */
function initPasswordConfirmation(passwordId, confirmId) {
    const password = document.getElementById(passwordId);
    const confirm = document.getElementById(confirmId);

    if (!password || !confirm) return;

    function checkMatch() {
        if (confirm.value.length > 0) {
            const matches = password.value === confirm.value;
            confirm.classList.remove('is-valid', 'is-invalid');
            confirm.classList.add(matches ? 'is-valid' : 'is-invalid');
        }
    }

    password.addEventListener('input', checkMatch);
    confirm.addEventListener('input', checkMatch);
}

/**
 * Initialiser la validation d'email
 */
function initEmailValidation(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('blur', function() {
        if (this.value.length > 0) {
            const valid = validateEmail(this.value);
            this.classList.remove('is-valid', 'is-invalid');
            this.classList.add(valid ? 'is-valid' : 'is-invalid');
        }
    });
}

/**
 * Initialiser la validation de code de cours
 */
function initCourseCodeValidation(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.addEventListener('input', function() {
        // Convertir en majuscules automatiquement
        this.value = this.value.toUpperCase();

        if (this.value.length > 0) {
            const valid = validateCourseCode(this.value);
            this.classList.remove('is-valid', 'is-invalid');
            this.classList.add(valid ? 'is-valid' : 'is-invalid');
        }
    });
}

// Exporter les fonctions
window.HoraCiteValidation = {
    validatePassword,
    calculatePasswordStrength,
    validateEmail,
    validateCourseCode,
    validateTime,
    initPasswordValidation,
    initPasswordConfirmation,
    initEmailValidation,
    initCourseCodeValidation
};
