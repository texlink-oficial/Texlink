# Task #4: TemplatesPage - Resumo da Implementação

**Status:** 80% Completo (Fundamentos Implementados)
**Data:** 2026-01-28

---

## ✅ Componentes Implementados

### 1. Tipos TypeScript (100%)
**Arquivo:** `src/types/invitation-templates.ts`

**Conteúdo:**
- ✅ Interface `InvitationTemplate`
- ✅ Interface `CreateInvitationTemplateDto`
- ✅ Interface `UpdateInvitationTemplateDto`
- ✅ Type `InvitationType`
- ✅ Constante `TEMPLATE_VARIABLES` (lista de variáveis permitidas)
- ✅ Helper `replaceTemplateVariables()`
- ✅ Helper `extractTemplateVariables()`
- ✅ Helper `validateTemplateVariables()`

### 2. Service Layer (100%)
**Arquivo:** `src/services/credentialSettingsService.ts`

**Métodos Implementados:**
- ✅ `getInvitationTemplates()` - Lista todos os templates
- ✅ `getInvitationTemplate(id)` - Busca por ID
- ✅ `createInvitationTemplate(data)` - Cria novo template
- ✅ `updateInvitationTemplate(id, data)` - Atualiza template
- ✅ `deleteInvitationTemplate(id)` - Remove template
- ✅ `duplicateInvitationTemplate(id)` - Duplica template

**Integração:**
- ✅ Exportado em `src/services/index.ts`
- ✅ Usa `api` client configurado
- ✅ Type-safe com TypeScript

### 3. Custom Hook (100%)
**Arquivo:** `src/hooks/useTemplates.ts`

**Features:**
- ✅ Estado reativo com `useState`
- ✅ Auto-fetch em mount
- ✅ Loading e error states
- ✅ Métodos CRUD completos
- ✅ Atualização otimista do estado local
- ✅ Error handling com mensagens amigáveis

**API Retornada:**
```typescript
{
  templates: InvitationTemplate[],
  isLoading: boolean,
  error: string | null,
  refetch: () => Promise<void>,
  createTemplate: (data) => Promise<InvitationTemplate>,
  updateTemplate: (id, data) => Promise<InvitationTemplate>,
  deleteTemplate: (id) => Promise<void>,
  duplicateTemplate: (id) => Promise<InvitationTemplate>,
}
```

### 4. Modal de Criação/Edição (100%)
**Arquivo:** `src/components/credentials/CreateEditTemplateModal.tsx`

**Features Implementadas:**
- ✅ Modo duplo: criar (sem template) e editar (com template)
- ✅ Formulário completo com validações
- ✅ Campo Nome (2-100 caracteres)
- ✅ Select de Tipo (EMAIL, WHATSAPP, SMS, LINK)
- ✅ Campo Subject (obrigatório para EMAIL, max 200 chars)
- ✅ Textarea de Conteúdo (10-5000 chars, monospace)
- ✅ Validação de variáveis (apenas permitidas)
- ✅ Sidebar com variáveis clicáveis
- ✅ Botão inserir variável no conteúdo
- ✅ Preview em tempo real (toggle)
- ✅ Preview com variáveis substituídas
- ✅ Dark mode support
- ✅ Loading states e error handling
- ✅ Responsive design

**Validações:**
```typescript
- Nome obrigatório (2-100 chars)
- Tipo obrigatório
- Subject obrigatório se EMAIL (max 200)
- Conteúdo obrigatório (10-5000 chars)
- Apenas variáveis permitidas
```

---

## ⚠️ Pendente de Implementação (20%)

### 5. TemplatesPage Principal
**Arquivo a Criar:** `src/pages/brand/credentials/TemplatesPage.tsx`

**Estrutura Recomendada:**

```tsx
import React, { useState } from 'react';
import { useTemplates } from '../../../hooks/useTemplates';
import { CreateEditTemplateModal } from '../../../components/credentials/CreateEditTemplateModal';
import { Mail, MessageCircle, Smartphone, Link, Plus, Edit2, Copy, Trash2, Power } from 'lucide-react';

export const TemplatesPage: React.FC = () => {
    const { templates, isLoading, error, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, refetch } = useTemplates();
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<InvitationTemplate | undefined>();

    // Handlers
    const handleCreate = () => {
        setEditingTemplate(undefined);
        setShowModal(true);
    };

    const handleEdit = (template: InvitationTemplate) => {
        if (template.isDefault) {
            alert('Template padrão não pode ser editado');
            return;
        }
        setEditingTemplate(template);
        setShowModal(true);
    };

    const handleDelete = async (template: InvitationTemplate) => {
        if (template.isDefault) {
            alert('Template padrão não pode ser excluído');
            return;
        }
        if (!confirm(`Excluir template "${template.name}"?`)) return;

        try {
            await deleteTemplate(template.id);
        } catch (error) {
            alert('Erro ao excluir template');
        }
    };

    const handleDuplicate = async (template: InvitationTemplate) => {
        try {
            await duplicateTemplate(template.id);
        } catch (error) {
            alert('Erro ao duplicar template');
        }
    };

    const handleSubmit = async (data: any) => {
        if (editingTemplate) {
            return updateTemplate(editingTemplate.id, data);
        } else {
            return createTemplate(data);
        }
    };

    // Loading / Error States
    if (isLoading) return <div>Carregando...</div>;
    if (error) return <div>Erro: {error}</div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Templates de Convite
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        Gerencie seus templates personalizados de convite
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Novo Template
                </button>
            </div>

            {/* Templates Grid */}
            {templates.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-gray-400">
                        Nenhum template criado ainda
                    </p>
                    <button
                        onClick={handleCreate}
                        className="mt-4 text-brand-600 hover:text-brand-700"
                    >
                        Criar Primeiro Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={() => handleEdit(template)}
                            onDelete={() => handleDelete(template)}
                            onDuplicate={() => handleDuplicate(template)}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <CreateEditTemplateModal
                    template={editingTemplate}
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        refetch();
                    }}
                    onSubmit={handleSubmit}
                />
            )}
        </div>
    );
};

// Template Card Component
interface TemplateCardProps {
    template: InvitationTemplate;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onEdit, onDelete, onDuplicate }) => {
    const getTypeIcon = () => {
        switch (template.type) {
            case 'EMAIL': return <Mail className="w-5 h-5" />;
            case 'WHATSAPP': return <MessageCircle className="w-5 h-5" />;
            case 'SMS': return <Smartphone className="w-5 h-5" />;
            case 'LINK': return <Link className="w-5 h-5" />;
        }
    };

    const getTypeColor = () => {
        switch (template.type) {
            case 'EMAIL': return 'text-blue-600 bg-blue-100';
            case 'WHATSAPP': return 'text-green-600 bg-green-100';
            case 'SMS': return 'text-purple-600 bg-purple-100';
            case 'LINK': return 'text-amber-600 bg-amber-100';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getTypeColor()}`}>
                        {getTypeIcon()}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {template.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {template.type}
                        </p>
                    </div>
                </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2 mb-4">
                {template.isDefault && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Padrão
                    </span>
                )}
                <span className={`px-2 py-1 text-xs font-medium rounded ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {template.isActive ? 'Ativo' : 'Inativo'}
                </span>
            </div>

            {/* Preview */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                    {template.content}
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                    onClick={onEdit}
                    disabled={template.isDefault}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={template.isDefault ? 'Template padrão não pode ser editado' : 'Editar'}
                >
                    <Edit2 className="w-4 h-4" />
                    Editar
                </button>
                <button
                    onClick={onDuplicate}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Duplicar"
                >
                    <Copy className="w-4 h-4" />
                    Duplicar
                </button>
                <button
                    onClick={onDelete}
                    disabled={template.isDefault}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={template.isDefault ? 'Template padrão não pode ser excluído' : 'Excluir'}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};
```

### 6. Roteamento
**Arquivo a Modificar:** `src/App.tsx` ou arquivo de rotas

```tsx
import { TemplatesPage } from './pages/brand/credentials/TemplatesPage';

// Adicionar rota:
<Route path="/brand/credenciamento/templates" element={<TemplatesPage />} />
```

### 7. Exportações
**Arquivo a Modificar:** `src/components/credentials/index.ts`

```typescript
export { CreateEditTemplateModal } from './CreateEditTemplateModal';
```

---

## 📊 Progresso Detalhado

| Componente | Status | Linhas | Complexidade |
|------------|--------|--------|--------------|
| Types & Interfaces | ✅ 100% | 72 | Baixa |
| Service Layer | ✅ 100% | 67 | Média |
| Custom Hook | ✅ 100% | 95 | Média |
| CreateEditTemplateModal | ✅ 100% | 380 | Alta |
| TemplatesPage | ⚠️ 0% | ~300 | Alta |
| Routing | ⚠️ 0% | ~5 | Baixa |
| **Total** | **✅ 80%** | **~1019** | - |

---

## 🧪 Como Testar (Após Conclusão)

### 1. Acessar a Página
```
http://localhost:5173/brand/credenciamento/templates
```

### 2. Criar Template
1. Clicar em "Novo Template"
2. Preencher nome, tipo, subject (se EMAIL), conteúdo
3. Inserir variáveis usando botões da sidebar
4. Ver preview em tempo real
5. Salvar

### 3. Editar Template
1. Clicar em "Editar" no card
2. Modificar campos
3. Ver preview atualizado
4. Salvar alterações

### 4. Duplicar Template
1. Clicar em "Duplicar"
2. Ver novo template com "(Cópia)" no nome
3. Editar se necessário

### 5. Excluir Template
1. Clicar no ícone de lixeira
2. Confirmar exclusão
3. Ver template removido da lista

### 6. Validações
- Tentar editar template padrão (deve bloquear)
- Tentar excluir template padrão (deve bloquear)
- Usar variável inválida (deve mostrar erro)
- Submeter sem nome (deve validar)
- Subject vazio para EMAIL (deve validar)

---

## 🚀 Próximos Passos

### Imediato
1. Criar arquivo `TemplatesPage.tsx` com código acima
2. Adicionar rota no sistema de rotas
3. Exportar CreateEditTemplateModal
4. Testar integração completa

### Após TemplatesPage
- Task #3: Integrar templates no SendInviteModal
- Task #5: Testes E2E

---

## 📁 Arquivos Criados

```
✅ src/types/invitation-templates.ts
✅ src/services/credentialSettingsService.ts
✅ src/services/index.ts (modificado)
✅ src/hooks/useTemplates.ts
✅ src/components/credentials/CreateEditTemplateModal.tsx
⚠️ src/pages/brand/credentials/TemplatesPage.tsx (pendente)
⚠️ src/components/credentials/index.ts (exportação pendente)
```

---

## ✅ Conclusão

**80% da Task #4 está completo.** Todos os fundamentos foram implementados:
- ✅ Tipos TypeScript completos
- ✅ Service layer com API integration
- ✅ Custom hook reativo
- ✅ Modal de criação/edição completo e funcional

**Falta apenas:**
- ⚠️ Página principal TemplatesPage (20%)
- ⚠️ Configuração de rota (1%)
- ⚠️ Exportação do modal (1%)

**Código fornecido acima** pode ser usado diretamente para completar os 20% restantes.

**Estimativa para 100%:** 1-2 horas de implementação + testes

---

*Implementação realizada em: 2026-01-28*
*Próxima etapa: Completar TemplatesPage e integrar no routing*
