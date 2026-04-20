import { useState } from 'react';
import { useNavigate } from 'react-router';
import './HeroPage.css';

const LOGO_IMAGE =
  'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=400&q=80';
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1400&q=80';
const HAND_WASH_IMAGE =
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80';
const ECO_IMAGE =
  'https://images.unsplash.com/photo-1459603677915-a62079ffd002?auto=format&fit=crop&w=900&q=80';
const INTERIOR_IMAGE =
  'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=900&q=80';
const TIRE_IMAGE =
  'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=900&q=80';

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export function HeroPage() {
  const navigate = useNavigate();
  const [isLogoHovered, setIsLogoHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="container nav-content">
          <div
            className="logo-container"
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
          >
            <div className="logo">
              <img src={LOGO_IMAGE} alt="Coonara Logo" className="logo-image" />
              <div className="logo-wordmark">
                <span className="logo-name">COONARA</span>
                <span className="logo-tagline">Professional Hand Car Wash</span>
              </div>
            </div>

            {isLogoHovered && (
              <div className="logo-sub-tab animate-pop-in">
                <div className="sub-tab-content">
                  <img src={LOGO_IMAGE} alt="Coonara" className="large-logo" />
                  <div className="sub-tab-text">
                    <span className="brand-name">COONARA</span>
                    <span className="brand-tag">Professional Hand Car Wash</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="nav-right">
            <button
              type="button"
              className={`hamburger${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            {menuOpen && (
              <div className="nav-dropdown animate-pop-in">
                <a href="#services" onClick={() => setMenuOpen(false)}>Services</a>
                <a href="#footer" onClick={() => setMenuOpen(false)}>About</a>
              </div>
            )}
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text animate-fade-in">
            <h1 className="hero-title">
              <span className="accent">Coonara</span> Professional
              <br />
              Hand Car Wash
            </h1>

            <p className="hero-subtitle">
              Experience the ultimate car detailing service - premium hand wash, eco-friendly products, and meticulous
              attention to detail on every vehicle.
            </p>

            <div className="hero-actions">
              <button type="button" className="btn-primary" onClick={() => navigate('/login')}>
                Book Your Service <span className="btn-icon">→</span>
              </button>
              <a href="tel:+61449957777" className="phone-cta-inline">
                <div className="status-dot-container">
                  <div className="dot"></div>
                  <div className="ping"></div>
                </div>
                <span>Call to Book</span>
                <span className="button-divider"></span>
                <span>+61 449 957 777</span>
              </a>
            </div>
          </div>

          <div className="hero-visual animate-slide-in">
            <img src={HERO_IMAGE} alt="Car being washed professionally" className="hero-image-v2" />
          </div>
        </div>
      </section>

      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">Why Choose Us</p>
            <h2 className="section-title">The Coonara Difference</h2>
            <p className="section-desc">
              Every wash is performed by hand with precision, care, and premium products that protect your investment.
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <img src={HAND_WASH_IMAGE} alt="Hand Wash" className="feature-bg" />
              <div className="feature-overlay">
                <h3>Premium Hand Car Wash</h3>
              </div>
            </div>
            <div className="feature-card">
              <img src={ECO_IMAGE} alt="Eco Friendly" className="feature-bg" />
              <div className="feature-overlay">
                <h3>Eco-Friendly Products</h3>
              </div>
            </div>
            <div className="feature-card">
              <img src={INTERIOR_IMAGE} alt="Interior Cleaning" className="feature-bg" />
              <div className="feature-overlay">
                <h3>Meticulous Interior Cleaning</h3>
              </div>
            </div>
            <div className="feature-card">
              <img src={TIRE_IMAGE} alt="Tire Shining" className="feature-bg" />
              <div className="feature-overlay">
                <h3>Tire Shining Experts</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-section">
        <div className="container stats-grid">
          {[
            { val: '740+', label: 'Premium Car Cleaning Services Delivered' },
            { val: '35', label: 'Skilled Hand Wash Professionals' },
            { val: '850+', label: 'Vehicles Left Spotless & Shining' },
            { val: '4+ Yrs', label: 'of Industry Experience' },
          ].map((s, i) => (
            <div key={i} className="stat-item">
              <div className="stat-value">{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="services-section">
        <div className="container">
          <div className="section-header">
            <p className="section-label">What We Offer</p>
            <h2 className="section-title">Our Premium Services</h2>
            <p className="section-desc">
              Choose the package that suits your vehicle. Every service is delivered with expert care.
            </p>
          </div>

          <div className="services-grid">
            <div className="service-card">
              <div className="card-badge-wrap">
                <div className="card-image">
                  <img
                    src="https://images.unsplash.com/photo-1552930294-6b595f4c2974?auto=format&fit=crop&q=80&w=800"
                    alt="Premium Wash"
                  />
                </div>
              </div>
              <div className="card-body">
                <h3 className="card-title">Premium Polish</h3>
                <ul className="service-features">
                  <li>Full exterior hand wash</li>
                  <li>Dashboard &amp; interior wipe-down</li>
                  <li>Vacuum seats and carpets</li>
                  <li>Hand polish for a glossy finish</li>
                </ul>
                <button type="button" className="btn-book-now" onClick={() => navigate('/login')}>
                  Book Now →
                </button>
              </div>
            </div>

            <div className="service-card">
              <div className="card-badge-wrap">
                <div className="card-image">
                  <img
                    src="https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&q=80&w=800"
                    alt="Express Wash"
                  />
                </div>
              </div>
              <div className="card-body">
                <h3 className="card-title">Express Wash</h3>
                <ul className="service-features">
                  <li>Exterior wash - removes dirt &amp; grime</li>
                  <li>Chamois drying for a streak-free finish</li>
                  <li>Exterior window cleaning</li>
                  <li>Tire shine for a polished look</li>
                </ul>
                <button type="button" className="btn-book-now" onClick={() => navigate('/login')}>
                  Book Now →
                </button>
              </div>
            </div>

            <div className="service-card">
              <div className="card-badge-wrap">
                <div className="card-image">
                  <img
                    src="https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&q=80&w=800"
                    alt="Platinum Wash"
                  />
                </div>
              </div>
              <div className="card-body">
                <h3 className="card-title">Platinum Wash</h3>
                <ul className="service-features">
                  <li>Dashboard and console cleaning</li>
                  <li>Vacuum seats and carpets</li>
                  <li>Door jamb &amp; boot trim cleaning</li>
                  <li>Interior windows &amp; mirrors cleaned</li>
                </ul>
                <button type="button" className="btn-book-now" onClick={() => navigate('/login')}>
                  Book Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer id="footer" className="main-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo-row">
                <img src={LOGO_IMAGE} alt="Coonara Logo" className="footer-logo-img" />
                <span className="footer-logo-name">COONARA</span>
              </div>
              <p>
                Trust Coonara Professional Hand Car Wash to elevate your car-washing experience. Expert care,
                eco-friendly products, and a spotless result every time.
              </p>
              <div className="footer-socials">
                <a href="#" className="social-link" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <FacebookIcon />
                </a>
                <a href="#" className="social-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <InstagramIcon />
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h5>Our Company</h5>
              <div className="footer-address">
                <p>16/35 Coonara Avenue</p>
                <p>West Pennant Hills</p>
                <p>NSW, Australia 2125</p>
              </div>
              <ul style={{ marginTop: '1.25rem' }}>
                <li><a href="tel:+61449957777">+61 449 957 777</a></li>
                <li><a href="#services">Our Services</a></li>
                <li><a href="#footer">About Us</a></li>
              </ul>
            </div>

            <div className="footer-map">
              <h5>Find Us</h5>
              <div className="map-embed">
                <iframe
                  title="Coonara Car Wash Location"
                  src="https://maps.google.com/maps?q=16+Coonara+Avenue+West+Pennant+Hills+NSW+2125+Australia&output=embed"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Coonara Professional Hand Car Wash. All rights reserved.</p>
            <p>West Pennant Hills, NSW Australia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
