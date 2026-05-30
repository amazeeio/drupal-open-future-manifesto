import { ReadingChrome } from "@/components/reading-chrome";
import { SignaturesSection } from "@/components/signatures-section";
import {
  beliefs,
  closingLines,
  commitments,
  convictionBody,
  daylightConviction,
  daylightParagraphs,
  manifestoTitle,
  mastheadDateline,
  openingLead,
  openingParagraphs
} from "@/lib/manifesto";
import { getSignatures } from "@/lib/signature-store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const signatures = await getSignatures();

  return (
    <>
      <ReadingChrome />

      <header className="mast">
        <div className="wrap">
          <h1 className="title">
            A Manifesto
            <br />
            for an <em>Open Future</em>
          </h1>
          <p className="dateline">{mastheadDateline}</p>
          <div className="rule-full"></div>
        </div>
      </header>

      <main>
        <div className="wrap">
          <div className="lede" id="sec-opening">
            <p>{openingLead}</p>
          </div>

          {openingParagraphs.slice(0, 2).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}

          <p className="tight">{openingParagraphs[2]}</p>
        </div>

        <p className="conviction" id="sec-conviction">
          We are here to help build a <span className="mk">resilient civilization</span>, and to build it in the open.
        </p>

        <div className="wrap">
          <p>{convictionBody.first}</p>
          <p>
            {convictionBody.beforeHighlight}
            <mark>{convictionBody.highlight}</mark>
            {convictionBody.afterHighlight}
          </p>
        </div>

        <p className="conviction">
          {daylightConviction[0]}
          <br />
          {daylightConviction[1]}
        </p>

        <div className="wrap">
          {daylightParagraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="wrap">
          <div className="sec-head" id="sec-believe">
            <h2>We believe</h2>
          </div>

          <ol className="tenets">
            {beliefs.map((belief) => (
              <li key={belief.lead}>
                <span className="lead">{belief.lead}</span>
                <span className="body">{belief.body}</span>
              </li>
            ))}
          </ol>

          <div className="sec-head" id="sec-commit">
            <h2>We commit</h2>
          </div>

          <ol className="tenets commit">
            {commitments.map((item) => (
              <li key={item.lead}>
                <span className="lead">{item.lead}</span>
                <span className="body">{item.body}</span>
              </li>
            ))}
          </ol>

          <div className="closing" id="sec-closing">
            <p className="big closing-line-primary">{closingLines[0]}</p>
            <p className="big closing-line-secondary">
              {closingLines[1]} <em>{closingLines[2]}</em>
            </p>
          </div>
        </div>
      </main>

      <SignaturesSection initialSignatures={signatures} />

      <footer className="colophon">
        <div className="rule"></div>
        Built with <span className="heart">♥</span> by <a href="https://www.drupal.org/u/schnitzel" rel="noopener noreferrer" target="_blank">Schnitzel</a> with the help of AI and hosted on <a href="https://www.amazee.io/" rel="noopener noreferrer" target="_blank">amazee.io</a>
      </footer>
    </>
  );
}