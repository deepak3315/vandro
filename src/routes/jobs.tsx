import { useEffect, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, MapPin, Search } from "lucide-react";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";

import { PageIntro, SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { listJobs, type Job } from "@/lib/careers-api";
import { pageHead } from "@/lib/site-content";

export const Route = createFileRoute("/jobs")({
  head: () =>
    pageHead(
      "Careers & Opportunities",
      "Explore open technology roles and take a considered next step in your career with VANDRO.",
    ),
  component: Careers,
});

function Careers() {
  const matches = useMatches();
  if (matches.some((match) => match.routeId === "/jobs/$jobId")) {
    return <Outlet />;
  }

  return <CareersListing />;
}

function CareersListing() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string>();

  useEffect(() => {
    let active = true;
    listJobs()
      .then((result) => {
        if (active) {
          setJobs(result.jobs);
          setNextCursor(result.nextCursor);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Careers are unavailable.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function loadMore() {
    if (!nextCursor) return;
    setError("");
    try {
      const result = await listJobs(nextCursor);
      setJobs((current) => [...current, ...result.jobs]);
      setNextCursor(result.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "More opportunities could not be loaded.",
      );
    }
  }

  return (
    <SiteLayout>
      <PageIntro
        label="CAREERS & OPPORTUNITIES"
        title="Your potential. A world of possibility."
        description="Take a considered next step in your technology career."
      />
      <section
        className="shell careers-content"
        aria-label="Current opportunities"
      >
        <div className="careers-listing">
          <div className="careers-section-heading">
            <div>
              <div className="eyebrow">CURRENT OPPORTUNITIES</div>
              <h2>Find your next opportunity.</h2>
            </div>
            <span className="careers-count">
              {jobs.length} {jobs.length === 1 ? "role" : "roles"}
            </span>
          </div>
          {loading ? (
            <p className="careers-status" role="status">
              Loading current openings…
            </p>
          ) : error ? (
            <p className="careers-status careers-error" role="alert">
              {error}
            </p>
          ) : jobs.length ? (
            <div className="careers-job-list">
              {jobs.map((job) => (
                <article className="careers-job-card" key={job.jobId}>
                  <div>
                    <span className="careers-job-department">
                      {job.department}
                    </span>
                    <h3>{job.title}</h3>
                    <p>{job.summary}</p>
                    <div className="careers-job-meta">
                      <span>
                        <MapPin size={14} aria-hidden="true" />
                        {job.location}
                      </span>
                      <span>
                        <BriefcaseBusiness size={14} aria-hidden="true" />
                        {job.employmentType} · {job.workMode}
                      </span>
                    </div>
                  </div>
                  <a
                    className="careers-action careers-job-link"
                    href={`/jobs/${encodeURIComponent(job.jobId)}`}
                    aria-label={`View ${job.title}`}
                  >
                    View opportunity{" "}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </article>
              ))}
              {nextCursor && (
                <button
                  className="careers-action careers-load-more"
                  type="button"
                  onClick={() => void loadMore()}
                >
                  Load more opportunities{" "}
                  <ArrowUpRight size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : (
            <div className="vacancies">
              <Search size={32} strokeWidth={1.3} aria-hidden="true" />
              <h2>New opportunities are on the horizon.</h2>
              <p>
                There are no published vacancies at the moment. Check back for
                future openings.
              </p>
            </div>
          )}
        </div>
        <div className="career-next">
          <h2>Make your next move count.</h2>
          <p>
            Develop your skills, sharpen your profile, and prepare for the
            opportunities ahead.
          </p>
          <Button asChild variant="outline">
            <a href="/services#career">
              Explore career support <ArrowUpRight />
            </a>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
