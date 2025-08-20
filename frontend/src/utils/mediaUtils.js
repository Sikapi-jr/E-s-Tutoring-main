// Media utilities for serving files through API
import React from 'react';
import api from '../api';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper function to get media file through API
export const getMediaUrl = async (filePath) => {
  if (!filePath) return null;
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http')) return filePath;
  
  // Extract just the filename from the path
  const cleanPath = filePath.replace('/media/', '').replace('media/', '');
  
  try {
    // Use API endpoint to get file as base64
    const response = await api.get(`/api/media/${cleanPath}`);
    const { content, content_type } = response.data;
    
    // Convert base64 to data URL
    return `data:${content_type};base64,${content}`;
  } catch (error) {
    console.error('Failed to load media file:', error);
    // Fallback to direct URL for development
    return `${API_BASE_URL}/media/${cleanPath}`;
  }
};

// Hook for loading media URLs
export const useMediaUrl = (filePath) => {
  const [mediaUrl, setMediaUrl] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!filePath) {
      setMediaUrl(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    getMediaUrl(filePath)
      .then((url) => {
        setMediaUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [filePath]);

  return { mediaUrl, loading, error };
};