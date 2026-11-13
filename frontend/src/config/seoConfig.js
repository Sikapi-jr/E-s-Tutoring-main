// SEO Configuration for EGS Tutoring Platform
// Local SEO and geographic targeting -- scoped to the actual service area
// (Toronto + Durham Region), matching LandingPage.jsx's TORONTO_AREAS and
// DURHAM_MUNICIPALITIES. Previously this claimed all-of-Canada coverage,
// which actively hurts local search ranking by diluting geographic
// relevance for the "tutor near me" style searches that actually convert.
export const localSEOData = {
  businessInfo: {
    name: "EGS Tutoring",
    type: "EducationalOrganization",
    description: "Online and in-person tutoring for students in Toronto and the Durham Region, in both English and French.",
    url: "https://egstutoring.ca",
    logo: "https://egstutoring.ca/EGS-ICON.svg",
    email: "egstutor@gmail.com",
    telephone: "+1-289-423-8434",
    sameAs: [
      "https://www.instagram.com/egstutoring"
    ],
    areaServed: [
      "Downtown Toronto", "North York", "Scarborough", "Etobicoke", "York", "East York",
      "Oshawa", "Whitby", "Ajax", "Pickering", "Clarington", "Uxbridge", "Scugog", "Brock"
    ],
    serviceArea: [
      { "@type": "City", "name": "Toronto" },
      { "@type": "AdministrativeArea", "name": "Durham Region" }
    ]
  },
  // Flat list of the most search-relevant cities/areas for page copy and
  // keyword targeting -- kept in sync with the landing page's actual
  // service-area chips, not a generic national list.
  majorCities: [
    "Toronto", "Scarborough", "North York", "Etobicoke",
    "Oshawa", "Whitby", "Ajax", "Pickering", "Clarington"
  ]
};

// Advanced structured data schemas (defined before seoConfig since the
// home page's structuredData reuses advancedSchemas.localBusiness directly
// rather than duplicating an equivalent schema inline).
export const advancedSchemas = {
  // Local Business schema for geographic SEO -- the richest schema (pricing,
  // service catalog, areaServed) so it's what the home page actually emits.
  localBusiness: {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": localSEOData.businessInfo.name,
    "description": localSEOData.businessInfo.description,
    "url": localSEOData.businessInfo.url,
    "logo": localSEOData.businessInfo.logo,
    "email": localSEOData.businessInfo.email,
    "telephone": localSEOData.businessInfo.telephone,
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "CA",
      "addressRegion": "ON"
    },
    "sameAs": localSEOData.businessInfo.sameAs,
    "areaServed": localSEOData.businessInfo.serviceArea,
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "telephone": localSEOData.businessInfo.telephone,
      "email": localSEOData.businessInfo.email
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Tutoring Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Online Tutoring",
            "description": "Live one-on-one online tutoring sessions"
          },
          "price": "35",
          "priceCurrency": "CAD",
          "unitText": "per hour"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "In-Person Tutoring",
            "description": "In-person tutoring at the student's home"
          },
          "price": "65",
          "priceCurrency": "CAD",
          "unitText": "per hour"
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Math Tutoring",
            "description": "Math tutoring from elementary through pre-calculus and physics"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "French Tutoring",
            "description": "French-language tutoring, conversation, and exam preparation"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "English Tutoring",
            "description": "English grammar, reading, and writing tutoring"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Science Tutoring",
            "description": "Science tutoring covering physics, chemistry, and biology"
          }
        }
      ]
    }
  },

  // Website schema
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "EGS Tutoring",
    "alternateName": "EGS Tutoring Platform",
    "url": "https://egstutoring.ca"
  },

  // How-to schema for tutoring guidance
  howToGetTutor: {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Find and Hire a Tutor with EGS Tutoring",
    "description": "Step-by-step guide to finding qualified tutors through EGS Tutoring in Toronto and the Durham Region",
    "totalTime": "PT15M",
    "estimatedCost": {
      "@type": "MonetaryAmount",
      "currency": "CAD",
      "value": "0"
    },
    "step": [
      {
        "@type": "HowToStep",
        "name": "Create Account",
        "text": "Sign up for a free EGS Tutoring account as a parent or student",
        "url": "https://egstutoring.ca/register"
      },
      {
        "@type": "HowToStep",
        "name": "Submit Request",
        "text": "Fill out a tutoring request specifying subject, grade level, and preferences",
        "url": "https://egstutoring.ca/request-reply"
      },
      {
        "@type": "HowToStep",
        "name": "Review Responses",
        "text": "Browse qualified tutor responses and compare profiles and rates",
        "url": "https://egstutoring.ca/request-reply"
      },
      {
        "@type": "HowToStep",
        "name": "Accept Tutor",
        "text": "Choose your preferred tutor and begin scheduling sessions"
      }
    ]
  },

  // Breadcrumb schema generator
  breadcrumb: (breadcrumbs) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": crumb.name,
      "item": crumb.url
    }))
  }),

  // Service schema for specific tutoring subjects
  tutoringService: (subject) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    "name": `${subject} Tutoring`,
    "description": `${subject} tutoring for students in Toronto and the Durham Region`,
    "provider": {
      "@type": "Organization",
      "name": "EGS Tutoring"
    },
    "areaServed": localSEOData.businessInfo.serviceArea,
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": `${subject} Tutoring Programs`,
      "itemListElement": [
        {
          "@type": "Offer",
          "description": `Online ${subject.toLowerCase()} tutoring`,
          "availability": "https://schema.org/InStock"
        },
        {
          "@type": "Offer",
          "description": `In-person ${subject.toLowerCase()} tutoring`,
          "availability": "https://schema.org/InStock"
        }
      ]
    }
  })
};

export const seoConfig = {
  // Default/Home page SEO
  home: {
    title: "EGS Tutoring - Online & In-Person Tutoring in Toronto & Durham Region",
    description: "Personalized online and in-person tutoring for K-12 students in Toronto and the Durham Region, in English and French. Book a qualified tutor today.",
    keywords: "tutoring Toronto, tutoring Durham Region, Oshawa tutor, Whitby tutor, online tutoring, in-person tutoring, math tutor, French tutor, homework help",
    canonical: "https://egstutoring.ca",
    // A JSON array of schema objects in one <script type="application/ld+json">
    // tag is valid JSON-LD and Google explicitly supports it -- this wires up
    // the business, website, and how-to schemas on the one page they matter most.
    structuredData: [
      advancedSchemas.localBusiness,
      advancedSchemas.website,
      advancedSchemas.howToGetTutor
    ]
  },

  // Login page SEO
  login: {
    title: "Login - EGS Tutoring Portal",
    description: "Log in to your EGS Tutoring account to manage sessions, track progress, and connect with your tutor.",
    keywords: "tutoring login, student portal, tutor dashboard, EGS tutoring account",
    canonical: "https://egstutoring.ca/login"
  },

  // Registration page SEO
  register: {
    title: "Sign Up - EGS Tutoring in Toronto & Durham Region",
    description: "Register as a parent, student, or tutor with EGS Tutoring. Get matched with a qualified tutor in Toronto or the Durham Region.",
    keywords: "tutoring registration, sign up tutor, student registration, parent account, EGS tutoring signup",
    canonical: "https://egstutoring.ca/register"
  },

  // Tutor request / reply page SEO (there is no standalone /request route --
  // requesting a tutor happens via a modal on this page)
  requestReply: {
    title: "Request a Tutor & Review Replies | EGS Tutoring",
    description: "Submit a tutoring request specifying subject and grade, then review and accept replies from qualified tutors in Toronto and the Durham Region.",
    keywords: "request tutor, find tutor Toronto, find tutor Durham Region, math tutor, French tutor, tutor responses",
    canonical: "https://egstutoring.ca/request-reply",
    noIndex: true,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Tutor Matching Service",
      "description": "Submit a tutoring request and get matched with qualified tutors",
      "areaServed": localSEOData.businessInfo.serviceArea,
      "provider": {
        "@type": "Organization",
        "name": "EGS Tutoring"
      }
    }
  },

  // Dashboard/Home page for logged-in users
  dashboard: {
    title: "Dashboard - EGS Tutoring Portal",
    description: "View upcoming sessions, track progress, manage requests, and connect with your tutors.",
    keywords: "tutoring dashboard, student portal, tutor portal, session management",
    canonical: "https://egstutoring.ca/home",
    noIndex: true
  },

  // Profile page SEO
  profile: {
    title: "Profile Settings - EGS Tutoring",
    description: "Manage your EGS Tutoring profile and account details.",
    keywords: "tutoring profile, account settings",
    canonical: "https://egstutoring.ca/profile",
    noIndex: true
  },

  // Settings page SEO
  settings: {
    title: "Account Settings - EGS Tutoring",
    description: "Configure your EGS Tutoring account settings and notification preferences.",
    keywords: "account settings, tutoring settings",
    canonical: "https://egstutoring.ca/settings",
    noIndex: true
  },

  // Log hours page SEO
  logHours: {
    title: "Log Tutoring Hours - EGS Tutoring",
    description: "Log tutoring session details, duration, and progress for accurate billing.",
    keywords: "log tutoring hours, tutor timesheet",
    canonical: "https://egstutoring.ca/hours",
    noIndex: true
  },

  // View invoices page SEO
  viewInvoices: {
    title: "Invoices & Billing - EGS Tutoring",
    description: "View and manage your EGS Tutoring invoices and payments.",
    keywords: "tutoring invoices, billing, payments",
    canonical: "https://egstutoring.ca/viewinvoices",
    noIndex: true
  },

  // Mailing list signup page SEO
  mailingList: {
    title: "Join Our Mailing List - EGS Tutoring Toronto & Durham Region",
    description: "Sign up for the EGS Tutoring mailing list to get tutoring tips, promotions, and updates for Toronto and the Durham Region delivered to your inbox.",
    keywords: "EGS Tutoring mailing list, tutoring newsletter, tutoring updates, subscribe tutoring Toronto",
    canonical: "https://egstutoring.ca/mailing-list"
  },

  // Contact page SEO
  contact: {
    title: "Contact Us - EGS Tutoring Toronto & Durham Region",
    description: "Get in touch with EGS Tutoring. Email, call, or send us a message to ask about tutoring in Toronto or the Durham Region.",
    keywords: "contact EGS Tutoring, tutoring phone number, tutoring email, Toronto tutoring contact",
    canonical: "https://egstutoring.ca/contact"
  },

  // Privacy policy page SEO
  privacyPolicy: {
    title: "Privacy Policy - EGS Tutoring",
    description: "Read EGS Tutoring's privacy policy to learn how we collect, use, and protect your personal information.",
    keywords: "EGS Tutoring privacy policy",
    canonical: "https://egstutoring.ca/privacy-policy"
  },

  // Terms of use page SEO
  termsOfUse: {
    title: "Terms of Use - EGS Tutoring",
    description: "Read the terms of use governing your access to and use of the EGS Tutoring platform.",
    keywords: "EGS Tutoring terms of use, terms and conditions",
    canonical: "https://egstutoring.ca/terms-of-use"
  }
};

// Function to get SEO data for a specific page
export const getSEOData = (pageKey) => {
  return seoConfig[pageKey] || seoConfig.home;
};

// Common structured data schemas
export const structuredDataSchemas = {
  // FAQ Schema for common tutoring questions
  faq: (faqs) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  }),

  // Course schema for specific subjects
  course: (courseData) => ({
    "@context": "https://schema.org",
    "@type": "Course",
    "name": courseData.name,
    "description": courseData.description,
    "provider": {
      "@type": "Organization",
      "name": "EGS Tutoring"
    },
    "courseMode": ["online", "in-person"],
    "educationalLevel": courseData.level || "All Levels"
  }),

  // Review schema for testimonials
  reviews: (reviews) => ({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EGS Tutoring",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": reviews.averageRating,
      "reviewCount": reviews.totalReviews
    },
    "review": reviews.reviews.map(review => ({
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.author
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating
      },
      "reviewBody": review.text
    }))
  })
};
