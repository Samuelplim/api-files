# 1. Configuração do Projeto

Este documento descreve as etapas necessárias para configurar o projeto Node.js para recebimento de arquivos.

## Inicialização do Projeto

1. Criar um novo diretório para o projeto:

   ```bash
   mkdir api-files
   cd api-files
   ```

2. Inicializar um novo projeto Node.js:

   ```bash
   npm init -y
   ```

3. Configurar TypeScript:

   ```bash
   npm install typescript ts-node @types/node --save-dev
   npx tsc --init
   ```

4. Editar o arquivo `tsconfig.json` para configurar o TypeScript:
   ```json
   {
     "compilerOptions": {
       "target": "es2018",
       "module": "commonjs",
       "outDir": "./dist",
       "rootDir": "./src",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

## Instalação de Dependências

Instalar as dependências necessárias para o projeto:

```bash
# Dependências de produção
npm install express multer nanoid cors dotenv

# Dependências de desenvolvimento
npm install @types/express @types/multer @types/cors jest ts-jest supertest @types/supertest @types/jest nodemon --save-dev
```

### Dependências Principais

- **express**: Framework web para Node.js
- **multer**: Middleware para handling de formulários multipart/form-data (upload de arquivos)
- **nanoid**: Geração de IDs únicos para nomes de arquivos
- **cors**: Middleware para habilitar CORS (Cross-Origin Resource Sharing)
- **dotenv**: Carregamento de variáveis de ambiente a partir de um arquivo .env

## Criação da Estrutura de Diretórios

Criar a estrutura de diretórios seguindo o padrão Domain-Driven Design (DDD):

```bash
mkdir -p src/{domain/{entities,repositories,services},infrastructure/{config,repositories,storage},application/{dto,services},interfaces/{http/{controllers,middlewares,routes},errors},public/uploads}
```

## Configuração de Scripts

Editar o arquivo `package.json` para adicionar scripts úteis:

```json
"scripts": {
  "build": "tsc",
  "start": "node dist/server.js",
  "dev": "nodemon --exec ts-node src/server.ts",
  "test": "jest",
  "test:e2e": "jest --config jest-e2e.config.js"
}
```

## Configuração do Ambiente

Criar um arquivo `.env` na raiz do projeto:

```
PORT=3000
NODE_ENV=development
UPLOAD_DIR=public/uploads
```

Criar um arquivo `.gitignore`:

```
node_modules
dist
.env
public/uploads/*
!public/uploads/.gitkeep
```

Criar um arquivo vazio `.gitkeep` dentro da pasta `public/uploads` para garantir que ela seja versionada:

```bash
touch public/uploads/.gitkeep
```

## Próximos Passos

Após concluir a configuração do projeto, prossiga para o próximo documento: [Implementação da API](./02-implementacao-api.md).
