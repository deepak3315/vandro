import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteLayout, ConnectBand } from "@/components/site/layout";
import { ServicesOverview } from "@/components/site/services";
import { Button } from "@/components/ui/button";
import { pageHead, services } from "@/lib/site-content";
export const Route = createFileRoute("/services")({
  head: () =>
    pageHead(
      "Our Services",
      "Explore IT staffing, training programs, career development, and cloud solutions from VANDRO.",
    ),
  component: Services,
});
function Services() {
  return (
    <SiteLayout>
      <ServicesOverview />
      <div className="shell service-details">
        {services.map((s) => (
          <section id={s.id} key={s.id} className="service-detail">
            <div>
              <span className="detail-number">{s.number}</span>
              <h2>{s.title}</h2>
              <h3>{s.label}</h3>
            </div>
            <div>
              <p>{s.detail}</p>
              <ul>
                {s.points.map((p) => (
                  <li key={p}>
                    <Check size={17} />
                    {p}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline">
                <Link to="/contact">
                  Discuss {s.title.toLowerCase()} <ArrowUpRight />
                </Link>
              </Button>
            </div>
          </section>
        ))}
      </div>
      <ConnectBand />
    </SiteLayout>
  );
}
