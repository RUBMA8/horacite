/**
 * HoraCité - Système de Gestion des Horaires Académiques
 * Serveur principal Express.js
 *
 * @author Ruben BOUAKALY, Isidore Ombolo, Mira Allaoua, Sofiane Bouyoucef
 * @version 1.0.0
 */

import 'dotenv/config';
import express from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import passport from 'passport';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import https from "node:https";
import { readFile } from 'node:fs/promises';


// Import configurations
import { initializeDatabase } from './config/database.js';
import './config/passport.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import coursRoutes from './routes/coursRoutes.js';
import sallesRoutes from './routes/sallesRoutes.js';
import professeursRoutes from './routes/professeursRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import horairesRoutes from './routes/horairesRoutes.js';



// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 3000;

// Memory Store pour les sessions
const MemoryStore = createMemoryStore(session);

// ============================================
// CONFIGURATION DES MIDDLEWARES
// ============================================

// Sécurité HTTP headers avec Helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            fontSrc: ["'self'", "data:", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://cdn.jsdelivr.net"],
        },
    },
}));

// Compression GZIP
app.use(compression());

// CORS configuration - permet l'accès depuis le réseau local
app.use(cors({
    origin: function(origin, callback) {
        // Permettre les requêtes sans origin (ex: mobile, Postman) ou depuis localhost/réseau local
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.match(/^http:\/\/192\.168\./)) {
            callback(null, true);
        } else {
            callback(null, process.env.CORS_ORIGIN || true);
        }
    },
    credentials: true
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Configuration des sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'horacite_secret_key_change_in_production',
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
        checkPeriod: 86400000 // Nettoyage toutes les 24h
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 1800000 // 30 minutes par défaut
    }
}));

// Passport authentication
app.use(passport.initialize());
app.use(passport.session());

// Variables globales pour les templates
app.use(async (req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.isAuthenticated = req.isAuthenticated();
    res.locals.success_msg = req.session.success_msg;
    res.locals.error_msg = req.session.error_msg;
    // Nettoyer les messages après affichage
    delete req.session.success_msg;
    delete req.session.error_msg;

    // Charger la session active pour toutes les pages authentifiées
    if (req.isAuthenticated()) {
        try {
            const Session = (await import('./models/Session.js')).default;
            res.locals.sessionActive = await Session.findActive();
        } catch (error) {
            console.error('Erreur chargement session active:', error);
            res.locals.sessionActive = null;
        }
    }

    next();
});

// ============================================
// CONFIGURATION HANDLEBARS
// ============================================

app.engine('hbs', engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        // Block helpers pour comparer des valeurs
        eq: function(a, b, options) {
            if (arguments.length === 2) {
                options = b;
                b = undefined;
            }
            if (options && options.fn) {
                return a === b ? options.fn(this) : options.inverse(this);
            }
            return a === b;
        },
        neq: function(a, b, options) {
            if (options && options.fn) {
                return a !== b ? options.fn(this) : options.inverse(this);
            }
            return a !== b;
        },
        lt: function(a, b, options) {
            if (options && options.fn) {
                return a < b ? options.fn(this) : options.inverse(this);
            }
            return a < b;
        },
        gt: function(a, b, options) {
            if (options && options.fn) {
                return a > b ? options.fn(this) : options.inverse(this);
            }
            return a > b;
        },
        lte: function(a, b, options) {
            if (options && options.fn) {
                return a <= b ? options.fn(this) : options.inverse(this);
            }
            return a <= b;
        },
        gte: function(a, b, options) {
            if (options && options.fn) {
                return a >= b ? options.fn(this) : options.inverse(this);
            }
            return a >= b;
        },
        and: function(a, b, options) {
            if (options && options.fn) {
                return a && b ? options.fn(this) : options.inverse(this);
            }
            return a && b;
        },
        or: function(a, b, options) {
            if (options && options.fn) {
                return a || b ? options.fn(this) : options.inverse(this);
            }
            return a || b;
        },
        not: function(a, options) {
            if (options && options.fn) {
                return !a ? options.fn(this) : options.inverse(this);
            }
            return !a;
        },

        // Helper pour formater les dates
        formatDate: (date) => {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('fr-CA');
        },

        // Helper pour formater les heures
        formatTime: (time) => {
            if (!time) return '';
            return time.substring(0, 5);
        },

        // Helper pour les jours de la semaine
        jourSemaine: (num) => {
            const jours = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
            return jours[num] || '';
        },

        // Helper pour les types de salle
        typeSalle: (type) => {
            const types = {
                'theorique': 'Salle théorique',
                'laboratoire_informatique': 'Laboratoire informatique',
                'laboratoire_scientifique': 'Laboratoire scientifique',
                'salle_multimedia': 'Salle multimédia',
                'atelier': 'Atelier',
                'studio': 'Studio'
            };
            return types[type] || type;
        },

        // Helper pour les rôles
        roleLabel: (role) => {
            const roles = {
                'admin': 'Administrateur système',
                'responsable': 'Responsable administratif'
            };
            return roles[role] || role;
        },

        // Helper pour les statuts de session
        statutSession: (statut) => {
            const statuts = {
                'planification': 'En planification',
                'active': 'Active',
                'terminee': 'Terminée'
            };
            return statuts[statut] || statut;
        },

        // Helper JSON stringify
        json: (context) => JSON.stringify(context),

        // Helper pour la pagination
        times: (n, block) => {
            let result = '';
            for (let i = 1; i <= n; i++) {
                result += block.fn(i);
            }
            return result;
        },

        // Helper pour sélectionner une option (compare en string pour gérer number vs string)
        selected: (value, current) => String(value) === String(current) ? 'selected' : '',

        // Helper pour cocher une checkbox
        checked: (value) => value ? 'checked' : '',

        // Helper pour vérifier si une valeur est dans un tableau
        includes: (array, value) => {
            if (!array) return false;
            return array.includes(value);
        },

        // Helper pour formater date et heure
        formatDateTime: (date) => {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('fr-CA') + ' ' + d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
        },

        // Helper pour la couleur des actions d'audit
        actionColor: (action) => {
            const colors = {
                'LOGIN': 'info',
                'LOGOUT': 'secondary',
                'CREATE': 'success',
                'UPDATE': 'warning',
                'DELETE': 'danger',
                'PASSWORD_CHANGE': 'primary'
            };
            return colors[action] || 'secondary';
        },

        // Helper pour échapper JSON dans les attributs HTML
        escapeJson: (str) => {
            if (!str) return '';
            return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
        },

        // Helper mathématique pour addition
        add: (a, b) => a + b,

        // Helper mathématique pour soustraction
        subtract: (a, b) => a - b,

        // Helper pour concaténer des chaînes
        concat: (...args) => {
            args.pop(); // Retirer le dernier argument (options handlebars)
            return args.join('');
        },

        // Helper pour vérifier disponibilité (utilisé dans la grille)
        isAvailable: (heure, jour, disponibilites) => {
            if (!disponibilites) return false;
            return disponibilites.some(d =>
                d.jour_semaine === jour &&
                d.heure_debut <= heure &&
                d.heure_fin > heure
            );
        }
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// ROUTES
// ============================================

// Route racine - Redirection vers login ou dashboard
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Routes de l'application
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/sessions', adminRoutes);
app.use('/cours', coursRoutes);
app.use('/admin/programmes', coursRoutes);
app.use('/salles', sallesRoutes);
app.use('/professeurs', professeursRoutes);
app.use('/horaires', horairesRoutes);


// ============================================
// GESTION DES ERREURS
// ============================================

// Route 404
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

async function startServer() {
    
    try {
        // Initialiser la base de données
        await initializeDatabase();
        console.log('Base de données initialisée avec succès');

        // Démarrer le serveur
        app.listen(PORT, () => {
            console.log('========================================');
            console.log('   HoraCité - Serveur démarré');
            console.log('========================================');
            console.log(`   URL: http://localhost:${PORT}`);
            console.log(`   Environnement: ${process.env.NODE_ENV || 'development'}`);
            console.log('========================================');
        });
    } catch (error) {
        console.error('Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

startServer();

export default app;
