import { identity } from '../data/copy.js';

export default function Nav() {
  return (
    <nav className="nav">
      <div className="mark">{identity.name}</div>
      <div className="links">
        <a href="#work">Work</a>
        <a href="#contact">Contact</a>
      </div>
    </nav>
  );
}
