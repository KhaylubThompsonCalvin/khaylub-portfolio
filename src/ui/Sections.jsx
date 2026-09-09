import { philosophy, footholds, areasOfFocus, spark } from '../data/copy.js';
import RevealText from './RevealText.jsx';

// The First Ember (philosophy) + Footholds (focus) + The Spark Wakes (spark) - the DOM
// text beats between the hero and the camps. Kept together for now; split into separate
// files if they grow.
export function Philosophy() {
  // The philosophy statement is the cinematic intro beat: its lines write themselves in word by
  // word as you scroll through, then the phoenix ember rises behind it. Drives its own reveal,
  // so the inner opts out of the block reveal-and-stay (.inner--reveal).
  return (
    <section className="section" id="philosophy">
      <div className="inner inner--reveal">
        {/* Reveal windows are LOCAL to the philosophy stage (global 0.12–0.30). They finish early  - 
            lead by local 0.28 (≈ global 0.17), body by local 0.42 (≈ global 0.20) - so the full
            statement is written and legible while the block is still centred, with reading room
            before it scrolls up into the nav-fade (top<130px ≈ global 0.223). Previously the body
            didn't finish until local 0.62 (≈ global 0.23), i.e. AFTER it had already begun fading,
            so the last words appeared to dissolve mid-sentence. */}
        <RevealText as="p" className="lead" stageId="philosophy" text={philosophy.lead} from={0} to={0.28} />
        <RevealText
          as="p"
          className="body"
          stageId="philosophy"
          text={philosophy.body}
          from={0.12}
          to={0.42}
        />
      </div>
    </section>
  );
}

export function AreasOfFocus() {
  return (
    <section className="section" id="focus">
      <div className="inner">
        <p className="kicker">{footholds.kicker}</p>
        <p className="lead lead--connector">{footholds.lede}</p>
        <ul className="focus-list">
          {areasOfFocus.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// The Spark Wakes - the phoenix's acknowledgment beat. One short line, alone and centred,
// timed to the ignition at scrollProgress 0.5 (stage 0.48–0.58): the firebird ignites into
// the upper frame while the Letter-to-Time question writes itself in below. The reveal
// finishes by local 0.4 (≈ global 0.52) so the words hold, legible, through the ignition
// and the fly-over before the section lifts away.
export function Spark() {
  return (
    <section className="section" id="spark">
      <div className="inner inner--reveal">
        <p className="kicker">{spark.kicker}</p>
        <RevealText as="p" className="lead" stageId="spark" text={spark.line} from={0} to={0.4} intensity={1.3} warm />
      </div>
    </section>
  );
}
