import { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Selective bloom built on three's own postprocessing passes (no @react-three/postprocessing
// dependency — three is already installed). Only objects opted in via BLOOM_LAYER glow; the
// light cream background and the matte Wanderer never bloom. PhoenixFlap enables this layer on
// its emissive feather meshes, so the "Spark of the Summit" ember/fire gets a real halo.
//
// Technique (the canonical three.js selective-bloom recipe): each frame, render a bloom-only
// pass with the background nulled and every non-bloom mesh swapped to flat black, blur it
// (UnrealBloomPass), then render the scene normally and add the blurred glow on top. Taking
// over the render loop (useFrame priority 1) is why this lives in a component, not a hook.
export const BLOOM_LAYER = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_LAYER);
const BLACK = new THREE.MeshBasicMaterial({ color: 'black' });
const _prevClear = new THREE.Color(); // scratch: reused each frame, never allocated in the loop

export default function SelectiveBloom({ strength = 1.0, radius = 0.5, threshold = 0.5 }) {
  const { gl, scene, camera, size } = useThree();
  const stash = useRef(new Map());

  const { bloomComposer, finalComposer, bloomPass } = useMemo(() => {
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      strength,
      radius,
      threshold
    );

    const bloomComposer = new EffectComposer(gl);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    // Additively composite the blurred glow over the base render.
    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
          }`,
      }),
      'baseTexture'
    );
    mixPass.needsSwap = true;

    const finalComposer = new EffectComposer(gl);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(mixPass);
    finalComposer.addPass(new OutputPass());

    return { bloomComposer, finalComposer, bloomPass };
    // Rebuild composers only when the renderer/scene/camera identity changes. size and the bloom
    // params are intentionally excluded — the resize and retune effects below keep them in sync,
    // so listing them here would needlessly tear down and rebuild the whole pipeline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);

  // Keep render targets and bloom resolution in sync with the canvas.
  useEffect(() => {
    bloomComposer.setSize(size.width, size.height);
    finalComposer.setSize(size.width, size.height);
    bloomPass.setSize(size.width, size.height);
  }, [size, bloomComposer, finalComposer, bloomPass]);

  // Live retune of the glow without rebuilding the composers.
  useEffect(() => {
    bloomPass.strength = strength;
    bloomPass.radius = radius;
    bloomPass.threshold = threshold;
  }, [bloomPass, strength, radius, threshold]);

  useEffect(() => {
    return () => {
      bloomComposer.dispose();
      finalComposer.dispose();
    };
  }, [bloomComposer, finalComposer]);

  // Priority 1 takes over rendering: all priority-0 frame callbacks (camera, Wanderer, phoenix)
  // have already updated transforms/materials this tick, so we render last.
  useFrame(() => {
    const prevBackground = scene.background;
    const prevFog = scene.fog;
    const prevClear = gl.getClearColor(_prevClear);
    const prevClearAlpha = gl.getClearAlpha();

    // Bloom-only pass: black everything that isn't on the bloom layer, on a black background.
    scene.background = null;
    scene.fog = null;
    gl.setClearColor(0x000000, 1);
    scene.traverse((o) => {
      if (o.isMesh && bloomLayer.test(o.layers) === false) {
        stash.current.set(o.uuid, o.material);
        o.material = BLACK;
      }
    });
    bloomComposer.render();

    // Restore and composite the glow over the normal render.
    scene.traverse((o) => {
      const m = stash.current.get(o.uuid);
      if (m) {
        o.material = m;
        stash.current.delete(o.uuid);
      }
    });
    scene.background = prevBackground;
    scene.fog = prevFog;
    gl.setClearColor(prevClear, prevClearAlpha);
    finalComposer.render();
  }, 1);

  return null;
}
