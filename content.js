/**
 * Google Analytics Period Navigator
 *
 * This extension adds forward/backward period navigation to Google Analytics,
 * allowing users to easily navigate through date periods without using the date picker.
 */

// Wait for the page to fully load
document.addEventListener('DOMContentLoaded', initialize);
window.addEventListener('load', initialize);
console.log('Loaded GA Period Navigator');

// Listen for URL changes since Google Analytics is a SPA
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });

/**
 * Initialize the extension after the page loads
 */
function initialize() {
  // Wait a bit for Google Analytics to fully render
  setTimeout(checkAndAddButtons, 1500);
}

/**
 * Check for the date range picker and add navigation buttons
 */
function checkAndAddButtons() {
  // Check if buttons already exist to avoid duplicates
  if (document.getElementById('ga-nav-prev') || document.getElementById('ga-nav-next')) {
    return;
  }

  // Look for the date range text element
  const dateRangeText = document.querySelector('div[class*="primary-date-range-text"]');
  if (!dateRangeText) {
    // Try again later if the element isn't found
    setTimeout(checkAndAddButtons, 1000);
    return;
  }

  // Find the parent container to place our buttons
  const dateContainer = dateRangeText.closest('div[data-testid="date-picker-container"]') ||
                        dateRangeText.parentElement.parentElement.parentElement;
  if (!dateContainer) {
    setTimeout(checkAndAddButtons, 1000);
    return;
  }

  // Create container for our buttons
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'ga-period-nav-buttons';

  // Create previous period button
  const prevButton = document.createElement('button');
  prevButton.id = 'ga-nav-prev';
  prevButton.className = 'ga-nav-button';
  prevButton.title = 'Previous Period';
  prevButton.innerHTML = '⏮️';
  prevButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigatePeriod(-1);
  });

  // Create next period button
  const nextButton = document.createElement('button');
  nextButton.id = 'ga-nav-next';
  nextButton.className = 'ga-nav-button';
  nextButton.title = 'Next Period';
  nextButton.innerHTML = '⏭️';
  nextButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigatePeriod(1);
  });

  // Add buttons to container
  buttonsContainer.appendChild(prevButton);
  buttonsContainer.appendChild(nextButton);

  // Insert buttons next to date picker
  dateContainer.parentNode.insertBefore(buttonsContainer, dateContainer.nextSibling);
}

/**
 * Navigate to previous or next period
 * @param {number} direction - Direction to navigate: -1 for previous, 1 for next
 */
function navigatePeriod(direction) {
  // 1. Extract dates from URL if they exist, otherwise default to null
  const { startDate, endDate } = extractDatesFromURL();

  // 2. Get dates from the UI if they're not in the URL
  let baseStartDate, baseEndDate;
  let diffDays;

  if (startDate && endDate) {
    // Convert string dates to Date objects
    baseStartDate = new Date(
      parseInt(startDate.substring(0, 4)),
      parseInt(startDate.substring(4, 6)) - 1,
      parseInt(startDate.substring(6, 8))
    );

    baseEndDate = new Date(
      parseInt(endDate.substring(0, 4)),
      parseInt(endDate.substring(4, 6)) - 1,
      parseInt(endDate.substring(6, 8))
    );

    // Calculate the number of days in this period
    diffDays = Math.round((baseEndDate - baseStartDate) / (1000 * 60 * 60 * 24)) + 1;
    console.log(`Period from URL dates: ${diffDays} days (${baseStartDate.toDateString()} - ${baseEndDate.toDateString()})`);
  } else {
    // Get dates from the date range text
    const { startDate: textStartDate, endDate: textEndDate, dayCount } = extractDatesFromText();

    if (textStartDate && textEndDate) {
      baseStartDate = textStartDate;
      baseEndDate = textEndDate;
      diffDays = dayCount;
      console.log(`Period from text dates: ${diffDays} days (${baseStartDate.toDateString()} - ${baseEndDate.toDateString()})`);
    } else {
      // If still no dates, use default 28 days
      diffDays = 28;

      // Use today as the end date and calculate start date
      baseEndDate = new Date();
      baseStartDate = new Date(baseEndDate);
      baseStartDate.setDate(baseStartDate.getDate() - (diffDays - 1));
      console.log(`Using default period: ${diffDays} days (${baseStartDate.toDateString()} - ${baseEndDate.toDateString()})`);
    }
  }

  // Calculate new dates by moving the period
  const newStartDate = new Date(baseStartDate);
  newStartDate.setDate(newStartDate.getDate() + (diffDays * direction));

  const newEndDate = new Date(baseEndDate);
  newEndDate.setDate(newEndDate.getDate() + (diffDays * direction));

  console.log(`Navigating from ${baseStartDate.toDateString()}-${baseEndDate.toDateString()} to ${newStartDate.toDateString()}-${newEndDate.toDateString()} (${diffDays} days)`);

  // 4. Update URL with new dates
  updateURL(formatDate(newStartDate), formatDate(newEndDate));
}

/**
 * Extract dates from the date range text in the UI
 * @return {Object} - Object containing startDate, endDate, and dayCount
 */
function extractDatesFromText() {
  const dateRangeText = document.querySelector('div[class*="primary-date-range-text"]')?.textContent?.trim() || '';
  console.log('Date range text:', dateRangeText);

  // Try first with the format that includes years for both dates: "Dec 23, 2024 - Jan 19, 2025"
  let crossYearPattern = /([A-Za-z]+)\s+(\d+),\s+(\d{4})\s+-\s+([A-Za-z]+)\s+(\d+),\s+(\d{4})/;
  let match = dateRangeText.match(crossYearPattern);

  if (match) {
    console.log('Matched cross-year pattern with explicit years');
    return parseCrossYearFormat(match);
  }

  // If no match with the cross-year pattern, try the standard pattern
  // Match patterns like "Apr 13 - Apr 13, 2025" or "Mar 17 - Apr 13, 2025"
  const dateTextPattern = /([A-Za-z]+)\s+(\d+)(?:\s+-\s+([A-Za-z]+)\s+(\d+))?(?:,?\s+(\d{4}))?/;
  match = dateRangeText.match(dateTextPattern);

  if (match) {
    return parseStandardFormat(match);
  }

  return {
    startDate: null,
    endDate: null,
    dayCount: null
  };
}

/**
 * Parse date text in cross-year format with explicit years
 * @param {Array} match - Regex match array for cross-year format
 * @return {Object} - Object containing startDate, endDate, and dayCount
 */
function parseCrossYearFormat(match) {
  const [_, startMonth, startDay, startYear, endMonth, endDay, endYear] = match;
  const months = getMonthsMap();

  const startDate = new Date(parseInt(startYear), months[startMonth], parseInt(startDay));
  const endDate = new Date(parseInt(endYear), months[endMonth], parseInt(endDay));

  // Calculate the number of days in this period
  const dayCount = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  console.log(`Parsed date range: ${startDate.toDateString()} - ${endDate.toDateString()} (${dayCount} days)`);

  return {
    startDate,
    endDate,
    dayCount
  };
}

/**
 * Parse date text in standard format
 * @param {Array} match - Regex match array for standard format
 * @return {Object} - Object containing startDate, endDate, and dayCount
 */
function parseStandardFormat(match) {
  const [_, startMonth, startDay, endMonth, endDay, year] = match;
  const months = getMonthsMap();

  // If year isn't explicitly mentioned, use current year
  const currentYear = new Date().getFullYear();
  const yearNum = year ? parseInt(year) : currentYear;

  // Handle year transition cases (like Dec-Jan)
  let startYear = yearNum;
  const startMonthNum = months[startMonth];
  const endMonthNum = endMonth ? months[endMonth] : startMonthNum;

  // If start month is later in the year than end month (e.g., Dec-Jan),
  // then start month is likely in the previous year
  if (endMonth && startMonthNum > endMonthNum) {
    startYear = yearNum - 1;
    console.log(`Year transition detected: ${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${yearNum}`);
  }

  const startDate = new Date(startYear, startMonthNum, parseInt(startDay));

  // If endMonth and endDay exist, use them; otherwise use startMonth and startDay
  const actualEndMonth = endMonth || startMonth;
  const actualEndDay = endDay || startDay;

  const endDate = new Date(yearNum, months[actualEndMonth], parseInt(actualEndDay));

  // Calculate the number of days in this period
  const dayCount = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

  console.log(`Parsed date range: ${startDate.toDateString()} - ${endDate.toDateString()} (${dayCount} days)`);

  return {
    startDate,
    endDate,
    dayCount
  };
}

/**
 * Get mapping of month names to their numeric values
 * @return {Object} - Object mapping month names to indices (0-11)
 */
function getMonthsMap() {
  return {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
}

/**
 * Extract dates from URL
 * @return {Object} - Object containing startDate, endDate, and dateOption if available
 */
function extractDatesFromURL() {
  const currentUrl = window.location.href;

  // Find the first occurrence of date parameters (using both dot formats)
  const datePattern = /(_u\.\.?date00|_u\.date00)=(\d{8}).*?(_u\.\.?date01|_u\.date01)=(\d{8})/;
  const match = currentUrl.match(datePattern);

  if (match) {
    // Extract dates from matches (position 2 and 4 due to capture groups)
    console.log(`Found dates in URL: ${match[2]}-${match[4]}`);
    return {
      startDate: match[2],
      endDate: match[4]
    };
  }

  // Check for dateOption parameter (using both dot formats)
  const dateOptionPattern = /(_u\.\.?dateOption|_u\.dateOption)=([^&%#]+)/;
  const dateOptionMatch = currentUrl.match(dateOptionPattern);

  if (dateOptionMatch) {
    console.log(`Found dateOption in URL: ${dateOptionMatch[2]}`);
    return {
      startDate: null,
      endDate: null,
    };
  }

  console.log('No dates found in URL');
  return {
    startDate: null,
    endDate: null
  };
}

/**
 * Update URL with new dates
 * @param {string} newStartDate - Start date in YYYYMMDD format
 * @param {string} newEndDate - End date in YYYYMMDD format
 */
function updateURL(newStartDate, newEndDate) {
  const currentUrl = window.location.href;

  // Find where the params start
  const paramsIndex = currentUrl.indexOf('params=');
  if (paramsIndex === -1) {
    handleUrlWithoutParams(currentUrl, newStartDate, newEndDate);
    return;
  }

  // Handle URL with existing params
  handleUrlWithParams(currentUrl, paramsIndex, newStartDate, newEndDate);
}

/**
 * Handle URL update for URLs without params
 * @param {string} currentUrl - Current URL
 * @param {string} newStartDate - Start date in YYYYMMDD format
 * @param {string} newEndDate - End date in YYYYMMDD format
 */
function handleUrlWithoutParams(currentUrl, newStartDate, newEndDate) {
  // No params, create a new URL with params
  const hashIndex = currentUrl.indexOf('#');
  let newUrl;

  if (hashIndex !== -1) {
    // URL has a hash, insert params before it
    const urlBeforeHash = currentUrl.substring(0, hashIndex);
    const urlAfterHash = currentUrl.substring(hashIndex);
    const separator = urlBeforeHash.includes('?') ? '&' : '?';

    newUrl = `${urlBeforeHash}${separator}params=_u..nav%3Dmaui%26_u.comparisonOption%3Ddisabled%26_u.date00%3D${newStartDate}%26_u.date01%3D${newEndDate}${urlAfterHash}`;
  } else {
    // No hash, append params to the end
    const separator = currentUrl.includes('?') ? '&' : '?';
    newUrl = `${currentUrl}${separator}params=_u..nav%3Dmaui%26_u.comparisonOption%3Ddisabled%26_u.date00%3D${newStartDate}%26_u.date01%3D${newEndDate}`;
  }

  console.log('Navigating to:', newUrl);
  window.location.href = newUrl;
}

/**
 * Handle URL update for URLs with existing params
 * @param {string} currentUrl - Current URL
 * @param {number} paramsIndex - Index of 'params=' in URL
 * @param {string} newStartDate - Start date in YYYYMMDD format
 * @param {string} newEndDate - End date in YYYYMMDD format
 */
function handleUrlWithParams(currentUrl, paramsIndex, newStartDate, newEndDate) {
  // Extract URL parts
  const beforeParams = currentUrl.substring(0, paramsIndex);

  // Find where params end (could be at &, # or end of string)
  let paramsEndIndex = currentUrl.indexOf('&', paramsIndex);
  if (paramsEndIndex === -1) {
    paramsEndIndex = currentUrl.indexOf('#', paramsIndex);
    if (paramsEndIndex === -1) {
      paramsEndIndex = currentUrl.length;
    }
  }

  const afterParams = currentUrl.substring(paramsEndIndex);

  // Extract current params content
  let paramsContent = currentUrl.substring(paramsIndex + 7, paramsEndIndex); // 7 = 'params='.length

  // Check if the URL contains _u..nav
  const hasDoubleNav = paramsContent.includes('_u..nav');

  // Completely rebuild params - first preserve any non-date parameters
  const nonDateParams = [];

  // Split by %26 (encoded &)
  const paramParts = paramsContent.split('%26');

  for (const part of paramParts) {
    // Keep parameters that are not date00, date01, dateOption, comparisonOption, or nav
    if (!part.includes('.date00') &&
        !part.includes('.date01') &&
        !part.includes('..date00') &&
        !part.includes('..date01') &&
        !part.includes('.dateOption') &&
        !part.includes('..dateOption') &&
        !part.includes('.comparisonOption') &&
        !part.includes('..comparisonOption') &&
        !part.includes('.nav') &&
        !part.includes('..nav')) {
      nonDateParams.push(part);
    }

    // Special handling for nav parameter - keep existing value if it exists
    if ((hasDoubleNav && part.includes('..nav')) ||
        (!hasDoubleNav && part.includes('.nav') && !part.includes('..nav'))) {
      nonDateParams.push(part);
    }
  }

  // Add our clean parameters
  let newParamsContent = nonDateParams.join('%26');

  // If no nav parameter was preserved, add the default
  if (!nonDateParams.some(part => part.includes('.nav'))) {
    newParamsContent = (newParamsContent ? newParamsContent + '%26' : '') + '_u..nav%3Dmaui';
  }

  // Add comparison option - always use single-dot format
  newParamsContent += (newParamsContent ? '%26' : '') + '_u.comparisonOption%3Ddisabled';

  // Add date parameters - ALWAYS use single-dot format for dates
  newParamsContent += (newParamsContent ? '%26' : '') +
                      `_u.date00%3D${newStartDate}%26_u.date01%3D${newEndDate}`;

  // Build the new URL
  const newUrl = beforeParams + 'params=' + newParamsContent + afterParams;

  console.log('Navigating to:', newUrl);
  window.location.href = newUrl;
}

/**
 * Format date as YYYYMMDD
 * @param {Date} date - Date object to format
 * @return {string} - Formatted date string in YYYYMMDD format
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}