# 6. Estrutura DDD (Domain-Driven Design)

Este documento descreve a estrutura de pastas e a organização do código seguindo o padrão Domain-Driven Design (DDD).

## Visão Geral da Estrutura

A aplicação segue a estrutura DDD para melhor organização e separação de responsabilidades:

```
src/
├── domain/                     # Regras de negócio e entidades
│   ├── entities/               # Modelos/entidades de domínio
│   │   └── File.ts             # Entidade que representa um arquivo
│   ├── repositories/           # Interfaces dos repositórios
│   │   └── FileRepository.ts   # Interface para operações com arquivos
│   └── services/               # Serviços de domínio
│       └── FileService.ts      # Regras de negócio para manipulação de arquivos
│
├── infrastructure/             # Implementações de infraestrutura
│   ├── config/                 # Configurações da aplicação
│   │   ├── multer.ts           # Configuração do Multer
│   │   ├── express.ts          # Configuração do Express
│   │   ├── swagger.ts          # Configuração do Swagger
│   │   └── rateLimit.ts        # Configuração do Rate Limiting
│   ├── repositories/           # Implementações concretas dos repositórios
│   │   └── FileRepositoryImpl.ts # Implementação do repositório de arquivos
│   ├── logger/                 # Componentes de logging
│   │   └── logger.ts           # Configuração de logging
│   └── storage/               # Componentes relacionados ao armazenamento
│       └── FileStorage.ts      # Gerenciamento de armazenamento físico
│
├── application/               # Orquestração entre domínio e infraestrutura
│   ├── dto/                   # Objetos de transferência de dados
│   │   ├── FileUploadDto.ts   # DTO para upload de arquivos
│   │   └── FileResponseDto.ts # DTO para resposta de arquivos
│   └── services/              # Serviços de aplicação
│       └── FileAppService.ts  # Coordena operações com arquivos
│
├── interfaces/                # Camada de interface com usuário
│   ├── http/                  # Interfaces HTTP
│   │   ├── controllers/       # Controladores das rotas
│   │   │   └── FileController.ts # Controlador para endpoints de arquivos
│   │   ├── middlewares/       # Middlewares do Express
│   │   │   ├── validation.ts  # Middleware de validação
│   │   │   └── errorHandler.ts # Middleware de tratamento de erros
│   │   └── routes/            # Definição de rotas
│   │       └── fileRoutes.ts  # Rotas para manipulação de arquivos
│   ├── errors/                # Tratamento de erros
│   │   └── ApiError.ts        # Classe para erros da API
│   └── types/                 # Tipos e interfaces para a camada de interface
│       └── express.d.ts       # Extensões de tipos para o Express
│
└── public/                    # Armazenamento físico dos arquivos
    └── uploads/               # Diretório base de uploads
        ├── YYYY-MM-DD/        # Organização por data
        └── categories/        # Organização por categorias
            ├── documents/     # Documentos
            ├── images/        # Imagens
            └── other/         # Outros tipos
```

## Implementação dos Componentes DDD

Vamos implementar os componentes principais seguindo a estrutura DDD:

### 1. Camada de Domínio

#### 1.1. Entidade de Arquivo

Arquivo: `src/domain/entities/File.ts`

```typescript
/**
 * Representa um arquivo no sistema
 */
export class File {
  constructor(
    public id: string,
    public name: string,
    public path: string,
    public mimetype: string,
    public size: number,
    public createdAt: Date
  ) {}

  /**
   * Método para validar a entidade
   */
  validate(): boolean {
    if (!this.name || this.name.trim() === "") {
      return false;
    }

    if (!this.path || this.path.trim() === "") {
      return false;
    }

    if (!this.mimetype || this.mimetype.trim() === "") {
      return false;
    }

    if (this.size <= 0) {
      return false;
    }

    return true;
  }

  /**
   * Obtém a extensão do arquivo
   */
  getExtension(): string {
    const parts = this.name.split(".");
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : "";
  }

  /**
   * Verifica se o arquivo é uma imagem
   */
  isImage(): boolean {
    return this.mimetype.startsWith("image/");
  }

  /**
   * Verifica se o arquivo é um documento
   */
  isDocument(): boolean {
    const documentMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ];

    return documentMimeTypes.includes(this.mimetype);
  }
}
```

#### 1.2. Interface do Repositório

Arquivo: `src/domain/repositories/FileRepository.ts`

```typescript
import { File } from "../entities/File";

/**
 * Interface para operações com arquivos
 */
export interface FileRepository {
  /**
   * Salva um arquivo
   * @param filename Nome original do arquivo
   * @param buffer Conteúdo do arquivo
   * @param mimetype Tipo MIME do arquivo
   */
  saveFile(filename: string, buffer: Buffer, mimetype: string): Promise<any>;

  /**
   * Busca um arquivo pelo caminho
   * @param path Caminho do arquivo
   */
  getFile(path: string): Promise<any>;

  /**
   * Verifica se um arquivo existe
   * @param path Caminho do arquivo
   */
  fileExists(path: string): Promise<boolean>;

  /**
   * Remove um arquivo
   * @param path Caminho do arquivo
   */
  deleteFile(path: string): Promise<boolean>;
}
```

#### 1.3. Serviço de Domínio

Arquivo: `src/domain/services/FileService.ts`

```typescript
import { FileRepository } from "../repositories/FileRepository";
import { ApiError } from "../../interfaces/errors/ApiError";

/**
 * Serviço de domínio para manipulação de arquivos
 */
export class FileService {
  constructor(private fileRepository: FileRepository) {}

  /**
   * Salva um arquivo
   */
  async saveFile(
    filename: string,
    buffer: Buffer,
    mimetype: string
  ): Promise<any> {
    try {
      // Validação básica
      if (!filename || !buffer || !mimetype) {
        throw new ApiError("Dados do arquivo inválidos", 400);
      }

      // Delegar ao repositório
      return await this.fileRepository.saveFile(filename, buffer, mimetype);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Erro ao salvar arquivo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Busca um arquivo pelo caminho
   */
  async getFile(path: string): Promise<any> {
    // Verificar se o arquivo existe
    const exists = await this.fileRepository.fileExists(path);

    if (!exists) {
      throw new ApiError("Arquivo não encontrado", 404);
    }

    // Buscar o arquivo
    return await this.fileRepository.getFile(path);
  }

  /**
   * Remove um arquivo
   */
  async deleteFile(path: string): Promise<boolean> {
    // Verificar se o arquivo existe
    const exists = await this.fileRepository.fileExists(path);

    if (!exists) {
      throw new ApiError("Arquivo não encontrado", 404);
    }

    // Remover o arquivo
    return await this.fileRepository.deleteFile(path);
  }
}
```

### 2. Camada de Infraestrutura

#### 2.1. Implementação do Repositório

Arquivo: `src/infrastructure/repositories/FileRepositoryImpl.ts`

```typescript
import { FileRepository } from "../../domain/repositories/FileRepository";
import { FileStorage } from "../storage/FileStorage";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { nanoid } from "nanoid";
import { ApiError } from "../../interfaces/errors/ApiError";

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

/**
 * Implementação concreta do repositório de arquivos
 */
export class FileRepositoryImpl implements FileRepository {
  private fileStorage: FileStorage;

  constructor() {
    this.fileStorage = new FileStorage();
  }

  /**
   * Salva um arquivo no sistema de arquivos
   */
  async saveFile(
    filename: string,
    buffer: Buffer,
    mimetype: string
  ): Promise<any> {
    try {
      // Gerar um ID único para o arquivo
      const id = nanoid();

      // Obter a data atual para organização por pastas
      const today = new Date();
      const dateFolder = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      // Normalizar o nome do arquivo
      const normalizedName = this.normalizeFileName(filename);

      // Determinar a extensão do arquivo
      const fileExt = path.extname(filename);

      // Gerar um timestamp
      const timestamp = Date.now();

      // Criar o nome final do arquivo
      const finalFileName = `${timestamp}-${id}-${normalizedName}`;

      // Determinar a pasta base conforme tipo do arquivo
      let categoryFolder = "other";
      if (mimetype.startsWith("image/")) {
        categoryFolder = "images";
      } else if (
        mimetype === "application/pdf" ||
        mimetype === "application/msword" ||
        mimetype.includes("officedocument") ||
        mimetype === "text/plain" ||
        mimetype === "text/csv"
      ) {
        categoryFolder = "documents";
      }

      // Criar o caminho completo para o arquivo por data
      const dateDirPath = path.join(
        __dirname,
        "../../../public/uploads",
        dateFolder
      );
      await this.fileStorage.ensureDirectoryExists(dateDirPath);

      // Caminho completo do arquivo
      const filePath = path.join(dateDirPath, finalFileName + fileExt);

      // Salvar o arquivo
      await writeFileAsync(filePath, buffer);

      // Gerar URI relativa para o arquivo
      const uri = `/uploads/${dateFolder}/${finalFileName}${fileExt}`;

      // Retornar os dados do arquivo
      return {
        id,
        name: filename,
        path: filePath,
        uri,
        mimetype,
        size: buffer.length,
        createdAt: today,
      };
    } catch (error) {
      throw new ApiError(
        `Erro ao salvar arquivo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Busca um arquivo pelo caminho
   */
  async getFile(path: string): Promise<any> {
    try {
      return await this.fileStorage.getFile(path);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `Erro ao buscar arquivo: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Verifica se um arquivo existe
   */
  async fileExists(path: string): Promise<boolean> {
    return await this.fileStorage.fileExists(path);
  }

  /**
   * Remove um arquivo
   */
  async deleteFile(path: string): Promise<boolean> {
    try {
      const filePath = this.fileStorage.getFullPath(path);
      await unlinkAsync(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Normaliza o nome do arquivo
   */
  private normalizeFileName(fileName: string): string {
    // Remove caracteres especiais e espaços
    return fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]/g, "-")
      .toLowerCase();
  }
}
```

### 3. Camada de Aplicação

#### 3.1. DTOs

Arquivo: `src/application/dto/FileResponseDto.ts`

```typescript
/**
 * DTO para resposta após upload de arquivos
 */
export interface FileResponseDto {
  name: string;
  uri: string;
  type: string;
}
```

Arquivo: `src/application/dto/FileUploadDto.ts`

```typescript
/**
 * DTO para recebimento de dados de upload
 */
export interface FileUploadDto {
  files: Express.Multer.File[];
}
```

#### 3.2. Serviço de Aplicação

Arquivo: `src/application/services/FileAppService.ts`

```typescript
import { FileService } from "../../domain/services/FileService";
import { FileRepositoryImpl } from "../../infrastructure/repositories/FileRepositoryImpl";
import { FileStorage } from "../../infrastructure/storage/FileStorage";
import { FileResponseDto } from "../dto/FileResponseDto";
import { ApiError } from "../../interfaces/errors/ApiError";
import path from "path";

/**
 * Serviço de aplicação para orquestrar operações com arquivos
 */
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

### 4. Camada de Interfaces

#### 4.1. Classe para Tratamento de Erros

Arquivo: `src/interfaces/errors/ApiError.ts`

```typescript
/**
 * Classe para representar erros da API
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
  }
}
```

#### 4.2. Middleware de Tratamento de Erros

Arquivo: `src/interfaces/http/middlewares/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../errors/ApiError";

/**
 * Middleware para tratamento de erros
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Erro interno genérico
  return res.status(500).json({
    error: "Erro interno do servidor",
  });
};
```

## Benefícios da Estrutura DDD

### 1. Separação de Responsabilidades

A estrutura DDD permite uma clara separação de responsabilidades entre as camadas:

- **Domínio**: Contém lógica de negócios pura, independente de frameworks ou tecnologias
- **Infraestrutura**: Implementa os detalhes técnicos, como acesso a dados e configurações
- **Aplicação**: Orquestra o fluxo entre domínio e infraestrutura
- **Interfaces**: Lida com a comunicação com o mundo externo (API HTTP, CLI, etc.)

### 2. Independência de Infraestrutura

A lógica de negócios no domínio não depende de frameworks ou tecnologias específicas, o que facilita:

- Testes unitários sem dependências externas
- Substituição de tecnologias sem alteração das regras de negócio
- Evolução do sistema ao longo do tempo

### 3. Testabilidade

A estrutura facilita a criação de testes em diferentes níveis:

- **Testes unitários**: Focados nas regras de negócio do domínio
- **Testes de integração**: Verificam a interação entre componentes
- **Testes e2e**: Testam o sistema do ponto de vista do usuário

### 4. Manutenibilidade

Código mais organizado e com responsabilidades bem definidas é mais fácil de manter:

- Mais fácil localizar onde uma mudança precisa ser feita
- Menor chance de bugs por efeitos colaterais
- Melhor compreensão do sistema por novos desenvolvedores

### 5. Escalabilidade

A estrutura DDD facilita a escalabilidade do sistema:

- Facilita a adição de novos recursos
- Permite a evolução de partes do sistema independentemente
- Suporta a divisão em microserviços no futuro, se necessário

## Fluxo de Dados na Arquitetura

1. As requisições chegam pelos controllers na camada de interfaces
2. Os controllers usam serviços de aplicação para processar as requisições
3. Os serviços de aplicação orquestram entidades e repositórios do domínio
4. Os repositórios utilizam a infraestrutura para persistir ou recuperar dados

### Exemplo: Upload de Arquivo

1. A requisição HTTP chega ao `FileController.uploadFiles`
2. O controller chama `FileAppService.uploadFiles`
3. O serviço de aplicação usa o `FileService` do domínio
4. O `FileService` utiliza o `FileRepository` para salvar o arquivo
5. O `FileRepositoryImpl` implementa o repositório usando o `FileStorage`
6. O resultado é transformado em um DTO e retornado ao cliente

Esta separação clara de responsabilidades facilita a manutenção, teste e evolução do sistema.

### Visualização do Fluxo de Dados

```
Cliente HTTP                                                  Sistema de Arquivos
    |                                                              |
    | Request POST /api/add-files                                  |
    |                                                              |
    v                                                              |
+-------------------+      +------------------+      +------------+|
| FileController    |----->| FileAppService   |----->| FileService||
| (Interfaces)      |      | (Application)    |      | (Domain)   ||
+-------------------+      +------------------+      +------------+|
    |                             |                       |        |
    |                             |                       v        |
    |                             |                 +--------------+
    |                             |                 | FileRepository|
    |                             |                 | (Domain)      |
    |                             |                 +--------------+
    |                             |                       |
    |                             |                       v
    |                             |                 +--------------+
    |                             |                 | FileRepositoryImpl|
    |                             |                 | (Infrastructure)  |
    |                             |                 +--------------+
    |                             |                       |
    |                             |                       v
    |                             |                 +--------------+
    |                             +---------------->| FileStorage  |
    |                                               | (Infrastructure)|
    |                                               +--------------+
    |                                                      |
    |                                                      v
    |                                                    [Disco]
    |                                                      |
    | Response { name, uri, type }                         |
    |<-----------------------------------------------------|
```

## Exemplos de Código em Cada Camada

### 1. Camada de Interface (Controllers)

```typescript
// FileController.ts (Interface Layer)
uploadFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const results = await this.fileAppService.uploadFiles(files);
    return res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};
```

### 2. Camada de Aplicação (Serviços)

```typescript
// FileAppService.ts (Application Layer)
async uploadFiles(files: Express.Multer.File[]): Promise<FileResponseDto[]> {
  // Verificar arquivos
  if (!files || files.length === 0) {
    throw new ApiError("Arquivo não informado", 400);
  }

  // Processar e transformar resultados
  const responses: FileResponseDto[] = [];
  for (const file of files) {
    // Lógica de processamento...
    responses.push({ name, uri, type });
  }
  return responses;
}
```

### 3. Camada de Domínio (Serviços e Entidades)

```typescript
// FileService.ts (Domain Layer)
async saveFile(filename: string, buffer: Buffer, mimetype: string): Promise<any> {
  // Regras de negócio e validações
  if (!filename || !buffer || !mimetype) {
    throw new ApiError("Dados do arquivo inválidos", 400);
  }

  // Delegar ao repositório
  return await this.fileRepository.saveFile(filename, buffer, mimetype);
}
```

### 4. Camada de Infraestrutura

```typescript
// FileRepositoryImpl.ts (Infrastructure Layer)
async saveFile(filename: string, buffer: Buffer, mimetype: string): Promise<any> {
  // Implementação técnica de como salvar arquivos
  const id = nanoid();
  const dateFolder = /* lógica de pasta por data */;
  // Gerar caminhos, salvar no sistema de arquivos...
  await writeFileAsync(filePath, buffer);
  return { id, name, path, uri, mimetype, size, createdAt };
}
```

## Conclusão

A arquitetura DDD proporciona uma estrutura sólida para o desenvolvimento da API de arquivos, facilitando a manutenção, os testes e a evolução do sistema ao longo do tempo. A clara separação de responsabilidades permite:

1. Foco nas regras de negócio de forma isolada
2. Substituição de tecnologias ou frameworks sem afetar a lógica principal
3. Testes mais específicos e isolados para cada camada
4. Manutenção mais simples com responsabilidades bem definidas
5. Escalabilidade e extensibilidade na adição de novas funcionalidades
