# Roco — a mascot for Claude Code

*[Español](README.md)*

![The mascot reacts to what Claude is doing](docs/roco.gif)

Roco is a pixel-art mascot that lives above the Claude Code prompt and **reacts to what Claude is doing**: it naps while you wait, thinks when you write, gets to work when Claude edits files or runs commands, celebrates when it's done and gets dizzy when something fails. Next to it you see at a glance what Claude is up to and how much context and quota you've used.

Pick one of 8 mascots, change its color with a single word, or **create your own by chatting with Claude**, in your language.

![The included mascots in their 5 moods](docs/personajes.png)

*Cat, Robot, Ghost, Dragon, Octopus, Astronaut and Mushroom, with a face for every mood. The eighth is Roco, the default golem.*

## Requirements

- A recent **Claude Code**, in the terminal or the desktop app (*Code* tab). Tested with version 2.1.286.
- **Function hooks enabled.** If you don't see the mascot after installing, add this to `~/.claude/settings.json` and restart:

  ```json
  {
    "env": { "CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1" }
  }
  ```

It doesn't work in the claude.ai chat: it needs Claude Code.

## Install

In a terminal:

```bash
claude plugin marketplace add s4duq/roco
```

```bash
claude plugin install roco@roco
```

Or, inside Claude Code, type `/plugin marketplace add s4duq/roco` and then `/plugin install roco@roco`. Restart Claude Code and type `/roco`.

To update: `claude plugin update roco@roco`. To remove it: `claude plugin uninstall roco@roco`.

## Usage

The first time you type `/roco`, a **menu with buttons** opens: pick the mascot, color, theme, what info to show and the size. Esc closes it.

| Command | What it does |
|---|---|
| `/roco` | Shows or hides the mascot (the first time, opens the menu) |
| `/roco menu` | Opens the menu |
| `/roco:crear [idea]` | Claude guides you to create your own mascot: shape, faces, colors and name |
| `/roco purple`, `/roco gato`, `/roco ocean` | Changes the color, mascot or theme with one word |
| `/roco make it pink and minimal` | Simple phrases work too, in English or Spanish |
| `/roco character [id]` | Without an id, lists the available mascots |
| `/roco color orange` or `/roco color #ff8a3d` | Your own color, by name or code; empty brings back the theme's |
| `/roco theme <magma, oceano, bosque, lavanda, mono, auto>` | Strip palette (also brings back the theme's color) |
| `/roco style <completo, compacto, minimo>` | Strip size |
| `/roco name <text>` | Renames it (max 16 characters) |
| `/roco language <auto, es, en>` | Language of the texts |
| `/roco help` | Shows every command |

Named colors: purple, blue, red, green, pink, orange, yellow, cyan, gray and white (Spanish names work too). Mascot ids are in Spanish: `gato`, `robot`, `fantasma`, `dragon`, `pulpo`, `astronauta`, `hongo`.

### The 5 moods

| Mood | When |
|---|---|
| Resting | Waiting for your message |
| Thinking | Claude is reading or thinking |
| Working | Claude edits files, runs commands or searches |
| Done | Claude finished its answer |
| Error | A tool failed or wasn't allowed |

## Create your mascot

**With Claude:** type `/roco:crear` followed by your idea (for example, `/roco:crear a space fox`). Claude suggests ideas, a face for each mood and colors, draws it and turns it on right away. Ask for changes until you like it.

**From an image:** with Node 22.18 or newer, clone this repository and turn any PNG or JPG into a mascot (the plugin itself doesn't need Node; only this converter does):

```bash
cd scripts
npm install
npm run personaje -- /path/to/my-drawing.png --nombre Michi
```

It's saved in `~/.claude/roco/personajes/` and you pick it with `/roco character michi`. `npm run personaje -- --ayuda` lists every option (size, colors, background and one image per mood).

## Options

You can also change them in Claude Code's `/config` menu, in the plugin's section.

| Option | Default | What it does |
|---|---|---|
| `personaje` | `roco` | Active mascot |
| `nombre` | *(the mascot's)* | Display name |
| `tema` | `magma` | Palette: magma, oceano, bosque, lavanda, mono or auto |
| `acento` | *(the theme's)* | Your own `#rrggbb` color |
| `estilo` | `completo` | completo, compacto or minimo |
| `campos` | `estado,acciones,uso,sesion,reinicio,contadores` | Which info to show; `git` (branch and uncommitted changes) is also available |
| `idioma` | `auto` | auto, es or en |
| `avisoTurnos` | `20` | Turns before suggesting a new conversation (0 turns it off) |
| `avisoContexto` | `70` | Context % before warning (0 turns it off) |
| `avisoCuota` | `80` | 5-hour quota % before warning (0 turns it off) |

## Privacy

- Everything runs on your machine and **never connects to the internet**.
- Context and quota figures are read from Claude Code without spending tokens.
- With the `git` field, it only runs `git` in the open folder to read the branch and pending changes.
- It only writes to `~/.claude/roco/personajes/`, and only when you create or convert a mascot.
- `/roco:crear` uses your Claude session only when you ask for it.

## Credits and license

Made by [s4duq](https://github.com/s4duq) with help from Claude Code and Antigravity.

Unofficial project, not affiliated with Anthropic. [MIT](LICENSE) license. Want to contribute a mascot? See [CONTRIBUTING.md](CONTRIBUTING.md).
