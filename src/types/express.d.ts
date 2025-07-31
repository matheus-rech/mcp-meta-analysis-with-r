// Extend Express Request type to include id
declare namespace Express {
  interface Request {
    id?: string;
  }
}