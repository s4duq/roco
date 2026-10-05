---
name: crear
description: Create or customize the person's Roco mascot, the pixel-art pet drawn above the prompt that reacts to what Claude does. Covers its look, its expressions for each mood, colors, name and which information the strip shows. Use when they run /roco:crear or ask, in any language, to create, design, change or personalize their mascot, pet or Roco.
argument-hint: "[your mascot idea]"
---

# Create a Roco mascot

Guide the person step by step, always in the language they write in. Keep every message short, show choices as short numbered lists and let them answer with just the numbers. Never ask them to edit files or run commands: you do everything with the two tools below.

**Show, don't just list.** If you have a tool that draws interactive widgets inline (for example `show_widget` in the Claude desktop app), show each set of choices as a small gallery instead of a plain list: one card per option with a quick sketch or color swatch, its name and a button that calls `sendPrompt('I pick …')` in their language (e.g. `sendPrompt('Elijo la 2: gato astronauta')`). Keep the numbered list as a fallback in the same message, short. Without such a tool, use the numbered lists only.

Their idea, if they gave one: $ARGUMENTS

## Steps

1. **The idea.** If they already described it, start from that and ask only for what is missing. Otherwise offer 3 quick ideas (an animal, a robot, a fantasy creature...). You need: what it is, its personality, 2 to 4 main colors and a name (up to 16 letters, digits, spaces, `_` or `-`).
2. **Expressions.** Propose one expression for each of its 5 moods and let them pick or change any:
   - `reposo` (idle, waiting for a message): e.g. sleepy eyes
   - `pensando` (thinking): e.g. looking up
   - `trabajando` (working, running tools): e.g. focused
   - `listo` (done): e.g. happy
   - `error`: e.g. dizzy
3. **Draw and save.** Call `mcp__roco__guardar_personaje`. Size 16x16 to 24x24, 2 to 6 colors, `paleta[0]` a dark outline color. Draw only the filled shape: the tool adds the 1-px outline with `paleta[0]`. Use `0` inside the shape only for dark details (eyes, mouth). Big readable silhouette: it must read at 48 px. Put the 5 expressions in `poses`, same size. If the tool refuses, fix what it says and call it again without bothering the person. When it accepts, the mascot is already above the prompt: ask if they want changes (a color, an expression, the name) and redo only that.
4. **Strip colors.** Offer an accent color that matches the mascot, or one of the themes (`magma` orange, `oceano` blue, `bosque` green, `lavanda` purple, `mono` gray, `auto` follows the terminal), and the style (`completo` big, `compacto` one line, `minimo` just the mascot). Apply their choice with `mcp__roco__ajustar` (`acento` as `#rrggbb`, `tema`, `estilo`).
5. **What the strip shows.** List the fields and let them choose; apply with `mcp__roco__ajustar` `campos` (comma-separated, in their order):
   - `estado`: name, mood and what Claude is doing
   - `acciones`: last actions (files edited, commands run)
   - `uso`: context used and the 5-hour and weekly quota
   - `git`: branch and pending changes
   - `sesion`: how long the session has been open
   - `reinicio`: when the 5-hour quota resets
   - `contadores`: turns, edits, commands and errors
   Default: `estado,acciones,uso,sesion,reinicio,contadores`.
6. **Finish.** Tell them: `/roco menu` opens a menu with buttons to switch mascots, colors, info and size; `/roco` shows or hides the mascot; `/roco purple` (or any color, theme or mascot name, in Spanish or English) changes it right away; and `/roco:crear` starts this assistant again.
