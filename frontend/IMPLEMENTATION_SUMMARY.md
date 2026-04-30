# MindVault AI Frontend - Complete Setup Summary

**Date**: April 30, 2026
**Project**: MindVault AI - Multi-tenant RAG SaaS
**Tech Stack**: Next.js 14+, TypeScript, Tailwind CSS, Shadcn/UI, Vercel AI SDK

---

## 📦 Installation Commands Used

### Project Initialization
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias
```

### Dependency Installation (Latest Stable Versions)
```bash
npm install ai@latest lucide-react@latest @tanstack/react-query@latest axios@latest zod@latest react-hook-form@latest @hookform/resolvers@latest clsx@latest tailwind-merge@latest framer-motion@latest
```

### Installed Package Versions
```json
{
  "dependencies": {
    "ai": "^6.0.170",
    "@tanstack/react-query": "^5.100.6",
    "axios": "^1.15.2",
    "zod": "^4.4.1",
    "react-hook-form": "^7.74.0",
    "@hookform/resolvers": "^5.2.2",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "framer-motion": "^12.38.0",
    "lucide-react": "^1.14.0",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4"
  }
}
```

---

## 📁 Project Directory Structure

```
mindvault-ai/frontend/
├── .next/                              # Next.js build output
├── node_modules/                       # Dependencies
├── public/                             # Static assets
│   ├── favicon.ico
│   └── next.svg
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout with providers
│   │   ├── page.tsx                    # Home page
│   │   └── globals.css                 # Global Tailwind styles
│   │
│   ├── infrastructure/                 # Infrastructure layer (non-domain)
│   │   ├── api-client/
│   │   │   └── index.ts               # ✨ Axios API client
│   │   │       ├── Base configuration (NEXT_PUBLIC_API_URL)
│   │   │       ├── Request interceptor (JWT injection)
│   │   │       ├── Response interceptor (401/403/500 handling)
│   │   │       └── Type-safe API methods (auth, documents, chat, usage)
│   │   │
│   │   └── providers/
│   │       ├── QueryProvider.tsx       # ✨ React Query setup
│   │       │   ├── Client component
│   │       │   ├── Global cache config (5 min stale, 10 min GC)
│   │       │   └── Exported queryClient for manual operations
│   │       │
│   │       └── index.ts                # Provider exports
│   │
│   ├── features/                       # Feature modules (domain-specific)
│   │   ├── auth/
│   │   │   └── index.ts               # Authentication placeholders
│   │   │       ├── useAuthHooks (useLogin, useRegister, etc.)
│   │   │       ├── AuthComponents (LoginForm, RegisterForm, etc.)
│   │   │       └── authApi (login, register, logout, etc.)
│   │   │
│   │   ├── chat/
│   │   │   └── index.ts               # Chat feature placeholders
│   │   │       ├── useChatHooks (useCreateSession, useSendMessage, etc.)
│   │   │       ├── ChatComponents (ChatWindow, MessageList, etc.)
│   │   │       └── chatApi (createSession, sendMessage, etc.)
│   │   │
│   │   └── documents/
│   │       └── index.ts               # Document management placeholders
│   │           ├── useDocumentHooks (useListDocuments, useUploadDocument, etc.)
│   │           ├── DocumentComponents (DocumentList, UploadModal, etc.)
│   │           └── documentApi (uploadDocument, listDocuments, etc.)
│   │
│   ├── components/
│   │   └── ui/                        # Shadcn/UI components (to be added)
│   │       └── [components will be added via: npx shadcn-ui@latest add ...]
│   │
│   ├── lib/
│   │   ├── utils/
│   │   │   └── helpers.ts             # ✨ Utility functions
│   │   │       ├── formatFileSize()
│   │   │       ├── formatDate() / formatDateTime()
│   │   │       ├── truncateText()
│   │   │       ├── isValidUUID()
│   │   │       ├── copyToClipboard()
│   │   │       ├── debounce()
│   │   │       └── throttle()
│   │   │
│   │   └── validation-schemas.ts      # ✨ Zod schemas
│   │       ├── LoginSchema
│   │       ├── RegisterSchema
│   │       ├── DocumentUploadSchema
│   │       ├── ChatQuerySchema
│   │       └── Type exports (LoginInput, RegisterInput, etc.)
│   │
│   └── .env.local                     # Environment variables (local development)
│
├── .env.example                       # ✨ Example environment variables
├── .eslintrc.json                     # ESLint configuration
├── .gitignore                         # Git ignore rules
├── AGENTS.md                          # Vercel AI agents setup (optional)
├── CLAUDE.md                          # Claude AI documentation (optional)
├── components.json                    # ✨ Shadcn/UI configuration
├── eslint.config.mjs                  # ESLint configuration
├── next.config.ts                     # Next.js configuration
├── next-env.d.ts                      # Next.js type definitions
├── package.json                       # Dependencies and scripts
├── package-lock.json                  # Dependency lock file
├── postcss.config.mjs                 # PostCSS configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript configuration
├── SETUP_GUIDE.md                     # Detailed setup instructions
└── README.md                          # Project README

✨ = New/Created files
```

---

## 🎯 Key Features Implemented

### 1. API Client (`src/infrastructure/api-client/index.ts`)
**Purpose**: Centralized HTTP communication with the backend

**Features**:
- ✅ Base URL from `NEXT_PUBLIC_API_URL` environment variable
- ✅ Request Interceptor:
  - Automatically injects JWT token from `localStorage.accessToken`
  - Sets `X-Requested-With` header
- ✅ Response Interceptor:
  - Handles 401 (Unauthorized) → clears tokens & redirects to login
  - Handles 403 (Forbidden) → logs error (user notification pending)
  - Handles 500+ → logs server error (user notification pending)
- ✅ Type-safe API methods:
  - `api.auth.login(email, password, org_slug)`
  - `api.auth.register(...)`
  - `api.auth.switchOrg(target_org_id)`
  - `api.auth.me()`
  - `api.documents.list(org_id)`, `get()`, `create()`, `delete()`, `upload()`
  - `api.chat.createSession()`, `listSessions()`, `getSession()`, `sendMessage()`
  - `api.usage.getMetrics()`, `getDocumentUsage()`

**Ready for JWT Injection**:
```typescript
// The interceptor automatically handles this on every request:
const token = localStorage.getItem('accessToken');
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

### 2. React Query Provider (`src/infrastructure/providers/QueryProvider.tsx`)
**Purpose**: Centralized server state management

**Configuration**:
- Stale Time: 5 minutes (data is considered fresh for 5 minutes)
- Garbage Collection Time: 10 minutes (cache is kept for 10 minutes)
- Retry: 1 attempt on failed requests
- Refetch on window focus: ✅ Enabled
- Refetch on reconnect: ✅ Enabled
- Mutation retry: 1 attempt

**Usage Pattern**:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['documents', orgId],
  queryFn: () => api.documents.list(orgId),
  refetchInterval: 5000, // Poll every 5 seconds while documents are processing
});
```

### 3. Validation Schemas (`src/lib/validation-schemas.ts`)
**Purpose**: Type-safe form validation with Zod

**Schemas Included**:
- `LoginSchema`: email + password validation
- `RegisterSchema`: email + password + confirmation + full_name + org_name
- `DocumentUploadSchema`: title + file validation
- `ChatQuerySchema`: query text validation with length limits

**Usage with react-hook-form**:
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@/lib/validation-schemas';

const form = useForm({
  resolver: zodResolver(LoginSchema),
});
```

### 4. Utility Functions (`src/lib/utils/helpers.ts`)
**Included Utilities**:
- `formatFileSize(bytes)` → "2.5 MB"
- `formatDate(date)` → "Apr 30, 2026"
- `formatDateTime(date)` → "Apr 30, 2026, 11:39 AM"
- `truncateText(text, length)` → "Long text..."
- `isValidUUID(uuid)` → boolean validation
- `copyToClipboard(text)` → async clipboard copy
- `debounce(func, wait)` → throttled function execution
- `throttle(func, limit)` → rate-limited function execution

### 5. Feature Module Structure
**Three main features organized by domain**:

#### Auth Feature (`src/features/auth/index.ts`)
```typescript
export const useAuthHooks = {
  // TODO: useLogin, useRegister, useLogout, useSwitchOrganization, useCurrentUser
};
export const AuthComponents = {
  // TODO: LoginForm, RegisterForm, AuthGuard, OrganizationSwitcher
};
export const authApi = {
  // TODO: login, register, logout, refreshToken, switchOrg
};
```

#### Chat Feature (`src/features/chat/index.ts`)
```typescript
export const useChatHooks = {
  // TODO: useCreateSession, useListSessions, useSendMessage, useStreamMessage
};
export const ChatComponents = {
  // TODO: ChatWindow, MessageList, MessageInput, SourceCitations
};
export const chatApi = {
  // TODO: createSession, sendMessage, streamMessage (Server-Sent Events)
};
```

#### Documents Feature (`src/features/documents/index.ts`)
```typescript
export const useDocumentHooks = {
  // TODO: useListDocuments, useUploadDocument, useDeleteDocument, useDocumentStatus
};
export const DocumentComponents = {
  // TODO: DocumentList, DocumentUploadModal, DocumentCard, IngestionProgress
};
export const documentApi = {
  // TODO: uploadDocument, listDocuments, deleteDocument, getDocumentChunks
};
```

---

## 🚀 Getting Started

### 1. Environment Setup
```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 2. Start Development Server
```bash
npm run dev
# Open http://localhost:3000
```

### 3. Add Shadcn Components (as needed)
```bash
# Essential UI components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add form
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add sidebar
```

### 4. Update Root Layout
Update `src/app/layout.tsx`:
```typescript
import { QueryProvider } from '@/infrastructure/providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## 🛠 Development Commands

```bash
# Start development server (hot reload)
npm run dev

# Production build
npm run build

# Run production server
npm start

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# Add new Shadcn component
npx shadcn-ui@latest add [component-name]
```

---

## 📊 Technology Decisions

### Why These Libraries?

| Library | Purpose | Benefits |
|---------|---------|----------|
| **Vercel AI SDK (ai)** | Chat streaming | Built for streaming responses, perfect for RAG |
| **TanStack Query** | Server state | Caching, deduplication, background refetch, polling |
| **Axios** | HTTP client | Promise-based, interceptors, request/response middleware |
| **Zod** | Validation | TypeScript-first, runtime validation, type inference |
| **react-hook-form** | Forms | Performance, minimal re-renders, integrates with Zod |
| **Shadcn/UI** | Components | Headless, customizable, Tailwind-based, copy-paste |
| **Framer Motion** | Animations | Smooth, performant transitions for senior-level UX |
| **Lucide React** | Icons | 400+ modern icons, consistent design |

---

## 🔐 Security Considerations

### Current Setup
- ✅ JWT token auto-injection via request interceptor
- ✅ Token stored in localStorage (for development)

### Production Improvements Needed
- [ ] Move JWT to httpOnly cookies (prevents XSS)
- [ ] Add CSRF token handling
- [ ] Implement token refresh logic (currently empty)
- [ ] Add Content Security Policy headers
- [ ] Validate environment variables at build time

---

## 📈 Performance Optimizations Included

1. **Request Deduplication**: React Query deduplicates identical requests
2. **Caching**: 5-minute stale time prevents unnecessary API calls
3. **Background Refetch**: Auto-refetch when window regains focus
4. **Code Splitting**: Next.js automatically chunks code by route
5. **Form Optimization**: react-hook-form minimizes re-renders
6. **Lazy Loading Utilities**: Debounce and throttle for expensive operations

---

## 🎨 Next Implementation Steps

### Week 1: Authentication
- [ ] Create LoginForm component using react-hook-form + LoginSchema
- [ ] Create RegisterForm component
- [ ] Implement useLogin hook with useMutation
- [ ] Add login/logout flow
- [ ] Create ProtectedRoute component (auth guard)

### Week 2: Layout & Navigation
- [ ] Create Sidebar component with organization switcher
- [ ] Create top navigation bar
- [ ] Implement responsive layout with mobile menu
- [ ] Add user profile dropdown

### Week 3: Document Management
- [ ] Create DocumentList component with TanStack Query
- [ ] Build DocumentUploadModal with file input
- [ ] Show ingestion progress with polling
- [ ] Add delete document functionality
- [ ] Show document storage usage

### Week 4: Chat Interface
- [ ] Integrate Vercel AI SDK for streaming
- [ ] Create ChatWindow component
- [ ] Build MessageList with scroll-to-bottom
- [ ] Add MessageInput with file attachment
- [ ] Render markdown responses
- [ ] Show source citations with highlighting

---

## 📚 Documentation Files

1. **SETUP_GUIDE.md** - Detailed step-by-step setup instructions
2. **IMPLEMENTATION_CHECKLIST.md** - Feature checklist (to be created)
3. **API_DOCUMENTATION.md** - Backend API endpoints (to be created)
4. **COMPONENT_GUIDE.md** - Shadcn component usage (to be created)

---

## 🐛 Troubleshooting

### Port 3000 Already in Use
```bash
npm run dev -- -p 3001
```

### Clear Build Cache
```bash
rm -rf .next node_modules
npm install
npm run build
```

### TypeScript Errors
```bash
npx tsc --noEmit  # Full type check
npm run build     # Full build check
```

### Environment Variables Not Loading
- Make sure `.env.local` exists (not `.env`)
- Restart dev server after changing environment variables
- Prefix client-side variables with `NEXT_PUBLIC_`

---

## ✅ Verification Checklist

- [x] Next.js 14+ with App Router initialized
- [x] TypeScript configured with path aliases (@/*)
- [x] Tailwind CSS + Shadcn/UI ready
- [x] All latest dependencies installed
- [x] Axios API client with interceptors configured
- [x] React Query provider setup
- [x] Zod validation schemas created
- [x] Utility functions library created
- [x] Feature module structure organized
- [x] Environment variables template created
- [x] ESLint configured
- [x] Directory structure optimized for scalability

---

## 🚀 Ready to Start Development!

Your frontend is fully configured and ready for feature implementation. The infrastructure layer is solid, and you can now focus on building amazing features:

1. **Start Dev Server**: `npm run dev`
2. **View Project**: http://localhost:3000
3. **Begin with Auth**: Create the login page first
4. **Then Documents**: Build document management
5. **Finally Chat**: Integrate the RAG interface

**Happy coding! 🎉**
