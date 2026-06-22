// FinaleReveal — PREP for "something amazing".
//
// The phoenix slow-flaps up into the sun and FREEZES on a held pose at the very end (see the
// freeze in PhoenixFlap.jsx). This is the mount point for the next climactic beat that ignites
// AT that freeze — e.g. a feather/ember burst, a light bloom, a transformation, or a transition
// into whatever comes next. Deliberately a null stub for now (the same intentional-phase-stub
// pattern as Atmosphere once was), so the spectacle slots in here without rewiring the scene.
//
// When building it: read scrollProgress via useExperience.getState() inside useFrame (the ADR-001
// idiom), gate to p ≳ 0.97 so it fires only at the freeze, and put any choreography in data/.
export default function FinaleReveal() {
  return null;
}
