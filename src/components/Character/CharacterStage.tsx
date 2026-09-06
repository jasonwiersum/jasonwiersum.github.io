import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { announceGreetingDone } from '../../hooks/useGreeting'
import { useLanguage } from '../../hooks/useLanguage'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'
import {
  CLIP_FADE,
  FOLLOW,
  IDLE_REST,
  LAYOUT,
  MAX_TRAVEL,
  SMILE_COMBO,
  SMILE_TIMEOUT,
} from './characterConfig'
import manifest from './manifest.json'
import { useGazeTracking, type Gaze } from './useGazeTracking'
import './character.css'

const SHEET = `${import.meta.env.BASE_URL}character/${manifest.sprite}`
const STILL = `${import.meta.env.BASE_URL}character/${manifest.still}`
/** Touch devices get a wave instead of tracking. Not built by the pipeline —
 *  drop the file in and it is used; if it is not there, the still is. */
const WAVE = `${import.meta.env.BASE_URL}character/wave.mp4`
/** The resting loop the character falls into once the greeting is over. Same
 *  framing as the wave — measured, the head sits at 49.2% of the width against
 *  the wave's 49.1% — so the two share a box and a crop. */
const IDLE = `${import.meta.env.BASE_URL}character/idle.mp4`
/** The easter egg: five quick taps and the character smiles, once. Same shot as
 *  the wave — 1280x720, and measured, the head sits at 48.97% of the width
 *  against the wave's 48.97% and the idle's 49.0-49.2% — so it shares their box,
 *  their crop and their dissolve without a value of its own. */
const SMILE = `${import.meta.env.BASE_URL}character/smile.mp4`
/** The other half of the resting loop. Takes alternate between this and the
 *  idle, so the character is never watched doing the same thing twice running.
 *  Same shot as the rest — measured, the head sits at 49.62% of the width
 *  against the idle's 49.64% — so it shares their box and crop. */
const COFFEE = `${import.meta.env.BASE_URL}character/coffee.mp4`
/** The third take. Same shot as the rest — measured, the head sits within a
 *  fifth of a percent of the others' — so it shares their box and crop too. */
const YAWN = `${import.meta.env.BASE_URL}character/yawn.mp4`
/**
 * The resting cycle, in order: a take, a rest, the next take, and round again.
 *
 * One <video> per clip rather than two elements passing three sources between
 * them. Swapping `src` on an element throws away exactly the thing the spare
 * has to prove before anything is handed to it — that it has decoded a frame
 * and can paint — so every hand-over would have to prove it again, and the
 * proof is a play/pause round trip. Three elements keep one proof each.
 *
 * Measured on the composited crop, the two seams this order adds are the best
 * in the set: coffee's last frame to yawn's first is 1.81 of 255, which is
 * inside coffee's own frame-to-frame step of 1.74, and yawn's last to the
 * idle's first is 4.00, against 4.30 for the greeting hand-over that was
 * called perfect.
 */
const LOOP = [IDLE, COFFEE, YAWN]

/** Gaze of every frame, flattened — read once per animation frame, so the pair
 *  of numbers should be adjacent in memory rather than behind two lookups. */
const GAZE = Float32Array.from(manifest.gaze.flat())
const COUNT = manifest.count
const WEIGHT_X = manifest.gazeWeightX

/** Whether this device has a pointer that can be followed at all. Read once:
 *  a machine does not grow a mouse mid-session, and if one is plugged in the
 *  page it changes is the next one. */
function hasFinePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches
}

/**
 * The hero character.
 *
 * The sheet is the clip in order, not a set of poses, and that is the whole
 * design: the cursor chooses a *position in the clip*, and this walks there one
 * frame at a time. Every step is therefore two frames that were filmed next to
 * each other, so what plays is recorded movement — the head turning, not a cut
 * from one picture to another.
 *
 * An earlier version kept 36 poses chosen for how different they looked and
 * jumped straight to the best match. Adjacent frames of the clip differ by
 * about 1.6/255; poses picked that way differ by about 10, and that difference
 * is exactly what read as a slideshow.
 *
 * The sheet never crossfades. Two of its frames are never mixed, so there is no
 * ghosting — the smoothness comes from the steps being small, not from
 * blending. (The two video clips a touch device gets do dissolve into each
 * other; that is a different problem, and the note is on them.)
 *
 * The character itself never moves, scales or rotates; only the frame changes,
 * as a `translate3d` the compositor handles without repainting. React does not
 * re-render while the cursor moves.
 */
export function CharacterStage() {
  const { t } = useLanguage()
  const stage = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLImageElement>(null)
  /** Position in the clip. Continuous, so it can be eased; the frame shown is
   *  this rounded. */
  const position = useRef(manifest.neutral)
  const shown = useRef(-1)
  const [ready, setReady] = useState(false)
  const [wavePlaying, setWavePlaying] = useState(false)
  const [waveBroken, setWaveBroken] = useState(false)
  const [waveSettled, setWaveSettled] = useState(false)
  const waveNode = useRef<HTMLVideoElement | null>(null)

  /**
   * What the character is doing.
   *
   * `greeting` is the wave on arrival, `wave` the same clip played again on a
   * tap; both show the wave element, which is why they are not one state — the
   * greeting announces itself to the rest of the page and a replay does not.
   * `idle` covers the resting clip both while it runs and while it holds on its
   * last frame between takes, because those look identical and differ only in
   * whether a timer is pending. `smile` is the easter egg, which suspends the
   * idle cycle for its one play and hands straight back to it.
   */
  const [phase, setPhase] = useState<'greeting' | 'idle' | 'wave' | 'smile'>(
    'greeting',
  )
  /** The greeting is over, so a tap on the character means something. */
  const [greetingOver, setGreetingOver] = useState(false)
  const [idleBroken, setIdleBroken] = useState(false)
  /**
   * The resting loop's two layers, and everything that keeps the second one
   * from being able to break the character.
   *
   * They hold different clips — slot 0 the idle, slot 1 the coffee — and takes
   * alternate between them, so every swap dissolves two shots that already line
   * up rather than cutting. Measured on the composited crops, mean absolute
   * difference of 255: the idle's last frame to the coffee's first is 3.99, the
   * coffee's last to the idle's first is 3.13, and neither has a better opening
   * frame to start from — searched frame by frame, the coffee's own frame 0
   * wins both ways. The seams already shipping run 2.75 to 4.09.
   *
   * The pair predates the coffee: it was two copies of the idle, dissolving the
   * idle's own wrap, because that clip does not loop into itself — last frame
   * 2.24 from first, seventeen normal frame steps, no clean loop point anywhere
   * in it. Alternating clips retires that problem instead of solving it, since
   * the idle no longer follows itself. The count of video elements is unchanged.
   *
   * An <img> of the frame was tried first and measured worse than the problem:
   * painting a LOSSLESS image of a frame instead of the video's own differs by
   * 2.57, ten times more on edges than on flat areas, because the browser
   * resamples video and images through different filters. Two videos go through
   * one path, so they match.
   *
   * A first attempt at this shipped and left the frame white, twice over, and
   * both guards below are that failure:
   *
   *   `spareDead` — an error on the spare used to call setIdleBroken, which
   *   unmounts BOTH layers. With the phase still `idle` the container kept its
   *   pale ground with nothing to draw on it. Only the primary can retire the
   *   character now; the spare can only retire itself.
   *
   *   `spareReady` — the spare had never played, and Safari on iOS does not
   *   reliably paint a video that has not. Nothing hands over to a layer that
   *   has not proved it can paint: it is played and paused first, and only a
   *   round trip that actually resolves sets this.
   *
   * With both, the worst case is the wrap staying a cut, which is where this
   * started. It is never a blank frame.
   */
  const loopNodes = useRef<Array<HTMLVideoElement | null>>(LOOP.map(() => null))
  /** Which layer is showing. The ref is what callbacks read, the state is what
   *  the render needs, and they are always set together. */
  const [loopSlot, setLoopSlot] = useState(0)
  const loopSlotRef = useRef(0)
  /** Per slot now that there are three of them: one clip proving it can paint,
   *  or failing to load, says nothing about the next. */
  const spareReady = useRef<boolean[]>(LOOP.map(() => false))
  const spareDead = useRef<boolean[]>(LOOP.map(() => false))
  const [smileBroken, setSmileBroken] = useState(false)
  const smileNode = useRef<HTMLVideoElement | null>(null)
  /** When each of the last few taps landed, oldest first. */
  const taps = useRef<number[]>([])
  /** Holds the smile on its first frame while the idle dissolves off it, and
   *  the backstop on fetching a clip that is deliberately not preloaded. */
  const smileStartTimer = useRef<number | undefined>(undefined)
  const smileWaitTimer = useRef<number | undefined>(undefined)
  /** A tap arrived mid-take. The wave waits for the idle to finish. */
  const waveQueued = useRef(false)
  /** The combo landed while a clip was running. The smile waits for it. */
  const smileQueued = useRef(false)
  /**
   * Which layer the smile is sitting on, because it is not always the idle.
   *
   * A combo during the wave cuts straight to the smile rather than waiting, so
   * whatever is showing has to stay opaque underneath it — the idle if it was
   * resting, the wave if it was mid-gesture. Get this wrong and the smile fades
   * in over a layer that is fading out beneath it.
   */
  const smileOver = useRef<'idle' | 'wave'>('idle')
  const restTimer = useRef<number | undefined>(undefined)
  /** Holds the replayed wave on its first frame until the idle has dissolved
   *  off it. */
  const waveStartTimer = useRef<number | undefined>(undefined)
  /** Whether the idle clip is actually running, as opposed to holding its last
   *  frame. A tap during the hold has nothing to wait for. */
  const idleRunning = useRef(false)
  const reduced = usePrefersReducedMotion()

  /**
   * Reveal the wave once it has a frame to show.
   *
   * Not an `onCanPlay` prop: with `autoPlay` and `preload="auto"` a small file
   * can be ready before React has finished attaching listeners, and the event
   * is then simply missed — the video played through to the end while still at
   * opacity 0. Reading `readyState` catches that case, and the listener covers
   * the ordinary one.
   */
  const attachWave = useCallback((node: HTMLVideoElement | null) => {
    waveNode.current = node
    if (!node) return
    // Failure races the listener in exactly the same way readiness does, and
    // loses in the same place: an unsupported codec or a missing file is
    // settled before React attaches `onError`, so the element sits there
    // already broken with nobody told. Read the state rather than wait to be
    // informed of it — otherwise the page spends the full backstop waiting for
    // a greeting that was never going to happen.
    if (node.error || node.networkState === node.NETWORK_NO_SOURCE) {
      setWaveBroken(true)
      return
    }
    if (node.readyState >= 2) {
      setWavePlaying(true)
      return
    }
    const onReady = () => setWavePlaying(true)
    const onFail = () => setWaveBroken(true)
    node.addEventListener('loadeddata', onReady, { once: true })
    node.addEventListener('error', onFail, { once: true })
  }, [])

  /** Watch the idle for a file that is missing or cannot be decoded, the same
   *  way the wave is watched and for the same reason: the failure is often
   *  settled before React attaches `onError`. */
  const attachIdle = useCallback(
    (slot: number) => (node: HTMLVideoElement | null) => {
      loopNodes.current[slot] = node
      if (!node) return
      // Only slot 0 can declare the idle broken. A spare that cannot load is a
      // wrap that stays a cut, not a character that disappears.
      const fail = () => {
        if (slot === 0) setIdleBroken(true)
        else spareDead.current[slot] = true
      }
      if (node.error || node.networkState === node.NETWORK_NO_SOURCE) {
        fail()
        return
      }
      node.addEventListener('error', fail, { once: true })
    },
    [],
  )

  /**
   * The smile is watched differently from the other two, because it is the one
   * clip that is not preloaded.
   *
   * `preload="none"` means the element sits at NETWORK_EMPTY with no source
   * fetched, which is indistinguishable from a file that is missing — so unlike
   * the wave and the idle there is nothing to read synchronously here, and the
   * only honest signal is a fetch that has actually been attempted and failed.
   * That check lives in `playSmile`.
   */
  const attachSmile = useCallback((node: HTMLVideoElement | null) => {
    smileNode.current = node
    if (!node) return
    node.addEventListener('error', () => setSmileBroken(true), { once: true })
  }, [])

  /**
   * The rest between takes, and the take after it.
   *
   * These two call each other, so one of them has to be reachable through a ref
   * — a plain pair of `useCallback`s cannot close over each other. The timer
   * reads the latest `startIdle` at the moment it fires rather than the one that
   * existed when it was set, which also means a change of motion preference
   * takes effect on the next rest rather than being baked in at mount.
   */
  const startIdleRef = useRef<() => void>(() => {})

  const rest = useCallback(() => {
    const min = reduced ? IDLE_REST.reducedMin : IDLE_REST.min
    const max = reduced ? IDLE_REST.reducedMax : IDLE_REST.max
    const wait = (min + Math.random() * (max - min)) * 1000
    window.clearTimeout(restTimer.current)
    restTimer.current = window.setTimeout(() => startIdleRef.current(), wait)
  }, [reduced])

  const startIdle = useCallback(() => {
    const node = loopNodes.current[loopSlotRef.current]
    if (!node) return
    setPhase('idle')
    // Usually a no-op: a hand-over at the end of the last take left this layer
    // parked here, which is the point — the take begins on the frame already
    // showing. It still matters when the hand-over did not happen, and then
    // this is the old cut, which is the fallback rather than the design.
    if (node.currentTime !== 0) node.currentTime = 0
    idleRunning.current = true

    // Start pulling the other half of the loop down now, with a take and a rest
    // still to run before it is wanted. Nothing depends on it arriving: if it
    // has not, the hand-over does not happen and the same clip plays again.
    const other = loopNodes.current[(loopSlotRef.current + 1) % LOOP.length]
    if (other && other.preload === 'none' && !other.error) {
      other.preload = 'auto'
      other.load()
    }
    const started = node.play()
    // A refusal is not fatal here: the character simply keeps holding its last
    // frame and the next rest tries again.
    if (started) {
      started.catch(() => {
        idleRunning.current = false
        rest()
      })
    }
  }, [rest])

  useEffect(() => {
    startIdleRef.current = startIdle
  }, [startIdle])

  /**
   * A take has finished and nothing is waiting on it: dissolve the wrap.
   *
   * The spare has to prove it can paint before anything is handed to it, and
   * playing it is the only proof there is — a loaded video that has never run
   * is exactly the case Safari does not reliably draw. So it is played and
   * paused at opacity 0, under the layer still showing, and the swap happens
   * only if that round trip resolves. Every way this can fail ends in the same
   * place: no swap, and `startIdle` cuts back to frame 0 as it always did.
   */
  const handOverLoop = useCallback(async () => {
    // Walk forward through the cycle rather than stopping at the first clip
    // that is not ready. With two of them the only alternative to the next one
    // was staying put; with three, a yawn that has not arrived should hand to
    // the idle rather than making the coffee follow itself. The loop runs at
    // most once per other clip, so a cycle where nothing else is ready ends
    // where it started.
    const from = loopSlotRef.current
    for (let step = 1; step < LOOP.length; step += 1) {
      const next = (from + step) % LOOP.length
      if (spareDead.current[next]) continue
      const node = loopNodes.current[next]
      if (!node || node.error || node.readyState < 2) continue

      if (!spareReady.current[next]) {
        try {
          const started = node.play()
          if (started) await started
          node.pause()
          // videoWidth only becomes non-zero once a frame has been decoded, so
          // this is the difference between "loaded" and "has something to
          // draw".
          if (node.videoWidth > 0) spareReady.current[next] = true
        } catch {
          continue
        }
        if (!spareReady.current[next]) continue
      }

      node.pause()
      if (node.currentTime !== 0) node.currentTime = 0
      loopSlotRef.current = next
      setLoopSlot(next)
      return
    }
  }, [])

  /**
   * Put the idle back on its opening frame before a dissolve leaves it.
   *
   * Both outgoing dissolves used to depart from wherever the take had ended,
   * and that is what the small jump was. The head drifts through a take and is
   * furthest from where the other two clips open at the moment the take
   * finishes: measured on the composited crops, the idle's LAST frame sits 4.87
   * of 255 from the wave's first and 4.08 from the smile's, while its FIRST
   * frame sits at 4.00 and 3.19. The seams that read as perfect — the greeting
   * handing over to the idle, and the smile handing back — are 3.24 and 3.12,
   * so 3.19 is inside that band and 4.87 is plainly outside it.
   *
   * Nothing else was available. Searched frame by frame, neither clip has an
   * opening frame that matches the idle's end better than its own frame 0
   * (best gains: 0.40 and 0.23, and 0.00 and 0.05 against the idle's start),
   * head size and position agree across all three to within 1.6%, and the
   * global grade difference is 1.52 at worst. The departure frame is the whole
   * of the lever.
   *
   * The step back to frame 0 is the idle's own wrap, 2.75 — the smallest seam
   * in the set, and the same one the loop already makes at the start of every
   * take.
   */
  const rewindIdle = useCallback(() => {
    const node = loopNodes.current[loopSlotRef.current]
    if (!node) return
    node.pause()
    idleRunning.current = false
    if (node.currentTime !== 0) node.currentTime = 0
  }, [])

  /**
   * Wave again, on a tap inside the frame.
   *
   * `play()` can be refused — a phone that has decided this page may not start
   * media, say — and rather than leave the character stranded on the wave's last
   * frame, a refusal drops straight back into the idle cycle.
   */
  const playWave = useCallback(() => {
    const node = waveNode.current
    if (!node) {
      rest()
      return
    }
    waveQueued.current = false
    // The still the idle leaves behind goes back to its opening frame first —
    // see rewindIdle. This is the seam that was jumping.
    rewindIdle()
    // Hold the neutral first frame while the idle dissolves off it, and only
    // then wave. Started here instead, the clip ran underneath the dissolve and
    // was 3.18s into a 4.01s gesture by the time anything could be seen of it —
    // measured — so the character appeared mid-wave from nowhere. Waiting also
    // makes the dissolve one between two still, near-identical neutral frames,
    // which is why it does not read as a cut at all.
    node.pause()
    node.currentTime = 0
    setPhase('wave')
    window.clearTimeout(waveStartTimer.current)
    waveStartTimer.current = window.setTimeout(() => {
      const started = node.play()
      if (started) started.catch(() => startIdleRef.current())
    }, CLIP_FADE)
  }, [rest, rewindIdle])

  /**
   * The easter egg, on five quick taps.
   *
   * It suspends the idle cycle rather than joining it: every pending timer is
   * dropped and the clip plays once before handing straight back. The idle stays
   * opaque underneath the whole time (see character.css) so what the smile fades
   * in over, and back out to reveal, is the same picture that was already on
   * screen.
   *
   * Nothing is moving by the time this runs — `armSmile` waits for it. That
   * wait is the whole point and it is not about the frames: measured against
   * the smile's opening frame, the worst mid-take idle frame differs by 4.55 of
   * 255 and the last one by 4.08, which is the idle-to-wave seam already
   * shipping. What was visible was the STOP. Pausing a clip mid-gesture halts a
   * moving picture on the spot, and that reads instantly, two seconds before
   * the dissolve has finished arriving.
   *
   * The first frame is held for one CLIP_FADE before playing, the same trick the
   * replayed wave uses and for the same reason: started with the dissolve, the
   * clip would be two seconds in by the time any of it could be seen. Measured,
   * that is affordable here — the clip barely moves for its first second (1.25
   * of 255 against its own opening frame) and the smile peaks at 5.0s, so the
   * fade is long over before the moment worth seeing.
   */
  const playSmile = useCallback(() => {
    const node = smileNode.current
    if (!node) return

    // Everything the idle cycle had pending, cancelled: a rest that fires
    // mid-smile would restart the idle underneath it, and a queued wave would
    // jump in the moment the smile ended.
    window.clearTimeout(restTimer.current)
    window.clearTimeout(waveStartTimer.current)
    window.clearTimeout(smileStartTimer.current)
    window.clearTimeout(smileWaitTimer.current)
    waveQueued.current = false
    smileQueued.current = false
    // What this is covering decides which layer has to hold underneath it.
    smileOver.current = phase === 'wave' || phase === 'greeting' ? 'wave' : 'idle'
    // The idle is put back on its opening frame either way: it is the still the
    // smile leaves behind when it came from the idle, and it is where the idle
    // restarts from afterwards when it came from the wave.
    rewindIdle()

    const begin = () => {
      node.pause()
      node.currentTime = 0
      setPhase('smile')
      smileStartTimer.current = window.setTimeout(() => {
        const started = node.play()
        if (started) started.catch(() => startIdleRef.current())
      }, CLIP_FADE)
    }

    if (node.readyState >= 2) {
      begin()
      return
    }

    // Not fetched yet. Nothing is revealed until there is a frame to reveal —
    // dissolving to an element with no picture would show the page through it.
    // `load()` runs inside the tap's own call stack, which is what lets a phone
    // start the fetch at all.
    const onReady = () => {
      window.clearTimeout(smileWaitTimer.current)
      begin()
    }
    node.addEventListener('loadeddata', onReady, { once: true })
    node.preload = 'auto'
    node.load()
    smileWaitTimer.current = window.setTimeout(() => {
      node.removeEventListener('loadeddata', onReady)
      // Give up on it for the rest of the visit rather than make every later
      // combo wait out the same ten seconds.
      setSmileBroken(true)
      startIdleRef.current()
    }, SMILE_TIMEOUT)
  }, [phase, rewindIdle])

  /**
   * The fifth tap.
   *
   * The smile never cuts a clip that is moving. If the idle is mid-take, or the
   * wave is actually running rather than being held on its first frame, this
   * queues and the clip's own `ended` hands over — the same courtesy the
   * replayed wave has always been given, and for a better reason than tidiness:
   * a picture stopped dead is what reads as a jump.
   *
   * The fetch starts here regardless, inside the tap's own call stack. The clip
   * is not preloaded, so the wait doubles as up to six seconds of head start.
   */
  const armSmile = useCallback(() => {
    const node = smileNode.current
    if (!node) return
    if (node.readyState < 2 && node.networkState !== node.NETWORK_LOADING) {
      node.preload = 'auto'
      node.load()
    }
    waveQueued.current = false

    // The idle still gets to finish: cutting a take short stops a moving
    // picture dead, which is what read as a jump.
    if (idleRunning.current) {
      smileQueued.current = true
      return
    }
    // The wave does not, by request. It is a worse seam and the numbers say so
    // — measured against the smile's opening frame, a wave frame is 2.08 away
    // at its quietest and 14.32 with the arm up, against 3.19 from the idle and
    // about 3.2 for the seams that read as seamless. What keeps it as good as
    // it can be is that the wave is left RUNNING underneath: the arm comes down
    // through the dissolve instead of freezing where it was.
    window.clearTimeout(restTimer.current)
    playSmile()
  }, [playSmile])

  /**
   * A tap on the character.
   *
   * Mid-take the wave is queued rather than cut in, which is the point: the idle
   * is allowed to finish first. Between takes there is nothing to finish, so the
   * pending rest is cancelled and the wave goes now — waiting out a timer the
   * reader cannot see would just read as the tap having been ignored.
   */
  const onTap = useCallback(() => {
    // Counted before anything else returns early, because the combo has to be
    // reachable while the wave is playing — its own first tap is what started
    // that wave.
    const now = Date.now()
    const recent = taps.current.filter((at) => now - at < SMILE_COMBO.windowMs)
    recent.push(now)
    taps.current = recent
    if (recent.length >= SMILE_COMBO.taps && phase !== 'smile' && !smileBroken) {
      taps.current = []
      armSmile()
      return
    }

    if (phase === 'wave' || phase === 'smile') return
    if (idleBroken) {
      playWave()
      return
    }
    if (idleRunning.current) {
      waveQueued.current = true
      return
    }
    window.clearTimeout(restTimer.current)
    playWave()
  }, [phase, idleBroken, playWave, armSmile, smileBroken])

  /** The timers are what outlive the component if left. */
  useEffect(
    () => () => {
      window.clearTimeout(restTimer.current)
      window.clearTimeout(waveStartTimer.current)
      window.clearTimeout(smileStartTimer.current)
      window.clearTimeout(smileWaitTimer.current)
    },
    [],
  )

  // On a touch device nothing is shown until the wave has had its say, so the
  // cut-out still does not flash up behind it for a moment first. The timeout
  // is the escape hatch: a video that stalls without erroring must not leave
  // the hero empty, so after it the still is shown regardless.
  useEffect(() => {
    if (wavePlaying || waveBroken) {
      setWaveSettled(true)
      return
    }
    const timer = setTimeout(() => setWaveSettled(true), 2500)
    return () => clearTimeout(timer)
  }, [wavePlaying, waveBroken])
  const tracks = useMemo(hasFinePointer, [])

  /**
   * Tell the rest of the page when the greeting is over — the settings island
   * waits for it before showing itself on a phone.
   *
   * A pointer device never gets the wave, and neither does one where the file
   * is missing, so in both cases there is nothing to wait for and the signal
   * goes immediately. Otherwise the video's own `ended` announces it, and this
   * timer is the backstop: a stalled video must not leave the corner waiting
   * for ever. Eight seconds against a four-second clip, so it only ever fires
   * when something has genuinely gone wrong.
   */
  useEffect(() => {
    if (tracks) {
      announceGreetingDone()
      return
    }
    // The wave got there under its own steam and has already handed over to the
    // idle. Re-running clears the backstop below, which is the point: left
    // pending it would fire mid-take and restart the idle from the top.
    if (greetingOver) return

    const settle = () => {
      announceGreetingDone()
      setGreetingOver(true)
      // A missing or stalled wave must not take the idle down with it. The
      // greeting is what failed; the character can still rest and be tapped.
      if (!idleBroken) startIdleRef.current()
    }
    if (waveBroken) {
      settle()
      return
    }
    const timer = setTimeout(settle, 8000)
    return () => clearTimeout(timer)
  }, [tracks, waveBroken, idleBroken, greetingOver])

  const render = useCallback(
    (gaze: Gaze, delta: number) => {
      const img = sheet.current
      if (!img) return

      // Aim: the frame that looks closest to where the cursor is. No tie-break
      // for nearness is needed — every frame here belongs to one pass of the
      // recording, so the nearest match is never on the far side of the clip.
      const here = position.current
      let aim = 0
      let bestCost = Infinity
      for (let i = 0; i < COUNT; i += 1) {
        const dx = GAZE[i * 2] - gaze.x
        const dy = GAZE[i * 2 + 1] - gaze.y
        const cost = WEIGHT_X * dx * dx + dy * dy
        if (cost < bestCost) {
          bestCost = cost
          aim = i
        }
      }

      // Ease towards it, but never faster than MAX_TRAVEL frames a second.
      // The cap is what guarantees the walk passes through the frames in
      // between instead of skipping over them.
      const limit = MAX_TRAVEL * delta
      let step = (aim - here) * (1 - Math.exp(-FOLLOW * delta))
      if (step > limit) step = limit
      else if (step < -limit) step = -limit
      position.current = here + step

      const frame = Math.round(position.current)
      if (frame === shown.current) return
      shown.current = frame

      const x = (frame % manifest.columns) / manifest.columns
      const y = Math.floor(frame / manifest.columns) / manifest.rows
      img.style.transform = `translate3d(${-x * 100}%, ${-y * 100}%, 0)`
    },
    [],
  )

  useGazeTracking(stage, tracks ? render : noop)

  // Without a cursor there is nothing to follow, so the sheet is never fetched
  // — which is also what keeps a megabyte off a phone's budget. A single frame
  // stands in, and the wave plays over it once.
  //
  // The wave keeps its own backdrop and sits in a frame, rather than being cut
  // out like the sheet is. It was shot with a pool of light in the middle that
  // the backdrop fit — which reads the borders, and they are vignetted — comes
  // in about 20 levels under, so the matte swallowed the gap between the raised
  // arm and the body and pasted a slab of backdrop onto the character. A frame
  // is the honest answer: it looks chosen, and it cannot fail.
  //
  // The still stays underneath as the layer that holds the size and marks the
  // character ready, and it is what shows if the video is missing.
  const src = tracks ? SHEET : STILL
  const neutral = manifest.neutral
  const wave = !tracks && !waveBroken
  // The wave is a 16:9 shot. The head sits at x=630 of 1280 and the raised hand
  // reaches out to x=146, so the furthest the subject gets from the head is
  // 484px — a crop centred on the head has to be at least 968 wide to hold the
  // whole gesture, and 1048 leaves it room to breathe. Against the full 720 of
  // height that is an aspect of 1.46, and `object-position` puts the crop's
  // centre on the head rather than on the frame's, so the head lands in the
  // middle of the box and the distance to either side of it is the same.
  // The still is contained inside the same box if the video never arrives.
  const aspect = tracks ? `${manifest.frameWidth} / ${manifest.frameHeight}` : '1.46'
  const visible = tracks || waveSettled
  /** Any clip showing means the framed shot rather than the cut-out sheet,
   *  so the bust fade comes off and the still underneath goes. */
  const filmShowing = wavePlaying || phase === 'idle' || phase === 'smile'
  const idle = !tracks && !idleBroken
  const smile = !tracks && !smileBroken

  return (
    <div
      className="character"
      ref={stage}
      style={{
        // Every size and offset comes from characterConfig.
        width: LAYOUT.width,
        maxWidth: LAYOUT.maxWidth,
        aspectRatio: aspect,
        translate: `${LAYOUT.offsetX} ${LAYOUT.offsetY}`,
        ['--character-cols' as string]: tracks ? manifest.columns : 1,
        ['--character-rows' as string]: tracks ? manifest.rows : 1,
        ['--character-mobile-max' as string]: LAYOUT.mobileMaxWidth,
        // Drives both the arriving clip's fade and the leaving clip's delay,
        // so the two cannot come apart. See CLIP_FADE.
        ['--clip-fade' as string]: `${CLIP_FADE}ms`,
      }}
      data-ready={(ready && visible) || undefined}
      data-wave={filmShowing || undefined}
      data-still={!tracks || undefined}
      // The idle layers hold before they go, which is what keeps the wrap
      // dissolve covered — the layer arriving is the other idle, not something
      // already opaque. Leaving for the wave is the one case where what they
      // uncover IS opaque, so there the hold comes off and they go at once.
      data-idle-leaving={phase === 'wave' || undefined}
    >
      <img
        className="character__sheet"
        // Hidden, not unmounted: it still carries the size, and it comes back
        // if the video turns out to be unplayable.
        data-covered={filmShowing || undefined}
        ref={sheet}
        src={src}
        alt=""
        draggable={false}
        decoding="async"
        style={
          tracks
            ? {
                // Start on the resting frame, so the first paint is not the
                // top-left corner of the sheet.
                transform: `translate3d(${
                  -((neutral % manifest.columns) / manifest.columns) * 100
                }%, ${-(Math.floor(neutral / manifest.columns) / manifest.rows) * 100}%, 0)`,
              }
            : undefined
        }
        onLoad={() => setReady(true)}
      />
      {wave ? (
        <video
          className="character__wave"
          src={WAVE}
          // Plays through once and holds on its last frame — no `loop`. Muted
          // and inline are what let a phone start it without a tap.
          autoPlay
          muted
          playsInline
          preload="auto"
          // Hidden until it can actually play. A missing file does not reliably
          // raise `error` on a media element, and an empty <video> paints as a
          // black box in some browsers — this way it simply never appears.
          ref={attachWave}
          data-playing={
            (wavePlaying &&
              (phase === 'greeting' ||
                phase === 'wave' ||
                (phase === 'smile' && smileOver.current === 'wave'))) ||
            undefined
          }
          onEnded={() => {
            announceGreetingDone()
            setGreetingOver(true)
            // A combo cut in and this clip is now running unseen under the
            // smile. Handing back to the idle here would end the smile early.
            if (phase === 'smile') return
            if (smileQueued.current) {
              playSmile()
              return
            }
            // With no idle to fall into, the character holds the wave's last
            // frame exactly as it did before this existed.
            if (!idleBroken) startIdleRef.current()
          }}
          onError={() => setWaveBroken(true)}
        />
      ) : null}
      {/* The resting clip, on two alternating layers — see loopNodes for why,
          and for the two guards that keep the spare from being able to blank
          the frame. Same box and crop as the wave, stacked over it, so every
          swap here dissolves shots that already line up rather than cutting.

          No `loop`: the pause between takes is the whole design, so each take
          is started deliberately. */}
      {idle
        ? LOOP.map((clipSrc, slot) => (
            <video
              key={slot}
              className="character__idle"
              src={clipSrc}
              muted
              playsInline
              // The coffee is a megabyte and the yawn nearly two, and neither
              // is wanted for a good ten seconds — the greeting, the first idle
              // take and a rest have to pass before even the coffee. Preloading
              // them would have three megabytes competing with the greeting for
              // a phone's bandwidth at the worst moment, so each take kicks off
              // the fetch of the one that follows it.
              preload={slot === 0 ? 'auto' : 'none'}
              ref={attachIdle(slot)}
              // The showing layer is opaque under the smile as well as while it
              // is the clip being watched: the smile fades in over it and, when
              // it ends, fades back out to reveal it, and both need something
              // solid underneath. Left to fade out on its own, what the smile
              // uncovered would be the wave's held last frame instead.
              data-playing={
                (slot === loopSlot &&
                  (phase === 'idle' ||
                    (phase === 'smile' && smileOver.current === 'idle'))) ||
                undefined
              }
              onEnded={() => {
                // Only the layer that was actually playing has anything to say.
                if (slot !== loopSlotRef.current) return
                // Paused mid-take by the smile, this cannot fire — but a take
                // that ends on the same tick as the fifth tap can, and
                // restarting the cycle here would run the idle underneath the
                // easter egg.
                if (phase === 'smile') return
                idleRunning.current = false
                // The smile first: it was queued by a combo, which outranks the
                // single tap that may also be waiting behind it. Neither wants
                // a hand-over underneath it — both dissolve away from this
                // layer, rewound, and a swap as well would be a second
                // dissolve nobody asked for.
                if (smileQueued.current) playSmile()
                else if (waveQueued.current) playWave()
                else {
                  rest()
                  void handOverLoop()
                }
              }}
              onError={() => {
                if (slot === 0) setIdleBroken(true)
                else spareDead.current[slot] = true
              }}
            />
          ))
        : null}
      {/* The easter egg, stacked over the idle so it dissolves onto the picture
          that is already showing. Same box, crop and fade as the other two.

          `preload="none"` is the one departure, and it is the point: 2.3 MB
          that almost nobody triggers has no business on every visit, so the
          file is fetched inside the tap that asks for it. Nothing is revealed
          until a frame has arrived — see playSmile. */}
      {smile ? (
        <video
          className="character__smile"
          src={SMILE}
          muted
          playsInline
          preload="none"
          ref={attachSmile}
          data-playing={phase === 'smile' || undefined}
          onEnded={() => startIdleRef.current()}
          onError={() => setSmileBroken(true)}
        />
      ) : null}
      {/* Sits over the frame from the moment the greeting is done, so a tap
          lands whether the character is mid-take or resting between them.
          A button rather than a click handler on the video, so it can be
          reached by keyboard and says what it does. */}
      {wave && greetingOver ? (
        <button
          type="button"
          className="character__replay"
          onClick={onTap}
          aria-label={t.a11y.replayGreeting}
        />
      ) : null}
      <p className="visually-hidden">{t.a11y.character}</p>
    </div>
  )
}

function noop() {}
