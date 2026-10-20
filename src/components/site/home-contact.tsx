import { useState, type FormEvent } from "react";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { SectionLabel } from "@/components/site/layout";
import { submitContactEnquiry } from "@/lib/careers-api";

export function HomeContact() {
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || isSubmitting) return;
    const fields = new FormData(form);
    setIsSubmitting(true);
    setStatus("");
    try {
      const result = await submitContactEnquiry({ name: String(fields.get("name") ?? "").trim(), email: String(fields.get("email") ?? "").trim(), phone: String(fields.get("phone") ?? "").trim(), interest: String(fields.get("interest") ?? ""), message: String(fields.get("message") ?? "").trim() });
      setStatus(result.message || "Thank you! Your enquiry has been sent.");
      form.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send your enquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="home-contact">
      <div className="shell home-contact-layout">
        <div className="home-contact-copy">
          <SectionLabel>LET&apos;S MOVE FORWARD</SectionLabel>
          <h2>
            Your next chapter.
            <br />
            <span>Let&apos;s build it together.</span>
          </h2>
          <p className="home-contact-description">
            Have a project, need talent, or looking to develop your skills?
            We&apos;d love to hear from you.
          </p>
          <div className="home-contact-details">
            <a
              href="mailto:info@vandrotech.com"
              className="home-contact-detail"
            >
              <span className="home-contact-icon">
                <Mail aria-hidden="true" />
              </span>
              <span>
                <strong>Email</strong>
                <small>info@vandrotech.com</small>
              </span>
            </a>
            <a href="tel:+919494959798" className="home-contact-detail">
              <span className="home-contact-icon">
                <Phone aria-hidden="true" />
              </span>
              <span>
                <strong>Phone</strong>
                <small>+91 9494959798</small>
              </span>
            </a>
            <div className="home-contact-detail">
              <span className="home-contact-icon">
                <MapPin aria-hidden="true" />
              </span>
              <span>
                <strong>Our Office</strong>
                <small>Hyderabad, India</small>
              </span>
            </div>
          </div>
        </div>

        <div className="home-contact-form-wrap">
          <form className="home-contact-form" onSubmit={submitEnquiry}>
            <h3>Start a conversation</h3>
            <p>
              Tell us what you&apos;re working toward and we&apos;ll get back to
              you soon.
            </p>
            <div className="home-contact-fields">
              <label>
                Your name <span aria-hidden="true">*</span>
                <input
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  required
                />
              </label>
              <label>
                Work email <span aria-hidden="true">*</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  required
                />
              </label>
              <label>
                Phone number <span aria-hidden="true">*</span>
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  pattern="\+?[0-9\s\-()]{7,20}"
                  title="Enter a valid phone number"
                  required
                />
              </label>
              <label className="home-contact-interest">
                I&apos;m interested in <span aria-hidden="true">*</span>
                <select name="interest" defaultValue="" required>
                  <option value="" disabled>
                    Select a service
                  </option>
                  <option>IT Staffing</option>
                  <option>Training Programs</option>
                  <option>Career Development</option>
                  <option>Cloud Solutions</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="home-contact-message">
                Your message <span aria-hidden="true">*</span>
                <textarea
                  name="message"
                  placeholder="Tell us a little about what you need..."
                  required
                />
              </label>
            </div>
            <button className="home-contact-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send enquiry"} <ArrowUpRight aria-hidden="true" />
            </button>
            <p
              className="home-contact-form-status"
              role="status"
              aria-live="polite"
            >
              {status}
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}


