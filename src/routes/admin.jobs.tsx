import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowUpRight, LogOut, RefreshCw } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

import { PageIntro, SiteLayout } from "@/components/site/layout";
import { Button } from "@/components/ui/button";
import {
  adminApi,
  beginAdminLogin,
  endAdminSession,
  finishAdminLogin,
  hasAdminSession,
  type Application,
  type Job,
} from "@/lib/careers-api";
import { pageHead } from "@/lib/site-content";

type JobFields = Pick<
  Job,
  | "title"
  | "department"
  | "location"
  | "employmentType"
  | "workMode"
  | "summary"
  | "description"
  | "requirements"
>;

const blankJob: JobFields = {
  title: "",
  department: "",
  location: "",
  employmentType: "Full-time",
  workMode: "Hybrid",
  summary: "",
  description: "",
  requirements: "",
};

function applicationStatus(value: string): Application["status"] | undefined {
  switch (value) {
    case "NEW":
      return "NEW";
    case "REVIEWING":
      return "REVIEWING";
    case "INTERVIEW":
      return "INTERVIEW";
    case "REJECTED":
      return "REJECTED";
    case "HIRED":
      return "HIRED";
    case "WITHDRAWN":
      return "WITHDRAWN";
    default:
      return undefined;
  }
}

export const Route = createFileRoute("/admin/jobs")({
  head: () =>
    pageHead(
      "Careers Admin",
      "Manage VANDRO careers opportunities and applications.",
    ),
  component: CareersAdmin,
});

function CareersAdmin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationCursor, setApplicationCursor] = useState<string>();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobFields, setJobFields] = useState<JobFields>(blankJob);
  const [selectedApplication, setSelectedApplication] = useState<string>();
  const [applicationDetailRevision, setApplicationDetailRevision] = useState(0);
  const [applicationDetail, setApplicationDetail] = useState<{
    application: Application;
    resumeUrl?: string;
  }>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        await finishAdminLogin(window.location.search);
        if (active) setAuthenticated(hasAdminSession());
      } catch (reason) {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Admin sign-in failed.",
          );
      } finally {
        if (active) setAuthReady(true);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  const reloadDashboard = useCallback(async () => {
    setError("");
    try {
      const [jobResult, applicationResult] = await Promise.all([
        adminApi<{ jobs: Job[] }>("/admin/jobs"),
        adminApi<{ applications: Application[]; nextCursor?: string }>(
          "/admin/applications",
        ),
      ]);
      setJobs(jobResult.jobs);
      setApplications(applicationResult.applications);
      setApplicationCursor(applicationResult.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load admin data.",
      );
    }
  }, []);

  useEffect(() => {
    if (authenticated) void reloadDashboard();
  }, [authenticated, reloadDashboard]);

  useEffect(() => {
    if (!authenticated || !selectedApplication) {
      setApplicationDetail(undefined);
      return;
    }
    let active = true;
    adminApi<{ application: Application; resumeUrl?: string }>(
      `/admin/applications/${encodeURIComponent(selectedApplication)}`,
    )
      .then((result) => {
        if (active) setApplicationDetail(result);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load application.",
          );
      });
    return () => {
      active = false;
    };
  }, [authenticated, selectedApplication, applicationDetailRevision]);

  async function loadMoreApplications() {
    if (!applicationCursor) return;
    setError("");
    try {
      const result = await adminApi<{
        applications: Application[];
        nextCursor?: string;
      }>(`/admin/applications?cursor=${encodeURIComponent(applicationCursor)}`);
      setApplications((current) => [...current, ...result.applications]);
      setApplicationCursor(result.nextCursor);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "More applications could not be loaded.",
      );
    }
  }

  async function login() {
    setError("");
    try {
      await beginAdminLogin();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not start admin sign-in.",
      );
    }
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = new FormData(event.currentTarget);
      const fields: JobFields = {
        title: String(data.get("title") ?? ""),
        department: String(data.get("department") ?? ""),
        location: String(data.get("location") ?? ""),
        employmentType: String(data.get("employmentType") ?? ""),
        workMode: String(data.get("workMode") ?? ""),
        summary: String(data.get("summary") ?? ""),
        description: String(data.get("description") ?? ""),
        requirements: String(data.get("requirements") ?? ""),
      };
      const path = selectedJob
        ? `/admin/jobs/${encodeURIComponent(selectedJob.jobId)}`
        : "/admin/jobs";
      await adminApi(path, selectedJob ? "PUT" : "POST", fields);
      setNotice(
        selectedJob ? "Opportunity updated." : "Draft opportunity created.",
      );
      setSelectedJob(null);
      setJobFields(blankJob);
      await reloadDashboard();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save the opportunity.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeJobStatus(
    job: Job,
    action: "publish" | "close" | "archive",
  ) {
    setError("");
    setNotice("");
    try {
      await adminApi(
        `/admin/jobs/${encodeURIComponent(job.jobId)}/${action}`,
        "POST",
      );
      setNotice(
        action === "publish"
          ? "Opportunity published."
          : action === "close"
            ? "Opportunity closed."
            : "Opportunity archived.",
      );
      await reloadDashboard();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update opportunity status.",
      );
    }
  }

  async function updateApplicationStatus(status: Application["status"]) {
    if (!selectedApplication) return;
    setError("");
    try {
      await adminApi(
        `/admin/applications/${encodeURIComponent(selectedApplication)}`,
        "PUT",
        { status },
      );
      setNotice("Application status updated.");
      await reloadDashboard();
      const result = await adminApi<{
        application: Application;
        resumeUrl?: string;
      }>(`/admin/applications/${encodeURIComponent(selectedApplication)}`);
      setApplicationDetail(result);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not update application status.",
      );
    }
  }

  async function retryEmail() {
    if (!selectedApplication) return;
    setError("");
    try {
      await adminApi(
        `/admin/applications/${encodeURIComponent(selectedApplication)}/notify`,
        "POST",
      );
      setNotice("Notification retry queued.");
      await reloadDashboard();
      const result = await adminApi<{
        application: Application;
        resumeUrl?: string;
      }>(`/admin/applications/${encodeURIComponent(selectedApplication)}`);
      setApplicationDetail(result);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not queue notification.",
      );
    }
  }

  function editJob(job: Job) {
    setSelectedJob(job);
    setJobFields({
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employmentType,
      workMode: job.workMode,
      summary: job.summary,
      description: job.description,
      requirements: job.requirements,
    });
  }

  return (
    <SiteLayout>
      <PageIntro
        label="VANDRO CAREERS"
        title="Opportunity, thoughtfully managed."
        description="A private workspace for managing open roles and candidate applications."
      />
      {!authReady ? (
        <section className="shell careers-admin-login">
          <p role="status">Checking administrator access…</p>
        </section>
      ) : !authenticated ? (
        <section className="shell careers-admin-login">
          <span className="eyebrow">ADMINISTRATOR ACCESS</span>
          <h2>Sign in to the Careers portal.</h2>
          <p>
            Only invited VANDRO administrators can access jobs and candidate
            applications.
          </p>
          {error && (
            <p className="careers-error" role="alert">
              {error}
            </p>
          )}
          <Button onClick={login}>
            Continue with secure sign-in <ArrowUpRight size={16} />
          </Button>
        </section>
      ) : (
        <section className="shell careers-admin">
          <div className="careers-admin-toolbar">
            <div>
              <span className="eyebrow">PRIVATE ADMIN</span>
              <h2>Careers dashboard</h2>
            </div>
            <div className="careers-admin-toolbar-actions">
              <button
                className="careers-action"
                type="button"
                onClick={() => {
                  void reloadDashboard();
                  setApplicationDetailRevision((revision) => revision + 1);
                }}
              >
                <RefreshCw size={15} /> Refresh
              </button>
              <button
                className="careers-action"
                type="button"
                onClick={endAdminSession}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          </div>
          {(error || notice) && (
            <p
              className={error ? "careers-error" : "careers-notice"}
              role={error ? "alert" : "status"}
            >
              {error || notice}
            </p>
          )}
          <div className="careers-admin-grid">
            <section className="careers-admin-panel">
              <div className="careers-admin-panel-heading">
                <div>
                  <span className="eyebrow">OPPORTUNITIES</span>
                  <h3>Manage job postings</h3>
                </div>
                <button
                  className="careers-action"
                  type="button"
                  onClick={() => {
                    setSelectedJob(null);
                    setJobFields(blankJob);
                  }}
                >
                  New role
                </button>
              </div>
              <form
                className="careers-form careers-admin-job-form"
                onSubmit={saveJob}
              >
                <label>
                  Job title
                  <input
                    name="title"
                    required
                    maxLength={120}
                    value={jobFields.title}
                    onChange={(e) =>
                      setJobFields({ ...jobFields, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Department
                  <input
                    name="department"
                    required
                    maxLength={100}
                    value={jobFields.department}
                    onChange={(e) =>
                      setJobFields({ ...jobFields, department: e.target.value })
                    }
                  />
                </label>
                <label>
                  Location
                  <input
                    name="location"
                    required
                    maxLength={120}
                    value={jobFields.location}
                    onChange={(e) =>
                      setJobFields({ ...jobFields, location: e.target.value })
                    }
                  />
                </label>
                <div className="careers-admin-field-row">
                  <label>
                    Employment
                    <input
                      name="employmentType"
                      required
                      maxLength={50}
                      value={jobFields.employmentType}
                      onChange={(e) =>
                        setJobFields({
                          ...jobFields,
                          employmentType: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Work mode
                    <input
                      name="workMode"
                      required
                      maxLength={50}
                      value={jobFields.workMode}
                      onChange={(e) =>
                        setJobFields({ ...jobFields, workMode: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label>
                  Short summary
                  <textarea
                    name="summary"
                    required
                    maxLength={240}
                    rows={2}
                    value={jobFields.summary}
                    onChange={(e) =>
                      setJobFields({ ...jobFields, summary: e.target.value })
                    }
                  />
                </label>
                <label>
                  About the role
                  <textarea
                    name="description"
                    required
                    maxLength={12000}
                    rows={5}
                    value={jobFields.description}
                    onChange={(e) =>
                      setJobFields({
                        ...jobFields,
                        description: e.target.value,
                      })
                    }
                  />
                </label>
                <label>
                  Requirements
                  <textarea
                    name="requirements"
                    required
                    maxLength={12000}
                    rows={5}
                    value={jobFields.requirements}
                    onChange={(e) =>
                      setJobFields({
                        ...jobFields,
                        requirements: e.target.value,
                      })
                    }
                  />
                </label>
                <Button type="submit" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : selectedJob
                      ? "Save changes"
                      : "Create draft"}
                </Button>
              </form>
              <div className="careers-admin-records">
                {jobs.length ? (
                  jobs.map((job) => (
                    <article className="careers-admin-record" key={job.jobId}>
                      <div>
                        <strong>{job.title}</strong>
                        <span>
                          {job.department} · {job.location}
                        </span>
                        <span
                          className={`careers-status-badge careers-status-${job.status.toLowerCase()}`}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className="careers-admin-record-actions">
                        {job.status !== "ARCHIVED" && (
                          <button
                            className="careers-action"
                            type="button"
                            onClick={() => editJob(job)}
                          >
                            Edit
                          </button>
                        )}
                        {(job.status === "DRAFT" ||
                          job.status === "CLOSED") && (
                          <button
                            className="careers-action"
                            type="button"
                            onClick={() => void changeJobStatus(job, "publish")}
                          >
                            Publish
                          </button>
                        )}
                        {job.status === "PUBLISHED" && (
                          <button
                            className="careers-action"
                            type="button"
                            onClick={() => void changeJobStatus(job, "close")}
                          >
                            Close
                          </button>
                        )}
                        {job.status !== "ARCHIVED" && (
                          <button
                            className="careers-action"
                            type="button"
                            onClick={() => void changeJobStatus(job, "archive")}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <p>No job postings yet. Create a draft to get started.</p>
                )}
              </div>
            </section>

            <section className="careers-admin-panel">
              <div className="careers-admin-panel-heading">
                <div>
                  <span className="eyebrow">CANDIDATES</span>
                  <h3>Review applications</h3>
                </div>
                <span className="careers-count">{applications.length}</span>
              </div>
              {applications.length ? (
                <div className="careers-admin-applications">
                  {applications.map((application) => (
                    <button
                      className={`careers-admin-application${selectedApplication === application.applicationId ? " is-selected" : ""}`}
                      key={application.applicationId}
                      type="button"
                      onClick={() =>
                        setSelectedApplication(application.applicationId)
                      }
                    >
                      <span>
                        <strong>{application.name}</strong>
                        <small>{application.jobTitle}</small>
                      </span>
                      <span
                        className={`careers-status-badge careers-status-${application.status.toLowerCase()}`}
                      >
                        {application.status}
                      </span>
                    </button>
                  ))}
                  {applicationCursor && (
                    <button
                      className="careers-action"
                      type="button"
                      onClick={() => void loadMoreApplications()}
                    >
                      Load more applications
                    </button>
                  )}
                  {applicationDetail && (
                    <article className="careers-application-detail">
                      <span className="eyebrow">APPLICATION DETAILS</span>
                      <h3>{applicationDetail.application.name}</h3>
                      <p>{applicationDetail.application.jobTitle}</p>
                      <p>
                        <a
                          href={`mailto:${applicationDetail.application.email}`}
                        >
                          {applicationDetail.application.email}
                        </a>
                      </p>
                      <p>
                        <a href={`tel:${applicationDetail.application.phone}`}>
                          {applicationDetail.application.phone}
                        </a>
                      </p>
                      {applicationDetail.application.message && (
                        <p className="careers-preserve-lines">
                          {applicationDetail.application.message}
                        </p>
                      )}
                      {applicationDetail.resumeUrl && (
                        <a
                          className="careers-action"
                          href={applicationDetail.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download private resume <ArrowUpRight size={15} />
                        </a>
                      )}
                      <label className="careers-status-select">
                        Application status
                        <select
                          value={applicationDetail.application.status}
                          onChange={(event) => {
                            const status = applicationStatus(
                              event.target.value,
                            );
                            if (status) void updateApplicationStatus(status);
                          }}
                        >
                          {[
                            "NEW",
                            "REVIEWING",
                            "INTERVIEW",
                            "REJECTED",
                            "HIRED",
                            "WITHDRAWN",
                          ].map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      {applicationDetail.application.notificationStatus !==
                        "SENT" && (
                        <button
                          className="careers-action"
                          type="button"
                          onClick={() => void retryEmail()}
                        >
                          Retry email notifications
                        </button>
                      )}
                      <small>
                        Email status:{" "}
                        {applicationDetail.application.notificationStatus}
                      </small>
                    </article>
                  )}
                </div>
              ) : (
                <div className="careers-admin-applications">
                  <p>Applications will appear here when candidates apply.</p>
                  {applicationCursor && (
                    <button
                      className="careers-action"
                      type="button"
                      onClick={() => void loadMoreApplications()}
                    >
                      Load more applications
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>
      )}
    </SiteLayout>
  );
}
