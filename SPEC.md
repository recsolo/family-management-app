# FamilyFlow UI Redesign — SPEC.md

## 1. Objective

Redesign the FamilyFlow app UI to be more efficient and less complicated without removing any features.

**Target users:** Families (2+ adults, children). Primary user manages household; secondary users are partners, older children.

**Core problems to solve:**
- Three simultaneous rails (left nav, center content, right context) cause cognitive overload
- 10 unstructured nav items are hard to scan
- Forms are buried inside nested disclosure panels
- Right context rail duplicates info already visible on the page
- Mobile layout is unusable (three rails stack poorly)

**Success criteria:**
- Any page can be reached in ≤2 clicks from anywhere
- Add/edit any item in ≤3 clicks
- No disclosure panel nested more than 1 level deep
- App renders correctly on 375px wide screens
- `npx tsc --noEmit` passes with 0 errors after each phase
- Visual identity (warm cream/gold glassmorphic) is preserved — no palette changes

---

## 2. Architecture Decisions

### Layout: Two-rail (nav + content)
- **Remove** the right context rail entirely
- Right-rail content (hero stats, page metadata, action buttons) moves into each page's own header area
- Notifications move to a slide-over drawer triggered by a bell icon in the top bar
- Quick-add actions move to a floating `+` button on mobile; inline page header on desktop

### Navigation: Grouped sections
Replace 10 flat items with 4 grouped sections in the left rail:

| Section | Pages |
|---------|-------|
| **Home** | Today (dashboard), Inbox |
| **Family** | Operations (chores/reminders), Family Room, Members |
| **Lifestyle** | Meal Planner, Budget Lab |
| **More** | Games, Partner Space, AI Studio, Help |

Left rail shows section labels + nav items. On mobile it collapses to a bottom tab bar with 4 tabs (Home, Family, Lifestyle, More).

### Forms: Slide-over sheet
- All add/edit forms open as a right-anchored slide-over sheet (`position: fixed; right: 0`)
- The underlying list stays visible behind the sheet
- Sheet has a backdrop overlay, close button, and `Escape` key support
- A single `<SlideOverSheet>` component handles all forms — receives `title` + `children` props

### Visual: Refine, don't replace
- Keep: cream/gold palette, glass card style, serif headings, badge chips
- Remove: excessive backdrop-blur on nested cards (keep only on top-level panels), decorative pseudo-element gradients on inner cards
- Standardize: 8-point spacing scale, single font-size scale (sm/base/lg/xl/2xl/3xl/serif-display)
- Add: `--space-*` CSS custom properties to replace magic numbers

---

## 3. Project Structure

**New files to create:**
```
src/components/ui/
  slide-over-sheet.tsx       ← universal slide-over form container
  nav-section.tsx            ← grouped nav section with label + items
  page-header.tsx            ← replaces right rail hero stats area

src/components/workspace/
  workspace-left-rail.tsx    ← refactored left rail with grouped nav
  notification-drawer.tsx    ← extracted notification slide-over
```

**Files to modify:**
```
src/components/workspace/workspace-shell-panels.tsx   ← remove RightRail, add SlideOverSheet trigger
src/components/familyflow-app.tsx                     ← remove right-rail props, add sheet state
src/components/workspace/workspace-page-sections.tsx  ← forms use SlideOverSheet, not DisclosurePanel
src/app/globals.css                                   ← add --space-* vars, remove right-rail CSS, refine blur
```

**Files to remove (after migration):**
- Right rail rendering code in `workspace-shell-panels.tsx` (the `WorkspaceRightRail` component)

---

## 4. Code Style

- TypeScript strict mode — no `any`, no type assertions without comment
- All new components are named exports, not default exports
- Props interfaces use descriptive names (`SlideOverSheetProps`, not just `Props`)
- No inline styles — all styling via CSS classes or Tailwind utilities
- Form state stays in page components via `useFormEditor` hook (already in place)
- Sheet open/close state lives in the page component that owns the form
- No new third-party dependencies — use existing React + custom CSS only
- Each new file ≤ 200 lines

---

## 5. Implementation Phases

### Phase A — SlideOverSheet component
Create `src/components/ui/slide-over-sheet.tsx`:
- Fixed right panel, 480px wide on desktop, full-screen on mobile
- Backdrop blur overlay
- Escape key + backdrop click to close
- Accepts `open`, `onClose`, `title`, `children`

### Phase B — Grouped navigation
Refactor `workspace-shell-panels.tsx` `WorkspaceLeftRail`:
- Group nav items into 4 sections using `nav-section.tsx`
- Add section labels
- Mobile: replace left rail with bottom tab bar (4 primary tabs)

### Phase C — Remove right rail
- Delete `WorkspaceRightRail` component
- Move hero stats into `page-header.tsx` component used at top of each page section
- Remove right-rail CSS from `globals.css`
- Remove right-rail props from `familyflow-app.tsx`

### Phase D — Forms to slide-over sheets
Convert the 3 most complex form areas to use `SlideOverSheet`:
1. Family Ops — chore add/edit form
2. Family Ops — reminder add/edit form
3. Partner Space — date plan add/edit form

These currently live inside `<DisclosurePanel>` — extract them to sheets.

### Phase E — CSS refinement
- Add `--space-4` through `--space-16` custom properties
- Remove decorative pseudo-elements from nested cards (keep only `.family-panel`, `.family-card` top-level)
- Reduce `backdrop-filter: blur` from inner cards (keep only the outermost shell)
- Consolidate mobile bottom nav CSS

---

## 6. Boundaries

### Always do
- Run `npx tsc --noEmit` after each phase before moving on
- Preserve all existing functionality — no features removed
- Keep the `useFormEditor` hook pattern for all form state
- Use existing CSS class names where possible; only add new ones when necessary

### Ask first about
- Any change to API routes or database schema
- Changes to auth flow or session handling
- Removing any existing CSS class (may break other components)
- Changing any file outside `src/components/` or `src/app/globals.css`

### Never do
- Change the color palette (`--gold-*`, `--cream-*`, `--warm-*` variables)
- Add shadcn/ui, Radix, or any new UI library dependency
- Convert to a different CSS approach (e.g., CSS Modules, styled-components)
- Remove any page or feature visible to end users
- Use `any` type or disable TypeScript checks
