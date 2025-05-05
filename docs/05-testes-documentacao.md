# 5. Testes e Documentação

Este documento descreve como implementar testes e documentação para a API de gerenciamento de arquivos.

## Criação de Testes

### 1. Configuração do Jest para Testes Unitários

Primeiro, vamos configurar o Jest para testes unitários:

Arquivo: `jest.config.js`

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/*.interface.ts",
    "!src/**/index.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### 2. Configuração para Testes de Integração (E2E)

Arquivo: `jest-e2e.config.js`

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 10000,
};
```

Arquivo: `tests/setup.ts`

```typescript
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// Carregar variáveis de ambiente de teste
dotenv.config({ path: ".env.test" });

// Criar arquivo .env.test se não existir
const envTestPath = path.join(process.cwd(), ".env.test");
if (!fs.existsSync(envTestPath)) {
  fs.writeFileSync(
    envTestPath,
    `PORT=3001
NODE_ENV=test
UPLOAD_DIR=public/uploads/test
MAX_FILE_SIZE=5242880
MAX_FILES_PER_REQUEST=5
VALIDATE_FILE_TYPES=false`
  );
}

// Garantir que o diretório de upload de teste exista
const testUploadDir = path.join(process.cwd(), "public/uploads/test");
if (!fs.existsSync(testUploadDir)) {
  fs.mkdirSync(testUploadDir, { recursive: true });
}

// Limpeza global após todos os testes
afterAll(async () => {
  // Limpar arquivos de teste gerados
  const testFilesDir = path.join(process.cwd(), "public/uploads/test");

  if (fs.existsSync(testFilesDir)) {
    const files = fs.readdirSync(testFilesDir);

    for (const file of files) {
      if (file !== ".gitkeep") {
        fs.unlinkSync(path.join(testFilesDir, file));
      }
    }
  }
});
```

### 3. Testes E2E para a Rota `/add-files`

Arquivo: `tests/e2e/file-api.test.ts`

```typescript
import request from "supertest";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import app from "../../src/server";

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

describe("File API E2E Tests", () => {
  // Caminho para arquivos de teste temporários
  const testFile1Path = path.join(__dirname, "test-file-1.txt");
  const testFile2Path = path.join(__dirname, "test-file-2.txt");

  // Criar arquivos de teste antes dos testes
  beforeAll(async () => {
    await writeFileAsync(
      testFile1Path,
      "Este é o conteúdo do arquivo de teste 1"
    );
    await writeFileAsync(
      testFile2Path,
      "Este é o conteúdo do arquivo de teste 2"
    );
  });

  // Limpar arquivos de teste após os testes
  afterAll(async () => {
    try {
      await unlinkAsync(testFile1Path);
      await unlinkAsync(testFile2Path);
    } catch (error) {
      console.error("Erro ao limpar arquivos de teste:", error);
    }
  });

  describe("POST /api/add-files", () => {
    it("deve fazer upload de um único arquivo com sucesso", async () => {
      const response = await request(app)
        .post("/api/add-files")
        .attach("files", testFile1Path);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty("name");
      expect(response.body[0]).toHaveProperty("uri");
      expect(response.body[0]).toHaveProperty("type");
      expect(response.body[0].name).toBe("test-file-1.txt");
      expect(response.body[0].type).toBe("text/plain");
    });

    it("deve fazer upload de múltiplos arquivos com sucesso", async () => {
      const response = await request(app)
        .post("/api/add-files")
        .attach("files", testFile1Path)
        .attach("files", testFile2Path);

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);

      // Verificar o primeiro arquivo
      expect(response.body[0]).toHaveProperty("name");
      expect(response.body[0]).toHaveProperty("uri");
      expect(response.body[0]).toHaveProperty("type");

      // Verificar o segundo arquivo
      expect(response.body[1]).toHaveProperty("name");
      expect(response.body[1]).toHaveProperty("uri");
      expect(response.body[1]).toHaveProperty("type");
    });

    it("deve retornar erro 400 quando nenhum arquivo é enviado", async () => {
      const response = await request(app)
        .post("/api/add-files")
        .set("Content-Type", "multipart/form-data");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("Arquivo não informado");
    });
  });

  describe("POST /api/load-files", () => {
    let uploadedFileUri: string;

    // Fazer upload de um arquivo para testar o carregamento
    beforeAll(async () => {
      const response = await request(app)
        .post("/api/add-files")
        .attach("files", testFile1Path);

      uploadedFileUri = response.body[0].uri;
    });

    it("deve carregar um arquivo existente com sucesso", async () => {
      const response = await request(app)
        .post("/api/load-files")
        .send({ uris: [uploadedFileUri] });

      expect(response.status).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(1);
      expect(response.body[0]).toHaveProperty("buffer");
      expect(response.body[0]).toHaveProperty("type");
      expect(response.body[0].buffer).toHaveProperty("type");
      expect(response.body[0].buffer).toHaveProperty("data");
      expect(response.body[0].buffer.type).toBe("text/plain");
    });

    it("deve retornar erro 400 quando nenhuma URI é enviada", async () => {
      const response = await request(app).post("/api/load-files").send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("deve retornar erro 404 quando um arquivo não existe", async () => {
      const response = await request(app)
        .post("/api/load-files")
        .send({ uris: ["/uploads/non-existent-file.txt"] });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
```

### 4. Testes Unitários para os Serviços

Arquivo: `src/domain/services/FileService.test.ts`

```typescript
import { FileService } from "./FileService";
import { FileRepository } from "../repositories/FileRepository";

// Mock do repositório
const mockFileRepository: jest.Mocked<FileRepository> = {
  saveFile: jest.fn(),
  getFile: jest.fn(),
  fileExists: jest.fn(),
  deleteFile: jest.fn(),
};

describe("FileService", () => {
  let fileService: FileService;

  beforeEach(() => {
    fileService = new FileService(mockFileRepository);
    // Resetar todos os mocks antes de cada teste
    jest.resetAllMocks();
  });

  describe("saveFile", () => {
    it("deve salvar um arquivo", async () => {
      // Configurar o mock para retornar um valor específico
      const mockFileData = {
        name: "test.txt",
        path: "/uploads/test.txt",
        mimetype: "text/plain",
      };

      mockFileRepository.saveFile.mockResolvedValue(mockFileData);

      // Executar o método a ser testado
      const result = await fileService.saveFile(
        "test.txt",
        Buffer.from("test"),
        "text/plain"
      );

      // Verificar se o método do repositório foi chamado com os parâmetros corretos
      expect(mockFileRepository.saveFile).toHaveBeenCalledWith(
        "test.txt",
        expect.any(Buffer),
        "text/plain"
      );

      // Verificar o resultado
      expect(result).toEqual(mockFileData);
    });
  });

  describe("getFile", () => {
    it("deve retornar um arquivo quando ele existe", async () => {
      // Configurar o mock
      const mockFile = {
        buffer: Buffer.from("test content"),
        type: "text/plain",
        name: "test.txt",
        path: "/uploads/test.txt",
      };

      mockFileRepository.getFile.mockResolvedValue(mockFile);
      mockFileRepository.fileExists.mockResolvedValue(true);

      // Executar o método a ser testado
      const result = await fileService.getFile("/uploads/test.txt");

      // Verificar se os métodos do repositório foram chamados corretamente
      expect(mockFileRepository.fileExists).toHaveBeenCalledWith("/uploads/test.txt");
      expect(mockFileRepository.getFile).toHaveBeenCalledWith("/uploads/test.txt");

      // Verificar o resultado
      expect(result).toEqual(mockFile);
    });

    it("deve lançar erro quando o arquivo não existe", async () => {
      // Configurar o mock para simular arquivo não encontrado
      mockFileRepository.fileExists.mockResolvedValue(false);

      // Executar o método e verificar se lança erro
      await expect(fileService.getFile("/uploads/non-existent.txt")).rejects.toThrow(
        "Arquivo não encontrado"
      );

      // Verificar se apenas o método fileExists foi chamado
      expect(mockFileRepository.fileExists).toHaveBeenCalledWith("/uploads/non-existent.txt");
      expect(mockFileRepository.getFile).not.toHaveBeenCalled();
    });
  });

      mockFileRepository.getFile.mockResolvedValue(mockFile);
      mockFileRepository.fileExists.mockResolvedValue(true);

      // Executar o método
      const result = await fileService.getFile("/uploads/test.txt");

      // Verificar chamadas e resultado
      expect(mockFileRepository.fileExists).toHaveBeenCalledWith(
        "/uploads/test.txt"
      );
      expect(mockFileRepository.getFile).toHaveBeenCalledWith(
        "/uploads/test.txt"
      );
      expect(result).toEqual(mockFile);
    });

    it("deve lançar um erro quando o arquivo não existe", async () => {
      // Configurar o mock para retornar false
      mockFileRepository.fileExists.mockResolvedValue(false);

      // Verificar se lança um erro
      await expect(
        fileService.getFile("/uploads/non-existent.txt")
      ).rejects.toThrow("Arquivo não encontrado");

      // Verificar que getFile não foi chamado
      expect(mockFileRepository.getFile).not.toHaveBeenCalled();
    });
  });
});
```

## Documentação de API

### 1. Instalação do Swagger para Documentação

Primeiro, instale as dependências necessárias:

```bash
npm install swagger-ui-express swagger-jsdoc
npm install @types/swagger-ui-express @types/swagger-jsdoc --save-dev
```

### 2. Configuração do Swagger

Arquivo: `src/infrastructure/config/swagger.ts`

```typescript
import swaggerJSDoc from "swagger-jsdoc";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API de Gerenciamento de Arquivos",
      version: "1.0.0",
      description: "API para upload e recuperação de arquivos",
      contact: {
        name: "Equipe de Desenvolvimento",
        email: "dev@example.com",
      },
    },
    servers: [
      {
        url: "/api",
        description: "Servidor de API",
      },
    ],
    components: {
      schemas: {
        FileResponse: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Nome original do arquivo",
            },
            uri: {
              type: "string",
              description: "URI para acessar o arquivo",
            },
            type: {
              type: "string",
              description: "Tipo MIME do arquivo",
            },
          },
        },
        FileRequest: {
          type: "object",
          properties: {
            uris: {
              type: "array",
              items: {
                type: "string",
              },
              description: "Lista de URIs de arquivos para carregar",
            },
          },
        },
        FileLoadResponse: {
          type: "object",
          properties: {
            buffer: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  description: "Tipo MIME do arquivo",
                },
                data: {
                  type: "array",
                  items: {
                    type: "number",
                  },
                  description: "Conteúdo do arquivo como array de bytes",
                },
              },
            },
            type: {
              type: "string",
              description: "Tipo MIME do arquivo",
            },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Mensagem de erro",
            },
          },
        },
      },
    },
  },
  apis: [
    "./src/interfaces/http/routes/*.ts",
    "./src/interfaces/http/controllers/*.ts",
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
```

### 3. Documentação das Rotas com Comentários JSDoc

Arquivo: `src/interfaces/http/routes/fileRoutes.ts` (adicionar comentários)

```typescript
import { Router } from "express";
import { FileController } from "../controllers/FileController";
import {
  upload,
  checkFilesExist,
  handleMulterErrors,
} from "../../../infrastructure/config/multer";
import { validateFileLoad } from "../middlewares/validation";
import {
  uploadLimiter,
  downloadLimiter,
} from "../../../infrastructure/config/rateLimit";

const router = Router();
const fileController = new FileController();

/**
 * @swagger
 * /add-files:
 *   post:
 *     summary: Faz upload de um ou mais arquivos
 *     description: Endpoint para upload de múltiplos arquivos
 *     tags: [Files]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: files
 *         type: file
 *         required: true
 *         description: Arquivos para upload
 *     responses:
 *       200:
 *         description: Upload realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FileResponse'
 *       400:
 *         description: Requisição inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro no servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/add-files",
  uploadLimiter,
  upload.array("files"),
  handleMulterErrors,
  checkFilesExist,
  fileController.uploadFiles
);

/**
 * @swagger
 * /load-files:
 *   post:
 *     summary: Carrega arquivos por URI
 *     description: Endpoint para carregar arquivos a partir de suas URIs
 *     tags: [Files]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FileRequest'
 *     responses:
 *       200:
 *         description: Arquivos carregados com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FileLoadResponse'
 *       400:
 *         description: Requisição inválida
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Arquivo não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Erro no servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  "/load-files",
  downloadLimiter,
  validateFileLoad,
  fileController.loadFiles
);

export const fileRoutes = router;
```

### 4. Integração do Swagger na Aplicação

Atualizar o arquivo de configuração do Express para incluir o Swagger:

Arquivo: `src/infrastructure/config/express.ts` (versão atualizada)

```typescript
import express, { Application } from "express";
import cors from "cors";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { fileRoutes } from "../../interfaces/http/routes/fileRoutes";
import { errorHandler } from "../../interfaces/http/middlewares/errorHandler";
import { swaggerSpec } from "./swagger";

export const configureExpress = (): Application => {
  const app = express();

  // Middleware para parsing de JSON
  app.use(express.json());

  // Configuração de CORS
  app.use(cors());

  // Servir arquivos estáticos da pasta 'public'
  app.use(express.static(path.join(__dirname, "../../../public")));

  // Documentação Swagger
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  // Rotas da API
  app.use("/api", fileRoutes);

  // Middleware de tratamento de erros
  app.use(errorHandler);

  return app;
};
```

## Exemplos de Uso

### 1. Documentação de Exemplos

Arquivo: `docs/examples.md`

````markdown
# Exemplos de Uso da API de Arquivos

Este documento fornece exemplos práticos de como utilizar a API de gerenciamento de arquivos.

## Upload de Arquivos

### Usando cURL

Enviar um único arquivo:

```bash
curl -X POST http://localhost:3000/api/add-files \
  -F "files=@/caminho/para/arquivo.pdf" \
  -H "Content-Type: multipart/form-data"
```
````

Enviar múltiplos arquivos:

```bash
curl -X POST http://localhost:3000/api/add-files \
  -F "files=@/caminho/para/arquivo1.pdf" \
  -F "files=@/caminho/para/arquivo2.jpg" \
  -H "Content-Type: multipart/form-data"
```

### Usando JavaScript (Fetch API)

```javascript
// Upload de um único arquivo
const formData = new FormData();
const fileInput = document.querySelector('input[type="file"]');
formData.append("files", fileInput.files[0]);

fetch("http://localhost:3000/api/add-files", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Erro:", error));

// Upload de múltiplos arquivos
const formData = new FormData();
const fileInput = document.querySelector('input[type="file"][multiple]');
for (const file of fileInput.files) {
  formData.append("files", file);
}

fetch("http://localhost:3000/api/add-files", {
  method: "POST",
  body: formData,
})
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error("Erro:", error));
```

## Carregamento de Arquivos por URI

### Usando cURL

```bash
curl -X POST http://localhost:3000/api/load-files \
  -H "Content-Type: application/json" \
  -d '{"uris": ["/uploads/2023-05-01/1683100000000-abcdefgh-documento.pdf"]}'
```

### Usando JavaScript (Fetch API)

```javascript
fetch("http://localhost:3000/api/load-files", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    uris: ["/uploads/2023-05-01/1683100000000-abcdefgh-documento.pdf"],
  }),
})
  .then((response) => response.json())
  .then((data) => {
    // Processar os dados do arquivo
    console.log(data);

    // Exemplo de como criar um Blob a partir dos dados recebidos
    const fileData = data[0];
    const arrayBuffer = new Uint8Array(fileData.buffer.data).buffer;
    const blob = new Blob([arrayBuffer], { type: fileData.type });

    // Criar URL para o blob e abrir em nova aba
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  })
  .catch((error) => console.error("Erro:", error));
```

```

## Próximos Passos

Após configurar os testes e a documentação, siga para o último documento: [Estrutura DDD](./06-estrutura-ddd.md) para entender a organização do código seguindo o padrão Domain-Driven Design.
```
