#!/usr/bin/env python3
"""Turn public/images/final.mp4 into the hero character's frame sheet.

Run this only to regenerate the assets; the output is committed, so a normal
checkout needs none of these tools.

    pip install pillow numpy scipy
    python3 scripts/build-character.py            # needs ffmpeg on PATH

Output:
    public/character/frames.webp                 the clip, in order, one sheet
    public/character/still.webp                  one frame, for touch devices
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
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

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
# The gaze cloud is L-shaped: the subject never looks up-and-right, so that
# corner of the cursor plane has to be approximated. Weighing both axes equally
# lands on an up-LEFT frame there, which reads as looking the wrong way.
# Horizontal gaze is much more legible than vertical, so the runtime weights x
# harder and lets the vertical give. Shipped in the manifest, applied there.
GAZE_WEIGHT_X = 2.5

# How much the runtime prefers a frame it can reach soon over one that looks
# very slightly more like where the cursor is, as a cost on the distance
# through the clip, normalised by the clip's length.
#
# Needed only because every frame is kept — see the note above. The recording
# passes each direction several times, so there is almost always a frame that
# both looks right AND is close by; this is what makes the runtime take it.
#
# 4 was chosen by simulating the runtime's actual loop against nine cursor
# targets from four starting positions. Time for the head to arrive, and how
# far it lands from the direction asked for:
#
#                         arrives (avg)   arrives (worst)   gaze error
#   110-frame window            1.11s            2.13s          0.356
#   all 240, no nearness        1.70s            2.98s          0.332
#   all 240, nearness 2         1.06s            2.98s          0.305
#   all 240, nearness 4         0.92s            2.05s          0.332
#   all 240, nearness 16        0.74s            1.82s          0.424
#
# 4 is the last value that is better than the shipping window on every column
# at once. Past it the head arrives sooner by settling for a frame that is
# visibly looking somewhere else.
GAZE_NEARNESS = 4.0

# --- gaze tracking --------------------------------------------------------
# Measured out from the EYEBROWS, not at fixed pixel coordinates.
#
# The earlier version read a fixed box and called the darkest mass in it the
# pupil. Two things were wrong with that. The head drifts and changes scale
# through the take, so the box slides off the eyes and the slide is read as
# gaze; and the brow is both darker and larger than the iris, so what the box
# actually measured, in most frames, was the eyebrow. Overlaying the detections
# on the source shows the markers sitting on the brows, not the eyes.
#
# Anchoring on the brow pair fixes both. The brows are the most reliable dark
# landmark on this face, they move with the head, and the distance between them
# gives the scale, so the eye boxes follow the head and every measurement can be
# expressed in units of that distance instead of pixels.
FACE_BOX = (120, 360, 480, 900)  # y0, y1, x0, x1: holds the face in every frame
BROW_SIGMAS = (7, 9, 11)         # blob widths tried when hunting for the brows
BROW_LEVEL = 14                  # px a brow pair may sit out of level
BROW_GAP = (55, 130)             # px: any plausible distance between the brows
BROW_TOLERANCE = 0.18            # how far a frame may sit from the take's median
EYE_TOP = 0.10                   # eye box top, below the brow, in gap units
EYE_SIZE = 0.62                  # eye box side, in gap units
IRIS_DARK = 120                  # luminance below which a pixel counts as iris
IRIS_FILL = (0.12, 0.62)         # share of the eye box that may be dark; outside
                                 # it the eye is shut or the box has slipped off
# How far a frame may sit from what its neighbours say, in eye-box fractions.
# Eyes cannot cross the whole socket and come back inside one 24fps frame, so a
# reading that disagrees with the frames either side is a misdetection, not a
# movement. Worth doing even though the checks above catch most of it: two
# frames slipped through into the first build and one of them, measured off a
# brow the search had lost, became the sheet's furthest-UP frame — so every
# cursor at the top of the page chose a frame picked by a bad measurement.
# 0.05 sits between the 90th and 97th percentile of the deviation, and throws
# out 19 of 240, the half-blinks among them.
GAZE_JUMP = 0.05


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


def _blobs(lum):
    """Dark blobs in the face box, over a few sizes."""
    y0, y1, x0, x1 = FACE_BOX
    sub = lum[y0:y1, x0:x1]
    found = []
    for sigma in BROW_SIGMAS:
        # Scale-normalised Laplacian of Gaussian: peaks on dark blobs about
        # sigma wide, whatever the surrounding skin happens to be lit to.
        resp = ndi.gaussian_laplace(sub, sigma) * sigma ** 2
        lab, n = ndi.label(resp > np.percentile(resp, 99.3))
        for k in range(1, n + 1):
            m = lab == k
            if m.sum() < 25:
                continue
            cy, cx = ndi.center_of_mass(m)
            found.append((cx + x0, cy + y0))
    return found


def _brows(blobs, gap_lo, gap_hi):
    """The brow pair: the HIGHEST two blobs sitting level and a face apart.
    Highest, because the only other pair that fits the description is the eyes,
    and they are always lower."""
    best = None
    for i in range(len(blobs)):
        for j in range(i + 1, len(blobs)):
            (xi, yi), (xj, yj) = blobs[i], blobs[j]
            if abs(yi - yj) > BROW_LEVEL or not gap_lo < abs(xi - xj) < gap_hi:
                continue
            height = (yi + yj) / 2
            if best is None or height < best[0]:
                left, right = sorted((blobs[i], blobs[j]))
                best = (height, left, right)
    return None if best is None else (best[1], best[2])


def _iris(lum, brow, gap):
    """Where the iris sits inside its own eye box, as a fraction of that box.

    The box hangs off the brow and is sized by the brow gap, so this says where
    the eye points within the head — which is the signal — rather than where the
    head happens to be in frame, which is not."""
    side = gap * EYE_SIZE
    x0 = int(brow[0] - side / 2)
    y0 = int(brow[1] + gap * EYE_TOP)
    sub = lum[y0:int(y0 + side), x0:int(x0 + side)]
    if sub.size == 0:
        return None
    m = sub < IRIS_DARK
    fill = m.sum() / sub.size
    if not IRIS_FILL[0] < fill < IRIS_FILL[1]:
        return None            # blinked, or the box has slid off the eye
    ys, xs = np.nonzero(m)
    w = (IRIS_DARK - sub[ys, xs]).clip(1)
    return (xs * w).sum() / w.sum() / side, (ys * w).sum() / w.sum() / side


def read_gaze(paths):
    """Where each frame looks, in units of the distance between the brows.

    Two passes over the clip. The first learns how far apart the brows sit in
    this take; the second measures again holding the gap near that, which is
    what keeps the search off the hair and the glasses. Blinks are filled in
    from the frames either side rather than dropped, so the result stays one
    reading per source frame."""
    lums = [np.asarray(Image.open(p).convert('L')).astype(np.float32) for p in paths]
    blobs = [_blobs(l) for l in lums]

    loose = [_brows(b, *BROW_GAP) for b in blobs]
    spans = [r[1][0] - r[0][0] for r in loose if r]
    if not spans:
        sys.exit('no eyebrows found — check FACE_BOX against the source.')
    median = float(np.median(spans))
    lo, hi = median * (1 - BROW_TOLERANCE), median * (1 + BROW_TOLERANCE)
    print(f'  brows sit {median:.0f}px apart; holding the gap to {lo:.0f}..{hi:.0f}')

    pairs = [_brows(b, lo, hi) or loose[i] for i, b in enumerate(blobs)]
    anchors = np.array([[np.nan] * 4 if p is None
                        else [p[0][0], p[0][1], p[1][0], p[1][1]] for p in pairs])
    where = np.arange(len(paths))
    for axis in range(4):
        col = anchors[:, axis]
        seen = np.nonzero(~np.isnan(col))[0]
        if not len(seen):
            sys.exit('no eyebrows found — check FACE_BOX against the source.')
        col = np.interp(where, seen, col[seen])
        # The head moves smoothly, so a frame that disagrees with its
        # neighbours is a misdetection rather than a movement.
        anchors[:, axis] = ndi.median_filter(col, size=5, mode='nearest')

    out = np.full((len(paths), 2), np.nan)
    for i, lum in enumerate(lums):
        lx, ly, rx, ry = anchors[i]
        gap = rx - lx
        eyes = [e for e in (_iris(lum, (lx, ly), gap), _iris(lum, (rx, ry), gap)) if e]
        if eyes:
            out[i] = np.mean(eyes, axis=0) - 0.5      # centre of the box is 0

    blind = np.isnan(out[:, 0])
    if blind.all():
        sys.exit('no eyes found — check FACE_BOX against the source.')

    def fill(mask):
        seen = np.nonzero(~mask)[0]
        for axis in range(2):
            out[:, axis] = np.interp(where, seen, out[seen, axis])

    fill(blind)
    # Now that there is a reading for every frame, throw out the ones the rest
    # of the clip disagrees with, and fill those in the same way.
    smooth = np.stack([ndi.median_filter(out[:, k], size=5, mode='nearest')
                       for k in range(2)], axis=1)
    stray = np.hypot(*(out - smooth).T) > GAZE_JUMP
    fill(blind | stray)
    print(f'  {int(blind.sum())} unreadable and {int(stray.sum())} stray frame(s), '
          'filled from their neighbours')
    return out


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

        # Normalise to -1..1 across the WHOLE clip, before choosing the window,
        # so the window is judged against the full range the subject ever
        # reaches rather than against its own.
        lo, hi = g.min(0), g.max(0)
        mid, half = (lo + hi) / 2, (hi - lo) / 2
        norm_all = (g - mid) / half
        norm_all[:, 1] *= -1      # image y grows downward; up should be +1

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
        neutral = int(np.argmin(GAZE_WEIGHT_X * norm[:, 0] ** 2 + norm[:, 1] ** 2))

        # A touch device cannot track a cursor, so it never loads the sheet —
        # which is also what keeps the sheet's size off the mobile budget.
        still = OUT_DIR / 'still.webp'
        n = neutral
        sheet.crop(((n % cols) * cw, (n // cols) * ch,
                    (n % cols) * cw + cw, (n // cols) * ch + ch)) \
             .save(still, 'WEBP', quality=args.quality + 8, method=6)

        manifest = {
            'sprite': 'frames.webp',
            'still': 'still.webp',
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
