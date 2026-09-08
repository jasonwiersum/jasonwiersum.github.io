#!/usr/bin/env python3
"""Turn public/images/final.mp4 into the hero character's frame sheet.

Run this only to regenerate the assets; the output is committed, so a normal
checkout needs none of these tools.

    pip install pillow numpy
    python3 scripts/build-character.py            # needs ffmpeg on PATH

Output:
    public/character/frames.webp                 the clip, in order, one sheet
    public/character/still-<hash>.webp           one frame, for touch devices
    src/components/Character/manifest.json       sheet geometry + per-frame gaze

The frames are kept IN THE ORDER THEY WERE FILMED, evenly spaced through the
clip. That is the whole point: the runtime walks the sheet one frame at a time,
so what it shows is the movement that was actually recorded, not a cut between
two unrelated poses. Picking N spread-out "poses" by how they look, as an
earlier version did, made every change of direction a visible jump — adjacent
recorded frames differ by ~1.6/255 mean, poses chosen that way by ~10.

Why a sheet rather than the video itself: driving `video.currentTime` from an
animation frame does not work. Seeks are asynchronous and coalesce, so the
element presents a fraction of the frames asked for; a sheet is one decode and
then a transform per frame, which is exact and costs nothing.
"""
import argparse
import hashlib
import io
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public' / 'images' / 'final-chroma.mp4'
OUT_DIR = ROOT / 'public' / 'character'
# The manifest is small and the app needs it before the first paint, so it is
# bundled from src/ rather than fetched at runtime.
MANIFEST = ROOT / 'src' / 'components' / 'Character' / 'manifest.json'

# --- the key ---------------------------------------------------------------
# The subject is shot against a green screen, and the whole matte is one
# threshold on how far green runs ahead of the stronger of red and blue.
#
# It replaces a polynomial fit of the backdrop plus a hysteresis flood. That
# machinery existed because the first take was shot against a pale grey the
# cream jumper came within ~8 levels of, so no threshold could separate them
# and the edge had to be argued for. It never worked properly: the hair came
# out as a staircase with a pale collar of backdrop still attached to it.
#
# Against green there is nothing to argue about. Measured on this take the two
# populations sit at about -30 and +144 with the histogram empty between 7 and
# 121, so a ramp across 20..105 only ever lands on genuinely mixed pixels — the
# anti-aliased rim the renderer drew, which is exactly what should come out
# part-transparent. On one frame that is 3.4k soft pixels against 214k solid.
KEY = (27.0, 191.0, 47.0)   # the screen, measured off the frame corners
KEY_LO = 20.0               # greenness at or below which a pixel is all subject
KEY_HI = 105.0              # and at or above which it is all screen

# --- output ---------------------------------------------------------------
# EVERY frame of the clip is kept, at full frame rate.
#
# It used to be one contiguous window of 110 of the 240, chosen by how well it
# answered nine directions. The reasoning was that a window is one unbroken
# pass of the recording, so any two of its frames are a plausible pair to walk
# between, whereas the whole clip revisits each direction several times with
# the body in a different place.
#
# What that cost is measurable and it is the reason for this change. Against
# the nine directions, the best 110-window answers looking straight UP at 0.746
# where the full clip answers it at 0.176, straight down at 0.391 against
# 0.218, and down-right at 0.521 against 0.344. Half the recording was being
# thrown away and two of the nine directions went with it.
#
# The objection to keeping everything was real, though, and it needed answering
# rather than ignoring: with all 240 frames the same direction recurs, so the
# nearest-looking frame can be most of the clip away. Simulated against the
# runtime's own walk, sweeping the cursor down the screen made the aim jump 230
# frames, which is 3.8s of walking before the head arrives.
#
# GAZE_NEARNESS is the answer, and it lives in the manifest because the runtime
# is what applies it — see the render loop in CharacterStage.
SPRITE_WIDTH = 400     # px per frame in the sheet
QUALITY = 72
GUTTER = 8
PAD = 16               # source rows replicated below the crop, so the resize
                       # samples the bust instead of the empty gutter
#
# GUTTER is a transparent margin around every pose in the sheet. Without it,
# lossy compression and sub-pixel sampling drag a sliver of the neighbouring
# pose into the window, which reads as a lit rectangle around the character on
# a dark page.
# How much harder the horizontal axis is weighed than the vertical when
# choosing a frame.
#
# 1.0 — they are weighed the same. This was 2.5, to cope with a gaze cloud that
# was L-shaped: the measurement in use then never placed a frame up-and-right,
# so that corner of the cursor plane had to be approximated and leaning on the
# more legible axis was the least bad way to do it. The cloud now covers the
# whole square by construction, every corner has a frame of its own, and there
# is nothing left for the thumb on the scale to buy. Verified either way: at
# 1.0 and at 2.5 the nine directions choose the same nine frames.
GAZE_WEIGHT_X = 1.0

# How much the runtime prefers a frame it can reach soon over one that looks
# more like where the cursor is, as a cost on the distance through the clip.
#
# 0.25, down from 4. The old value existed because the old measurement had the
# clip passing each direction several times, so there was nearly always a frame
# that both looked right AND was close by, and this made the loop take it.
#
# The clip does not do that. It is one pass around the perimeter of the gaze
# square — up-left, up, up-right, right, down-right, down, down-left, left,
# centre — so each direction occurs exactly ONCE and there is no near-equivalent
# to prefer. All a large weight can do now is substitute a frame looking
# somewhere else. Simulated over every pair of nine cursor targets and eight
# starting positions:
#
#             worst gaze error   exact hits
#   4.0             1.414          17/72     <- a whole quadrant wrong
#   1.0             0.708          30/72
#   0.5             0.077          45/72
#   0.25            0.047          61/72
#   0               0.000          72/72
#
# and against the runtime's own walk, 0.25 costs 0.0018 of gaze error at worst
# while bringing the head in sooner than 0 does — 1.46s against 1.60 on average
# and 3.65 against 4.20 at worst. That is the whole of what it is still for.
GAZE_NEARNESS = 0.25

# --- gaze tracking --------------------------------------------------------
# Taken from the choreography, anchored on frames read off the screen by eye.
#
# Every earlier version of this measured the face and every one of them was
# wrong. It read the iris inside a box hung off the eyebrows, which is a
# perfectly sensible way to find where the EYES point inside the head — and
# useless here, because this character looks with its head. Against nine frames
# read by eye the detector correlated +0.63, explaining under half the variance,
# and two attempts to settle its sign disagreed with each other (+0.51, -0.51).
# Pupil-in-frame scored -0.41 and a silhouette yaw +0.21. None of the three was
# good enough to ship, and no amount of tuning a landmark detector on a stylised
# face behind glasses was going to fix that.
#
# So it is not measured any more. The clip was made to a script — one second per
# direction, nine directions, in a known order — and the nine frames below were
# picked off the running site by the person who commissioned it. Eight of the
# nine fall inside the very second the script asked that direction for, and the
# ninth is three frames past its block, which is the character still arriving.
# That agreement between an independent reading and the shooting script is
# stronger evidence than any detector produced.
#
# Anything not an anchor is interpolated between the two anchors either side.
ANCHORS = [
    (0, (0.0, 0.0)),      # the clip opens on centre, per the script
    (47, (-1.0, 1.0)),    # up-left
    (69, (0.0, 1.0)),     # up
    (94, (1.0, 1.0)),     # up-right
    (123, (1.0, 0.0)),    # right
    (132, (1.0, -1.0)),   # down-right
    (147, (0.0, -1.0)),   # down
    (182, (-1.0, -1.0)),  # down-left
    (200, (-1.0, 0.0)),   # left
    (233, (0.0, 0.0)),    # and back to centre
]

# The head, generously — the box the motion between anchors is measured in.
HEAD_BOX = (60, 400, 460, 820)  # y0, y1, x0, x1


def read_gaze(paths):
    """Where each frame looks, interpolated between the anchors above.

    Not linear in the frame number. The character holds a direction and then
    travels to the next one, so spacing the in-between frames evenly by index
    would put a gaze on a still frame that it does not show. What parameterises
    each leg instead is how much the head actually MOVED: the frame-to-frame
    difference inside HEAD_BOX, accumulated. Frames where nothing moves stay
    with their anchor, and the ones during a turn spread across the leg in
    proportion to how far through the turn they are.

    Raw pixels, no landmarks. That is the point — it is the one thing about
    this footage that has never given a wrong answer.
    """
    heads = []
    y0, y1, x0, x1 = HEAD_BOX
    for path in paths:
        im = np.asarray(Image.open(path).convert('L'), dtype=np.float32)
        heads.append(im[y0:y1, x0:x1])

    # How far the head moved into each frame from the one before it.
    move = np.zeros(len(paths), np.float64)
    for i in range(1, len(paths)):
        move[i] = np.abs(heads[i] - heads[i - 1]).mean()
    print(f'  head motion per frame: median {np.median(move[1:]):.2f}, '
          f'peak {move.max():.2f} of 255')

    out = np.zeros((len(paths), 2), np.float64)
    anchors = [a for a in ANCHORS if a[0] < len(paths)]
    for (ia, ga), (ib, gb) in zip(anchors, anchors[1:]):
        leg = move[ia + 1 : ib + 1]
        travelled = np.concatenate([[0.0], np.cumsum(leg)])
        total = travelled[-1]
        # A leg with no movement at all cannot be parameterised by movement;
        # fall back to the frame number, which is what it degenerates to.
        t = travelled / total if total > 0 else np.linspace(0, 1, len(travelled))
        for k, index in enumerate(range(ia, ib + 1)):
            out[index] = [ga[j] + (gb[j] - ga[j]) * t[k] for j in range(2)]
    # Before the first anchor and after the last, hold that anchor's direction:
    # the clip opens and closes on centre and does not move in those frames.
    out[: anchors[0][0]] = anchors[0][1]
    out[anchors[-1][0] :] = anchors[-1][1]
    return out


def run_ffmpeg(dst: Path) -> None:
    exe = shutil.which('ffmpeg') or ''
    if not exe:
        sys.exit('ffmpeg not found on PATH — needed only to regenerate assets.')
    subprocess.run(
        [exe, '-v', 'error', '-i', str(SOURCE), '-vsync', '0', str(dst / 'f%04d.png')],
        check=True,
    )


def key_matte(path):
    """RGB with the screen unmixed out, plus alpha.

    Three steps, and the order matters.

    Alpha first, from greenness — see KEY_LO/KEY_HI. Then spill: the screen
    throws green light onto the subject, so green is pulled back to whatever
    red or blue can justify wherever it runs ahead of both. Then the rim is
    un-mixed: a part-covered pixel is subject*a + screen*(1-a), and solving for
    the subject is what stops the edge carrying a green fringe onto the page.

    The un-mix uses the screen with its own green already suppressed. Using the
    raw screen colour there subtracts a green that the spill pass has just
    removed, which drives the rim magenta.
    """
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    cap = np.maximum(r, b)
    alpha = np.clip((KEY_HI - (g - cap)) / (KEY_HI - KEY_LO), 0.0, 1.0)

    fg = im.copy()
    fg[..., 1] = np.minimum(g, cap)

    screen = np.array(KEY, np.float32)
    screen[1] = max(KEY[0], KEY[2])
    mixed = (alpha > 0.02) & (alpha < 0.98)
    a = alpha[mixed][:, None]
    fg[mixed] = np.clip((fg[mixed] - screen * (1 - a)) / a, 0, 255)

    return fg.astype(np.uint8), (alpha * 255).astype(np.uint8)


# The nine directions the window has to be able to answer, in normalised gaze.
DIRECTIONS = [(-1, 1), (0, 1), (1, 1), (-1, 0), (0, 0), (1, 0), (-1, -1), (0, -1), (1, -1)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--width', type=int, default=SPRITE_WIDTH)
    ap.add_argument('--quality', type=int, default=QUALITY)
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        print('extracting frames…')
        run_ffmpeg(tmp)
        frames = sorted(tmp.glob('*.png'))
        print(f'  {len(frames)} frames')

        print('reading gaze…')
        g = read_gaze(frames)

        # No normalising and no sign to argue about: `read_gaze` already
        # returns the runtime's own convention — x is +1 with the cursor to the
        # viewer's RIGHT, y is +1 with it ABOVE (see useGazeTracking, which
        # negates screen y for exactly this) — and the anchors are written at
        # the extremes, so the range is -1..1 by construction.
        #
        # What used to be here was a normalise followed by a negation whose
        # justification was empirical and, twice, wrong.
        norm_all = g

        idx = list(range(len(frames)))
        print(f'keeping all {len(idx)} frames')
        for (dx, dy), name in zip(DIRECTIONS, (
                'TOP-LEFT', 'TOP-CENTER', 'TOP-RIGHT', 'CENTER-LEFT', 'CENTER',
                'CENTER-RIGHT', 'BOTTOM-LEFT', 'BOTTOM-CENTER', 'BOTTOM-RIGHT')):
            k = int(np.argmin(GAZE_WEIGHT_X * (norm_all[:, 0] - dx) ** 2
                              + (norm_all[:, 1] - dy) ** 2))
            miss = np.hypot((norm_all[k][0] - dx) * GAZE_WEIGHT_X ** 0.5,
                            norm_all[k][1] - dy)
            print(f'  {name:<14} {norm_all[k][0]:+.2f} {norm_all[k][1]:+.2f}   off by {miss:.3f}')

        print('keying…')
        mattes = {i: key_matte(frames[i]) for i in idx}

        # One crop for every frame, so nothing shifts between them.
        x0 = y0 = 10 ** 9
        x1 = y1 = -1
        for _, al in mattes.values():
            ys, xs = np.nonzero(al > 6)
            x0, x1 = min(x0, xs.min()), max(x1, xs.max())
            y0, y1 = min(y0, ys.min()), max(y1, ys.max())
        print(f'  crop x {x0}..{x1}  y {y0}..{y1}')

        pw = args.width                                   # frame, before the gutter
        ph = round((y1 - y0 + 1) * pw / (x1 - x0 + 1))
        cw, ch = pw + GUTTER * 2, ph + GUTTER * 2         # cell, what CSS shows
        # Roughly square sheet: a long thin one wastes more of the browser's
        # maximum texture dimension than it needs to.
        cols = max(1, round((len(idx) * ch / cw) ** 0.5))
        rows = (len(idx) + cols - 1) // cols
        sheet = Image.new('RGBA', (cols * cw, rows * ch), (0, 0, 0, 0))
        pad_h = round(PAD * pw / (x1 - x0 + 1))
        for n, i in enumerate(idx):
            fg, al = mattes[i]
            box = np.dstack([fg, al])[y0:y1 + 1, x0:x1 + 1]
            box = np.vstack([box, np.repeat(box[-1:], PAD, axis=0)])
            tile = Image.fromarray(box, 'RGBA') \
                        .resize((pw, ph + pad_h), Image.LANCZOS) \
                        .crop((0, 0, pw, ph))
            sheet.paste(tile, ((n % cols) * cw + GUTTER, (n // cols) * ch + GUTTER))

        sprite = OUT_DIR / 'frames.webp'
        sheet.save(sprite, 'WEBP', quality=args.quality, method=6)

        # Rescale to what THIS window can actually do. The normalisation above
        # spans the whole clip, but the window is one pass of it and does not
        # reach as far in every direction — here it stops at -0.68 on the left
        # against +1.00 on the right. Left as it was, the cursor's full travel
        # to the left asked for a look the sheet does not contain, and the
        # character simply never got there: it never looked down-left.
        #
        # Each side is scaled on its own, around zero rather than around the
        # range's midpoint, so full deflection reaches the furthest frame there
        # is while a cursor at rest still picks the frame looking straight
        # ahead — recentring on the midpoint would have left it glancing left.
        norm = norm_all[idx].copy()
        for axis in (0, 1):
            for side in (-1, 1):
                on = np.sign(norm[:, axis]) == side
                if not on.any():
                    continue
                reach = np.abs(norm[on, axis]).max()
                if reach > 0:
                    norm[on, axis] /= reach

        # The frame closest to looking straight ahead. Where the character rests,
        # and the only frame a touch device ever needs.
        # The LAST anchor written at dead centre, not the first and not the
        # nearest. Two frames sit at (0, 0) — the clip opens on centre and
        # returns to it — and `argmin` would take the opening one on the tie.
        # The closing one is the settled pose, and it is the frame that was
        # picked by eye as the character looking at the reader, which is what
        # the still is for: it is the whole character on a touch device, and it
        # is what a link preview and a search result show.
        neutral = max(i for i, (x, y) in ANCHORS if x == 0.0 and y == 0.0)

        # A touch device cannot track a cursor, so it never loads the sheet —
        # which is also what keeps the sheet's size off the mobile budget.
        #
        # The filename carries a hash of the bytes, the way Vite names the JS
        # and CSS it emits, and that is not about browser caching: GitHub Pages
        # sends max-age=600 here, so a browser is never more than ten minutes
        # stale. It is about the OTHER caches, the ones with no revalidation and
        # no way to ask.
        #
        # This image is the first thing on the page under mobile-first indexing,
        # which is how Google crawls, so it is the thumbnail beside the search
        # result and the image a chat app unfurls. Those copies live on their
        # servers and refresh on their schedule — weeks, for a site this size.
        # At a fixed `still.webp` there is nothing to tell them the picture
        # changed, and one did stay wrong for exactly that reason. A filename
        # they have never seen has no cached copy to serve.
        n = neutral
        crop = sheet.crop(((n % cols) * cw, (n // cols) * ch,
                           (n % cols) * cw + cw, (n // cols) * ch + ch))
        buffer = io.BytesIO()
        crop.save(buffer, 'WEBP', quality=args.quality + 8, method=6)
        payload = buffer.getvalue()
        still_name = f'still-{hashlib.sha256(payload).hexdigest()[:8]}.webp'
        # Every earlier still goes. They are unreachable once the manifest names
        # the new one, and leaving them would publish a growing pile of stale
        # portraits that a crawler is perfectly able to find and index.
        for stale in OUT_DIR.glob('still*.webp'):
            stale.unlink()
        still = OUT_DIR / still_name
        still.write_bytes(payload)

        manifest = {
            'sprite': 'frames.webp',
            'still': still_name,
            'frameWidth': cw,
            'frameHeight': ch,
            'columns': cols,
            'rows': rows,
            'count': len(idx),
            'neutral': neutral,
            'gazeWeightX': GAZE_WEIGHT_X,
            'gazeNearness': GAZE_NEARNESS,
            'gaze': [[round(float(a), 4), round(float(b), 4)] for a, b in norm],
            'source': 'images/final-chroma.mp4',
        }
        MANIFEST.parent.mkdir(parents=True, exist_ok=True)
        MANIFEST.write_text(json.dumps(manifest))

        mp = cols * cw * rows * ch / 1e6
        print(f'wrote {sprite.relative_to(ROOT)}  {sprite.stat().st_size / 1024:.0f} KB  '
              f'({cols}x{rows} cells of {cw}x{ch}, frame {pw}x{ph}, {mp:.1f} MP)')
        print(f'wrote {still.relative_to(ROOT)}  {still.stat().st_size / 1024:.0f} KB  '
              f'(frame {neutral})')
        print(f'wrote {MANIFEST.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
