# Adapt Systems — Brand Assets

Selected identity: **Logo concept 02 (Stack)**, with **Tagline-led, light** banner framing for both LinkedIn and Twitter/X.

## Files

| File | Purpose |
|------|---------|
| `mark-stack-accent.svg` | Primary mark — ink + muted-blue accent, on light. |
| `mark-stack-mono-ink.svg` | Mono mark — ink only, on light. |
| `mark-stack-on-dark.svg` | Mark for dark surfaces — off-white + accent. |
| `lockup-horizontal-light.svg` | Mark + wordmark, side-by-side, on light. |
| `lockup-horizontal-dark.svg` | Mark + wordmark, side-by-side, on dark. |
| `linkedin-banner-1584x396.svg` / `.png` | LinkedIn cover banner (Tagline-led, light). |
| `twitter-banner-1500x500.svg` / `.png` | Twitter / X header (Tagline-led, light). |
| `avatar-light-400.png` | Profile avatar, light surface — 400×400. |
| `avatar-dark-400.png` | Profile avatar, dark surface — 400×400. |
| `favicon-16.png` / `-32.png` / `-64.png` / `-512.png` | Favicons / app icons. |

## The mark

A 4-block stack: 1 block on top, 1 in the middle (accent muted-blue), 2 at the base. Reads as composability — modular components forming a stable foundation — with the accent block as the active layer being adapted.

- **Construction** — 56-unit grid, 12-unit base block, 4-unit gap.
- **Clear space** — minimum 1× the base-block height on all sides.
- **Minimum size** — 16px (favicon) for the mark alone; 120px for the horizontal lockup.
- **Don't** — outline the blocks, rotate the mark, recolor individual blocks except the accent, place on busy photographic backgrounds.

## Tokens

```
Ink            #0B0F12
Off-white      #FAFAF7
Accent (blue)  #3B6FB0
Accent ink     #2C5A95
Muted          #7A8189
Line           #E6E5E0
```

## Type

- **Display** — Inter Tight, weight 500, letter-spacing −0.025em
- **Body** — Inter, weight 400/500
- **Labels** — JetBrains Mono, weight 500, uppercase, letter-spacing 0.06–0.18em

All from Google Fonts.

## Usage notes

- Banners use the homepage tagline verbatim. If you want to swap the tagline, edit the `.svg` file directly (the text is live SVG `<text>`).
- The PNG avatars are pre-cropped to 400×400; LinkedIn / Twitter / GitHub will mask to a circle automatically.
- Favicon-512 is the maximum-quality source — most platforms generate downstream sizes from it. The 16 / 32 / 64 PNGs are pre-rendered for direct use.
