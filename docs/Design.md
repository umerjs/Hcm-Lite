# HCM Lite Design System

## Theme & Vibe
- **Style:** Clean, minimalist, modern enterprise SaaS. No heavy shadows or chaotic gradients.
- **Color Palette:** 
  - **Primary:** Emerald/Teal (`bg-emerald-600` to `bg-emerald-700`) to represent growth and HR, aligning with Saylani's brand.
  - **Background:** `bg-background` (slate-50 in light mode, slate-950 in dark mode).
  - **Cards/Surfaces:** `bg-card` with a subtle `border-border` outline.
  - **Destructive/Error:** `bg-red-500` for rejections/errors.
  - **Warning:** `bg-amber-500` for pending states.

## Typography & Hierarchy
- **Font:** Default Tailwind sans-serif (Inter/system-ui).
- **Page Headers:** `<h1 className="text-2xl font-bold tracking-tight text-foreground">` paired with a `<p className="text-sm text-muted-foreground">` for descriptions.
- **Data/Money:** Always format currency as `PKR 150,000` with tabular numbers (`tabular-nums`).

## Component Specifications (shadcn/ui based)
- **Buttons:** Slightly rounded (`rounded-lg`), bold text. Use variants: `default` (primary actions), `outline` (secondary/cancel), `ghost` (icon buttons).
- **Cards:** Use `Card`, `CardHeader`, `CardTitle`, `CardContent`. Keep padding generous (`p-6`).
- **Tables:** Clean lines, left-aligned headers. Wrap in a border with rounded corners. Use sticky headers if the list is long.
- **Badges (`StatusBadge`):** 
  - Present/Approved: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400`
  - Pending/Late: `bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400`
  - Absent/Rejected: `bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400`
- **AI Elements (`AiBadge`):** Use a subtle purple gradient or distinct icon (e.g., Lucide `Sparkles`) to clearly mark AI-generated insights or smart leave suggestions.

## Layout & Responsiveness
- **Desktop (1024px+):** Fixed left sidebar (250px), top header (64px height), main content area max-width 1200px centered.
- **Mobile (< 768px):** Sidebar collapses into a Hamburger Menu (`Sheet` component from shadcn). Data tables must have `overflow-x-auto`.