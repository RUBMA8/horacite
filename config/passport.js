/**
 * Configuration Passport.js pour l'authentification
 */

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { getDatabase } from './database.js';

// Stratégie d'authentification locale
passport.use(new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    async (email, password, done) => {
        try {
            const db = await getDatabase();

            // Rechercher l'utilisateur par email
            const user = await db.get(
                'SELECT * FROM users WHERE email = ? AND actif = 1',
                [email.toLowerCase()]
            );

            if (!user) {
                return done(null, false, { message: 'Identifiants incorrects' });
            }

            // Vérifier le mot de passe
            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                // Logger la tentative échouée
                await db.run(
                    `INSERT INTO audit_logs (user_id, action, details, timestamp)
                     VALUES (?, 'LOGIN_FAILED', ?, CURRENT_TIMESTAMP)`,
                    [user.id, JSON.stringify({ email: user.email, reason: 'wrong_password' })]
                );
                return done(null, false, { message: 'Identifiants incorrects' });
            }

            // Connexion réussie - Logger
            await db.run(
                `INSERT INTO audit_logs (user_id, action, details, timestamp)
                 VALUES (?, 'LOGIN_SUCCESS', ?, CURRENT_TIMESTAMP)`,
                [user.id, JSON.stringify({ email: user.email })]
            );

            // Ne pas inclure le hash du mot de passe dans l'objet utilisateur
            const { password_hash, ...userWithoutPassword } = user;

            return done(null, userWithoutPassword);

        } catch (error) {
            return done(error);
        }
    }
));

// Sérialisation de l'utilisateur pour la session
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Désérialisation de l'utilisateur depuis la session
passport.deserializeUser(async (id, done) => {
    try {
        const db = await getDatabase();
        const user = await db.get(
            'SELECT id, matricule, email, nom, prenom, role, actif, force_password_change, created_at FROM users WHERE id = ?',
            [id]
        );

        if (!user || !user.actif) {
            return done(null, false);
        }

        done(null, user);

    } catch (error) {
        done(error);
    }
});

export default passport;
