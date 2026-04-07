Review the code changes in this session (or the files/diff specified by the user) against the EcoHeart architecture and quality standards.

## Context

Read the platform audit at `current-ecoheart-poc-AUDIT.md` for architecture context, tech stack, and known gaps. Read `GIS-Docs/DESIGN.md` for design system rules.

## Review Checklist

For each changed file, evaluate:

### Architecture & Patterns
- Does it follow existing patterns in the codebase? (e.g., tool definitions in tools.ts use Zod + `tool()` wrapper, components use `"use client"` where needed, dynamic imports with `ssr: false` for browser-only libs)
- Does it integrate cleanly without modifying unrelated code?
- Are new files placed in the correct directory following the existing structure?

### Security (OWASP Top 10)
- No raw user input passed to SQL, shell, or DOM without sanitization
- No secrets or API keys hardcoded
- No `dangerouslySetInnerHTML` or `rehype-raw` without sanitization
- XSS vectors in any user-facing rendering

### Design System Compliance
- No 1px solid borders (use background color shifts or tonal transitions)
- Shadows use Natural Bloom: `0px 12px 32px rgba(28, 28, 25, 0.06)`
- Text uses `#1c1c19` (on-surface), never pure black
- Corners use `lg` (2rem) or `md` (1.5rem) radius
- Map overlays use glassmorphism (70% opacity + 24px backdrop-blur)
- Orange `#E8761B` used sparingly for critical insights only
- Fonts: Manrope for headlines, Inter for body

### Performance
- Heavy libraries (Leaflet, D3, pdfjs-dist) loaded via `next/dynamic` with `ssr: false`
- No blocking fetches in component render path
- Large data (GeoJSON) not serialized into LLM context without truncation

### TypeScript
- No `any` types without justification
- Proper null checks on optional data
- Zod schemas match the actual data shape

## Output Format

For each file reviewed, provide:
1. **File**: path
2. **Verdict**: PASS / NEEDS CHANGES / CRITICAL
3. **Issues** (if any): numbered list with line references
4. **Suggestions** (optional): improvements that aren't blockers

End with an overall summary and a confidence score (1-10) for production readiness of the changes.

$ARGUMENTS
