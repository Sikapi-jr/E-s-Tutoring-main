import { useEffect } from 'react';
import { generateSocialTags } from '../utils/seoUtils';

const SEOHead = ({
  title = "EGS Tutoring - Professional Online & In-Person Tutoring Services Canada",
  description = "Connect with qualified tutors across Canada. EGS Tutoring offers personalized online and in-person tutoring for all grades and subjects. Schedule sessions, track progress, and improve grades with our comprehensive tutoring platform.",
  keywords = "tutoring, online tutoring, in-person tutoring, Canada tutors, math tutoring, science tutoring, homework help, academic support, qualified tutors, student progress tracking",
  canonical = "https://egstutoring.ca",
  ogImage = "https://egstutoring.ca/og-image.jpg",
  structuredData = null,
  noIndex = false,
  noFollow = false,
  priority = "0.8",
  changeFreq = "weekly",
  breadcrumbs = null,
  hrefLang = null,
  customMeta = {}
}) => {
  useEffect(() => {
    // Update document title with character limit optimization
    const optimizedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    document.title = optimizedTitle;
    
    // Update meta tags helper function
    const updateMetaTag = (name, content, isProperty = false, httpEquiv = false) => {
      if (!content) return;
      
      let attribute, selector;
      if (httpEquiv) {
        attribute = 'http-equiv';
        selector = `meta[http-equiv="${name}"]`;
      } else if (isProperty) {
        attribute = 'property';
        selector = `meta[property="${name}"]`;
      } else {
        attribute = 'name';
        selector = `meta[name="${name}"]`;
      }
      
      let tag = document.querySelector(selector);
      if (tag) {
        tag.setAttribute('content', content);
      } else {
        tag = document.createElement('meta');
        tag.setAttribute(attribute, name);
        tag.setAttribute('content', content);
        document.head.appendChild(tag);
      }
    };

    // Update basic meta tags
    updateMetaTag('description', description.length > 160 ? description.substring(0, 157) + '...' : description);
    updateMetaTag('keywords', keywords);
    
    // Robots meta tag
    const robotsContent = `${noIndex ? 'noindex' : 'index'}, ${noFollow ? 'nofollow' : 'follow'}`;
    updateMetaTag('robots', robotsContent);
    
    // Generate and apply social media tags
    const socialTags = generateSocialTags({ title, description, canonical }, ogImage);
    Object.entries(socialTags).forEach(([key, value]) => {
      const isProperty = key.startsWith('og:') || key.startsWith('twitter:');
      updateMetaTag(key, value, isProperty);
    });
    
    // Custom meta tags
    Object.entries(customMeta).forEach(([key, value]) => {
      updateMetaTag(key, value);
    });
    
    // Update canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.setAttribute('href', canonical);
    } else {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      canonicalLink.setAttribute('href', canonical);
      document.head.appendChild(canonicalLink);
    }
    
    // Add hreflang links for multi-language support
    if (hrefLang) {
      // Remove existing hreflang links
      document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => {
        if (link.id === 'dynamic-hreflang') link.remove();
      });
      
      Object.entries(hrefLang).forEach(([lang, url]) => {
        const hrefLangLink = document.createElement('link');
        hrefLangLink.setAttribute('rel', 'alternate');
        hrefLangLink.setAttribute('hreflang', lang);
        hrefLangLink.setAttribute('href', url);
        hrefLangLink.id = 'dynamic-hreflang';
        document.head.appendChild(hrefLangLink);
      });
    }
    
    // Add structured data if provided
    if (structuredData) {
      let script = document.querySelector('script[type="application/ld+json"]#dynamic-schema');
      if (script) {
        script.textContent = JSON.stringify(structuredData);
      } else {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.id = 'dynamic-schema';
        script.textContent = JSON.stringify(structuredData);
        document.head.appendChild(script);
      }
    }
    
    // Add breadcrumb structured data
    if (breadcrumbs) {
      let breadcrumbScript = document.querySelector('script[type="application/ld+json"]#breadcrumb-schema');
      if (breadcrumbScript) {
        breadcrumbScript.textContent = JSON.stringify(breadcrumbs);
      } else {
        breadcrumbScript = document.createElement('script');
        breadcrumbScript.type = 'application/ld+json';
        breadcrumbScript.id = 'breadcrumb-schema';
        breadcrumbScript.textContent = JSON.stringify(breadcrumbs);
        document.head.appendChild(breadcrumbScript);
      }
    }
    
    // Add sitemap priority and change frequency (for future sitemap generation)
    updateMetaTag('sitemap-priority', priority);
    updateMetaTag('sitemap-changefreq', changeFreq);
    
    // Performance optimizations
    updateMetaTag('format-detection', 'telephone=no');
    updateMetaTag('mobile-web-app-capable', 'yes');
    updateMetaTag('apple-mobile-web-app-capable', 'yes');
    
  }, [title, description, keywords, canonical, ogImage, structuredData, noIndex, noFollow, priority, changeFreq, breadcrumbs, hrefLang, customMeta]);

  return null; // This component doesn't render anything
};

export default SEOHead;