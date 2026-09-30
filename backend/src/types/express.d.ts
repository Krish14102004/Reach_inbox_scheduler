import type { SessionUser } from '../modules/auth/session.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export {};
