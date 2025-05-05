import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../errors/ApiError";

export const validateLoadFilesRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { uris } = req.body;

  if (!uris) {
    return next(new ApiError("URIs não informadas", 400));
  }

  if (!Array.isArray(uris)) {
    return next(new ApiError("URIs devem ser um array", 400));
  }

  if (uris.length === 0) {
    return next(new ApiError("Lista de URIs está vazia", 400));
  }

  for (const uri of uris) {
    if (typeof uri !== "string") {
      return next(new ApiError("Todas as URIs devem ser strings", 400));
    }
  }

  next();
};
