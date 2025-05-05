import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../errors/ApiError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Erro:", err);

  // Se for um erro da API, já possui código de status
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Erros do Multer
  if (err.name === "MulterError") {
    let message = "Erro no upload de arquivo";
    let statusCode = 400;

    // Erros específicos do Multer
    if (err.message === "File too large") {
      message = "Arquivo excede o tamanho máximo permitido";
    } else if (err.message === "Too many files") {
      message = "Número máximo de arquivos excedido";
    }

    res.status(statusCode).json({
      error: {
        message,
        statusCode,
      },
    });
    return;
  }

  // Erro desconhecido
  res.status(500).json({
    error: {
      message: "Erro interno do servidor",
      statusCode: 500,
    },
  });
  return;
};
