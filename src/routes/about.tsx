import { createFileRoute } from "@tanstack/react-router";
import { UsersRound, MessageCircle, TrendingUp } from "lucide-react";
import { SiteLayout, SectionLabel } from "@/components/site/layout";
import approachTeam from "@/assets/approach-team-reference.png";
import team from "@/assets/team.jpg";
import { pageHead } from "@/lib/site-content";

const values = [
  {
    title: "People first",
    description:
      "Every successful engagement starts with people. We take time to understand individual ambitions, business needs, and the teams behind every opportunity.",
    Icon: UsersRound,
  },
  {
    title: "Clarity always",
    description:
      "We value honest conversations, clear expectations, and practical guidance so everyone understands the path ahead.",
    Icon: MessageCircle,
  },
  {
    title: "Progress together",
    description:
      "We believe better outcomes come from collaboration. We build relationships around shared goals, continuous learning, and long-term progress.",
    Icon: TrendingUp,
  },
];

const outcomes = [
  {
    title: "Meaningful opportunities",
    description: "for individuals at every stage.",
  },
  {
    title: "Stronger, future-ready teams",
    description: "for businesses across industries.",
  },
  {
    title: "A more capable tomorrow",
    description: "through people, skills, and technology.",
  },
];

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead(
      "About VANDRO",
      "We connect talent, technology, and opportunity to help individuals grow and businesses move forward.",
    ),
  component: About,
});

function About() {
  return (
    <SiteLayout>
      <div className="about-page">
        <section className="about-hero">
          <div className="shell about-hero-layout">
            <div className="about-hero-copy">
              <SectionLabel>ABOUT VANDRO</SectionLabel>
              <h1>
                People at the heart.
                <br />
                <span>Progress on the horizon.</span>
              </h1>
              <p>
                We bring people, skills, and technology together to help
                individuals grow and businesses move forward.
              </p>
            </div>
            <div className="about-hero-image">
              <img
                src={team}
                alt="Colleagues sharing ideas around a laptop in a bright office"
                width={1536}
                height={1024}
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section className="about-who">
          <div className="shell about-who-layout">
            <div className="about-who-copy">
              <SectionLabel>OUR PURPOSE</SectionLabel>
              <h2>Connecting potential with possibility.</h2>
              <p>
                VANDRO Private Limited brings IT staffing, training programs,
                career development, and cloud solutions together to help people
                and businesses take their next step with greater clarity.
              </p>
              <p>
                We believe meaningful progress starts with understanding. For
                businesses, that means identifying the right talent, skills, and
                technology to support their goals. For professionals, it means
                finding opportunities to learn, grow, and build a future with
                purpose.
              </p>
              <p>
                Our approach is practical and people-focused: understand the
                need, identify the opportunity, and work towards a solution that
                creates lasting value.
              </p>
            </div>
            <img
              className="about-who-image"
              src={approachTeam}
              alt="A team collaborating around a laptop in their office"
              width={763}
              height={493}
              loading="lazy"
            />
          </div>
        </section>

        <section className="about-values">
          <div className="shell">
            <div className="about-values-heading">
              <SectionLabel>WHAT GUIDES US</SectionLabel>
              <h2>
                A considered approach.
                <br />
                <span>An enduring commitment.</span>
              </h2>
            </div>
            <div className="about-values-grid">
              {values.map(({ title, description, Icon }) => (
                <article className="about-value" key={title}>
                  <Icon
                    className="about-value-icon"
                    aria-hidden="true"
                    size={24}
                    strokeWidth={1.5}
                  />
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="about-commitment">
          <div className="shell about-commitment-layout">
            <div className="about-commitment-copy">
              <SectionLabel>OUR COMMITMENT</SectionLabel>
              <h2>Every connection should create progress.</h2>
              <p>
                We strive to make opportunities more accessible, talent
                connections more meaningful, and business challenges easier to
                navigate through collaboration and innovative solutions.
              </p>
            </div>
            <ul className="about-outcomes">
              {outcomes.map(({ title, description }) => (
                <li key={title}>
                  <span aria-hidden="true" />
                  <p>
                    <strong>{title}</strong> — {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
