import { ArrowRight } from "lucide-react";
import { SectionLabel } from "@/components/site/layout";

const steps = [
  {
    title: "Understand",
    description:
      "We listen to your goals, your challenges, and where you want to go.",
  },
  {
    title: "Connect",
    description:
      "We identify the talent, expertise, or learning path that fits your needs.",
  },
  {
    title: "Prepare",
    description:
      "We align skills, evaluate readiness, and build a foundation for success.",
  },
  {
    title: "Move forward",
    description: "We support your next step and keep the conversation going.",
  },
];

export function HowWeWork() {
  return (
    <section className="work-section">
      <div className="shell">
        <SectionLabel>HOW WE WORK</SectionLabel>
        <div className="work-heading">
          <h2>
            A clear path.
            <br />
            <span>A meaningful partnership.</span>
          </h2>
          <p>
            From the first conversation to the next milestone, we stay focused
            on what matters to you.
          </p>
        </div>
        <div className="work-steps">
          {steps.map((step, index) => (
            <article className="work-step" key={step.title}>
              <div className="work-step-number">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <span aria-hidden="true" />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <ArrowRight className="work-step-arrow" aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
