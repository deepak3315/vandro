import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { resources } from "@/lib/resources-content";
import { pageHead } from "@/lib/site-content";

export const Route = createFileRoute("/resources/$articleId")({
  head: ({ params }) => {
    const article = resources.find((item) => item.id === params.articleId);
    return pageHead(
      article?.title ?? "Resource not found",
      article?.summary ?? "This resource could not be found.",
    );
  },
  component: ResourceArticle,
});

function ResourceArticle() {
  const { articleId } = Route.useParams();
  const article = resources.find((item) => item.id === articleId);

  if (!article) {
    return (
      <SiteLayout>
        <section className="resource-not-found shell">
          <p role="alert">This resource could not be found.</p>
          <Link to="/resources" className="resource-back-link">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Resources
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <article className="resource-detail">
        <header className="resource-detail-header shell">
          <Link to="/resources" className="resource-back-link">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Resources
          </Link>
          <div className="resource-detail-meta">
            <span className="resource-category">{article.category}</span>
            <time dateTime="2026-10-20">{article.publishedAt}</time>
          </div>
          <h1>{article.title}</h1>
          <p className="resource-detail-summary">{article.summary}</p>
        </header>
        <div className="resource-detail-image shell">
          <img src={article.image} alt={article.imageAlt} />
        </div>
        <div className="resource-detail-body">
          {article.content.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
          {article.sources.length > 0 && (
            <section className="resource-sources" aria-labelledby="sources">
              <h2 id="sources">Further reading</h2>
              <ul>
                {article.sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Link to="/resources" className="resource-back-link">
            <ArrowLeft size={16} aria-hidden="true" /> Back to Resources
          </Link>
        </div>
      </article>
    </SiteLayout>
  );
}
