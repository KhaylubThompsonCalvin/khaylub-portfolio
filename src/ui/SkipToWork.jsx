// Honors the 10-second recruiter rule: a one-tap jump straight to the work,
// for visitors who won't scroll through the cinematic.
export default function SkipToWork() {
  const go = () => {
    document.getElementById('work')?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <button className="skip" onClick={go}>
      Skip to the work {'\u2193'}
    </button>
  );
}
