# Etapas para criar um projeto Node.js para receber arquivos

## 1. Configuração do projeto

- Inicializar um novo projeto Node.js
- Instalar as dependências necessárias
- Criar a estrutura de diretórios seguindo o padrão Domain-Driven Design (DDD)

## 2. Implementação da API

- Configurar o servidor Express
- Implementar o upload de arquivos com Multer
  - Configurar Multer para salvar arquivos na pasta 'public'
  - Configurar armazenamento em disco com multer.diskStorage
  - Definir nomes de arquivos únicos para evitar sobrescritas
    - Utilizar combinação de timestamp + UUID/nanoid para garantir unicidade de nomes
    - Preservar extensão original dos arquivos
    - Implementar função de normalização de nomes (remover caracteres especiais, espaços, etc.)
    - Considerar a inclusão de hash do conteúdo do arquivo para detecção de duplicatas
- Definir as rotas para upload e acesso aos arquivos:
  - Implementar rota `/add-files/` para receber múltiplos arquivos
    - Aceitar FormData com arquivos em buffer
    - Aceitar qualquer tipo de arquivo
    - Validar presença de arquivos (retornar erro 400 com mensagem "Arquivo não informado" caso nenhum arquivo seja enviado)
    - Implementar estratégia de nomeação de arquivos para evitar colisões:
      - Gerar nomes de arquivo compostos por: `[timestamp]-[uuid]-[nome-original-normalizado].[extensão]`
      - Estruturar hierarquia de diretórios baseada em data ou tipo de conteúdo
      - Verificar existência prévia de arquivos com o mesmo nome antes de salvar
    - Retornar array de objetos `{ type: string; uri: string; name: string }`
  - Implementar rota `/load-files` para buscar arquivos por URI
    - Aceitar array de URIs como parâmetro
    - Retornar array de objetos `{ buffer: { type: string; data: number[] }; type: string }`
    - Validar existência de arquivos (retornar erro 400 caso algum dos arquivos solicitados não seja encontrado)

## 3. Armazenamento e gerenciamento

- Configurar o local de armazenamento dos arquivos
  - Criar e configurar a pasta 'public' para armazenamento dos arquivos
  - Implementar estrutura de pastas para organizar uploads por data/categoria (conforme especificado na seção de DDD abaixo)
  - Configurar acesso estático à pasta 'public' via Express
- Implementar validação e controle de arquivos
  - A rota `/add-files` deve aceitar qualquer tipo de arquivo
  - Implementar validação para verificar se arquivos foram enviados
    - Se nenhum arquivo for enviado, retornar erro com mensagem "Arquivo não informado" e código HTTP 400
  - A rota `/load-files` deve validar se todos os arquivos solicitados existem
    - Se algum arquivo não for encontrado, retornar erro 400
  - Verificar integridade dos arquivos enviados

## 4. Segurança e Limitações

- Configurar limites de tamanho para uploads
- Implementar validação de tipos de arquivos

## 5. Testes e Documentação

- Criar testes para a API
  - Implementar testes e2e para a rota `/add-files`
  - Implementar testes e2e para a rota `/load-files`
- Documentar as endpoints disponíveis
- Preparar exemplos de uso

## 6. Estrutura de Pastas - Domain-Driven Design (DDD)

A aplicação deve seguir a estrutura DDD (Domain-Driven Design) para melhor organização e separação de responsabilidades:

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
│   │   └── express.ts          # Configuração do Express
│   ├── repositories/           # Implementações concretas dos repositórios
│   │   └── FileRepositoryImpl.ts # Implementação do repositório de arquivos
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
│   │   │   └── validation.ts  # Middleware de validação
│   │   └── routes/            # Definição de rotas
│   │       └── fileRoutes.ts  # Rotas para manipulação de arquivos
│   └── errors/                # Tratamento de erros
│       └── ApiError.ts        # Classe para erros da API
│
└── public/                    # Armazenamento físico dos arquivos
    └── uploads/               # Diretório base de uploads
        ├── YYYY-MM-DD/        # Organização por data
        └── categories/        # Organização por categorias
            ├── documents/     # Documentos
            ├── images/        # Imagens
            └── other/         # Outros tipos
```

### Benefícios da Estrutura DDD

- **Separação de responsabilidades**: Cada camada tem uma responsabilidade específica
- **Independência de infraestrutura**: A lógica de negócio não depende de frameworks ou tecnologias específicas
- **Testabilidade**: Facilita a criação de testes unitários e de integração
- **Manutenibilidade**: Código mais organizado e fácil de manter
- **Escalabilidade**: Facilita a adição de novos recursos ou mudanças de requisitos

### Fluxo de Dados

1. As requisições chegam pelos controllers na camada de interfaces
2. Os controllers usam serviços de aplicação para processar as requisições
3. Os serviços de aplicação orquestram entidades e repositórios do domínio
4. Os repositórios utilizam a infraestrutura para persistir ou recuperar dados
