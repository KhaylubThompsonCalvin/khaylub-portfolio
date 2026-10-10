// Sky dome: a dusk gradient with a low sun and its glow, matched to the channel banner (dark slate above, warm gold at the horizon).
import * as THREE from 'three';

export function createSky({ sunDir, palette, radius = 3000 }) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: sunDir.clone().normalize() },
      uZenith: { value: new THREE.Color(palette.zenith) },
      uHorizon: { value: new THREE.Color(palette.horizon) },
      uGlow: { value: new THREE.Color(palette.sunGlow) },
      uSun: { value: new THREE.Color(palette.sun) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir, uZenith, uHorizon, uGlow, uSun;
      const vec3 COOL = vec3(0.56, 0.60, 0.66);
      varying vec3 vDir;
      void main() {
        float h = clamp(normalize(vDir).y, -0.2, 1.0);
        float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);   // renormalise: the interpolated direction is shorter mid-triangle, which faceted the glow
        // the horizon is warm only toward the sun; elsewhere it is the cool grey-blue of the banner
        vec3 hor = mix(COOL, uHorizon, pow(s, 3.0));
        vec3 col = mix(hor, uZenith, pow(smoothstep(-0.05, 0.55, h), 0.8));
        col += uGlow * pow(s, 10.0) * 0.32 + uGlow * pow(s, 90.0) * 0.5;
        col = mix(col, uSun, smoothstep(0.9993, 0.9997, s));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  sky.name = 'Sky';
  sky.frustumCulled = false;
  return sky;
}
