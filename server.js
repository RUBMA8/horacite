/**
 * HoraCité - Système de Gestion des Horaires Académiques
 *
 * @author Ruben BOUAKALY, Isidore Ombolo, Mira Allaoua, Sophiane Bouyoucef
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

// Importation des configurations
import { initializeDatabase } from './config/database.js';
import './config/passport.js';

// Importation des routes 
import authRoutes from './routes/authRoutes.js';

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialisation Express
const app = express();
const PORT = process.env.PORT || 3000;

// Les sessions
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

// CORS configuration
app.use(cors({
    origin: function(origin, callback) {
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
        checkPeriod: 86400000
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 1800000
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
    delete req.session.success_msg;
    delete req.session.error_msg;

    // Charger la session active
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
        formatDate: (date) => {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('fr-CA');
        },
        formatTime: (time) => {
            if (!time) return '';
            return time.substring(0, 5);
        },
        roleLabel: (role) => {
            const roles = {
                'admin': 'Administrateur système',
                'responsable': 'Responsable administratif',
                'utilisateur': 'Utilisateur'
            };
            return roles[role] || role;
        },
        statutSession: (statut) => {
            const statuts = {
                'planification': 'En planification',
                'active': 'Active',
                'terminee': 'Terminée'
            };
            return statuts[statut] || statut;
        },
        checked: (value) => value ? 'checked' : '',
        selected: (value, current) => String(value) === String(current) ? 'selected' : '',
        formatDateTime: (date) => {
            if (!date) return '';
            const d = new Date(date);
            return d.toLocaleDateString('fr-CA') + ' ' + d.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
        }
    }
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// ============================================
// ROUTES (SPRINT 1)
// ============================================

// Route racine
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/auth/login');
    }
});

// Routes d'authentification (RUBEN)
app.use('/auth', authRoutes);

// Routes dashboard (Basique)
app.use('/dashboard', dashboardRoutes);

// Routes admin (ISIDORE + SOPHIANE)
app.use('/admin', adminRoutes);

// ============================================
// GESTION DES ERREURS
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// DÉMARRAGE DU SERVEUR
// ============================================

async function startServer() {
    try {
        await initializeDatabase();
        console.log('Base de données initialisée avec succès');

        app.listen(PORT, () => {
            console.log('========================================');
            console.log('   HoraCité - Serveur démarré');
            console.log('========================================');
            console.log(`   URL: http://localhost:${PORT}`);
            console.log(`   Environnement: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   Sprint: 1 (Auth + Users + Sessions)`);
            console.log('========================================');
        });
    } catch (error) {
        console.error('Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

startServer();

export default app;
