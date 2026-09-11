/**
 * ===========================================================================
 * Character tuning — everything adjustable lives here
 * ===========================================================================
 *
 * The character is the whole of `source-media/final-chroma.mp4`, kept as a
 * sheet of frames in filming order (`scripts/build-character.py`). The cursor
 * does not pick a picture: it picks a position in that recording, and the
 * runtime walks there one frame at a time, so what plays is recorded movement.
 *
 * Every frame is kept. It used to be one unbroken 110-frame window of the 240,
 * because sampling the whole clip means the same direction recurs and the aim
 * can jump between those recurrences — the head sets off the wrong way and
 * comes back. What that window cost was two of the nine directions: straight up
 * and straight down only exist outside it. Keeping everything and adding a
 * nearness term to the aim (GAZE_NEARNESS, in the manifest) answers the
 * recurrence problem instead of avoiding it, and measured, it tracks both
 * faster and closer than the window did.
 */

/** How far the pointer has to travel for the gaze to reach its extreme, as a
 *  fraction of the room between the character's centre and the viewport edge it
 *  is heading for. 1 = full deflection exactly at the edge; smaller = the
 *  character looks all the way over sooner and then holds.
 *
 *  Measuring per side rather than in viewport widths is what keeps left and
 *  right symmetric even though the character sits right of centre. */
export const SENSITIVITY = {
  /** Horizontal reach. 0.85 ≈ maxed out 85% of the way to the edge. */
  x: 0.85,
  /** Vertical reach. Tighter, because a head nods less than it turns. */
  y: 0.7,
}

/** Nothing happens while the pointer is this close to the character's centre,
 *  as a fraction of the reach above. Stops the character drifting when the
 *  cursor is parked. */
export const DEAD_ZONE = 0.1

/** How quickly the aimed-at gaze catches up to the pointer. Higher is more
 *  immediate, lower is more languid. Frame-rate independent: this is the
 *  exponential rate, not a per-frame fraction. */
export const SMOOTHING = 7.5

/** Gaze is clamped to this before the clip position is chosen, so a cursor at
 *  the far edge of a wide monitor reads the same as one just outside the reach. */
export const MAX_GAZE = 1

/** How quickly the character sets off towards the frame it is aiming for.
 *  Same exponential rate as SMOOTHING, applied to position in the clip. */
export const FOLLOW = 6

/**
 * Where the clip is cut so its two ends can be joined — the seam of the ring.
 *
 * The recording opens looking straight ahead and ends looking straight ahead,
 * which is what lets the walk treat it as a loop rather than a strip (see
 * CharacterStage). But "the same pose" is not the same picture: between the
 * last frame and the first, the head sits a little differently, and joining
 * them at 239 → 0 made a step 3.6 times the size of an ordinary one — and 1.75
 * times the largest step the recording contains anywhere. Measured on the
 * frames themselves, weighted by how much each pixel moves across the clip, so
 * the jumper that never moves does not dilute the head that does.
 *
 * These two are the pair that joins most quietly, out of every pair of ends
 * that still leaves a frame looking straight ahead: 11.68 against an average
 * step of 6.26 and a largest step of 12.80. Restricted to the head, where the
 * eye actually goes, it comes to 1.83 against an average of 2.59 — the join is
 * quieter than an ordinary step of the clip.
 *
 * It costs 33 frames: 20 off the front, 13 off the back, all of them within a
 * whisker of straight ahead. Every one of the nine directions is between them,
 * and the ring is 207 frames rather than 240, so the longest walk is shorter
 * too.
 *
 * To find them again after a re-cut: take every pair (last, first) near the
 * ends, composite each frame on its own alpha, and score the pair by the mean
 * absolute difference weighted by the per-pixel variance across all frames.
 */
export const CLIP = {
  /** First frame of the ring. */
  first: 20,
  /** Last frame, which joins back to the first. */
  last: 226,
}

/**
 * Ceiling on how fast the clip is allowed to run, in frames per second.
 *
 * The sheet holds the recording at its own frame rate, so 24 is life speed.
 * Above about 60 the walk starts skipping frames on a 60 Hz screen and the
 * point of all this is lost; well below 24 it feels underwater.
 *
 * 60, then: the most that still shows every frame on a 60 Hz screen. That is a
 * ceiling and not a dial, so anything faster has to come from the walk being
 * shorter rather than quicker — which is what joining the clip's two ends into
 * a ring does (see CharacterStage). Nothing is further than half of the 240
 * frames now, so the longest walk there is takes two seconds rather than four.
 */
export const MAX_TRAVEL = 60

/** Size and placement inside the hero, straight into CSS. Nothing here moves at
 *  runtime — the character is physically fixed and only the frame changes. */
export const LAYOUT = {
  /** Width of the character relative to its column. */
  width: '100%',
  /** Largest it is ever drawn, so it stays crisp: the source caps out here. */
  maxWidth: '30rem',
  /** Nudge within the stage, e.g. '0px' / '-1.5rem'. */
  offsetX: '0px',
  offsetY: '0px',
  /** Shrink on small screens, where the hero stacks. */
  mobileMaxWidth: '17rem',
}

/**
 * How long the character rests between takes of the idle clip, in seconds.
 *
 * The idle is 5.9s and its last frame is not its first: measured, the wrap is
 * about twenty times a normal frame-to-frame step — a small settle of the head
 * rather than a change of pose. Played back to back that settle would repeat
 * every six seconds and become the thing you notice, so the rest between takes
 * is what the loop is really made of, and it is randomised so the rhythm never
 * becomes predictable.
 *
 * The reduced-motion pair is longer rather than absent, the same rule the rest
 * of the project follows: an idle character that never moves at all reads as a
 * broken video, not as a considerate one. It stays three times the base pair,
 * so shortening one shortens the other.
 *
 * Was 10-15. At a 5.9s take that put the character in motion about a third of
 * the time; at 7-11 it is closer to two fifths, which is the same rhythm with
 * less waiting in it.
 *
 * The rest is spent on the take that just finished, and the dissolve to the
 * next one is scheduled for its last CLIP_FADE, so the fade lands as the next
 * take begins. Keep this comfortably above CLIP_FADE: the dissolve is clamped
 * to start no earlier than the rest does, so a rest shorter than a fade turns
 * into a clip fading in while it is already playing.
 */
export const IDLE_REST = {
  min: 7,
  max: 11,
  reducedMin: 21,
  reducedMax: 33,
}

/**
 * How long one clip dissolves into another, in milliseconds.
 *
 * One number for every swap, and one number driving both halves of each swap:
 * the clip arriving fades over this, and the clip leaving holds at full opacity
 * for exactly this long before it starts to go. That is what keeps the box
 * covered at every instant — two clips fading in opposite directions do not add
 * up to one in the middle, and measured, the gap that opened let 24.6% of the
 * page through. Tie the two halves to separate numbers and the flash comes back
 * the moment they drift apart.
 *
 * Two seconds is long for a crossfade, and deliberately so. The two clips were
 * graded apart — the idle's skin came 7.2% darker than the wave's, and even
 * corrected, a residue survives that a quick cut hands to the eye all at once.
 * Stretched this far the change arrives below the threshold of being noticed.
 *
 * It costs the first half of a tapped wave, which spends it dissolving in. That
 * is affordable because of where the gesture sits: the hand is raised from
 * 0.17s to 3.84s of the 4.01s clip and peaks at 2.51s, so the fade is over
 * before the moment worth seeing.
 */
export const CLIP_FADE = 2000

/**
 * The tap combination that plays the smile clip.
 *
 * A single tap already replays the greeting, and that must not get slower to
 * make room for this: the first tap starts the wave exactly as it always did,
 * and the fifth inside the window takes over from it. Waiting to see whether
 * more taps were coming would have put a delay on the common gesture to serve
 * the rare one.
 *
 * Five taps in 1.5s is 3.3 a second — brisk enough that nobody arrives at it by
 * tapping twice to replay the wave, slow enough to be doable with one thumb.
 * The window rolls: what counts is five taps inside any 1.5s, not five from a
 * standing start.
 */
export const SMILE_COMBO = {
  taps: 5,
  windowMs: 1500,
}

/**
 * How long to wait for the smile clip to arrive before giving up on it.
 *
 * It is the one clip that is not preloaded — 2.3 MB for something almost nobody
 * triggers — so the first play has to fetch it, and nothing is revealed until
 * there is a frame to reveal. Ten seconds is long for a file this size and
 * that is the point: it is a backstop for a fetch that died, not a deadline.
 */
export const SMILE_TIMEOUT = 10000
