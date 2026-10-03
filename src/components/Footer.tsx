export function Footer() {
  return (
    <footer className="foot">
      <div className="foot__key">
        <span><span className="pill pill--otc">OTC</span> over the counter</span>
        <span><span className="pill pill--rx">Rx</span> prescription only</span>
        <span>
          <span className="pill pill--pharmacy">No Rx — Ask Pharmacist</span> no doctor&apos;s prescription
          needed, but only a pharmacist can hand it to you (not off the shelf)
        </span>
        <span>
          <span className="pill pill--controlled">Controlled (Rx)</span> a prescription works, but expect
          scrutiny — schedule drug, extra paperwork, harder refills
        </span>
        <span>
          <span className="pill pill--banned">Banned — Do Not Bring</span> no legal personal-use pathway — do
          not attempt to bring this in
        </span>
        <span><span className="pill pill--generic">Ask by generic name</span> brand unknown, generic name given</span>
        <span><span className="conf conf-med">†</span> general knowledge, not brand-verified</span>
        <span><span className="conf conf-low">?</span> unconfirmed — verify locally</span>
      </div>
      <p className="foot__disclaimer">
        <strong>This is seed data for a prototype</strong>, compiled from general pharmacology knowledge — not
        a live regulatory feed. Brand names, availability, and prescription status change and vary by region
        and even by individual pharmacy. Confirm with a local pharmacist or physician before relying on this
        while traveling.
      </p>
    </footer>
  );
}
