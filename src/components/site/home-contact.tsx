import { useState, type FormEvent } from "react";
import { ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import { SectionLabel } from "@/components/site/layout";

export function HomeContact() {
  const [status, setStatus] = useState("");

  function submitEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const fields = new FormData(form);
    const subject = `Website enquiry: ${fields.get("interest")}`;
    const body = [
      `Name: ${fields.get("name")}`,
      `Work email: ${fields.get("email")}`,
      `Interested in: ${fields.get("interest")}`,
      "",
      "Message:",
      fields.get("message"),
    ].join("\n");

    setStatus(
      "Opening your email app with the enquiry details. Please send the prepared message to complete your enquiry.",
    );
    window.location.href = `mailto:info@vandrotech.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
            <button className="home-contact-submit" type="submit">
              Send enquiry <ArrowUpRight aria-hidden="true" />
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
