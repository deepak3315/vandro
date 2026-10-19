import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Layers3,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { SectionLabel } from "@/components/site/layout";
import approachTeam from "@/assets/approach-team-reference.png";

const principles = [
  { icon: UsersRound, label: "PEOPLE", detail: "Build potential" },
  { icon: Layers3, label: "CAPABILITIES", detail: "Create opportunities" },
  { icon: TrendingUp, label: "TECHNOLOGY", detail: "Drive growth" },
];

export function ApproachSection() {
  return (
    <section className="approach-section">
      <div className="shell approach-layout">
        <div className="approach-visual">
          <img
            className="approach-photo"
            src={approachTeam}
            alt="Four professionals collaborating around a laptop in a sunlit modern office"
            width="763"
            height="493"
            loading="lazy"
          />
          <div className="approach-caption">
            <div className="approach-caption-intro">
              <strong>CONNECTED BY PEOPLE.</strong>
              <p>Ideas, skills, and opportunities that create real progress.</p>
            </div>
            <div className="approach-caption-principles">
              {principles.map(({ icon: Icon, label, detail }) => (
                <div className="approach-caption-principle" key={label}>
                  <Icon aria-hidden="true" size={22} strokeWidth={1.7} />
                  <strong>{label}</strong>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="approach-copy">
          <div className="approach-eyebrow">
            <SectionLabel>THE VANDRO APPROACH</SectionLabel>
            <span className="approach-eyebrow-rule" aria-hidden="true" />
            <span className="approach-edition">01 / 03</span>
          </div>
          <h2>
            Progress starts
            <br />
            <span>with people.</span>
          </h2>
          <span className="approach-heading-rule" aria-hidden="true" />
          <p>
            Behind every business breakthrough is the right team. Behind every
            career milestone is the right opportunity.
          </p>
          <p>
            At VANDRO Private Limited, we bring the two together—connecting
            talent, building capabilities, and making technology work for your
            ambitions.
          </p>
          <div className="approach-values">
            <div className="approach-value">
              <span className="approach-value-icon">
                <UsersRound aria-hidden="true" size={25} strokeWidth={1.6} />
              </span>
              <span>
                <strong>People-first thinking</strong>
                <small>Real people. Real progress.</small>
              </span>
            </div>
            <span className="approach-values-divider" aria-hidden="true" />
            <div className="approach-value">
              <span className="approach-value-icon">
                <Target aria-hidden="true" size={25} strokeWidth={1.6} />
              </span>
              <span>
                <strong>Purpose-led solutions</strong>
                <small>Opportunities with impact.</small>
              </span>
            </div>
          </div>
          <Link to="/about" className="approach-link">
            Get to know VANDRO <ArrowUpRight aria-hidden="true" size={19} />
          </Link>
        </div>
      </div>
    </section>
  );
}
