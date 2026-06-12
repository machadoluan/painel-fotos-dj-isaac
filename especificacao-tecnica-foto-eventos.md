# Especificação Técnica — Sistema de Fotos para Eventos

## Visão Geral

Aplicação web para eventos (casamentos, festas) onde convidados escaneiam um QR code, fazem upload de fotos, e essas fotos aparecem em tempo real num carrossel exibido no telão. O fotógrafo/operador tem um painel para moderar as fotos.

---

## Stack Tecnológico

- **Frontend:** React (Vite)
- **Backend/DB/Storage/Realtime:** Supabase
- **Deploy:** Vercel
- **Estilização:** Tailwind CSS

---

## Estrutura do Banco de Dados (Supabase)

### Tabela: `events`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
name        text NOT NULL           -- Ex: "Casamento Ana & João"
slug        text UNIQUE NOT NULL    -- Ex: "ana-joao-2024" (usado na URL)
active      boolean DEFAULT true
created_at  timestamptz DEFAULT now()
```

### Tabela: `photos`
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
event_id    uuid REFERENCES events(id) ON DELETE CASCADE
storage_path text NOT NULL          -- Caminho no Supabase Storage
url         text NOT NULL           -- URL pública da foto
visible     boolean DEFAULT true    -- false = excluída do carrossel
created_at  timestamptz DEFAULT now()
```

### Supabase Storage
- Bucket: `event-photos`
- Acesso público para leitura
- Upload permitido sem autenticação (convidados não precisam de login)

### Supabase Realtime
- Habilitar realtime na tabela `photos` para sincronização automática

---

## Rotas da Aplicação

| Rota | Descrição |
|------|-----------|
| `/evento/:slug` | Página de upload para convidados |
| `/telao/:slug` | Carrossel fullscreen para o telão |
| `/admin` | Painel do operador (login simples) |
| `/admin/evento/:id` | Gerenciar fotos de um evento específico |

---

## Páginas e Funcionalidades

### 1. Página de Upload do Convidado — `/evento/:slug`

**O que faz:**
- Busca o evento pelo slug na URL
- Exibe nome do evento
- Permite selecionar e enviar fotos (múltiplas de uma vez)
- Upload direto para o Supabase Storage
- Salva registro na tabela `photos`
- Feedback visual de progresso do upload

**Regras:**
- Sem login, sem cadastro
- Aceitar apenas imagens (jpg, png, webp, heic)
- Tamanho máximo por foto: 10MB
- Compressão no client-side antes do upload (usar biblioteca `browser-image-compression`)
- Se o evento não existir ou estiver inativo, mostrar mensagem amigável

**UI:**
- Design simples e bonito, pensado para mobile (a maioria vai acessar pelo celular)
- Botão grande de "Enviar Fotos"
- Preview das fotos selecionadas antes de enviar
- Indicador de sucesso após upload

---

### 2. Carrossel (Telão) — `/telao/:slug`

**O que faz:**
- Busca todas as fotos visíveis do evento em tempo real
- Exibe as fotos em carrossel fullscreen com transição automática
- Novas fotos entram na fila automaticamente via Realtime do Supabase
- Fotos excluídas pelo admin somem imediatamente

**Comportamento:**
- Transição entre fotos: fade ou slide (configurável)
- Intervalo padrão: 4 segundos por foto
- Loop infinito
- Se não houver fotos ainda, exibir tela de espera com nome do evento
- Modo fullscreen (botão para entrar em fullscreen)

**Ordem das fotos:**
- Exibir em ordem de chegada (mais antigas primeiro), fazendo loop

---

### 3. Painel Admin — `/admin`

**Autenticação:**
- Login simples com usuário e senha fixos via Supabase Auth
- Ou senha hardcoded em variável de ambiente (mais simples para começar)

**Funcionalidades:**
- Listar todos os eventos
- Criar novo evento (nome + slug automático a partir do nome)
- Ativar/desativar evento
- Botão para copiar o link do upload (`/evento/:slug`)
- Botão para abrir o carrossel (`/telao/:slug`)
- Botão para gerar/exibir QR code do link de upload

---

### 4. Gerenciar Fotos do Evento — `/admin/evento/:id`

**Funcionalidades:**
- Grade de todas as fotos do evento (thumbnails)
- Cada foto tem botão de excluir (marca `visible = false`, não deleta do storage)
- Opção de deletar permanentemente (remove do storage e do banco)
- Atualização em tempo real (novas fotos aparecem automaticamente)
- Contador de fotos

---

## Componentes React

```
src/
  components/
    UploadPage.jsx          -- Página do convidado
    Carousel.jsx            -- Carrossel do telão
    AdminPanel.jsx          -- Painel admin
    EventManager.jsx        -- Gerenciar fotos de um evento
    QRCodeModal.jsx         -- Exibir QR code do evento
  lib/
    supabaseClient.js       -- Instância do Supabase
  App.jsx                   -- Rotas principais
  main.jsx
```

---

## Variáveis de Ambiente (.env)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxx
VITE_ADMIN_PASSWORD=senha_do_operador
```

---

## Dependências NPM

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "browser-image-compression": "^2.x",
    "qrcode.react": "^3.x",
    "tailwindcss": "^3.x"
  }
}
```

---

## Configuração do Supabase Storage

```sql
-- Permitir upload público (sem autenticação)
CREATE POLICY "Permitir upload público"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'event-photos');

-- Permitir leitura pública
CREATE POLICY "Permitir leitura pública"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'event-photos');
```

---

## Configuração Realtime

```sql
-- Habilitar realtime na tabela photos
ALTER TABLE photos REPLICA IDENTITY FULL;

-- Publicar eventos de INSERT e UPDATE
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE photos;
COMMIT;
```

---

## Fluxo Completo

1. Operador cria o evento no painel admin → sistema gera slug e QR code
2. Operador imprime plaquinhas com o QR code
3. No evento: convidados escaneiam → abre `/evento/ana-joao-2024` no celular
4. Convidado seleciona fotos → faz upload → foto aparece no banco
5. Carrossel em `/telao/ana-joao-2024` está aberto no telão → foto aparece automaticamente em ~1-2 segundos
6. Se aparecer foto indesejada, operador abre `/admin/evento/:id` no celular ou laptop → clica em excluir → foto some do telão imediatamente
7. Após o evento, operador pode exportar/baixar todas as fotos

---

## Notas de Implementação

- O carrossel deve pré-carregar a próxima foto para evitar flash branco
- Usar `object-fit: cover` nas fotos para preencher a tela uniformemente
- O painel admin deve ser responsivo (operador pode usar no celular)
- Comprimir fotos no client antes do upload (reduzir para max 1920px e ~80% qualidade) para economizar storage e acelerar o carrossel
- Slug deve ser gerado automaticamente (lowercase, sem acentos, hífens no lugar de espaços)
