import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/layout";
import teamImage from "@/assets/team.jpg";
import trainingImage from "@/assets/industry-education.jpg";
import careerImage from "@/assets/service-career-reference.png";
import cloudImage from "@/assets/cloud.jpg";
import { pageHead } from "@/lib/site-content";

const servicePanels = [
  {
    id: "staffing",
    number: "01",
    title: "IT Staffing",
    headline: "Connecting the right people with the right opportunities.",
    description:
      "We help businesses find skilled technology professionals who match their technical requirements, team needs, and long-term goals. From contract to full-time roles, we focus on meaningful connections between talent and opportunity.",
    points: [
      "Contract and permanent hiring",
      "Specialized technology talent",
      "Scalable resourcing solutions",
      "Candidate screening and placement",
    ],
    image: teamImage,
    imageAlt:
      "Technology professionals collaborating around a laptop in a modern office",
    imageFirst: false,
  },
  {
    id: "training",
    number: "02",
    title: "Training Programs",
    headline: "Practical skills for real-world opportunities.",
    description:
      "We offer industry-relevant training programs in key technical skills, designed to help individuals build strong foundations and stay current with industry needs. Our programs focus on practical learning, hands-on experience, and career readiness.",
    points: [
      "Technical skills development",
      "Hands-on practical learning",
      "Industry-aligned training paths",
      "Career-focused preparation",
    ],
    image: trainingImage,
    imageAlt:
      "Learners collaborating around a laptop in a professional training environment",
    imageFirst: true,
  },
  {
    id: "career",
    number: "03",
    title: "Career Development",
    headline: "Guidance for every step forward.",
    description:
      "We support individuals through personalized guidance, one-to-one mentoring, and career development support. Whether you're exploring new opportunities or planning your next move, we help you build the skills, confidence, and direction to achieve your career goals.",
    points: [
      "Career planning and guidance",
      "Resume and profile development",
      "Interview preparation",
      "One-to-one mentoring",
    ],
    image: careerImage,
    imageAlt:
      "Professional considering their next career step in a modern city office",
    imageFirst: false,
  },
  {
    id: "cloud",
    number: "04",
    title: "Cloud Solutions",
    headline: "Build, migrate, and scale with confidence.",
    description:
      "We help businesses design, implement, and manage cloud solutions that are secure, scalable, and aligned with their goals. From cloud migration and platform selection to infrastructure setup and ongoing support, we enable modern, reliable technology environments.",
    points: [
      "Cloud strategy and migration",
      "Infrastructure and integration",
      "Platform selection and optimization",
      "Ongoing support and management",
    ],
    image: cloudImage,
    imageAlt: "Server racks in a modern cloud infrastructure environment",
    imageFirst: true,
  },
] as const;

export const Route = createFileRoute("/services")({
  head: () =>
    pageHead(
      "Our Services",
      "Explore IT staffing, training programs, career development, and cloud solutions from VANDRO.",
    ),
  component: Services,
});

function Services() {
  const router = useRouter();

  useLayoutEffect(() => {
    const scrollToHash = (hash: string) => {
      if (!hash) return;

      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      target?.scrollIntoView({ behavior: "instant", block: "start" });
    };

    scrollToHash(window.location.hash);

    return router.subscribe("onRendered", ({ toLocation }) => {
      if (toLocation.pathname === "/services") {
        scrollToHash(toLocation.hash);
      }
    });
  }, [router]);

  return (
    <SiteLayout>
      <section
        className="industries-offerings services-offerings"
        aria-label="VANDRO services"
      >
        <div className="shell">
          {servicePanels.map((service) => (
            <article
              id={service.id}
              key={service.id}
              className={`industries-offering${service.imageFirst ? " industries-offering-reverse" : ""}`}
              aria-labelledby={`${service.id}-title`}
            >
              <div className="industries-offering-copy">
                <span className="industries-offering-number">
                  {service.number}
                </span>
                <h2 id={`${service.id}-title`}>{service.title}</h2>
                <h3>{service.headline}</h3>
                <p>{service.description}</p>
                <ul className="industries-offering-areas">
                  {service.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
              <img
                className="industries-offering-image"
                src={service.image}
                alt={service.imageAlt}
                loading="lazy"
              />
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
