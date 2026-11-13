import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../components/SEOHead';
import GoogleReviewsButton from '../components/GoogleReviewsButton';
import { getSEOData } from '../config/seoConfig';
import '../styles/LandingPage.css';

const DURHAM_MUNICIPALITIES = [
  'Oshawa', 'Whitby', 'Ajax', 'Pickering', 'Clarington', 'Uxbridge', 'Scugog', 'Brock'
];

const TORONTO_AREAS = [
  'Downtown Toronto', 'North York', 'Scarborough', 'Etobicoke', 'York', 'East York'
];

const GOAL_ACCENTS = ['25, 42, 136', '255, 179, 27', '74, 96, 222'];

const SUBJECT_KEYS = ['math', 'english', 'science', 'french'];

// Getting Started steps -> where each one sends a visitor.
// "Request a Tutor" and "Review Replies" both live on the same
// /request-reply page (it holds the request modal and the current-requests list).
const STEP_ROUTES = ['/register', '/request-reply', '/request-reply'];

const Arrow = () => <span className="lw-arrow" aria-hidden="true">&rarr;</span>;

const CheckIcon = () => (
  <svg className="lw-check-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="11" fill="var(--egs-yellow)" />
    <path d="M7 12.5l3 3 7-7" stroke="var(--egs-navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* Goal icons: vector replacements for the old reused heart-icon.png,
   one shape per goal, coloured via the --accent-rgb set on .lw-card */
const SupportIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const SafetyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M8.5 12.4l2.3 2.3 4.7-4.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ConfidenceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3.5z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);

const GOAL_ICONS = [SupportIcon, SafetyIcon, ConfidenceIcon];

const PRICING_ACCENTS = ['74, 96, 222', '25, 42, 136', '255, 179, 27'];

const OnlineIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4.5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
    <path d="M8.5 20h7M12 16.5V20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const InPersonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const GroupIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8.5" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="16" cy="10.5" r="2.4" stroke="currentColor" strokeWidth="2" />
    <path
      d="M2.5 19.5c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5M14.8 14.6c2.6.3 4.7 2.3 4.7 4.9"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const PRICING_ICONS = [OnlineIcon, InPersonIcon, GroupIcon];

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const seoData = getSEOData('home');

  // Coverage (exam-prep/course categories) sit on their own centered row;
  // the 4 subject categories (math, english, science, french) form the
  // full-width row underneath.
  const coverageBoxes = [
    {
      key: 'schoolClasses',
      title: t('landing.subjects.coverage.schoolClasses.title'),
      items: t('landing.subjects.coverage.schoolClasses.items', { returnObjects: true }),
    },
    {
      key: 'provincialExams',
      title: t('landing.subjects.coverage.provincialExams.title'),
      items: t('landing.subjects.coverage.provincialExams.items', { returnObjects: true }),
    },
    {
      key: 'entranceExams',
      title: t('landing.subjects.coverage.entranceExams.title'),
      items: t('landing.subjects.coverage.entranceExams.items', { returnObjects: true }),
    },
  ];

  const subjectCategoryBoxes = SUBJECT_KEYS.map((key) => ({
    key,
    title: t(`landing.subjects.categories.${key}.title`),
    items: t(`landing.subjects.categories.${key}.items`, { returnObjects: true }),
  }));

  return (
    <>
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        canonical={seoData.canonical}
        structuredData={seoData.structuredData}
      />
      <GoogleReviewsButton />
      <div className="landing-page">

        {/* HERO: diagonal split, full-bleed image on the right */}
        <section className="lw-hero" id="home">
          <figure className="lw-hero-image">
            <img src="/picture1.jpg" alt="" loading="eager" />
          </figure>
          <div className="lw-hero-text-wrap">
            <h1 className="lw-h1">{t('landing.title')}</h1>
            <p className="lw-hero-text">{t('landing.subtitle')}</p>
            <div className="lw-btn-row">
              <button className="lw-btn lw-btn--navy" onClick={() => navigate('/register')}>
                {t('auth.registerButton')} <Arrow />
              </button>
              <button className="lw-btn lw-btn--outline-dark" onClick={() => navigate('/login')}>
                {t('navigation.login')}
              </button>
            </div>
          </div>
        </section>

        {/* GETTING STARTED */}
        <section className="lw-section lw-section--navy" id="getting-started">
          <div className="lw-container">
            <h2 className="lw-h2" style={{ color: 'var(--egs-white)', textAlign: 'center' }}>{t('landing.gettingStarted')}</h2>
            <p className="lw-section-text lw-section-text--center">{t('landing.stepsSubtitle')}</p>
            <ul className="lw-grid" style={{ listStyle: 'none', padding: 0 }}>
              {['step1', 'step2', 'step3'].map((key, i) => (
                <li key={key}>
                  <div
                    className="lw-card lw-step-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(STEP_ROUTES[i])}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(STEP_ROUTES[i]);
                    }}
                  >
                    <div className="lw-step-number">{i + 1}</div>
                    <h3>{t(`landing.steps.${key}.title`)}</h3>
                    <p>{t(`landing.steps.${key}.description`)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ABOUT */}
        <section className="lw-section" id="about">
          <div className="lw-container lw-about-grid">
            <figure className="lw-img-holder lw-about-banner">
              <img src="/tutor-teaching.avif" alt={t('landing.about.heading')} loading="lazy" />
            </figure>
            <div>
              <p className="lw-eyebrow">{t('landing.eyebrow.about')}</p>
              <h2 className="lw-h2">{t('landing.about.heading')}</h2>
              <p className="lw-section-text">{t('landing.about.mission')}</p>
              <p className="lw-section-text" style={{ marginTop: '0.75rem' }}>{t('landing.about.approach')}</p>
              <p className="lw-section-text" style={{ marginTop: '0.75rem' }}>{t('landing.about.formats')}</p>
            </div>
          </div>
        </section>

        {/* GOALS */}
        <section className="lw-section lw-section--light" id="goals">
          <div className="lw-container">
            <p className="lw-eyebrow" style={{ textAlign: 'center' }}>{t('landing.eyebrow.goals')}</p>
            <h2 className="lw-h2" style={{ textAlign: 'center' }}>{t('landing.goals.heading')}</h2>

            <ul className="lw-grid" style={{ listStyle: 'none', padding: 0, margin: '2.5rem 0 0' }}>
              {[
                { title: t('landing.goals.support.title'), text: t('landing.goals.support.description') },
                { title: t('landing.goals.safety.title'), text: t('landing.goals.safety.description') },
                { title: t('landing.goals.confidence.title'), text: t('landing.goals.confidence.description') },
              ].map((goal, i) => {
                const GoalIcon = GOAL_ICONS[i];
                return (
                  <li key={goal.title}>
                    <div className="lw-card" style={{ '--accent-rgb': GOAL_ACCENTS[i] }}>
                      <div className="lw-card-icon">
                        <GoalIcon />
                      </div>
                      <h3>{goal.title}</h3>
                      <p>{goal.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* PRICING */}
        <section className="lw-section" id="pricing">
          <div className="lw-container">
            <p className="lw-eyebrow" style={{ textAlign: 'center' }}>{t('landing.eyebrow.pricing')}</p>
            <h2 className="lw-h2" style={{ textAlign: 'center' }}>{t('landing.pricing.heading')}</h2>
            <p className="lw-section-text lw-section-text--center">{t('landing.pricing.intro')}</p>

            <ul className="lw-grid" style={{ listStyle: 'none', padding: 0, margin: '2.5rem 0 0' }}>
              {[
                {
                  key: 'online',
                  title: t('landing.pricing.online.title'),
                  price: t('landing.pricing.online.price'),
                  unit: t('landing.pricing.online.unit'),
                  text: t('landing.pricing.online.description'),
                },
                {
                  key: 'inPerson',
                  title: t('landing.pricing.inPerson.title'),
                  price: t('landing.pricing.inPerson.price'),
                  unit: t('landing.pricing.inPerson.unit'),
                  text: t('landing.pricing.inPerson.description'),
                },
                {
                  key: 'group',
                  title: t('landing.pricing.group.title'),
                  price: t('landing.pricing.group.price'),
                  unit: '',
                  badge: t('landing.pricing.group.badge'),
                  text: t('landing.pricing.group.description'),
                },
              ].map((plan, i) => {
                const PlanIcon = PRICING_ICONS[i];
                return (
                  <li key={plan.key}>
                    <div className="lw-card lw-pricing-card" style={{ '--accent-rgb': PRICING_ACCENTS[i] }}>
                      {plan.badge && <span className="lw-pricing-badge">{plan.badge}</span>}
                      <div className="lw-card-icon">
                        <PlanIcon />
                      </div>
                      <h3>{plan.title}</h3>
                      <p className="lw-price">
                        {plan.price}
                        {plan.unit && <span className="lw-price-unit">{plan.unit}</span>}
                      </p>
                      <p>{plan.text}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* WHY CHOOSE US - centered, no image */}
        <section className="lw-section lw-section--navy" id="why-choose-us">
          <div className="lw-container">
            <div className="lw-why-center">
              <h2 className="lw-h2" style={{ color: 'var(--egs-white)', textAlign: 'center' }}>{t('landing.whyChooseUs.heading')}</h2>
              <p className="lw-section-text">{t('landing.whyChooseUs.intro')}</p>
              <p className="lw-eyebrow lw-why-tutors-label" style={{ textAlign: 'center' }}>{t('landing.whyChooseUs.tutorsHeading')}</p>
              <ul className="lw-check-list">
                <li><CheckIcon /><span>{t('landing.whyChooseUs.tutors.credentials')}</span></li>
                <li><CheckIcon /><span>{t('landing.whyChooseUs.tutors.understanding')}</span></li>
                <li><CheckIcon /><span>{t('landing.whyChooseUs.tutors.experience')}</span></li>
                <li><CheckIcon /><span>{t('landing.whyChooseUs.tutors.bilingual')}</span></li>
              </ul>
            </div>
          </div>
        </section>

        {/* SUBJECTS CATALOG - every box identical */}
        <section className="lw-section" id="subjects">
          <div className="lw-container">
            <p className="lw-eyebrow" style={{ textAlign: 'center' }}>{t('landing.eyebrow.subjects')}</p>
            <h2 className="lw-h2" style={{ textAlign: 'center' }}>{t('landing.subjects.heading')}</h2>

            <div className="lw-subjects-grid lw-subjects-grid--coverage" style={{ marginTop: '2.5rem' }}>
              {coverageBoxes.map((box) => (
                <div className="lw-subject-card lw-subject-card--special" key={box.key}>
                  <h3>{box.title}</h3>
                  <ul>
                    {box.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="lw-subjects-grid" style={{ marginTop: '1.5rem' }}>
              {subjectCategoryBoxes.map((box) => (
                <div className="lw-subject-card" key={box.key}>
                  <h3>{box.title}</h3>
                  <ul>
                    {box.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SERVICE AREA */}
        <section className="lw-section lw-section--navy" id="service-area">
          <div className="lw-container">
            <p className="lw-eyebrow" style={{ textAlign: 'center' }}>{t('landing.eyebrow.serviceArea')}</p>
            <h2 className="lw-h2" style={{ color: 'var(--egs-white)', textAlign: 'center' }}>{t('landing.serviceArea.heading')}</h2>
            <p className="lw-section-text lw-section-text--center">{t('landing.serviceArea.intro')}</p>

            <div className="lw-area-group">
              <h3>{t('landing.serviceArea.toronto')}</h3>
              <div className="lw-chip-row">
                {TORONTO_AREAS.map((city) => (
                  <span className="lw-chip" key={city}>{city}</span>
                ))}
              </div>
            </div>

            <div className="lw-area-group">
              <h3>{t('landing.serviceArea.durham')}</h3>
              <div className="lw-chip-row">
                {DURHAM_MUNICIPALITIES.map((city) => (
                  <span className="lw-chip" key={city}>{city}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PORTAL FEATURES */}
        <main>
          <section className="lw-section lw-section--light" id="features">
            <div className="lw-container">
              <h2 className="lw-h2" style={{ textAlign: 'center' }}>{t('landing.allInOnePlace')}</h2>
              <ul className="lw-subjects-grid" style={{ listStyle: 'none', padding: 0, margin: '2.5rem 0 0' }}>
                {['scheduling', 'requests', 'reports', 'invoicing'].map((key) => (
                  <li key={key}>
                    <div className="lw-card lw-feature-card">
                      <h3>{t(`landing.features.${key}.title`)}</h3>
                      <p>{t(`landing.features.${key}.description`)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="lw-section lw-section--black" style={{ paddingBottom: '2rem' }}>
          <div className="lw-container">
            <div className="lw-footer-top">
              <div>
                <p className="lw-h2" style={{ color: 'var(--egs-white)', textAlign: 'left', fontSize: '1.5rem', margin: '0 0 0.75rem' }}>
                  {t('landing.title')}
                </p>
                <p className="lw-footer-brand-text">{t('landing.footerText')}</p>
              </div>

              <ul className="lw-footer-list">
                <li className="lw-footer-list-title">{t('contact.quickLinks')}</li>
                <li>
                  <button className="lw-footer-link" onClick={() => navigate('/contact')}>
                    {t('footer.contact')}
                  </button>
                </li>
                <li>
                  <button className="lw-footer-link" onClick={() => navigate('/mailing-list')}>
                    {t('footer.mailingList')}
                  </button>
                </li>
                <li>
                  <button className="lw-footer-link" onClick={() => navigate('/privacy-policy')}>
                    {t('legal.privacyPolicy')}
                  </button>
                </li>
                <li>
                  <button className="lw-footer-link" onClick={() => navigate('/terms-of-use')}>
                    {t('legal.termsOfUse')}
                  </button>
                </li>
              </ul>

              <div>
                <p className="lw-footer-list-title">{t('landing.cta.heading')}</p>
                <p className="lw-footer-brand-text" style={{ marginBottom: '1.25rem' }}>{t('landing.cta.subtext')}</p>
                <div className="lw-btn-row">
                  <button className="lw-btn lw-btn--light-blue" onClick={() => navigate('/register')}>
                    {t('auth.registerButton')} <Arrow />
                  </button>
                  <button className="lw-btn lw-btn--outline-light" onClick={() => navigate('/login')}>
                    {t('navigation.login')}
                  </button>
                </div>
              </div>
            </div>

            <div className="lw-footer-bottom">
              <p className="lw-copyright">
                &copy; {new Date().getFullYear()} EGS Tutoring. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default LandingPage;
