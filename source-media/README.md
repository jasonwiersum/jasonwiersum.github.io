# Source media

Build inputs. Nothing here is served, and nothing here is copied into `dist/`.

That is the whole reason the folder exists. Everything under `public/` is copied
verbatim into the build, so while these files lived in `public/images/` their
5.1 MB was published on every deploy — sitting at a guessable URL, counted
against nothing, and never once requested by the site. They are inputs to
`scripts/build-character.py`, not assets of the page.

Keep them. The character can be rebuilt from them at a different frame count,
size or quality without having to source the footage again; delete them and that
stops being possible.

## `final-chroma.mp4` — the character, and the one in use

10 seconds, 24fps, 240 frames, 1280×720, shot against a green screen.
`scripts/build-character.py` reads this one — see `SOURCE` there — keys the
green out, and writes:

- `public/character/frames.webp` — every frame, in order, on one sheet
- `public/character/still-<hash>.webp` — the resting frame, for touch devices
- `src/components/Character/manifest.json` — sheet geometry and per-frame gaze

## `final.mp4` — the first take, kept for reference

The original recording, shot against a pale grey. It is **not** what the
character is built from any more and nothing points at it.

It was replaced because the backdrop came within about 8 levels of the cream
jumper, so no threshold could separate them: the matte had to be argued for with
a polynomial fit and a hysteresis flood, and it still came out with the hair as
a staircase and a collar of backdrop attached. The green-screen take retired all
of that machinery.

Kept because it is the only copy, and because the two takes are the same
performance — if the character ever needs a frame the chroma take does not
have, this is where it would come from.
