import { useEffect, useMemo, useRef } from 'react';
import { useExperience } from '../store/useExperience.js';
import { STAGES, localProgress } from '../data/stages.js';

// Cinematic per-word scroll reveal — each word sharpens (blur + fade + lift) in sequence as you
// scroll through its section, the "motion-blur text reveal" the reference leans on. Adapted from
// a 21st.dev pattern but rebuilt on our own scroll spine: no framer-motion, no Tailwind. It reads
// scroll via the store's subscribe() (a side-effect listener — fires on each Lenis tick WITHOUT
// re-rendering React) and writes word styles imperatively through refs, honouring the
// getState()-in-the-loop performance idiom. The reveal finishes early in the beat (default by
// ~45% through) so the copy is fully legible for most of the section — recruiter clarity first.
// prefers-reduced-motion renders every word solid with no scroll coupling.
export default function RevealText({
  text,
  stageId,
  from = 0,
  to = 0.45,
  className,
  as: Tag = 'p',
  intensity = 1, // scales the blur + lift; >1 reads weightier/more cinematic (e.g. the summit)
  warm = false, // each word lands from ember-warm to ink — ties the summit copy to the fire
}) {
  const ref = useRef(null);
  const reducedMotion = useExperience((s) => s.reducedMotion);
  const stage = useMemo(() => STAGES.find((s) => s.id === stageId), [stageId]);
  const words = useMemo(() => text.split(' '), [text]);

  useEffect(() => {
    const spans = ref.current?.querySelectorAll('.reveal-word');
    if (!spans?.length) return;

    if (reducedMotion) {
      spans.forEach((el) => {
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.transform = 'none';
        el.style.color = '';
      });
      return;
    }

    const apply = (p) => {
      const lp = stage ? localProgress(p, stage) : Math.min(1, Math.max(0, p));
      const span = to - from || 1;
      const r = Math.min(1, Math.max(0, (lp - from) / span)); // 0..1 across the reveal window
      for (let i = 0; i < spans.length; i++) {
        const start = (i / spans.length) * 0.6; // last word starts at 60% of the window
        const t = Math.min(1, Math.max(0, (r - start) / 0.4));
        const e = t * t * (3 - 2 * t); // smoothstep
        const el = spans[i];
        el.style.opacity = (0.08 + 0.92 * e).toFixed(3);
        el.style.filter = e < 0.999 ? `blur(${((1 - e) * 6 * intensity).toFixed(2)}px)` : 'none';
        el.style.transform =
          e < 0.999 ? `translateY(${((1 - e) * 0.5 * intensity).toFixed(3)}em)` : 'none';
        if (warm) {
          // ember-warm (176,122,58) settling to ink (36,28,18) as the word lands
          const c = (a, b) => Math.round(a + (b - a) * e);
          el.style.color = `rgb(${c(176, 36)}, ${c(122, 28)}, ${c(58, 18)})`;
        }
      }
    };

    apply(useExperience.getState().scrollProgress);
    const unsub = useExperience.subscribe((s) => apply(s.scrollProgress));
    return unsub;
  }, [reducedMotion, stage, from, to, words.length, intensity, warm]);

  return (
    <Tag ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i}>
          <span className="reveal-word">{w}</span>
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}
