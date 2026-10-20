import {
  createFileRoute,
  Link,
  Outlet,
  useMatches,
} from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageIntro, SiteLayout } from "@/components/site/layout";
import { resources } from "@/lib/resources-content";
import { pageHead } from "@/lib/site-content";

export const Route = createFileRoute("/resources")({
  head: () =>
    pageHead(
      "Resources & Insights",
      "Practical perspectives from VANDRO on careers, learning, talent, and technology.",
    ),
  component: Resources,
});

function Resources() {
  const matches = useMatches();
  if (matches.some((match) => match.routeId === "/resources/$articleId")) {
    return <Outlet />;
  }

  return (
    <SiteLayout>
      <PageIntro
        label="RESOURCES & INSIGHTS"
        title="Ideas for what comes next."
        description="Practical perspectives on people, careers, and technology."
      />
      <section
        className="industries-offerings resources-list"
        aria-label="Resources and insights"
      >
        <div className="shell">
          {resources.map((article, index) => (
            <article
              key={article.id}
              className={`industries-offering resource-panel${index % 2 ? " industries-offering-reverse" : ""}`}
              aria-labelledby={`${article.id}-title`}
            >
              <div className="industries-offering-copy resource-panel-copy">
                <span className="resource-category">{article.category}</span>
                <time
                  className="resource-date"
                  dateTime="2026-10-20"
                  aria-label={`Published ${article.publishedAt}`}
                >
                  {article.publishedAt}
                </time>
                <h2 id={`${article.id}-title`}>{article.title}</h2>
                <p>{article.summary}</p>
                <Link
                  className="resource-read-link"
                  to="/resources/$articleId"
                  params={{ articleId: article.id }}
                >
                  Read article <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <img
                className="industries-offering-image"
                src={article.image}
                alt={article.imageAlt}
                loading="lazy"
              />
            </article>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
