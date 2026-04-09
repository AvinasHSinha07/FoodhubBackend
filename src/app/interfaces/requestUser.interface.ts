export interface IRequestUser {
  userId: string;
  role: string;
  email: string;
}

declare global {
  namespace Express {
      interface Request {
          user: IRequestUser;
      }
  }
}