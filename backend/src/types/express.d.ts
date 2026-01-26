import { JwtPayload } from "../middlewares/auth.middleware";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload; // Change from {id: string; role: string} to JwtPayload
    }
  }
}