/**
 * Grainient — a WebGL gradient that drifts, from React Bits
 * (https://reactbits.dev, MIT). Vendored rather than installed: the library
 * ships components as source to copy, and `ogl` was already a dependency here.
 *
 * Kept close to upstream so it stays easy to diff against a newer version.
 * Three changes: the stylesheet's name, to match this repo's casing; a
 * `paused` prop for `prefers-reduced-motion`, since the page has one
 * everywhere else and a gradient that never stops moving is exactly what that
 * preference is about (paused still paints — one frame, held); and a pointer
 * reaction, borrowing `mouseRadius` and its falloff verbatim from React Bits'
 * own Dither so the two behave the same way at the same number.
 */
import React, { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import './grainient.css';

interface GrainientProps {
  timeSpeed?: number;
  colorBalance?: number;
  warpStrength?: number;
  warpFrequency?: number;
  warpSpeed?: number;
  warpAmplitude?: number;
  blendAngle?: number;
  blendSoftness?: number;
  rotationAmount?: number;
  noiseScale?: number;
  grainAmount?: number;
  grainScale?: number;
  grainAnimated?: boolean;
  contrast?: number;
  gamma?: number;
  saturation?: number;
  centerX?: number;
  centerY?: number;
  zoom?: number;
  color1?: string;
  color2?: string;
  color3?: string;
  lightMode?: boolean;
  className?: string;
  /** Hold the current frame instead of animating. */
  paused?: boolean;
  enableMouseInteraction?: boolean;
  /** Reach of the pointer, in aspect-corrected screen halves. */
  mouseRadius?: number;
  /** How much of the page's scroll the gradient follows. 0 holds it still,
   *  1 would pin it to the content. */
  scrollParallax?: number;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [1, 1, 1];
  return [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255];
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform float uScrollOffset;
uniform vec2 uMouse;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uLightMode;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);} 
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);} 
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  // The scroll rides in as a shift of the sampling centre. Translating the
  // canvas would do the same thing to look at, but the canvas is exactly the
  // viewport and fixed, so any transform opens a gap at one edge — covering it
  // would mean a canvas some 850px taller on this page, and that many more
  // pixels shaded every frame for something that costs nothing here.
  vec2 tuv=uv-0.5+uCenterOffset+vec2(0.0,uScrollOffset);
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  // The pointer, in the same aspect-corrected space Dither measures in: both
  // centred on the screen, both with x stretched by the ratio, so the reach a
  // given uMouseRadius buys is the same in either component.
  //
  // The y flip is Dither's, and it is load-bearing: the pointer is measured
  // from the top of the page and gl_FragCoord counts from the bottom. Without
  // it the swell lands in the mirror image of the cursor — measured with the
  // drift frozen, a pointer at y=250 put the effect at y=569 and one at y=650
  // put it at y=298, while x landed correctly every time.
  float mouseEffect=0.0;
  if(uMouseStrength>0.0&&uMouseRadius>0.0){
    vec2 m=(uMouse/iResolution.xy-0.5)*vec2(1.0,-1.0);
    m.x*=ratio;
    vec2 q=uv-0.5;
    q.x*=ratio;
    vec2 toPointer=q-m;
    float dist=length(toPointer);
    mouseEffect=(1.0-S(0.0,uMouseRadius,dist))*uMouseStrength;
    // Two halves, because either alone reads as the wrong thing: pushing the
    // pattern outward alone is a lens with no colour to it, and pulling the
    // blend alone is a spotlight that does not move. Together the gradient
    // swells around the pointer and darkens toward the accent as it goes.
    tuv+=normalize(toPointer+vec2(1e-5))*mouseEffect*0.14;
  }

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x-mouseEffect*0.42;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);} 
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  if(uLightMode>0.5){
    float energy=max(max(col.r,col.g),col.b);
    vec3 hue=col/max(energy,0.001);
    float chroma=length(col-vec3(dot(col,vec3(0.333333))));
    float coverage=clamp(0.12+chroma*1.15+energy*0.18,0.0,0.88);
    col=mix(vec3(1.0),clamp(hue*0.58+col*0.18,0.0,1.0),coverage);
  }

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`;


// Keep renderer/program alive across re-renders so Effect 2 can update
// uniforms without ever rebuilding the WebGL context.
type GrainientCtx = {
  renderer: InstanceType<typeof Renderer>;
  program: InstanceType<typeof Program>;
  mesh: InstanceType<typeof Mesh>;
};
const ctxMap = new WeakMap<HTMLDivElement, GrainientCtx>();

const Grainient: React.FC<GrainientProps> = ({
  timeSpeed = 0.25,
  colorBalance = 0.0,
  warpStrength = 1.0,
  warpFrequency = 5.0,
  warpSpeed = 2.0,
  warpAmplitude = 50.0,
  blendAngle = 0.0,
  blendSoftness = 0.05,
  rotationAmount = 500.0,
  noiseScale = 2.0,
  grainAmount = 0.1,
  grainScale = 2.0,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1.0,
  saturation = 1.0,
  centerX = 0.0,
  centerY = 0.0,
  zoom = 0.9,
  color1 = '#FF9FFC',
  color2 = '#5227FF',
  color3 = '#B497CF',
  lightMode = false,
  className = '',
  paused = false,
  enableMouseInteraction = false,
  mouseRadius = 0.5,
  scrollParallax = 0
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Read inside the render loop, which is built once and never rebuilt, so the
  // flag has to reach it through a ref rather than a dependency.
  const pausedRef = useRef(paused);
  const controls = useRef<{ start: () => void; stop: () => void } | null>(null);
  // Where the pointer is, where the shader currently thinks it is, and how much
  // of the effect is faded in. All three are read inside the render loop, which
  // is built once, so they travel by ref rather than as dependencies.
  const pointer = useRef({ targetX: 0, targetY: 0, x: 0, y: 0, target: 0, strength: 0, seen: false });
  const mouseOn = useRef(enableMouseInteraction);
  const parallax = useRef(scrollParallax);

  // Effect 1: build WebGL context once, pause when offscreen / tab hidden
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2)
    });

    const gl = renderer.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime:           { value: 0 },
        iResolution:     { value: new Float32Array([1, 1]) },
        uTimeSpeed:      { value: 0.25 },
        uColorBalance:   { value: 0.0 },
        uWarpStrength:   { value: 1.0 },
        uWarpFrequency:  { value: 5.0 },
        uWarpSpeed:      { value: 2.0 },
        uWarpAmplitude:  { value: 50.0 },
        uBlendAngle:     { value: 0.0 },
        uBlendSoftness:  { value: 0.05 },
        uRotationAmount: { value: 500.0 },
        uNoiseScale:     { value: 2.0 },
        uGrainAmount:    { value: 0.1 },
        uGrainScale:     { value: 2.0 },
        uGrainAnimated:  { value: 0.0 },
        uContrast:       { value: 1.5 },
        uGamma:          { value: 1.0 },
        uSaturation:     { value: 1.0 },
        uCenterOffset:   { value: new Float32Array([0, 0]) },
        uZoom:           { value: 0.9 },
        uScrollOffset:   { value: 0 },
        uMouse:          { value: new Float32Array([0, 0]) },
        uMouseRadius:    { value: 0.0 },
        uMouseStrength:  { value: 0.0 },
        uColor1:         { value: new Float32Array([1, 1, 1]) },
        uColor2:         { value: new Float32Array([1, 1, 1]) },
        uColor3:         { value: new Float32Array([1, 1, 1]) },
        uLightMode:      { value: 0.0 }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });
    ctxMap.set(container, { renderer, program, mesh });

    const setSize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h);
      const res = (program.uniforms.iResolution as { value: Float32Array }).value;
      res[0] = gl.drawingBufferWidth;
      res[1] = gl.drawingBufferHeight;
      renderer.render({ scene: mesh });
    };

    const ro = new ResizeObserver(setSize);
    ro.observe(container);
    setSize();

    let raf = 0;
    let isVisible = true;
    let isPageVisible = !document.hidden;
    const t0 = performance.now();

    // The canvas never receives these itself: the backdrop is pointer-events:
    // none and the page sits on top of it, so the window is the only place the
    // whole travel is visible. Coordinates are turned into drawing-buffer
    // pixels because that is the space the shader compares against.
    const onPointerMove = (event: PointerEvent) => {
      if (!mouseOn.current) return;
      const rect = container.getBoundingClientRect();
      const scaleX = gl.drawingBufferWidth / Math.max(rect.width, 1);
      const scaleY = gl.drawingBufferHeight / Math.max(rect.height, 1);
      const p = pointer.current;
      p.targetX = (event.clientX - rect.left) * scaleX;
      p.targetY = (event.clientY - rect.top) * scaleY;
      p.target = 1;
      // The first sighting jumps rather than eases: easing in from the corner
      // drags a visible bulge across the page before it reaches the cursor.
      if (!p.seen) { p.x = p.targetX; p.y = p.targetY; p.seen = true; }
    };
    const onPointerLeave = () => { pointer.current.target = 0; };

    if (window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave);
    }

    const loop = (t: number) => {
      (program.uniforms.iTime as { value: number }).value = (t - t0) * 0.001;
      // Eased, not followed: the raw position makes the swell snap from frame
      // to frame on a fast flick, and the whole point of it is to feel soft.
      const p = pointer.current;
      p.x += (p.targetX - p.x) * 0.08;
      p.y += (p.targetY - p.y) * 0.08;
      p.strength += (p.target - p.strength) * 0.05;
      const m = (program.uniforms.uMouse as { value: Float32Array }).value;
      m[0] = p.x;
      m[1] = p.y;
      (program.uniforms.uMouseStrength as { value: number }).value = mouseOn.current ? p.strength : 0;
      // Read here rather than from a scroll listener: the loop already runs
      // every frame, and a listener would only ever be setting the same value
      // a little later.
      //
      // Negated, which is measured rather than reasoned about: gl_FragCoord
      // counts from the bottom, so the offset that reads as "down" in the
      // shader is "up" on screen. Unnegated and with the drift frozen, 300px
      // of scroll moved the gradient 90px the wrong way — the right ratio,
      // travelling against the content instead of with it.
      const vh = Math.max(container.clientHeight, 1);
      ;(program.uniforms.uScrollOffset as { value: number }).value =
        -(window.scrollY / vh) * parallax.current;
      renderer.render({ scene: mesh });
      raf = requestAnimationFrame(loop);
    };

    const tryStart = () => {
      if (isVisible && isPageVisible && !pausedRef.current && raf === 0) raf = requestAnimationFrame(loop);
    };
    const tryStop = () => {
      if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
    };

    const io = new IntersectionObserver(
      ([entry]) => { isVisible = entry.isIntersecting; isVisible ? tryStart() : tryStop(); },
      { threshold: 0 }
    );
    io.observe(container);

    const onVisibility = () => {
      isPageVisible = !document.hidden;
      isPageVisible ? tryStart() : tryStop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    controls.current = { start: tryStart, stop: tryStop };
    tryStart();

    return () => {
      tryStop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerleave', onPointerLeave);
      controls.current = null;
      ctxMap.delete(container);
      try { container.removeChild(canvas); } catch { /* ignore */ }
    };
  }, []); // renderer created once

  // The frame already on screen stays on screen when this turns on: stopping
  // the loop leaves the last render in the buffer, so there is nothing to
  // repaint and nothing goes blank.
  useEffect(() => {
    pausedRef.current = paused;
    if (paused) controls.current?.stop();
    else controls.current?.start();
  }, [paused]);

  // Effect 3: sync props to uniforms — zero GPU cost, no teardown
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ctx = ctxMap.get(container);
    if (!ctx) return;
    const { program } = ctx;
    const u = program.uniforms as Record<string, { value: any }>;

    u.uTimeSpeed.value      = timeSpeed;
    u.uColorBalance.value   = colorBalance;
    u.uWarpStrength.value   = warpStrength;
    u.uWarpFrequency.value  = warpFrequency;
    u.uWarpSpeed.value      = warpSpeed;
    u.uWarpAmplitude.value  = warpAmplitude;
    u.uBlendAngle.value     = blendAngle;
    u.uBlendSoftness.value  = blendSoftness;
    u.uRotationAmount.value = rotationAmount;
    u.uNoiseScale.value     = noiseScale;
    u.uGrainAmount.value    = grainAmount;
    u.uGrainScale.value     = grainScale;
    u.uGrainAnimated.value  = grainAnimated ? 1.0 : 0.0;
    u.uContrast.value       = contrast;
    u.uGamma.value          = gamma;
    u.uSaturation.value     = saturation;
    u.uCenterOffset.value   = new Float32Array([centerX, centerY]);
    u.uZoom.value           = zoom;
    u.uMouseRadius.value    = mouseRadius;
    mouseOn.current         = enableMouseInteraction;
    parallax.current        = scrollParallax;
    u.uColor1.value         = new Float32Array(hexToRgb(color1));
    u.uColor2.value         = new Float32Array(hexToRgb(color2));
    u.uColor3.value         = new Float32Array(hexToRgb(color3));
    u.uLightMode.value      = lightMode ? 1.0 : 0.0;
  }, [
    timeSpeed, colorBalance, warpStrength, warpFrequency, warpSpeed,
    warpAmplitude, blendAngle, blendSoftness, rotationAmount, noiseScale,
    grainAmount, grainScale, grainAnimated, contrast, gamma, saturation,
    centerX, centerY, zoom, color1, color2, color3, lightMode,
    enableMouseInteraction, mouseRadius, scrollParallax
  ]);


  return <div ref={containerRef} className={`grainient-container ${className}`.trim()} />;
};

export default Grainient;
