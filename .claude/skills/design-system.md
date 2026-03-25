# Skill: design-system

## Propósito

Como usar design tokens, convenções de componentes e padrões responsivos. Garante consistência visual entre design specs e código implementado.

## Quando consultar

- Ao definir design tokens e component specs (ux-designer)
- Ao implementar componentes e layouts (frontend-dev)
- Ao verificar aderência visual em code review (code-reviewer)

## Regras

### Design tokens

1. **Single source of truth:** tokens definidos em `design-tokens.json` → consumidos por `tailwind.config.js` → usados via classes Tailwind. Nunca hardcode valores.
2. **Naming semântico:** tokens nomeados por função, não por valor (ex: `color-primary`, não `color-blue-500`).
3. **Hierarquia de tokens:**
   - **Primitive:** valores brutos (`blue-500: #3B82F6`)
   - **Semantic:** função no design (`color-primary: blue-500`)
   - **Component:** específico do componente (`button-bg: color-primary`)
4. **Dark mode:** token por token, não inversão automática. Cada semantic token tem valor light e dark.
5. **Contraste WCAG AA:** toda combinação text/background atinge 4.5:1. Componentes UI atingem 3:1.
6. **Nunca use cor hardcoded:** `bg-[#3B82F6]` é proibido. Use `bg-primary`.

### Tipografia

7. **Escala tipográfica:** definida nos tokens (xs, sm, base, lg, xl, 2xl, 3xl). Sem valores customizados fora da escala.
8. **Line height:** vinculada ao font size no token (ex: `text-base` já inclui `leading-normal`).
9. **Font weight:** semântico (`font-normal`, `font-medium`, `font-bold`). Máximo 3 weights.
10. **Acessibilidade:** font-size mínimo 16px para body text. 14px apenas para labels secundários.

### Espaçamento

11. **Escala de 4px:** todo espaçamento é múltiplo de 4 (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24).
12. **Consistência:** use tokens de espaçamento (ex: `p-4`, `gap-6`, `mb-8`). Nunca `p-[13px]`.
13. **Áreas de toque:** mínimo 44x44px (11 unidades Tailwind) para elementos interativos.

### Componentes

14. **States obrigatórios:** todo componente interativo tem: default, hover, focus, active, disabled.
15. **5 estados de dados:** componentes que exibem dados: success, loading, empty, error, partial.
16. **Props tipadas:** toda prop documentada com TypeScript interface.
17. **Variantes via CVA (Class Variance Authority):** use `cva()` para variantes de componente. Não `if/else` de classes.
18. **Composição:** componentes compostos (ex: `Card`, `Card.Header`, `Card.Body`) em vez de props gigantes.
19. **Forwarding refs:** componentes de UI aceitam `ref` (use `forwardRef`).
20. **Sem lógica de negócio:** componentes de UI são puros. Lógica fica em hooks ou services.

### Responsividade

21. **Mobile-first:** escreva CSS/Tailwind para mobile primeiro, adicione breakpoints para telas maiores.
22. **Breakpoints padrão:**
    - `sm`: 640px (landscape phone)
    - `md`: 768px (tablet)
    - `lg`: 1024px (laptop)
    - `xl`: 1280px (desktop)
23. **Container:** `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` como padrão.
24. **Grid system:** CSS Grid para layouts de página, Flexbox para alinhamento de componentes.
25. **Sem scroll horizontal:** em nenhum breakpoint. Teste mobile e desktop.
26. **Imagens responsivas:** use `srcset` ou `next/image`. Nunca imagem de 2000px em mobile.

### Acessibilidade visual

27. **Focus visible:** todo elemento focável tem `:focus-visible` com ring (ex: `focus-visible:ring-2 focus-visible:ring-primary`).
28. **Sem cor como único indicador:** combine cor com ícone ou texto para status (ex: erro = vermelho + ícone ✕ + texto "Erro").
29. **Reduced motion:** respeite `prefers-reduced-motion`. Desabilite animações quando ativo.
30. **Skip to content:** link invisível no topo de cada página, visível no focus.

### Animações

31. **Duration:** 150ms para micro-interactions, 300ms para transições, 500ms para animações maiores.
32. **Easing:** `ease-out` para elementos entrando, `ease-in` para saindo, `ease-in-out` para movimento contínuo.
33. **Sem animação em conteúdo essencial:** informação crítica nunca depende de animação para ser visível.

## Exemplos

### ✅ Correto
```tsx
// Componente com CVA, props tipadas, acessibilidade
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active',
        secondary: 'bg-secondary text-on-secondary hover:bg-secondary-hover',
        ghost: 'hover:bg-surface-hover',
      },
      size: {
        sm: 'h-9 px-3 text-sm',     // 36px height
        md: 'h-11 px-4 text-base',   // 44px height — touch target
        lg: 'h-12 px-6 text-lg',     // 48px height
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size })}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <Spinner className="mr-2" aria-hidden /> : null}
      {children}
    </button>
  )
);
```

```tsx
// Responsivo mobile-first
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {entries.map(entry => (
    <MoodCard key={entry.id} entry={entry} />
  ))}
</div>
```

### ❌ Incorreto
```tsx
// Cor hardcoded, sem states, sem acessibilidade, sem tipagem
function Button({ label, onClick }) {           // sem TypeScript
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: '#3B82F6' }}   // hardcoded
      className="p-[13px] text-white"           // magic number, sem focus, sem hover
    >
      {label}
    </button>
    // 😱 Sem disabled state, sem loading, sem focus-visible, sem aria
  );
}

// Desktop-first (errado)
<div className="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
  {/* 😱 Desktop-first: deveria ser grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 */}
</div>

// Cor como único indicador
<span className="text-red-500">Error occurred</span>
{/* 😱 Sem ícone — daltônicos não distinguem por cor */}
```

## Referências

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [CVA — Class Variance Authority](https://cva.style/)
- [WCAG 2.1 AA — Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Radix UI — Primitives](https://www.radix-ui.com/)
- UX Designer `design-tokens.md` em `artifacts/02-design/`
- UX Designer `component-library.md` em `artifacts/02-design/`
