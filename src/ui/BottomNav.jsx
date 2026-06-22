// Bottom nav cue — a fast path to the two sections that carry the signal for a recruiter (BR-03):
// the Work and the Contact. Replaces the old "skip to the work" framing with plain navigation,
// matching the reference's clean nav (no "skip" anywhere — just section links).
export default function BottomNav() {
  const go = (id) => () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  return (
    <nav className="bottom-nav" aria-label="Jump to section">
      <button type="button" onClick={go('work')}>
        Work
      </button>
      <span className="bottom-nav-sep" aria-hidden="true">
        ·
      </span>
      <button type="button" onClick={go('contact')}>
        Contact
      </button>
    </nav>
  );
}
