// src/utils/timeHelpers.js

export const getTimeSince = (isoString) => {
  const minutes = Math.floor((Date.now() - new Date(isoString)) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
};

export const formatTime = (isoString) => {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const getTimeColor = (isoString) => {
  const minutes = Math.floor((Date.now() - new Date(isoString)) / 60000);
  if (minutes > 30) return "text-red-600";
  if (minutes > 15) return "text-yellow-600";
  return "text-gray-600";
};