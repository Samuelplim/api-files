# 3. Armazenamento e Gerenciamento

Este documento descreve a configuração e implementação do armazenamento e gerenciamento de arquivos no projeto.

## Configuração do Local de Armazenamento

### 1. Estrutura de Pastas

A estrutura de pastas para armazenamento segue este modelo:

```
public/
└── uploads/
    ├── YYYY-MM-DD/        # Organização por data
    └── categories/        # Organização por categorias
        ├── documents/     # Documentos
        ├── images/        # Imagens
        └── other/         # Outros tipos
```

### 2. Configuração para Acesso Estático

Esta configuração já foi incluída no servidor Express no documento anterior:

```typescript
// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, "../public")));
```

### 3. Implementação do Armazenamento

Arquivo: `src/infrastructure/storage/FileStorage.ts`

```typescript
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { ApiError } from "../../interfaces/errors/ApiError";

const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(fs.stat);

export class FileStorage {
  private baseUploadPath: string;

  constructor() {
    this.baseUploadPath = path.join(__dirname, "../../../public/uploads");
  }

  /**
   * Verifica se um arquivo existe
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await statAsync(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Constrói o caminho completo para um arquivo a partir de sua URI
   */
  getFullPath(uri: string): string {
    // Se a URI já for um caminho completo com a pasta public, retorna direto
    if (uri.startsWith("/uploads/")) {
      return path.join(__dirname, "../../../public", uri);
    }

    // Se a URI for apenas o nome do arquivo, busca na pasta padrão
    return path.join(this.baseUploadPath, uri);
  }

  /**
   * Recupera um arquivo do sistema de arquivos
   */
  async getFile(uri: string): Promise<{ buffer: Buffer; filePath: string }> {
    const filePath = this.getFullPath(uri);

    if (!(await this.fileExists(filePath))) {
      throw new ApiError(`Arquivo não encontrado: ${uri}`, 404);
    }

    try {
      const buffer = await readFileAsync(filePath);
      return { buffer, filePath };
    } catch (error) {
      throw new ApiError(`Erro ao ler arquivo: ${uri}`, 500);
    }
  }

  /**
   * Determina o tipo MIME de um arquivo com base em sua extensão
   */
  getMimeType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();

    const mimeTypes: { [key: string]: string } = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain",
      ".zip": "application/zip",
      ".mp3": "audio/mpeg",
      ".mp4": "video/mp4",
      ".wav": "audio/wav",
      ".avi": "video/x-msvideo",
      ".mov": "video/quicktime",
      ".xml": "application/xml",
      ".csv": "text/csv",
    };

    return mimeTypes[extension] || "application/octet-stream";
  }

  /**
   * Cria os diretórios necessários para armazenar um arquivo
   */
  async ensureDirectoryExists(directoryPath: string): Promise<void> {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
    }
  }

  /**
   * Converte um buffer para uma matriz de números para transferência via JSON
   */
  bufferToArray(buffer: Buffer): number[] {
    return Array.from(buffer);
  }
}
```

## Implementação da Validação e Controle de Arquivos

### 1. Validação de Arquivos

Arquivo: `src/interfaces/http/middlewares/validation.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../errors/ApiError";

/**
 * Middleware para validar requisições de upload de arquivos
 */
export const validateFileUpload = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    throw new ApiError("Arquivo não informado", 400);
  }
  next();
};

/**
 * Middleware para validar requisições de carregamento de arquivos por URI
 */
export const validateFileLoad = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { uris } = req.body;

  if (!uris) {
    throw new ApiError("URIs não informadas", 400);
  }

  if (!Array.isArray(uris)) {
    throw new ApiError("URIs devem ser um array", 400);
  }

  if (uris.length === 0) {
    throw new ApiError("Nenhuma URI fornecida", 400);
  }

  // Validar que todas as URIs são strings
  if (uris.some((uri) => typeof uri !== "string")) {
    throw new ApiError("Todas as URIs devem ser strings", 400);
  }

  next();
};
```

### 2. Implementação da Camada de Aplicação

Arquivo: `src/application/services/FileAppService.ts`

```typescript
import { FileService } from "../../domain/services/FileService";
import { FileRepositoryImpl } from "../../infrastructure/repositories/FileRepositoryImpl";
import { FileStorage } from "../../infrastructure/storage/FileStorage";
import { FileResponseDto } from "../dto/FileResponseDto";
import { ApiError } from "../../interfaces/errors/ApiError";
import path from "path";

export class FileAppService {
  private fileService: FileService;
  private fileStorage: FileStorage;

  constructor() {
    const fileRepository = new FileRepositoryImpl();
    this.fileService = new FileService(fileRepository);
    this.fileStorage = new FileStorage();
  }

  /**
   * Processa o upload de múltiplos arquivos
   */
  async uploadFiles(files: Express.Multer.File[]): Promise<FileResponseDto[]> {
    // Verificar se há arquivos
    if (!files || files.length === 0) {
      throw new ApiError("Arquivo não informado", 400);
    }

    const responses: FileResponseDto[] = [];

    for (const file of files) {
      // Gerar URL relativa para o arquivo
      const relativePath = file.path.split("public")[1].replace(/\\/g, "/");
      const uri = relativePath;

      // Obter o tipo MIME do arquivo
      const type = this.fileStorage.getMimeType(file.path);

      // Adicionar à lista de respostas
      responses.push({
        name: file.originalname,
        uri,
        type,
      });
    }

    return responses;
  }

  /**
   * Carrega arquivos a partir de suas URIs
   */
  async loadFiles(uris: string[]): Promise<any[]> {
    const results = [];

    for (const uri of uris) {
      try {
        // Buscar o arquivo no sistema de arquivos
        const { buffer, filePath } = await this.fileStorage.getFile(uri);

        // Obter o tipo MIME
        const type = this.fileStorage.getMimeType(filePath);

        // Converter buffer para array
        const bufferArray = this.fileStorage.bufferToArray(buffer);

        // Adicionar ao resultado
        results.push({
          buffer: {
            type,
            data: bufferArray,
          },
          type,
        });
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(`Erro ao processar arquivo: ${uri}`, 500);
      }
    }

    return results;
  }
}
```

### 3. DTOs para Transferência de Dados

Arquivo: `src/application/dto/FileResponseDto.ts`

```typescript
export interface FileResponseDto {
  name: string;
  uri: string;
  type: string;
}
```

Arquivo: `src/application/dto/FileUploadDto.ts`

```typescript
export interface FileUploadDto {
  files: Express.Multer.File[];
}
```

## Próximos Passos

Após configurar o armazenamento e gerenciamento de arquivos, siga para o próximo documento: [Segurança e Limitações](./04-seguranca-limitacoes.md) para implementar medidas de segurança e limitações apropriadas.
