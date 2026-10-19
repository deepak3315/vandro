import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  UsersRound,
  GraduationCap,
  TrendingUp,
  Cloud,
} from "lucide-react";
import { SectionLabel } from "@/components/site/layout";
import team from "@/assets/team.jpg";
import trainingImage from "@/assets/service-training-reference.png";
import careerImage from "@/assets/service-career-reference.png";
import cloudImage from "@/assets/cloud.jpg";
import architectureImage from "@/assets/services-architecture-reference.png";
import { services } from "@/lib/site-content";
const icons = [UsersRound, GraduationCap, TrendingUp, Cloud];
const serviceImages = {
  staffing: {
    src: team,
    alt: "Technology professionals collaborating around a laptop",
  },
  training: {
    src: trainingImage,
    alt: "Warm modern interior with the words Skill Today, Opportunity Tomorrow",
  },
  career: {
    src: careerImage,
    alt: "Professional looking toward a city skyline through office windows at golden hour",
  },
  cloud: {
    src: cloudImage,
    alt: "Rows of server racks in a modern enterprise data center",
  },
} as const;

export function ServicesOverview() {
  return (
    <section
      className="services-section services-page-overview"
      id="what-we-do"
    >
      <img
        className="services-architecture-background"
        src={architectureImage}
        alt=""
        aria-hidden="true"
      />
      <div className="shell">
        <div className="section-heading services-heading">
          <div>
            <SectionLabel>WHAT WE DO</SectionLabel>
            <h1 className="services-page-title">
              Built for your
              <br />
              <span>next move.</span>
            </h1>
          </div>
          <span className="services-divider" aria-hidden="true" />
          <div className="section-heading-right">
            <p>
              Great talent. Relevant skills. Smarter technology. Four ways we
              help you move forward.
            </p>
            <Link to="/services" className="text-link">
              All our services <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <ServicesGrid />
      </div>
    </section>
  );
}

export function ServicesGrid() {
  return (
    <div className="services-grid">
      {services.map((service, index) => {
        const Icon = icons[index] ?? Cloud;
        const image = serviceImages[service.id];

        return (
          <Link
            to="/services"
            hash={service.id}
            className={`service-card service-${service.id}`}
            key={service.id}
          >
            <div className="service-image">
              <img src={image.src} alt={image.alt} loading="lazy" />
              <span className="service-icon">
                <Icon size={20} strokeWidth={1.5} />
              </span>
            </div>
            <div className="service-card-content">
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <div className="service-link">
                <span>Explore service</span>
                <span className="service-link-arrow">
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
