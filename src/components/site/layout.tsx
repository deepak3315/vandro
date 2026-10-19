import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowUpRight, Mail, MapPin, Menu, Phone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/vandro-wordmark-transparent.png";
const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/industries", label: "Industries" },
  { to: "/services", label: "Services" },
  { to: "/resources", label: "Resources" },
  { to: "/jobs", label: "Careers" },
] as const;
export function SiteLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="site-header">
        <div className="shell header-inner">
          <Link to="/" aria-label="VANDRO home" className="brand">
            <img
              src={logo}
              alt="VANDRO Private Limited"
              width="240"
              height="62"
            />
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeProps={{ className: "active" }}
                activeOptions={{ exact: true }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <Button asChild className="header-contact">
            <Link to="/contact">
              Let’s connect <ArrowUpRight />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
        {open && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {[...links, { to: "/contact" as const, label: "Contact" }].map(
              (l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
                  {l.label}
                  <ArrowUpRight size={16} />
                </Link>
              ),
            )}
          </nav>
        )}
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div className="shell footer-main">
          <div className="footer-column footer-brand-column">
            <Link to="/" className="brand">
              <img
                src={logo}
                alt="VANDRO Private Limited"
                width="240"
                height="62"
                loading="lazy"
              />
            </Link>
            <p>People. Technology. Possibility.</p>
          </div>
          <nav
            className="footer-column footer-quick-links"
            aria-label="Quick links"
          >
            <h2>Quick Links</h2>
            {links.slice(1).map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
            <Link to="/contact">Contact</Link>
          </nav>
          <div className="footer-column footer-contact-column">
            <h2>Contact Us</h2>
            <a href="mailto:info@vandrotech.com">
              <Mail aria-hidden="true" />
              info@vandrotech.com
            </a>
            <a href="tel:+919494959798">
              <Phone aria-hidden="true" />
              +91 9494959798
            </a>
            <span>
              <MapPin aria-hidden="true" />
              Hyderabad, India
            </span>
          </div>
          <div className="footer-column footer-newsletter">
            <h2>Stay in touch</h2>
            <p>
              Get insights on careers, technology, and opportunities at Vandro.
            </p>
            <form>
              <label
                className="visually-hidden"
                htmlFor="footer-newsletter-email"
              >
                Your email address
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                placeholder="Your email address"
                disabled
              />
              <button
                type="button"
                aria-label="Newsletter signup unavailable"
                disabled
              >
                <ArrowUpRight aria-hidden="true" />
              </button>
            </form>
            <small>Newsletter signup will be available soon.</small>
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>© 2026 VANDRO Private Limited. All rights reserved.</span>
          <div className="footer-legal">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Cookie Policy</span>
          </div>
        </div>
      </footer>
    </>
  );
}
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="section-label">
      <span />
      {children}
    </div>
  );
}
export function ConnectBand() {
  return (
    <section className="connect-band">
      <div className="shell connect-inner">
        <div>
          <SectionLabel>LET’S MOVE FORWARD</SectionLabel>
          <h2>
            Your next chapter.
            <br />
            <span>Let’s build it together.</span>
          </h2>
        </div>
        <Button asChild size="lg">
          <Link to="/contact">
            Start a conversation <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
export function PageIntro({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <section className="page-intro">
      <div className="shell">
        <SectionLabel>{label}</SectionLabel>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
