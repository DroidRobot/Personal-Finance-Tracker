import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from './index';
import { prisma } from '@/lib/prisma';
import { PasswordUtil } from '@/utils/password';

export const initializePassport = () => {
  // JWT Strategy
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.jwtSecret,
      },
      async (payload, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
          });

          if (user) {
            return done(null, user);
          }
          return done(null, false);
        } catch (error) {
          return done(error, false);
        }
      }
    )
  );

  // Local Strategy
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (!user || !user.passwordHash) {
            return done(null, false, {
              message: 'Invalid email or password',
            });
          }

          const isValidPassword = await PasswordUtil.verify(
            user.passwordHash,
            password
          );

          if (!isValidPassword) {
            return done(null, false, {
              message: 'Invalid email or password',
            });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Google OAuth Strategy
  if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.oauth.google.clientId,
          clientSecret: config.oauth.google.clientSecret,
          callbackURL: `${config.clientUrl}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists with this OAuth provider
            const oauthProvider = await prisma.oAuthProvider.findUnique({
              where: {
                provider_providerId: {
                  provider: 'google',
                  providerId: profile.id,
                },
              },
              include: { user: true },
            });

            if (oauthProvider) {
              return done(null, oauthProvider.user);
            }

            // Check if user exists with same email
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email provided by Google'));
            }

            let user = await prisma.user.findUnique({
              where: { email: email.toLowerCase() },
            });

            if (!user) {
              // Create new user
              user = await prisma.user.create({
                data: {
                  email: email.toLowerCase(),
                  firstName: profile.name?.givenName || '',
                  lastName: profile.name?.familyName || '',
                  avatarUrl: profile.photos?.[0]?.value,
                  emailVerified: true,
                  oauthProviders: {
                    create: {
                      provider: 'google',
                      providerId: profile.id,
                    },
                  },
                },
              });
            } else {
              // Link OAuth provider to existing user
              await prisma.oAuthProvider.create({
                data: {
                  provider: 'google',
                  providerId: profile.id,
                  userId: user.id,
                },
              });
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }
};

export default initializePassport;
