# Cómo aportar · Contributing

*Español abajo de cada punto; English below each point.*

## Una mascota nueva · A new mascot

1. Crea `personajes/<id>.json` (id en minúsculas: letras, números, `_` o `-`).
   Create `personajes/<id>.json` (lowercase id: letters, digits, `_` or `-`).
2. Formato · Format:

   ```json
   {
     "formato": 1,
     "nombre": "Michi",
     "ancho": 20,
     "alto": 20,
     "paleta": ["#2b2321", "#ff9d4d", "#ffffff"],
     "pixeles": ["....", "..."],
     "acento": "#ff9d4d",
     "poses": { "reposo": [], "pensando": [], "trabajando": [], "listo": [], "error": [] }
   }
   ```

   - Entre 16 y 24 píxeles por lado y como máximo 6 colores. · 16 to 24 pixels per side, 6 colors at most.
   - Cada fila es un texto: `.` es transparente y `0`–`5` es el índice en `paleta`. · Each row is a string: `.` is transparent and `0`–`5` index into `paleta`.
   - `paleta[0]` es un color oscuro y cada píxel del borde de la figura usa `0` (contorno de 1 px). · `paleta[0]` is dark and every edge pixel of the shape uses `0` (1-px outline).
   - `poses` es opcional: una cara por ánimo, del mismo tamaño. · `poses` is optional: one face per mood, same size.
   - Fácil: crea la mascota con `/roco:crear` y copia el archivo de `~/.claude/roco/personajes/`. · Easy way: make it with `/roco:crear` and copy the file from `~/.claude/roco/personajes/`.
3. Revisa · Check (Node ≥ 22.18):

   ```bash
   cd scripts
   npm install
   npm test
   ```

4. Agrega el id a la lista de `scripts/galeria.mjs` y abre un pull request. · Add the id to the list in `scripts/galeria.mjs` and open a pull request.

La raíz del repo no lleva `package.json` a propósito: así instalar el plugin no corre npm. · The repo root has no `package.json` on purpose, so installing the plugin never runs npm.

## Código · Code

- El módulo corre dentro de Claude Code y solo usa `$` (sin Node ni DOM). · The module runs inside Claude Code and only uses `$` (no Node, no DOM).
- Tests del plugin · Plugin tests: `claude plugin test .`
- Sin red, sin texto libre dentro del SVG y `git` solo con argumentos fijos. · No network, no free text inside the SVG and `git` only with fixed arguments.
