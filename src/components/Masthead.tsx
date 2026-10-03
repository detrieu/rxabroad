import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { MyMedsLink } from './MyMedsLink';

export function Masthead() {
  return (
    <header className="masthead">
      <Link href="/" className="masthead__home">
        <span className="masthead__badge" aria-hidden="true">PT</span>
        <span className="masthead__text">
          <span className="masthead__word">Pill Trotter</span>
          <span className="masthead__tag">Know what to ask for, wherever you land.</span>
        </span>
      </Link>
      <nav className="masthead__nav" aria-label="Site">
        <MyMedsLink />
        <ThemeToggle />
      </nav>
    </header>
  );
}
