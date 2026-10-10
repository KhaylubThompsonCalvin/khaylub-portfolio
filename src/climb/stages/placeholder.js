// placeholder.js: a stage that is not built yet: a patch of ground and a marker post at the stage's anchor
import * as THREE from 'three';
export function placeholder(index) {
  return { build({ scene, anchor }) {
    const group = new THREE.Group();
    group.position.copy(anchor.centre);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(260, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#4a4338', roughness: 1 }));
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 8), new THREE.MeshStandardMaterial({ color: '#c8a46a', roughness: 0.8 }));
    post.position.set(0, 1.5, 0);
    group.add(ground, post); group.name = `placeholder-${index + 1}`; scene.add(group);
    return { group, dispose() { scene.remove(group); for (const m of [ground, post]) { m.geometry.dispose(); m.material.dispose(); } } };
  } };
}
