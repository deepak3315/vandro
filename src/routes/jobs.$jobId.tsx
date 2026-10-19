import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  MapPin,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import { SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import { getJob, submitApplication, type Job } from "@/lib/careers-api";
import { pageHead } from "@/lib/site-content";

export const Route = createFileRoute("/jobs/$jobId")({
  head: () =>
    pageHead(
      "Job opportunity",
      "Explore a current career opportunity with VANDRO.",
    ),
  component: JobDetail,
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const [job, setJob] = useState<Job>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState("");
  const uploadAttempt = useRef<
    { idempotencyKey: string; uploadToken: string } | undefined
  >(undefined);

  useEffect(() => {
    let active = true;
    getJob(jobId)
      .then(({ job: result }) => {
        if (active) setJob(result);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Opportunity not found.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [jobId]);

  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) return;
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const resume = data.get("resume");
    if (!(resume instanceof File) || resume.size === 0) {
      setError("Please choose a PDF or DOCX resume.");
      return;
    }
    setSubmitting(true);
    try {
      const attempt = uploadAttempt.current ?? {
        idempotencyKey: crypto.randomUUID(),
        uploadToken: crypto.randomUUID(),
      };
      uploadAttempt.current = attempt;
      await submitApplication(
        {
          jobId: job.jobId,
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          phone: String(data.get("phone") ?? ""),
          message: String(data.get("message") ?? ""),
        },
        resume,
        setProgress,
        attempt,
      );
      uploadAttempt.current = undefined;
      setSubmitted(true);
      setProgress("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Application could not be submitted.",
      );
      setProgress("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteLayout>
      {loading ? (
        <section className="careers-detail shell">
          <p role="status">Loading opportunity…</p>
        </section>
      ) : !job ? (
        <section className="careers-detail shell">
          <p className="careers-error" role="alert">
            {error}
          </p>
          <a className="careers-back-link" href="/jobs">
            <ArrowLeft size={15} /> Back to careers
          </a>
        </section>
      ) : (
        <section className="careers-detail shell">
          <a className="careers-back-link" href="/jobs">
            <ArrowLeft size={15} aria-hidden="true" /> All opportunities
          </a>
          <div className="careers-detail-grid">
            <article className="careers-detail-copy">
              <span className="careers-job-department">{job.department}</span>
              <h1>{job.title}</h1>
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
              <p className="careers-job-summary">{job.summary}</p>
              <h2>About the role</h2>
              <p className="careers-preserve-lines">{job.description}</p>
              <h2>What you’ll bring</h2>
              <p className="careers-preserve-lines">{job.requirements}</p>
            </article>
            <aside
              className="careers-apply-panel"
              aria-labelledby="application-heading"
            >
              {submitted ? (
                <div className="careers-success" role="status">
                  <span className="eyebrow">APPLICATION RECEIVED</span>
                  <h2>Thank you for taking the next step.</h2>
                  <p>
                    Your application is safely recorded. A confirmation email
                    will arrive once processing completes.
                  </p>
                  <a className="careers-action" href="/jobs">
                    Explore other roles <ArrowUpRight size={16} />
                  </a>
                </div>
              ) : (
                <>
                  <span className="eyebrow">TAKE THE NEXT STEP</span>
                  <h2 id="application-heading">Apply for this role</h2>
                  <form className="careers-form" onSubmit={apply}>
                    <label>
                      Full name
                      <input
                        name="name"
                        autoComplete="name"
                        required
                        maxLength={120}
                        onChange={() => {
                          uploadAttempt.current = undefined;
                        }}
                      />
                    </label>
                    <label>
                      Email address
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        onChange={() => {
                          uploadAttempt.current = undefined;
                        }}
                      />
                    </label>
                    <label>
                      Phone number
                      <input
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        maxLength={40}
                        onChange={() => {
                          uploadAttempt.current = undefined;
                        }}
                      />
                    </label>
                    <label>
                      A note for our team{" "}
                      <span className="careers-optional">(optional)</span>
                      <textarea
                        name="message"
                        rows={4}
                        maxLength={4000}
                        onChange={() => {
                          uploadAttempt.current = undefined;
                        }}
                      />
                    </label>
                    <label>
                      Resume{" "}
                      <span className="careers-optional">
                        PDF or DOCX, up to 5 MB
                      </span>
                      <input
                        name="resume"
                        type="file"
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        required
                        onChange={() => {
                          uploadAttempt.current = undefined;
                        }}
                      />
                    </label>
                    {error && (
                      <p className="careers-error" role="alert">
                        {error}
                      </p>
                    )}
                    {progress && <p role="status">{progress}</p>}
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="careers-submit"
                    >
                      {submitting ? "Submitting…" : "Submit application"}
                      <ArrowUpRight size={16} />
                    </Button>
                    <small>
                      Your application and resume are shared only with the
                      VANDRO recruitment team.
                    </small>
                  </form>
                </>
              )}
            </aside>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
