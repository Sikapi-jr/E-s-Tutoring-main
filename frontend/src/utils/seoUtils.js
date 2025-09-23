// Advanced SEO Utilities for EGS Tutoring Platform

import { localSEOData, advancedSchemas } from '../config/seoConfig';

// Generate location-specific SEO data
export const generateLocationSEO = (city, province) => {
  const locationKeywords = [
    `tutoring ${city}`,
    `${city} tutors`, 
    `online tutoring ${province}`,
    `in-person tutoring ${city}`,
    `math tutor ${city}`,
    `science tutor ${city}`,
    `${city} homework help`,
    `academic support ${province}`
  ];

  return {
    title: `Professional Tutoring in ${city}, ${province} | EGS Tutoring`,
    description: `Find qualified tutors in ${city}, ${province}. EGS Tutoring connects students with expert tutors for math, science, and language arts. Online and in-person options available.`,
    keywords: locationKeywords.join(', '),
    canonical: `https://egstutoring.ca/${province.toLowerCase()}/${city.toLowerCase()}`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "LocalBusiness", 
      "name": "EGS Tutoring",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": city,
        "addressRegion": province,
        "addressCountry": "CA"
      },
      "geo": {
        "@type": "GeoCoordinates",
        // Default to Canada center, could be enhanced with real coordinates
        "latitude": 56.1304,
        "longitude": -106.3468
      },
      "areaServed": [
        {
          "@type": "City",
          "name": city
        },
        {
          "@type": "State", 
          "name": province
        }
      ]
    }
  };
};

// Generate subject-specific SEO data  
export const generateSubjectSEO = (subject, gradeLevel = null) => {
  const subjectKeywords = [
    `${subject.toLowerCase()} tutoring`,
    `${subject.toLowerCase()} tutor`,
    `online ${subject.toLowerCase()} help`,
    `${subject.toLowerCase()} homework help`,
    `${subject.toLowerCase()} lessons`,
    `learn ${subject.toLowerCase()}`,
    `${subject.toLowerCase()} academic support`
  ];

  if (gradeLevel) {
    subjectKeywords.push(
      `${subject.toLowerCase()} tutor ${gradeLevel}`,
      `${gradeLevel} ${subject.toLowerCase()} help`,
      `${gradeLevel} ${subject.toLowerCase()} tutoring`
    );
  }

  const title = gradeLevel 
    ? `${subject} Tutoring for ${gradeLevel} Students | EGS Tutoring`
    : `Professional ${subject} Tutoring Services | EGS Tutoring`;

  const description = gradeLevel
    ? `Expert ${subject.toLowerCase()} tutoring for ${gradeLevel} students. Personalized lessons, homework help, and exam preparation with qualified tutors across Canada.`
    : `Get expert ${subject.toLowerCase()} tutoring with qualified instructors. Online and in-person options available for all grade levels across Canada.`;

  return {
    title,
    description,
    keywords: subjectKeywords.join(', '),
    canonical: `https://egstutoring.ca/subjects/${subject.toLowerCase()}${gradeLevel ? `/${gradeLevel.toLowerCase()}` : ''}`,
    structuredData: advancedSchemas.tutoringService(subject)
  };
};

// Generate FAQ schema for common tutoring questions
export const generateTutoringFAQ = () => {
  const faqData = [
    {
      question: "How does EGS Tutoring work?",
      answer: "EGS Tutoring connects students with qualified tutors through our platform. Simply create an account, submit a tutoring request specifying your needs, review tutor responses, and choose the best match for your learning goals."
    },
    {
      question: "What subjects do you offer tutoring for?",
      answer: "We offer tutoring for all major subjects including mathematics, science (physics, chemistry, biology), English, French, social studies, and more. Our tutors cover elementary through university level coursework."
    },
    {
      question: "Are sessions available online and in-person?",
      answer: "Yes! EGS Tutoring offers both online and in-person tutoring options. You can choose the format that works best for your schedule and learning preferences."
    },
    {
      question: "How are tutors qualified?",
      answer: "All EGS Tutoring tutors undergo a thorough screening process including background checks, credential verification, and assessment of their teaching abilities. We only work with qualified, experienced educators."
    },
    {
      question: "What are the tutoring rates?",
      answer: "Tutoring rates vary based on subject, grade level, and tutor experience. You'll see each tutor's rates when reviewing responses to your tutoring request, allowing you to choose based on your budget."
    },
    {
      question: "How do I schedule tutoring sessions?",
      answer: "Once you've accepted a tutor, you can work directly with them to plan sessions that fit both of your schedules. Our platform helps facilitate communication and session management."
    },
    {
      question: "Is there a minimum commitment?",
      answer: "No, there's no minimum commitment required. You can book sessions as needed, whether it's for ongoing support or help with specific assignments or exam preparation."
    },
    {
      question: "Can parents track their child's progress?",
      answer: "Yes, parents have access to progress tracking, session summaries, and can communicate with tutors about their child's learning journey through our parent portal."
    }
  ];

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
};

// Generate breadcrumb navigation for SEO
export const generateBreadcrumbs = (pathArray) => {
  const breadcrumbs = [
    { name: "Home", url: "https://egstutoring.ca" }
  ];

  let currentPath = "";
  pathArray.forEach((segment, index) => {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' '),
      url: `https://egstutoring.ca${currentPath}`
    });
  });

  return advancedSchemas.breadcrumb(breadcrumbs);
};

// Generate rich snippet data for pricing
export const generatePricingSchema = (pricingData) => {
  return {
    "@context": "https://schema.org",
    "@type": "Offer",
    "name": "Tutoring Services",
    "description": "Professional tutoring services for all subjects and grade levels",
    "priceCurrency": "CAD",
    "price": pricingData.startingPrice,
    "priceRange": `$${pricingData.minPrice}-$${pricingData.maxPrice}`,
    "availability": "https://schema.org/InStock",
    "validFrom": new Date().toISOString(),
    "seller": {
      "@type": "Organization",
      "name": "EGS Tutoring"
    },
    "itemOffered": {
      "@type": "Service",
      "name": "Tutoring Services",
      "category": "Education"
    }
  };
};

// Generate review/rating schema
export const generateReviewSchema = (reviews) => {
  if (!reviews || reviews.length === 0) return null;

  const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EGS Tutoring",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating.toFixed(1),
      "reviewCount": reviews.length,
      "bestRating": 5,
      "worstRating": 1
    },
    "review": reviews.slice(0, 5).map(review => ({ // Show top 5 reviews
      "@type": "Review",
      "author": {
        "@type": "Person",
        "name": review.author
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": 5,
        "worstRating": 1
      },
      "reviewBody": review.text,
      "datePublished": review.date
    }))
  };
};

// Generate course schema for specific subjects
export const generateCourseSchema = (courseData) => {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": courseData.name,
    "description": courseData.description,
    "provider": {
      "@type": "Organization",
      "name": "EGS Tutoring",
      "url": "https://egstutoring.ca"
    },
    "courseMode": ["online", "classroom"],
    "educationalLevel": courseData.level,
    "teaches": courseData.skills || [],
    "timeRequired": courseData.duration || "Flexible",
    "coursePrerequisites": courseData.prerequisites || "None",
    "educationalCredentialAwarded": "Completion Certificate",
    "isAccessibleForFree": false,
    "offers": {
      "@type": "Offer",
      "category": "Education",
      "priceCurrency": "CAD"
    }
  };
};

// SEO-optimized meta tag generator for social sharing
export const generateSocialTags = (pageData, imageUrl = null) => {
  const defaultImage = "https://egstutoring.ca/og-image.jpg";
  
  return {
    // Facebook Open Graph
    'og:title': pageData.title,
    'og:description': pageData.description,
    'og:image': imageUrl || defaultImage,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': `${pageData.title} - EGS Tutoring`,
    'og:url': pageData.canonical,
    'og:type': 'website',
    'og:site_name': 'EGS Tutoring',
    'og:locale': 'en_CA',
    
    // Twitter Cards
    'twitter:card': 'summary_large_image',
    'twitter:title': pageData.title,
    'twitter:description': pageData.description, 
    'twitter:image': imageUrl || defaultImage,
    'twitter:image:alt': `${pageData.title} - EGS Tutoring`,
    'twitter:site': '@EGSTutoring', // Add if you have a Twitter account
    'twitter:creator': '@EGSTutoring'
  };
};

// Performance optimization helpers
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const fontLink = document.createElement('link');
  fontLink.rel = 'preload';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Roboto+Flex:wght@300;400;500;600;700&display=swap';
  fontLink.as = 'style';
  fontLink.onload = function() { this.rel = 'stylesheet'; };
  document.head.appendChild(fontLink);
  
  // Prefetch important pages
  const prefetchPages = ['/register', '/request', '/login'];
  prefetchPages.forEach(page => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = page;
    document.head.appendChild(link);
  });
};

export default {
  generateLocationSEO,
  generateSubjectSEO,
  generateTutoringFAQ,
  generateBreadcrumbs,
  generatePricingSchema,
  generateReviewSchema,
  generateCourseSchema,
  generateSocialTags,
  preloadCriticalResources
};