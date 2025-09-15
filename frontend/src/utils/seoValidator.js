// Advanced SEO Validation and Monitoring Utilities

// SEO Score Calculator
export const calculateSEOScore = (pageData) => {
  let score = 0;
  const checks = [];
  
  // Title tag validation (20 points)
  if (pageData.title) {
    if (pageData.title.length >= 30 && pageData.title.length <= 60) {
      score += 20;
      checks.push({ type: 'title', status: 'pass', message: 'Title length is optimal (30-60 chars)' });
    } else if (pageData.title.length < 30) {
      score += 10;
      checks.push({ type: 'title', status: 'warning', message: 'Title is too short (recommended 30-60 chars)' });
    } else {
      score += 5;
      checks.push({ type: 'title', status: 'fail', message: 'Title is too long (recommended 30-60 chars)' });
    }
  } else {
    checks.push({ type: 'title', status: 'fail', message: 'Title tag is missing' });
  }
  
  // Meta description validation (15 points)
  if (pageData.description) {
    if (pageData.description.length >= 120 && pageData.description.length <= 160) {
      score += 15;
      checks.push({ type: 'description', status: 'pass', message: 'Meta description length is optimal (120-160 chars)' });
    } else if (pageData.description.length < 120) {
      score += 8;
      checks.push({ type: 'description', status: 'warning', message: 'Meta description is too short' });
    } else {
      score += 5;
      checks.push({ type: 'description', status: 'fail', message: 'Meta description is too long' });
    }
  } else {
    checks.push({ type: 'description', status: 'fail', message: 'Meta description is missing' });
  }
  
  // Keywords validation (10 points)
  if (pageData.keywords && pageData.keywords.length > 0) {
    score += 10;
    checks.push({ type: 'keywords', status: 'pass', message: 'Keywords are present' });
  } else {
    checks.push({ type: 'keywords', status: 'warning', message: 'Keywords are missing or empty' });
  }
  
  // Canonical URL validation (10 points)
  if (pageData.canonical) {
    score += 10;
    checks.push({ type: 'canonical', status: 'pass', message: 'Canonical URL is set' });
  } else {
    checks.push({ type: 'canonical', status: 'fail', message: 'Canonical URL is missing' });
  }
  
  // Open Graph validation (15 points)
  if (pageData.ogTitle && pageData.ogDescription && pageData.ogImage) {
    score += 15;
    checks.push({ type: 'opengraph', status: 'pass', message: 'Open Graph tags are complete' });
  } else {
    score += 5;
    checks.push({ type: 'opengraph', status: 'warning', message: 'Open Graph tags are incomplete' });
  }
  
  // Structured data validation (15 points)
  if (pageData.structuredData) {
    score += 15;
    checks.push({ type: 'structureddata', status: 'pass', message: 'Structured data is present' });
  } else {
    checks.push({ type: 'structureddata', status: 'warning', message: 'Structured data is missing' });
  }
  
  // Performance indicators (15 points)
  const performanceChecks = [
    pageData.preconnects ? 5 : 0,
    pageData.dnsPrefetch ? 5 : 0,
    pageData.resourceHints ? 5 : 0
  ];
  
  const performanceScore = performanceChecks.reduce((sum, points) => sum + points, 0);
  score += performanceScore;
  
  if (performanceScore === 15) {
    checks.push({ type: 'performance', status: 'pass', message: 'Performance optimizations are implemented' });
  } else if (performanceScore > 0) {
    checks.push({ type: 'performance', status: 'warning', message: 'Some performance optimizations are missing' });
  } else {
    checks.push({ type: 'performance', status: 'fail', message: 'Performance optimizations are not implemented' });
  }
  
  return {
    score,
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    checks,
    recommendations: generateRecommendations(checks)
  };
};

// Generate SEO recommendations based on validation results
const generateRecommendations = (checks) => {
  const recommendations = [];
  
  checks.forEach(check => {
    if (check.status === 'fail') {
      switch (check.type) {
        case 'title':
          recommendations.push('Add a compelling title tag between 30-60 characters that includes your target keywords');
          break;
        case 'description':
          recommendations.push('Create a meta description between 120-160 characters that summarizes the page content');
          break;
        case 'canonical':
          recommendations.push('Add a canonical URL to prevent duplicate content issues');
          break;
        case 'performance':
          recommendations.push('Implement performance optimizations like preconnect, DNS prefetch, and resource hints');
          break;
      }
    } else if (check.status === 'warning') {
      switch (check.type) {
        case 'title':
          recommendations.push('Optimize title length to be between 30-60 characters for better search visibility');
          break;
        case 'description':
          recommendations.push('Adjust meta description length to 120-160 characters for optimal display');
          break;
        case 'keywords':
          recommendations.push('Add relevant keywords to help search engines understand page content');
          break;
        case 'opengraph':
          recommendations.push('Complete Open Graph tags (title, description, image) for better social media sharing');
          break;
        case 'structureddata':
          recommendations.push('Add structured data markup to help search engines understand content context');
          break;
      }
    }
  });
  
  return recommendations;
};

// Monitor page performance metrics
export const monitorPagePerformance = () => {
  if (!window.performance) return null;
  
  const timing = window.performance.timing;
  const navigation = window.performance.navigation;
  
  const metrics = {
    // Page load metrics
    pageLoadTime: timing.loadEventEnd - timing.navigationStart,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    firstPaint: null,
    firstContentfulPaint: null,
    
    // Network metrics
    dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
    tcpConnection: timing.connectEnd - timing.connectStart,
    serverResponse: timing.responseEnd - timing.requestStart,
    
    // Navigation info
    navigationType: navigation.type, // 0: navigate, 1: reload, 2: back/forward
    redirectCount: navigation.redirectCount
  };
  
  // Get paint timing if available
  if (window.performance.getEntriesByType) {
    const paintEntries = window.performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-paint') {
        metrics.firstPaint = entry.startTime;
      } else if (entry.name === 'first-contentful-paint') {
        metrics.firstContentfulPaint = entry.startTime;
      }
    });
  }
  
  return metrics;
};

// Validate structured data
export const validateStructuredData = (structuredData) => {
  if (!structuredData) return { valid: false, errors: ['No structured data provided'] };
  
  const errors = [];
  const warnings = [];
  
  try {
    const data = typeof structuredData === 'string' ? JSON.parse(structuredData) : structuredData;
    
    // Check for required @context
    if (!data['@context']) {
      errors.push('Missing @context property');
    } else if (data['@context'] !== 'https://schema.org') {
      warnings.push('Consider using https://schema.org as @context');
    }
    
    // Check for required @type
    if (!data['@type']) {
      errors.push('Missing @type property');
    }
    
    // Validate based on type
    if (data['@type'] === 'EducationalOrganization') {
      if (!data.name) errors.push('Educational organizations must have a name');
      if (!data.description) warnings.push('Consider adding a description');
      if (!data.url) warnings.push('Consider adding a URL');
    }
    
    if (data['@type'] === 'Course') {
      if (!data.name) errors.push('Courses must have a name');
      if (!data.provider) errors.push('Courses must have a provider');
    }
    
    if (data['@type'] === 'FAQPage') {
      if (!data.mainEntity || !Array.isArray(data.mainEntity)) {
        errors.push('FAQ pages must have mainEntity array');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
    };
    
  } catch (e) {
    return {
      valid: false,
      errors: ['Invalid JSON structure'],
      warnings: [],
      score: 0
    };
  }
};

// Check for common SEO issues
export const runSEOAudit = () => {
  const issues = [];
  const warnings = [];
  const passes = [];
  
  // Check title tag
  const title = document.querySelector('title');
  if (!title || !title.textContent.trim()) {
    issues.push('Missing title tag');
  } else if (title.textContent.length > 60) {
    warnings.push('Title tag is too long (>60 characters)');
  } else if (title.textContent.length < 30) {
    warnings.push('Title tag is too short (<30 characters)');
  } else {
    passes.push('Title tag length is optimal');
  }
  
  // Check meta description
  const description = document.querySelector('meta[name="description"]');
  if (!description || !description.getAttribute('content')) {
    issues.push('Missing meta description');
  } else {
    const content = description.getAttribute('content');
    if (content.length > 160) {
      warnings.push('Meta description is too long (>160 characters)');
    } else if (content.length < 120) {
      warnings.push('Meta description is too short (<120 characters)');
    } else {
      passes.push('Meta description length is optimal');
    }
  }
  
  // Check canonical URL
  const canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    warnings.push('Missing canonical URL');
  } else {
    passes.push('Canonical URL is present');
  }
  
  // Check viewport meta tag
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    issues.push('Missing viewport meta tag (mobile optimization)');
  } else {
    passes.push('Viewport meta tag is present');
  }
  
  // Check for structured data
  const structuredDataScripts = document.querySelectorAll('script[type="application/ld+json"]');
  if (structuredDataScripts.length === 0) {
    warnings.push('No structured data found');
  } else {
    passes.push(`Found ${structuredDataScripts.length} structured data blocks`);
  }
  
  // Check for Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  
  if (!ogTitle || !ogDescription || !ogImage) {
    warnings.push('Incomplete Open Graph tags for social media');
  } else {
    passes.push('Open Graph tags are complete');
  }
  
  // Check for alt attributes on images
  const images = document.querySelectorAll('img');
  const imagesWithoutAlt = Array.from(images).filter(img => !img.getAttribute('alt'));
  if (imagesWithoutAlt.length > 0) {
    warnings.push(`${imagesWithoutAlt.length} images missing alt attributes`);
  } else if (images.length > 0) {
    passes.push('All images have alt attributes');
  }
  
  return {
    issues,
    warnings,
    passes,
    score: Math.max(0, 100 - (issues.length * 15) - (warnings.length * 5)),
    timestamp: new Date().toISOString()
  };
};

// Generate SEO report
export const generateSEOReport = (pageUrl = window.location.href) => {
  const audit = runSEOAudit();
  const performance = monitorPagePerformance();
  
  const pageData = {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute('content'),
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content')
  };
  
  const seoScore = calculateSEOScore(pageData);
  
  return {
    url: pageUrl,
    timestamp: new Date().toISOString(),
    seoScore: seoScore.score,
    grade: seoScore.grade,
    audit,
    performance,
    recommendations: seoScore.recommendations,
    summary: {
      issues: audit.issues.length,
      warnings: audit.warnings.length,
      passes: audit.passes.length,
      overallHealth: audit.score >= 80 ? 'Good' : audit.score >= 60 ? 'Fair' : 'Poor'
    }
  };
};

export default {
  calculateSEOScore,
  monitorPagePerformance,
  validateStructuredData,
  runSEOAudit,
  generateSEOReport
};