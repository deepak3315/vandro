import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout, SectionLabel } from "@/components/site/layout";
import { pageHead } from "@/lib/site-content";
import team from "@/assets/team.jpg";
import approachTeam from "@/assets/approach-team-reference.png";
import financeImage from "@/assets/industry-finance.jpg";
import educationImage from "@/assets/industry-education.jpg";
import retailImage from "@/assets/industry-retail.jpg";

const industries = [
  {
    number: "01",
    title: "Technology",
    headline: "Technology that moves businesses forward.",
    description:
      "The technology sector evolves constantly, creating new demands for specialized skills, reliable infrastructure, and adaptable teams. Vandro supports technology businesses by helping them connect with talent, strengthen technical capabilities, and navigate changing business needs.",
    areas: [
      "Software and application development",
      "Cloud infrastructure and modernization",
      "Technical talent and workforce needs",
      "Digital transformation and technology enablement",
    ],
    image: approachTeam,
    alt: "Technology professionals collaborating around a laptop in a modern office",
  },
  {
    number: "02",
    title: "Finance",
    headline: "Enabling progress in a technology-driven financial world.",
    description:
      "Financial organizations depend on capable people, reliable systems, and technology that supports changing business demands. Vandro aims to support this environment by helping organizations strengthen their technical capabilities, access relevant talent, and pursue practical technology improvements.",
    areas: [
      "Financial technology and digital platforms",
      "Technical talent and specialist skills",
      "Cloud infrastructure and modernization",
      "Technology capability and operational improvement",
    ],
    image: financeImage,
    alt: "Contemporary financial district buildings representing finance and business technology",
  },
  {
    number: "03",
    title: "Education & Training",
    headline: "Building skills for what comes next.",
    description:
      "Learning creates opportunities when knowledge connects with practical experience. Vandro supports education and professional development by helping individuals strengthen technical skills, explore career pathways, and prepare for changing industry requirements.",
    areas: [
      "Technical and professional learning",
      "Practical, hands-on technology training",
      "Digital skills and career readiness",
      "Continuous learning and upskilling",
    ],
    image: educationImage,
    alt: "Learners working together on a practical exercise in a study environment",
  },
  {
    number: "04",
    title: "Retail & E-commerce",
    headline: "Supporting the next generation of digital commerce.",
    description:
      "Retail and e-commerce businesses operate in a fast-moving digital environment where customer expectations, platforms, and operations continue to evolve. Vandro supports these businesses by helping them strengthen technology capabilities, access relevant skills, and build a foundation for sustainable digital growth.",
    areas: [
      "E-commerce platforms and digital experiences",
      "Cloud infrastructure and scalability",
      "Technology talent and digital capabilities",
      "Systems integration and operational efficiency",
    ],
    image: retailImage,
    alt: "Retail team member using a digital point-of-sale system with a customer",
  },
];

export const Route = createFileRoute("/industries")({
  head: () =>
    pageHead(
      "Industries We Serve",
      "VANDRO works across technology, finance, education and training, and retail and e-commerce.",
    ),
  component: Industries,
});

function Industries() {
  return (
    <SiteLayout>
      <div className="industries-page">
        <section className="industries-hero">
          <div className="shell industries-hero-layout">
            <div className="industries-hero-copy">
              <SectionLabel>INDUSTRIES WE SERVE</SectionLabel>
              <h1>
                Different industries.
                <br />
                <span>Shared ambition.</span>
              </h1>
              <p>
                Every industry has its own challenges and opportunities. We work
                across technology, finance, education and training, and retail
                and e-commerce, helping organizations respond to changing needs
                through people, skills, and technology.
              </p>
            </div>
            <img
              className="industries-hero-image"
              src={team}
              alt="Professionals collaborating around a laptop in a modern office"
              width={1536}
              height={1024}
              fetchPriority="high"
            />
          </div>
        </section>

        <section
          className="industries-offerings"
          aria-label="Industries VANDRO serves"
        >
          <div className="shell">
            {industries.map((industry, index) => (
              <article
                className={`industries-offering${index % 2 ? " industries-offering-reverse" : ""}`}
                key={industry.number}
              >
                <div className="industries-offering-copy">
                  <span className="industries-offering-number">
                    {industry.number}
                  </span>
                  <h2>{industry.title}</h2>
                  <h3>{industry.headline}</h3>
                  <p>{industry.description}</p>
                  <ul className="industries-offering-areas">
                    {industry.areas.map((area) => (
                      <li key={area}>{area}</li>
                    ))}
                  </ul>
                </div>
                <img
                  className="industries-offering-image"
                  src={industry.image}
                  alt={industry.alt}
                  loading="lazy"
                />
              </article>
            ))}
          </div>
        </section>
      </div>
    </SiteLayout>
  );
}
