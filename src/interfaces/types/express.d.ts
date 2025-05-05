import { Express } from "express-serve-static-core";
import multer from "multer";

declare global {
  namespace Express {
    interface Request {
      files?:
        | Express.Multer.File[]
        | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}
