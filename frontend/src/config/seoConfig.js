// SEO Configuration for EGS Tutoring Platform
// Advanced local SEO and geographic targeting
export const localSEOData = {
  businessInfo: {
    name: "EGS Tutoring",
    type: "EducationalOrganization",
    description: "Professional online and in-person tutoring services across Canada",
    url: "https://egstutoring.ca",
    logo: "https://egstutoring.ca/EGS-ICON.svg",
    email: "egstutor@gmail.com",
    areaServed: [
      "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", 
      "Saskatchewan", "Nova Scotia", "New Brunswick", "Newfoundland and Labrador",
      "Prince Edward Island", "Northwest Territories", "Nunavut", "Yukon"
    ],
    serviceArea: {
      "@type": "Country",
      "name": "Canada"
    }
  },
  majorCities: [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg", 
    "Quebec City", "Hamilton", "Kitchener", "London", "Victoria", "Halifax",
    "Saskatoon", "Regina", "St. John's", "Barrie", "Kelowna", "Abbotsford", "Kingston"
  ]
};

export const seoConfig = {
  // Default/Home page SEO
  home: {
    title: "EGS Tutoring - Professional Online & In-Person Tutoring Services Canada",
    description: "Connect with qualified tutors across Canada. EGS Tutoring offers personalized online and in-person tutoring for all grades and subjects. Schedule sessions, track progress, and improve grades with our comprehensive tutoring platform.",
    keywords: "tutoring, online tutoring, in-person tutoring, Canada tutors, math tutoring, science tutoring, homework help, academic support, qualified tutors, student progress tracking",
    canonical: "https://egstutoring.ca",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "EGS Tutoring",
      "description": "Professional online and in-person tutoring services across Canada",
      "url": "https://egstutoring.ca",
      "logo": "https://egstutoring.ca/EGS-ICON.svg",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "CA"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "email": "egstutor@gmail.com"
      }
    }
  },

  // Login page SEO
  login: {
    title: "Login - EGS Tutoring Portal",
    description: "Access your EGS Tutoring account. Login to schedule tutoring sessions, track student progress, manage invoices, and connect with qualified tutors across Canada.",
    keywords: "tutoring login, student portal, tutor dashboard, EGS tutoring account",
    canonical: "https://egstutoring.ca/login"
  },

  // Registration page SEO
  register: {
    title: "Sign Up - EGS Tutoring Platform",
    description: "Join EGS Tutoring today! Register as a student, parent, or tutor. Get access to qualified tutors, schedule sessions, and improve academic performance across Canada.",
    keywords: "tutoring registration, sign up tutor, student registration, parent account, EGS tutoring signup",
    canonical: "https://egstutoring.ca/register"
  },

  // Tutor request page SEO
  request: {
    title: "Request a Tutor - Find Qualified Tutors | EGS Tutoring",
    description: "Submit a tutoring request and connect with qualified tutors in your area. Specify your subject needs, grade level, and learning preferences. Get matched with the perfect tutor.",
    keywords: "request tutor, find tutor, math tutor, science tutor, online tutoring request, in-person tutor",
    canonical: "https://egstutoring.ca/request",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Tutor Request Service",
      "description": "Submit requests to find qualified tutors for any subject",
      "provider": {
        "@type": "Organization",
        "name": "EGS Tutoring"
      }
    }
  },

  // Tutor replies page SEO
  requestReply: {
    title: "Tutor Responses - Review & Accept Tutors | EGS Tutoring",
    description: "Review responses from qualified tutors who match your tutoring requirements. Compare tutor profiles, qualifications, and rates to choose the best fit for your learning needs.",
    keywords: "tutor responses, compare tutors, accept tutor, tutor profiles, qualified tutors",
    canonical: "https://egstutoring.ca/request-reply"
  },

  // Dashboard/Home page for logged-in users
  dashboard: {
    title: "Dashboard - EGS Tutoring Portal",
    description: "Access your EGS Tutoring dashboard. View upcoming sessions, track progress, manage requests, and connect with your tutors. Everything you need for successful learning.",
    keywords: "tutoring dashboard, student portal, tutor portal, session management, progress tracking",
    canonical: "https://egstutoring.ca/home"
  },

  // Profile page SEO
  profile: {
    title: "Profile Settings - EGS Tutoring",
    description: "Manage your EGS Tutoring profile. Update personal information, contact details, learning preferences, and account settings for the best tutoring experience.",
    keywords: "tutoring profile, account settings, user profile, update information",
    canonical: "https://egstutoring.ca/profile"
  },

  // Settings page SEO
  settings: {
    title: "Account Settings - EGS Tutoring",
    description: "Configure your EGS Tutoring account settings. Manage notifications, privacy preferences, payment methods, and platform configurations.",
    keywords: "account settings, tutoring settings, notification preferences, payment settings",
    canonical: "https://egstutoring.ca/settings"
  },

  // Log hours page SEO
  logHours: {
    title: "Log Tutoring Hours - Track Sessions | EGS Tutoring",
    description: "Log your tutoring sessions and track hours worked. Tutors can record session details, duration, and student progress for accurate billing and reporting.",
    keywords: "log tutoring hours, track sessions, tutor timesheet, session logging, tutoring records",
    canonical: "https://egstutoring.ca/log-hours"
  },

  // View invoices page SEO
  viewInvoices: {
    title: "Invoices & Billing - EGS Tutoring",
    description: "View and manage your tutoring invoices. Track payments, download receipts, and manage billing for your EGS Tutoring sessions.",
    keywords: "tutoring invoices, billing, payments, tutoring receipts, session billing",
    canonical: "https://egstutoring.ca/viewinvoices"
  }
};

// Function to get SEO data for a specific page
export const getSEOData = (pageKey) => {
  return seoConfig[pageKey] || seoConfig.home;
};

// Advanced structured data schemas
export const advancedSchemas = {
  // Local Business schema for geographic SEO
  localBusiness: {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "name": localSEOData.businessInfo.name,
    "description": localSEOData.businessInfo.description,
    "url": localSEOData.businessInfo.url,
    "logo": localSEOData.businessInfo.logo,
    "email": localSEOData.businessInfo.email,
    "areaServed": localSEOData.businessInfo.areaServed.map(area => ({
      "@type": "State",
      "name": area
    })),
    "serviceArea": localSEOData.businessInfo.serviceArea,
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Tutoring Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "EducationalOccupationalProgram",
            "name": "Math Tutoring",
            "description": "Comprehensive math tutoring from elementary to university level",
            "provider": {
              "@type": "Organization", 
              "name": "EGS Tutoring"
            },
            "educationalCredentialAwarded": "Academic Support Certificate"
          }
        },
        {
          "@type": "Offer", 
          "itemOffered": {
            "@type": "EducationalOccupationalProgram",
            "name": "Science Tutoring",
            "description": "Expert science tutoring covering physics, chemistry, biology",
            "provider": {
              "@type": "Organization",
              "name": "EGS Tutoring" 
            }
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "EducationalOccupationalProgram", 
            "name": "Language Arts Tutoring",
            "description": "English and French language tutoring services",
            "provider": {
              "@type": "Organization",
              "name": "EGS Tutoring"
            }
          }
        }
      ]
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://egstutoring.ca/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  },

  // Website schema
  website: {
    "@context": "https://schema.org",
    "@type": "WebSite", 
    "name": "EGS Tutoring",
    "alternateName": "EGS Tutoring Platform",
    "url": "https://egstutoring.ca",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://egstutoring.ca/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  },

  // How-to schema for tutoring guidance
  howToGetTutor: {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Find and Hire a Tutor with EGS Tutoring",
    "description": "Step-by-step guide to finding qualified tutors through EGS Tutoring platform",
    "image": "https://egstutoring.ca/how-to-guide.jpg",
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
        "url": "https://egstutoring.ca/request"
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
    "description": `Professional ${subject.toLowerCase()} tutoring services for all grade levels`,
    "provider": {
      "@type": "Organization",
      "name": "EGS Tutoring"
    },
    "areaServed": {
      "@type": "Country", 
      "name": "Canada"
    },
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