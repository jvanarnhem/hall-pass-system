// src/utils/csvHelpers.js

// Parse CSV text into array of objects
export const parseCSV = (csvText, expectedHeaders) => {
  const lines = csvText.trim().split('\n');
  
  if (lines.length < 2) {
    return { success: false, error: 'CSV file is empty or has no data rows', data: [] };
  }

  // Parse header
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  
  // Check required columns
  const missing = expectedHeaders.filter(col => !header.includes(col.toLowerCase()));
  if (missing.length > 0) {
    return { success: false, error: `Missing required columns: ${missing.join(', ')}`, data: [] };
  }

  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma, handling quoted fields
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
    const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

    if (cleanParts.length < expectedHeaders.length) {
      console.warn(`Skipping line ${i + 1}: not enough columns`);
      continue;
    }

    // Build object using header
    const row = {};
    header.forEach((col, idx) => {
      row[col] = cleanParts[idx] || '';
    });

    data.push(row);
  }

  return { success: true, data, count: data.length };
};

// Export array of objects to CSV
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    alert('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Escape CSV field
  const escapeCSV = (field) => {
    if (!field) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => escapeCSV(row[header]));
    csv += values.join(',') + '\n';
  });

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Format date to YYYY-MM-DD HH:MM:SS
export const formatDateForCSV = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};