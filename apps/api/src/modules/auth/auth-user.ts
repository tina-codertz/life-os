// What the guard knows about the caller: just the ID from the access token. Loading the full
// user (and checking it still exists) is up to the endpoint that needs it.
export interface AuthUser {
  id: string;
}

// Adds `req.user` to Express's Request type, set by JwtAuthGuard.
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}
