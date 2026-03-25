# Partycooler Design System

## Design Philosophy

Partycooler is built around three core principles:

1. **Clarity First** - Inventory management requires instant comprehension. Every metric, status, and action should be immediately understandable without cognitive load.

2. **Efficiency Over Decoration** - Users interact with this system during busy operations. The interface prioritizes speed and task completion over visual flourish.

3. **Trust Through Consistency** - Reliable data presentation builds user confidence. Consistent patterns, predictable interactions, and stable layouts create a trustworthy experience.

---

## Color System

### Philosophy
The color palette is intentionally restrained to maintain focus on data. We use a cool-toned neutral base with strategic accent colors that convey meaning rather than decoration.

### Primary Palette (5 Colors Max)

| Token | Purpose | Value |
|-------|---------|-------|
| `--primary` | Actions, interactive elements, brand identity | Cool blue `hsl(210, 60%, 45%)` |
| `--background` | Page backgrounds, canvas | Near-white `hsl(210, 20%, 98%)` |
| `--foreground` | Primary text, headings | Dark slate `hsl(210, 25%, 10%)` |
| `--muted` | Secondary text, borders, disabled states | Gray `hsl(210, 15%, 65%)` |
| `--card` | Elevated surfaces, containers | White `hsl(0, 0%, 100%)` |

### Semantic Colors

| Token | Purpose | Usage |
|-------|---------|-------|
| `--success` | Positive states, ingress transactions | Green tones for "stock in" |
| `--destructive` | Alerts, egress transactions, low stock | Red tones for "stock out" and warnings |
| `--warning` | Approaching thresholds, expiry warnings | Amber for attention without alarm |

### Dark Mode

Dark mode is implemented via `next-themes` with Tailwind's `class` strategy. The `ThemeProvider` wraps the app root with `attribute="class"`, `defaultTheme="system"`, and `enableSystem` so the initial theme matches the OS preference. Toggling adds or removes the `.dark` class on `<html>`, which activates the `.dark { }` token overrides in `globals.css`.

- All color tokens have dark-mode variants defined in `globals.css` under `.dark`
- Colors use the OKLCh color space for perceptually uniform dark and light variants
- User preference is persisted to `localStorage` by next-themes

### Color Usage Rules

1. **Never use gradients** unless explicitly requested - solid colors only
2. **Maximum 3 colors visible** in any single component
3. **Success/Destructive for transactions** - Green = stock in, Red = stock out
4. **Muted for secondary information** - timestamps, IDs, metadata
5. **Primary only for actions** - buttons, links, interactive elements

---

## Typography

### Font Stack

```css
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| Page Title | 2rem (32px) | 700 | 1.2 | Main page headings |
| Section Header | 1.5rem (24px) | 600 | 1.3 | Card titles, section dividers |
| Card Title | 1.125rem (18px) | 600 | 1.4 | Widget headers, modal titles |
| Body | 1rem (16px) | 400 | 1.5 | Primary content, descriptions |
| Small | 0.875rem (14px) | 400 | 1.5 | Table cells, secondary info |
| Caption | 0.75rem (12px) | 500 | 1.4 | Labels, timestamps, metadata |

### Typography Rules

1. **Maximum 2 font families** - Inter for UI, monospace for data/codes only
2. **Use `text-balance`** on headings for optimal line breaks
3. **Use `text-pretty`** on body text to prevent orphans
4. **Numbers in tables** use tabular-nums for alignment
5. **Never use font sizes below 14px** for interactive elements

---

## Layout System

### Layout Method Priority

1. **Flexbox** - Default for all layouts (nav, cards, forms, lists)
2. **CSS Grid** - Only for dashboard widgets and complex 2D layouts
3. **Absolute positioning** - Reserved for overlays, tooltips, badges only

### Spacing Scale

Use Tailwind's spacing scale consistently:

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` / `p-1` | 4px | Tight groupings (icon + text) |
| `gap-2` / `p-2` | 8px | Related elements, button padding |
| `gap-3` / `p-3` | 12px | Form field spacing |
| `gap-4` / `p-4` | 16px | Card padding, section gaps |
| `gap-6` / `p-6` | 24px | Major section divisions |
| `gap-8` / `p-8` | 32px | Page-level spacing |

### Container Widths

```
Mobile:     100% with px-4 padding
Tablet:     max-w-3xl (768px)
Desktop:    max-w-6xl (1152px)
Wide:       max-w-7xl (1280px) for dashboard only
```

### Grid Patterns

**Dashboard Grid:**
```
Mobile:   1 column
Tablet:   2 columns  
Desktop:  4 columns (stats) / 2 columns (charts)
```

**Data Tables:**
```
Mobile:   Card-based list view (stacked)
Tablet+:  Traditional table with horizontal scroll if needed
```

---

## Component Patterns

### Cards

Cards are the primary container for content groupings.

```
Structure:
┌─────────────────────────────┐
│ Header (optional)           │
│ - Title (left)              │
│ - Actions (right)           │
├─────────────────────────────┤
│ Content                     │
│                             │
├─────────────────────────────┤
│ Footer (optional)           │
└─────────────────────────────┘

Styling:
- Background: var(--card)
- Border: 1px solid var(--border)
- Border radius: var(--radius) (8px)
- Shadow: shadow-sm (subtle elevation)
- Padding: p-4 (content), p-4 (header/footer)
```

### Data Display

**Stat Cards:**
```
┌──────────────────┐
│ Label      [icon]│
│ 247              │  <- Large number, font-semibold
│ +12 from last wk │  <- Trend indicator, text-sm
└──────────────────┘
```

**Transaction Rows:**
```
┌─────────────────────────────────────────────────┐
│ [+/-] Product Name    Qty    Type    Timestamp  │
│  ↑     Left-aligned   Right  Badge   Right/muted│
│ Green=in, Red=out                               │
└─────────────────────────────────────────────────┘
```

### Forms

**Field Layout:**
- Use `FieldGroup` + `Field` + `FieldLabel` for all form layouts
- Use `FieldSet` + `FieldLegend` for grouped options
- Stack fields vertically on mobile, 2-column grid on desktop for short forms
- Always show validation errors below the field in `text-destructive`

**Input Sizing:**
- Default height: 40px (h-10)
- Comfortable touch targets on mobile: minimum 44px

### ThemeToggle

`components/layout/ThemeToggle.tsx` — ghost icon button placed in the header (`ml-auto`).

- Uses `useTheme()` from `next-themes`
- Shows `Moon` icon in light mode, `Sun` icon in dark mode (both `h-4 w-4`)
- Renders `null` until mounted to avoid hydration mismatch
- `aria-label="Toggle theme"` for accessibility
- Only visible in the protected layout header

### Buttons

**Hierarchy:**
1. `default` - Primary actions (Save, Add, Submit)
2. `secondary` - Secondary actions (Cancel, Back)
3. `outline` - Tertiary actions (Edit, View details)
4. `ghost` - Minimal actions (icon-only, table row actions)
5. `destructive` - Dangerous actions (Delete, Remove)

**Sizing:**
- `sm` - Table actions, compact spaces
- `default` - Standard forms and dialogs
- `lg` - Primary CTAs, mobile touch targets

### Tables

**Desktop (640px+):**
- Full table with sortable headers
- Row hover state: `hover:bg-muted/50`
- Sticky header on scroll
- Actions column aligned right

**Mobile (<640px):**
- Transform to card-based list
- Each row becomes a stacked card
- Key info (product, quantity) prominent
- Secondary info (date, type) below

---

## Navigation Structure

### Sidebar (Desktop)

```
┌──────────────────┐
│ [Logo] Partycool │
├──────────────────┤
│ Dashboard        │  <- Active state: bg-primary/10, text-primary
│ Products         │
│ Inventory        │
│ Transactions     │
│ Alerts           │
│ Activity         │
├──────────────────┤
│ Settings         │
│ [User] Logout    │
└──────────────────┘

Width: 240px (w-60)
Collapsible to: 64px (icons only)
```

### Bottom Nav (Mobile)

```
┌─────┬─────┬─────┬─────┬─────┐
│ 🏠  │ 📦  │ ➕  │ 📊  │ ⚙️  │
│Home │Prod │ Add │Stats│More │
└─────┴─────┴─────┴─────┴─────┘

- Fixed to bottom
- 5 items maximum
- Active state: text-primary
- "Add" action can be prominent (larger, primary color)
```

---

## Responsive Breakpoints

| Breakpoint | Width | Target |
|------------|-------|--------|
| `sm` | 640px | Large phones, landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |

### Mobile-First Approach

1. **Design for mobile first** - Base styles target phones
2. **Enhance progressively** - Add complexity at larger breakpoints
3. **Touch-friendly defaults** - 44px minimum touch targets
4. **Thumb-zone awareness** - Primary actions in bottom half on mobile

---

## Data Visualization

### Chart Philosophy

Charts should answer questions at a glance, not require analysis.

### Chart Types by Use Case

| Data Type | Chart | Why |
|-----------|-------|-----|
| Stock levels over time | Area/Line | Shows trends and patterns |
| Current inventory by product | Horizontal Bar | Easy comparison, readable labels |
| Transaction distribution | Donut | Part-to-whole relationship |
| Daily activity | Vertical Bar | Discrete time periods |

### Chart Styling

```
Colors:
- Ingress (stock in): Success green
- Egress (stock out): Destructive red  
- Neutral data: Primary blue
- Grid lines: Muted, dashed

Labels:
- Axis labels: text-sm, text-muted-foreground
- Values: text-sm, font-medium
- Tooltips: Card-styled with shadow

Sizing:
- Minimum height: 200px
- Aspect ratio: 16:9 for line/area, flexible for bars
```

---

## Micro-interactions

### Transitions

```css
/* Default transition for interactive elements */
transition: all 150ms ease-in-out;

/* Slower for layout changes */
transition: all 300ms ease-in-out;
```

### Feedback States

| Action | Feedback |
|--------|----------|
| Button click | Scale down slightly (0.98), then release |
| Form submit | Button shows loading spinner |
| Transaction added | Row slides in, brief highlight |
| Item deleted | Row fades out |
| Error | Shake animation on invalid field |

### Loading States

1. **Skeleton screens** for initial page loads
2. **Spinner** for button actions (use shadcn `<Spinner />`)
3. **Progress bar** for multi-step processes
4. **Optimistic updates** for quick actions (revert on error)

---

## Accessibility

### Requirements

1. **Color contrast** - Minimum 4.5:1 for text, 3:1 for UI elements
2. **Focus indicators** - Visible focus rings on all interactive elements
3. **Screen reader text** - Use `sr-only` class for icon-only buttons
4. **ARIA labels** - All interactive elements must be labeled
5. **Keyboard navigation** - Full functionality without mouse

### Implementation

```tsx
// Icon-only button example
<Button variant="ghost" size="icon">
  <Trash2 className="h-4 w-4" />
  <span className="sr-only">Delete product</span>
</Button>

// Form field with error
<Field>
  <FieldLabel htmlFor="quantity">Quantity</FieldLabel>
  <Input 
    id="quantity" 
    aria-describedby="quantity-error"
    aria-invalid={!!error}
  />
  {error && (
    <p id="quantity-error" className="text-sm text-destructive">
      {error}
    </p>
  )}
</Field>
```

---

## Iconography

### Icon Library

Use Lucide React icons consistently throughout the application.

### Icon Sizing

| Context | Size | Class |
|---------|------|-------|
| Inline with text | 16px | `h-4 w-4` |
| Button icons | 16-20px | `h-4 w-4` or `h-5 w-5` |
| Navigation | 20px | `h-5 w-5` |
| Empty states | 48px | `h-12 w-12` |
| Feature icons | 24px | `h-6 w-6` |

### Semantic Icons

| Concept | Icon | Usage |
|---------|------|-------|
| Stock In | `PackagePlus` or `ArrowDownToLine` | Ingress transactions |
| Stock Out | `PackageMinus` or `ArrowUpFromLine` | Egress transactions |
| Product | `Package` | Product listings |
| Alert | `AlertTriangle` | Low stock warnings |
| Dashboard | `LayoutDashboard` | Navigation |
| Settings | `Settings` | Configuration |
| Light mode | `Sun` | ThemeToggle (switch to light) |
| Dark mode | `Moon` | ThemeToggle (switch to dark) |
| Add | `Plus` | Create actions |
| Edit | `Pencil` | Modify actions |
| Delete | `Trash2` | Remove actions |
| Search | `Search` | Filter/search inputs |

---

## Empty States

Every list and data view needs an empty state.

### Structure

```
┌─────────────────────────────┐
│                             │
│         [Icon 48px]         │
│                             │
│     No products yet         │  <- Title
│                             │
│   Add your first product    │  <- Description
│   to start tracking         │
│   inventory.                │
│                             │
│      [+ Add Product]        │  <- CTA Button
│                             │
└─────────────────────────────┘
```

### Use the `<Empty>` component:

```tsx
<Empty>
  <EmptyIcon>
    <Package className="h-12 w-12" />
  </EmptyIcon>
  <EmptyTitle>No products yet</EmptyTitle>
  <EmptyDescription>
    Add your first product to start tracking inventory.
  </EmptyDescription>
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Add Product
  </Button>
</Empty>
```

---

## Design Tokens Summary

```css
/* globals.css - Core tokens */
@theme inline {
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --radius: 0.5rem;
  
  /* Light mode palette */
  --background: 210 20% 98%;
  --foreground: 210 25% 10%;
  --card: 0 0% 100%;
  --card-foreground: 210 25% 10%;
  --primary: 210 60% 45%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 15% 92%;
  --secondary-foreground: 210 25% 25%;
  --muted: 210 15% 92%;
  --muted-foreground: 210 15% 45%;
  --accent: 210 15% 92%;
  --accent-foreground: 210 25% 25%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border: 210 15% 85%;
  --input: 210 15% 85%;
  --ring: 210 60% 45%;
  
  /* Semantic additions */
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;
  --warning-foreground: 0 0% 0%;
}
```

---

## Quick Reference Checklist

Before shipping any component, verify:

- [ ] Maximum 5 colors used
- [ ] Maximum 2 font families
- [ ] Flexbox used (not floats/absolute unless necessary)
- [ ] Responsive at all breakpoints
- [ ] Touch targets minimum 44px on mobile
- [ ] Focus states visible
- [ ] Loading states defined
- [ ] Empty states designed
- [ ] Error states handled
- [ ] ARIA labels on icons/buttons
- [ ] Text contrast meets WCAG AA
