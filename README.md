# 🤖 Betinho - Sistema de Automação Híbrido

## Progress
~78% (16/28 tarefas concluídas)

---

## 🔐 Sistema de Autenticação

O sistema agora possui autenticação completa para proteger o acesso.

### 🎯 Primeiro Acesso

**Credenciais Padrão do Dono:**
- **Email:** `robertokizirian@gmail.com`
- **Senha:** `Betinho@2026`
- **Nível:** OWNER (privilégios máximos)

⚠️ **IMPORTANTE:** Altere a senha padrão imediatamente após o primeiro login!

### 📖 Como Usar

1. **Login:**
   - Acesse: `/login`
   - Use as credenciais padrão
   - Será redirecionado para o dashboard

2. **Dashboard Admin:**
   - Acesse: `/admin`
   - Visualize informações do sistema
   - Altere sua senha
   - Faça logout

3. **Alterar Senha:**
   - No dashboard, clique em "Alterar Senha"
   - Digite a senha atual
   - Digite e confirme a nova senha (mínimo 8 caracteres)

### 🧪 Testar Credenciais (Debug)

**Antes de tentar fazer login, teste se as credenciais estão funcionando:**

1. **Acesse o endpoint de teste:**
   ```
   /test-credentials
   ```

2. **Verifique a resposta:**
   - ✅ `verifyPasswordResult: true` → Sistema OK, pode fazer login
   - ❌ `verifyPasswordResult: false` → Problema detectado, veja os logs

3. **Interpretação dos resultados:**
   ```json
   {
     "status": "✅ CREDENTIALS WORKING - You can login!",
     "verification": {
       "verifyPasswordResult": true,  // ← DEVE SER TRUE
       "hashComputedCorrectly": true  // ← DEVE SER TRUE
     }
   }
   ```

**⚠️ SEGURANÇA:** Delete o arquivo `api/test-credentials.js` após confirmar que o sistema está funcionando!


### 🛡️ Segurança Implementada

- ✅ Hash de senha com PBKDF2 (10.000 iterações)
- ✅ Sessões seguras com JWT
- ✅ Cookies HttpOnly, Secure e SameSite
- ✅ Rate limiting: 5 tentativas de login por 15 minutos
- ✅ Validação de inputs
- ✅ Proteção CORS configurada
- ✅ Tokens com expiração de 24 horas
- ✅ **Persistência com Firebase Firestore** - Dados persistem após cold starts

### 🔥 Armazenamento Persistente com Firebase

O sistema agora usa **Firebase Firestore** para armazenar dados de autenticação:

- ✅ **Sem perda de dados** em cold starts do Vercel
- ✅ **Senhas alteradas persistem** automaticamente
- ✅ **Salt aleatório** gerado para cada senha
- ✅ **OWNER padrão** criado automaticamente na primeira execução
- ✅ Todos os dados salvos na coleção `users` do Firestore

### 🔌 Endpoints da API

**Authentication:**
- `POST /api/auth?action=login` - Fazer login
- `POST /api/auth?action=logout` - Fazer logout
- `POST /api/auth?action=change-password` - Alterar senha
- `GET /api/auth?action=verify-session` - Verificar sessão

**Admin Panel (OWNER only):**
- `GET /api/admin?action=users` - List all users with stats
- `POST /api/admin?action=delete-user` - Delete user account
- `POST /api/admin?action=ban-user` - Ban/unban user
- `POST /api/admin?action=reset-password` - Reset user password
- `GET /api/admin?action=analytics` - Get platform analytics
- `GET /api/admin?action=follows` - Get all follow relationships
- `POST /api/admin?action=delete-follow` - Delete follow relationship

**User Management:**
- `POST /api/register` - Register new user
- `GET /api/users?username=...` - Get user by username
- `POST /api/users?action=update-profile` - Update user profile
- `POST /api/upload-photo` - Upload profile photo

**Follow System:**
- `POST /api/follow?action=follow` - Follow user
- `POST /api/follow?action=unfollow` - Unfollow user
- `GET /api/follow?action=followers&userId=...` - Get followers
- `GET /api/follow?action=following&userId=...` - Get following
- `GET /api/follow?action=check&userId=...` - Check if following

### 🎨 Páginas

- `/` - Página principal (protegida, requer autenticação)
- `/login.html` - Página de login
- `/signup.html` - Página de registro
- `/admin-dashboard.html` - Dashboard administrativo (OWNER apenas)
- `/admin-panel.html` - **NEW!** Comprehensive admin panel (OWNER apenas)
- `/profile.html` - User profile page
- `/users-gallery.html` - Browse all users

### 🛡️ Admin Panel Features

The new comprehensive admin panel (`/admin-panel.html`) provides OWNER users with complete platform management capabilities:

**Tab 1: User Management**
- View all registered users with detailed stats
- Search and filter users by name, email, or username
- View detailed user profiles
- Reset user passwords
- Ban/unban users
- Delete user accounts (with confirmation)
- Real-time user statistics

**Tab 2: Analytics Dashboard**
- Total users count
- Active users (logged in last 7 days)
- New users this week
- Total follow relationships
- Top 10 most followed users
- Recent registrations list
- Platform growth metrics

**Tab 3: Follow Management**
- View all follow relationships
- Search by follower or following
- Delete follow relationships
- Follow statistics and analytics
- Identify inactive users

**Tab 4: System Configuration**
- Platform settings (name, description)
- Upload size limits
- Maintenance mode toggle
- System information display

### ⚙️ Configuração do Deploy (Vercel)

**Variáveis de Ambiente Obrigatórias:**

1. **JWT_SECRET** (OBRIGATÓRIO)
   ```bash
   # Gere uma chave secreta forte:
   openssl rand -base64 32
   
   # Configure no Vercel:
   vercel env add JWT_SECRET
   ```

2. **FIREBASE_PROJECT_ID** (OBRIGATÓRIO)
   ```bash
   # Obtenha do Firebase Console > Project Settings
   vercel env add FIREBASE_PROJECT_ID
   ```

3. **FIREBASE_PRIVATE_KEY** (OBRIGATÓRIO)
   ```bash
   # Obtenha do Firebase Console > Service Accounts > Generate new private key
   # Copie o valor de "private_key" do arquivo JSON
   vercel env add FIREBASE_PRIVATE_KEY
   ```

4. **FIREBASE_CLIENT_EMAIL** (OBRIGATÓRIO)
   ```bash
   # Obtenha do Firebase Console > Service Accounts
   # Copie o valor de "client_email" do arquivo JSON
   vercel env add FIREBASE_CLIENT_EMAIL
   ```

**Como configurar Firebase:**

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Vá para **Project Settings** > **Service Accounts**
4. Clique em **Generate new private key**
5. Extraia os valores do JSON e adicione às variáveis de ambiente no Vercel

**Recomendado para Produção:**
- Configure todas as variáveis de ambiente no dashboard do Vercel
- Veja `.env.example` para referência completa
- Use Firebase Firestore Rules para proteger os dados

⚠️ **IMPORTANTE**: Com Firebase, as alterações de senha **persistem automaticamente** entre cold starts!

---

## 🚀 FASE 1: Performance & Anti-Timeout (CRÍTICO)
**Status: 7/7 ✅ COMPLETO**

- [x] SSE Streaming (`api/chat-stream.js`)
  - Start < 500ms
  - Progressive token delivery
  - 11s timeout com graceful close
  
- [x] Circuit Breakers (`api/lib/circuit-breaker.js`)
  - 8s timeout per engine (4s margin)
  - CLOSED/OPEN/HALF_OPEN states
  - Automatic failover
  
- [x] Engine Orchestrator (`api/lib/engine-orchestrator.js`)
  - Promise.race() across 3 engines
  - First successful response wins
  - Complexity-based engine selection
  
- [x] Smart Cache (`api/lib/cache.js`)
  - LRU with 5min TTL
  - MD5 content-based keys
  - Target 30%+ hit rate
  
- [x] Metrics & Monitoring (`api/lib/metrics.js`)
  - Response time tracking
  - Engine usage distribution
  - Timeout incidents
  
- [x] Health Check (`api/health.js`)
  - Engine availability
  - Circuit breaker states
  - Performance metrics (p95, p99)
  - Cache statistics
  
- [x] Rate Limiting (`api/lib/rate-limit.js`)
  - 100 req/min per IP
  - 1000 req/hour per user
  - Sliding window

---

## 🧪 FASE 2: Testes & Qualidade
**Status: 2/4 🟡 EM PROGRESSO**

- [x] 29 testes unitários criados
  - SecurityValidator (12 tests)
  - CreditCalculator (25 tests)
  - AutomationEngine (20 tests)
  - MultimodalProcessor (30 tests)
  
- [ ] **[BLOCKER]** Todos os testes passando
  - ❌ 3 testes falhando (AutomationEngine - ES modules)
  - Status: Copilot Agent corrigindo
  - PR: #13 (copilot/add-serverless-streaming-responses)
  
- [x] Jest 27 + Babel configurado
  - testEnvironment: jsdom
  - ES modules support
  - Coverage thresholds: 10% (temporário)
  
- [ ] Coverage > 80%
  - Atual: ~10% (ajustado temporariamente)
  - Meta: 80%+ em todas as métricas

---

## 🤖 FASE 3: CI/CD Automation
**Status: 4/5 🟡 EM PROGRESSO**

- [x] GitHub Actions - Tests (`.github/workflows/test.yml`)
  - Run on: push, pull_request
  - Node 22.x
  - Jest + Coverage
  - Codecov upload (configurar token)
  
- [x] GitHub Actions - Deploy (`.github/workflows/deploy.yml`)
  - Auto-deploy on main
  - Vercel integration
  
- [x] GitHub Actions - CodeQL Security (`.github/workflows/codeql.yml`)
  - Weekly security scans
  - 0 vulnerabilities ✅
  
- [x] Dependabot (`.github/dependabot.yml`)
  - Weekly updates
  - Max 5 open PRs
  
- [ ] Pre-commit hooks (Husky + lint-staged)
  - ESLint + Prettier
  - Auto-fix on commit

---

## 📚 FASE 4: Documentação
**Status: 4/4 ✅ COMPLETO**

- [x] README.md completo
  - Quick start
  - Architecture diagram
  - Features overview
  - Installation guide
  
- [x] API.md (endpoints)
  - POST /api/chat
  - POST /api/chat-stream
  - GET /api/health
  - Rate limits
  
- [x] ARCHITECTURE.md (4 camadas)
  - Layer 1: UI/UX
  - Layer 2: Orchestration
  - Layer 3: Infrastructure
  - Layer 4: Engines
  
- [x] CONTRIBUTING.md
  - Development workflow
  - Testing guidelines
  - PR template

---

## 🎯 FASE 5: Features do Sistema
**Status: 2/6 🟡 EM PROGRESSO**

- [x] Rota /betinho adicionada
- [x] Proteção de rotas (RequireSubscription)
- [ ] Sistema de créditos completo
- [ ] Histórico de automações (UI)
- [ ] Modo Híbrido (seleção manual + IA)
- [ ] Modo Otimizado (100% IA)

---

## 📊 Estatísticas do Projeto

### PR #13 (rkmmax-hibrido)
- **Commits:** 16
- **Files Changed:** 28
- **Additions:** +5,256 lines
- **Deletions:** -474 lines
- **Status:** Open (aguardando correção de testes)

### Estrutura de Testes
```
src/automation/__tests__/
├── SecurityValidator.test.js (12 tests)
├── CreditCalculator.test.js (25 tests)
├── AutomationEngine.test.js (20 tests) ❌ FAILING
└── MultimodalProcessor.test.js (30 tests)

Total: 87 tests | Passing: 84 | Failing: 3
```

### Infraestrutura Criada
```javascript
api/
├── chat-stream.js          // SSE streaming
├── health.js               // Health check
└── lib/
    ├── circuit-breaker.js  // Circuit breakers
    ├── engine-orchestrator.js // 3-engine race
    ├── cache.js            // LRU cache
    ├── metrics.js          // Performance tracking
    └── rate-limit.js       // Rate limiting
```

---

## 🐛 ISSUES CRÍTICAS

### 1. [BLOCKER] Failing Tests - AutomationEngine
**Status:** 🔴 EM CORREÇÃO  
**Assignee:** Copilot Agent  
**PR:** #13  
**Erro:** ES module import/require conflict

```bash
FAIL src/automation/__tests__/AutomationEngine.test.js
  ● Test suite failed to run
    ReferenceError: require is not defined in ES module scope
```

**Solução em andamento:**
- Converter `require()` → `import`
- Adicionar mocks corretos para ES modules
- Ajustar jest.config.cjs

---

## 🎯 Próximos Passos

1. **[URGENT]** Corrigir testes falhando (AutomationEngine)
2. Aumentar coverage para 80%+
3. Configurar Husky + lint-staged
4. Implementar Sistema de Créditos (UI)
5. Criar dashboard de histórico de automações
6. Implementar Modo Híbrido no frontend

---

## 📅 Timeline

| Data | Milestone | Status |
|------|-----------|--------|
| 2026-02-04 | FASE 1: Performance Infrastructure | ✅ COMPLETO |
| 2026-02-05 | FASE 2 & 3: Tests + CI/CD | 🟡 EM PROGRESSO |
| 2026-02-05 | FASE 4: Documentation | ✅ COMPLETO |
| 2026-02-09 | Correção de testes falhando | 🔴 BLOQUEADO |
| 2026-02-12 | FASE 5: Features do Sistema | 🔵 PLANEJADO |

---

## 🏆 Métricas de Sucesso

- [x] Serverless timeout < 12s ✅
- [x] SSE streaming < 500ms ✅
- [x] Circuit breakers operacionais ✅
- [x] 0 vulnerabilidades (CodeQL) ✅
- [ ] 100% testes passando ⏳
- [ ] Coverage > 80% ⏳

---

## Last Updated
**2026-02-09** - Aguardando correção de testes do PR #13

**Progresso Real:** 78% (16/28 tarefas)  
**Próxima Meta:** 85% - Todos os testes passando + Coverage 80%

---

## Links Úteis
- [PR #13 - Serverless Infrastructure](https://github.com/kizirianmax/rkmmax-hibrido/pull/13)
- [Repositório Principal (rkmmax-hibrido)](https://github.com/kizirianmax/rkmmax-hibrido)
- [GitHub Actions - Tests](https://github.com/kizirianmax/rkmmax-hibrido/actions)
