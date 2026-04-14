/**
 * HoraCité - JavaScript principal
 * Système de Gestion des Horaires Académiques
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les composants
    initFormValidation();
    initAlertDismiss();
    initConfirmActions();
    initTooltips();
    initSidebarToggle();
});

/**
 * Validation des formulaires Bootstrap
 */
function initFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');

    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        });
    });

    // Validation en temps réel pour certains champs
    const codeInputs = document.querySelectorAll('input[pattern]');
    codeInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.pattern) {
                const regex = new RegExp(this.pattern);
                if (regex.test(this.value)) {
                    this.classList.remove('is-invalid');
                    this.classList.add('is-valid');
                } else {
                    this.classList.remove('is-valid');
                    this.classList.add('is-invalid');
                }
            }
        });
    });
}

/**
 * Auto-dismiss des alertes après un délai
 */
function initAlertDismiss() {
    const alerts = document.querySelectorAll('.alert-dismissible');

    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
            bsAlert.close();
        }, 15000);
    });
}

/**
 * Confirmation des actions destructives
 */
function initConfirmActions() {
    const deleteButtons = document.querySelectorAll('[data-confirm]');

    deleteButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            const message = this.dataset.confirm || 'Êtes-vous sûr de vouloir effectuer cette action ?';
            if (!confirm(message)) {
                event.preventDefault();
            }
        });
    });
}

/**
 * Initialiser les tooltips Bootstrap
 */
function initTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
}

/**
 * Toggle sidebar sur mobile
 */
function initSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('[data-bs-toggle="collapse"][data-bs-target="#sidebar"]');

    if (sidebar && toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            sidebar.classList.toggle('show');
        });
    }
}

/**
 * Afficher un message toast
 */
function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white bg-${type}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toastEl);
    const toast = new bootstrap.Toast(toastEl);
    toast.show();

    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

/**
 * Afficher un spinner de chargement
 */
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'spinner-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Chargement...</span>
        </div>
    `;
    document.body.appendChild(overlay);
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.remove();
}

/**
 * Requête AJAX générique
 */
async function fetchAPI(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    try {
        const response = await fetch(url, { ...defaultOptions, ...options });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Une erreur s\'est produite');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Vérifier les conflits d'horaire
 */
async function checkConflicts(salleId, professeurId, sessionId, jour, heureDebut, heureFin) {
    try {
        const params = new URLSearchParams({
            salle_id: salleId,
            professeur_id: professeurId,
            session_id: sessionId,
            jour: jour,
            heure_debut: heureDebut,
            heure_fin: heureFin
        });

        const data = await fetchAPI(`/horaires/api/check-conflits?${params}`);
        return data;
    } catch (error) {
        console.error('Erreur lors de la vérification des conflits:', error);
        return { hasConflits: false, conflits: [] };
    }
}

/**
 * Charger les salles disponibles
 */
async function loadAvailableRooms(sessionId, jour, heureDebut, heureFin, type = null) {
    try {
        const params = new URLSearchParams({
            session_id: sessionId,
            jour: jour,
            heure_debut: heureDebut,
            heure_fin: heureFin
        });
        if (type) params.append('type', type);

        return await fetchAPI(`/salles/api/disponibles?${params}`);
    } catch (error) {
        console.error('Erreur lors du chargement des salles:', error);
        return [];
    }
}

/**
 * Charger les professeurs disponibles
 */
async function loadAvailableProfessors(sessionId, jour, heureDebut, heureFin, specialite = null) {
    try {
        const params = new URLSearchParams({
            session_id: sessionId,
            jour: jour,
            heure_debut: heureDebut,
            heure_fin: heureFin
        });
        if (specialite) params.append('specialite', specialite);

        return await fetchAPI(`/professeurs/api/disponibles?${params}`);
    } catch (error) {
        console.error('Erreur lors du chargement des professeurs:', error);
        return [];
    }
}

/**
 * Charger les pavillons (Monocampus)
 */
async function loadPavillons() {
    try {
        return await fetchAPI(`/salles/api/pavillons`);
    } catch (error) {
        console.error('Erreur lors du chargement des pavillons:', error);
        return [];
    }
}

/**
 * Formater une heure
 */
function formatTime(time) {
    if (!time) return '';
    return time.substring(0, 5);
}

/**
 * Obtenir le nom du jour
 */
function getDayName(dayNumber) {
    const days = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    return days[dayNumber] || '';
}

/**
 * Exporter les fonctions utilitaires
 */
window.HoraCite = {
    showToast,
    showLoading,
    hideLoading,
    fetchAPI,
    checkConflicts,
    loadAvailableRooms,
    loadAvailableProfessors,
    loadPavillons,
    formatTime,
    getDayName
};
