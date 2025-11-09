// src/utils/timeHelpers.js

export const getTimeSince = (timeValue) => {
  if (!timeValue) return "—";
  
  // Handle Firestore Timestamp objects OR ISO strings
  const date = timeValue?.toDate ? timeValue.toDate() : new Date(timeValue);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
};

export const formatTime = (timeValue) => {
  if (!timeValue) return "—";
  
  // Handle Firestore Timestamp objects OR ISO strings
  const date = timeValue?.toDate ? timeValue.toDate() : new Date(timeValue);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const getTimeColor = (timeValue) => {
  if (!timeValue) return "text-gray-600";
  
  // Handle Firestore Timestamp objects OR ISO strings
  const date = timeValue?.toDate ? timeValue.toDate() : new Date(timeValue);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  
  if (minutes > 30) return "text-red-600";
  if (minutes > 15) return "text-yellow-600";
  return "text-gray-600";
};