# GA Period Navigator

A very simple Chrome extension that adds one-click period navigation buttons to Google Analytics dashboards.

## Why This Extension Exists

Working with Google Analytics often requires comparing metrics across different time periods. The default date picking experience involves 3-5 clicks to navigate between periods, which can become tedious when performing frequent comparisons.

![Without extension: 3-5 clicks required to navigate between periods](/static/ga-clicks.png)

This extension adds simple next/previous period navigation buttons (⏮️ and ⏭️) to the Google Analytics interface, allowing you to quickly jump between time periods with a single click.

[Demo video of extension in action](/static/demo.mp4)

## Installation

### Manual Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the directory containing the extension files
5. The extension will be installed and active immediately

## Permissions

This extension only requires the `activeTab` permission and only runs on Google Analytics pages (`https://analytics.google.com/*`).
