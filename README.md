# page-mascot

A cursor-tracking mascot: a 3x3 sprite sheet of head directions. The page swaps cells
based on the angle between the pointer and the mascot, so the character always "looks"
at your cursor.

## Project structure

```
characters/      source photos (front-facing shot of the character)
mascots/         generated 3x3 sprite sheets (atlases used by the pages)
scripts/         mascot.js -- the cursor tracking shared by every demo page
index.html       index page listing the demos
portrait-*.html  single-mascot demo, one per character
wall-*.html      grid-of-mascots demo, one per character
prompt-generate-directions.md   prompt used to generate the 9-direction image
```

## Workflow

This repo uses the **manual route**: the sprite sheet is drawn by hand in a chat UI, not
by an API. There is no `OPENAI_API_KEY` and no image-generation service anywhere in the
pipeline — everything after step 1 runs locally and offline.

### 1. Generate the directions image (3x3 sprite sheet) — by hand

- Prepare a **front-facing photo** of the character and put it in `characters/`
  (e.g. `characters/quyen.jpg`).
- Open [prompt-generate-directions.md](prompt-generate-directions.md) and copy the whole
  prompt.
- Use **any web agent** (Gemini, ChatGPT, Claude, ...) with image generation: attach the
  front-facing photo and paste the prompt.
- The prompt asks for a seamless 3x3 grid on a solid white background, preserving
  identity / clothing / lighting, with the shoulders and body perfectly still and facing
  forward — **only the head rotates**:

  |                | left              | middle                | right              |
  | -------------- | ----------------- | --------------------- | ------------------ |
  | **top row**    | looking up-left   | looking straight up   | looking up-right   |
  | **middle row** | facing left       | facing the camera     | facing right       |
  | **bottom row** | looking down-left | looking straight down | looking down-right |

- Re-generate until all nine cells share the same scale and head position, with no
  jumping between frames.
- Save the result as `mascots/<name>.png`. Note the size of a single cell (e.g.
  `320x383`) — that ratio is used in the CSS
  (`--mascot-height: calc(var(--mascot-width) * 383 / 320)`).

### 2. Generate the page with the `/page-mascot` skill

Use the [`page-mascot`](https://github.com/nilbuild/page-mascot) skill in your agent to
build the page:

```
/page-mascot
```

The skill picks up the character, crops and aligns the sprite sheet into an atlas, then
generates the component / HTML page already wired with cursor tracking and click
reactions.

It creates its own gitignored `.venv/` from the skill's `requirements.txt` — Pillow,
numpy and scipy do the cropping and alignment. That is the whole dependency list: no
network calls, no credentials. The skill also ships an automated image-generation path,
but this repo does not use it — step 1 already supplies the sheet, so run the skill in
its `--skip-generate` mode.

Reference repo: https://github.com/nilbuild/page-mascot

## Running locally

Nothing to install — the demos are plain HTML/CSS/JS with no build step. They load
`background-image` via relative paths, so just serve them over HTTP:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000/ and follow the links to the `portrait-*.html` and
`wall-*.html` demos.

`wall-*.html` accepts query params:

- `?cols=8&rows=5` — pin the grid to a fixed number of columns/rows
- `?tile=120` — only set the tile width; the grid fills the viewport
