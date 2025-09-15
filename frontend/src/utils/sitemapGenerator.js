// Advanced Sitemap Generator for EGS Tutoring Platform

import { localSEOData } from '../config/seoConfig';

// Generate dynamic sitemap based on available content
export const generateDynamicSitemap = (additionalPages = []) => {
  const baseUrl = 'https://egstutoring.ca';
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Core static pages
  const staticPages = [
    {
      url: '/',
      lastmod: currentDate,
      changefreq: 'weekly',
      priority: '1.0'
    },
    {
      url: '/register',
      lastmod: currentDate,
      changefreq: 'monthly', 
      priority: '0.9'
    },
    {
      url: '/request',
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.9'
    }
  ];
  
  // Subject-specific pages
  const subjects = [
    'Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology',
    'English', 'French', 'History', 'Geography', 'Computer Science'
  ];
  
  const subjectPages = subjects.map(subject => ({
    url: `/subjects/${subject.toLowerCase().replace(/\s+/g, '-')}`,
    lastmod: currentDate,
    changefreq: 'monthly',
    priority: '0.8'
  }));
  
  // Grade level pages
  const gradeLevels = [
    'Elementary', 'Middle School', 'High School', 'University'
  ];
  
  const gradeLevelPages = gradeLevels.map(grade => ({
    url: `/grades/${grade.toLowerCase().replace(/\s+/g, '-')}`,
    lastmod: currentDate, 
    changefreq: 'monthly',
    priority: '0.7'
  }));
  
  // Location-based pages for major Canadian cities
  const locationPages = localSEOData.majorCities.map(city => ({
    url: `/locations/${city.toLowerCase().replace(/\s+/g, '-')}`,
    lastmod: currentDate,
    changefreq: 'monthly',
    priority: '0.6'
  }));
  
  // Combine all pages
  const allPages = [
    ...staticPages,
    ...subjectPages, 
    ...gradeLevelPages,
    ...locationPages,
    ...additionalPages
  ];
  
  // Generate XML sitemap
  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return {
    xml: sitemapXML,
    pages: allPages,
    totalPages: allPages.length
  };
};

// Generate robots.txt with dynamic sitemap reference
export const generateAdvancedRobotsTxt = () => {
  const baseUrl = 'https://egstutoring.ca';
  
  return `User-agent: *
Allow: /

# Disallow private and admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /login
Disallow: /dashboard
Disallow: /home
Disallow: /profile
Disallow: /settings
Disallow: /log-hours
Disallow: /viewinvoices
Disallow: /request-reply

# Allow important public pages
Allow: /
Allow: /register
Allow: /request
Allow: /subjects/
Allow: /grades/
Allow: /locations/

# Sitemap locations
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-subjects.xml
Sitemap: ${baseUrl}/sitemap-locations.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1

# Block common bot files
Disallow: /wp-admin/
Disallow: /wp-content/
Disallow: /wp-includes/
Disallow: /*.php$
Disallow: /*.inc$
Disallow: /*.cgi$
Disallow: /*.xhtml$

# Allow CSS and JS for proper rendering
Allow: /*.css$
Allow: /*.js$
Allow: /*.png$
Allow: /*.jpg$
Allow: /*.jpeg$
Allow: /*.gif$
Allow: /*.svg$
Allow: /*.ico$
Allow: /*.webp$

# Google-specific directives
User-agent: Googlebot
Allow: /

User-agent: Googlebot-Image
Allow: /

# Bing-specific directives  
User-agent: bingbot
Crawl-delay: 2

# Social media crawlers
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /`;
};

// Generate subject-specific sitemap
export const generateSubjectSitemap = () => {
  const baseUrl = 'https://egstutoring.ca';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const subjects = [
    { name: 'Mathematics', priority: '0.9' },
    { name: 'Science', priority: '0.9' },
    { name: 'Physics', priority: '0.8' },
    { name: 'Chemistry', priority: '0.8' },
    { name: 'Biology', priority: '0.8' },
    { name: 'English', priority: '0.9' },
    { name: 'French', priority: '0.8' },
    { name: 'History', priority: '0.7' },
    { name: 'Geography', priority: '0.7' },
    { name: 'Computer Science', priority: '0.8' }
  ];
  
  const gradeLevels = ['elementary', 'middle-school', 'high-school', 'university'];
  
  let pages = [];
  
  // Add main subject pages
  subjects.forEach(subject => {
    pages.push({
      url: `/subjects/${subject.name.toLowerCase().replace(/\s+/g, '-')}`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: subject.priority
    });
    
    // Add grade-specific subject pages
    gradeLevels.forEach(grade => {
      pages.push({
        url: `/subjects/${subject.name.toLowerCase().replace(/\s+/g, '-')}/${grade}`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: (parseFloat(subject.priority) - 0.1).toString()
      });
    });
  });
  
  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemapXML;
};

// Generate location-specific sitemap
export const generateLocationSitemap = () => {
  const baseUrl = 'https://egstutoring.ca';
  const currentDate = new Date().toISOString().split('T')[0];
  
  const provinces = [
    { name: 'Ontario', cities: ['Toronto', 'Ottawa', 'Hamilton', 'London', 'Kitchener'] },
    { name: 'Quebec', cities: ['Montreal', 'Quebec City'] },
    { name: 'British Columbia', cities: ['Vancouver', 'Victoria', 'Kelowna'] },
    { name: 'Alberta', cities: ['Calgary', 'Edmonton'] },
    { name: 'Manitoba', cities: ['Winnipeg'] },
    { name: 'Saskatchewan', cities: ['Saskatoon', 'Regina'] },
    { name: 'Nova Scotia', cities: ['Halifax'] },
    { name: 'Newfoundland and Labrador', cities: ['St. John\'s'] }
  ];
  
  let pages = [];
  
  provinces.forEach(province => {
    // Add province page
    pages.push({
      url: `/locations/${province.name.toLowerCase().replace(/\s+/g, '-')}`,
      lastmod: currentDate,
      changefreq: 'monthly',
      priority: '0.7'
    });
    
    // Add city pages
    province.cities.forEach(city => {
      pages.push({
        url: `/locations/${province.name.toLowerCase().replace(/\s+/g, '-')}/${city.toLowerCase().replace(/\s+/g, '-')}`,
        lastmod: currentDate,
        changefreq: 'monthly',
        priority: '0.6'
      });
    });
  });
  
  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return sitemapXML;
};

// Generate sitemap index that references all sitemaps
export const generateSitemapIndex = () => {
  const baseUrl = 'https://egstutoring.ca';
  const currentDate = new Date().toISOString();
  
  const sitemaps = [
    { url: `${baseUrl}/sitemap.xml`, lastmod: currentDate },
    { url: `${baseUrl}/sitemap-subjects.xml`, lastmod: currentDate },
    { url: `${baseUrl}/sitemap-locations.xml`, lastmod: currentDate }
  ];
  
  const sitemapIndexXML = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap.url}</loc>
    <lastmod>${sitemap.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  return sitemapIndexXML;
};

export default {
  generateDynamicSitemap,
  generateAdvancedRobotsTxt,
  generateSubjectSitemap,
  generateLocationSitemap,
  generateSitemapIndex
};