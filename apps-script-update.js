/**
 * עדכון נדרש ל-Google Apps Script
 * העתיקי את הפונקציות האלה ל-Apps Script שלך
 */

/**
 * doPost - מטפל בבקשות POST מהפאנל
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'sendNewsletter') {
      return sendNewsletterFromPanel(data.data);
    } else if (action === 'sendManualEmail') {
      return sendManualEmailFromPanel(data.emails, data.files);
    } else if (action === 'processAndSendFiles') {
      return processAndSendFilesFromPanel(data.startDate, data.endDate, data.key);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * doGet - מטפל בבקשות GET
 */
function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'getLeads') {
    return getLeadsForPanel();
  } else if (action === 'getStats') {
    return getStatsForPanel();
  } else if (action === 'getFilteredCount') {
    const filters = JSON.parse(e.parameter.filters);
    return getFilteredCountForPanel(filters);
  } else if (action === 'getCustomersList') {
    return getCustomersListForPanel();
  } else if (action === 'getFilesList') {
    return getFilesListForPanel();
  } else if (action === 'getPreviewStats') {
    return getPreviewStatsForPanel(e.parameter.startDate, e.parameter.endDate);
  }
  
  return ContentService.createTextOutput(JSON.stringify({error: 'Invalid action'}))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * שליחת ניוזלטר מהפאנל
 */
function sendNewsletterFromPanel(payload) {
  try {
    const recipients = payload.isTest 
      ? ["haganenet.barbur@gmail.com"] 
      : getFilteredEmailsList(payload.filters);
    
    if (recipients.length === 0) {
      throw new Error('לא נמצאו נמענים');
    }
    
    const sigBlob = DriveApp.getFileById(SIGNATURE_FILE_ID).getBlob();
    const fullHtml = `<div dir="rtl" style="font-family: Arial; text-align: right;">
      ${payload.bodyHtml}<br><br>
      <img src="cid:signature" style="max-width:300px;">
    </div>`;
    
    recipients.forEach(email => {
      MailApp.sendEmail({
        to: email,
        subject: payload.subject,
        htmlBody: fullHtml,
        inlineImages: {"signature": sigBlob}
      });
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: recipients.length
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * שליחת קבצים ידנית
 */
function sendManualEmailFromPanel(emails, fileNames) {
  try {
    const result = sendManualEmail(emails, fileNames);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: result
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * שליחת קבצים קבוצתית
 */
function processAndSendFilesFromPanel(startDate, endDate, specificKey) {
  try {
    const count = processAndSendFiles(startDate, endDate, specificKey);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: count
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * קבלת ספירת נמענים מסוננים
 */
function getFilteredCountForPanel(filters) {
  try {
    const emails = getFilteredEmailsList(filters);
    
    return ContentService.createTextOutput(emails.length.toString())
      .setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    return ContentService.createTextOutput('0')
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * קבלת רשימת מיילים מסוננים
 */
function getFilteredEmailsList(filters) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  
  const emails = [];
  const start = filters.startDate ? new Date(filters.startDate) : null;
  const end = filters.endDate ? new Date(filters.endDate) : null;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = row[1];
    const type = row[4];
    const date = row[0] ? new Date(row[0]) : null;
    
    if (!email || !email.includes('@')) continue;
    
    if (start && date && date < start) continue;
    if (end && date && date > end) continue;
    if (filters.type && filters.type !== 'All' && type !== filters.type) continue;
    
    emails.push(email);
  }
  
  return [...new Set(emails)]; // unique only
}

/**
 * קבלת רשימת לקוחות
 */
function getCustomersListForPanel() {
  try {
    const customers = getCustomersList();
    
    return ContentService.createTextOutput(JSON.stringify(customers))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * קבלת רשימת קבצים
 */
function getFilesListForPanel() {
  try {
    const files = getFilesList();
    
    return ContentService.createTextOutput(JSON.stringify(files))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * קבלת תצוגה מקדימה של קבוצות
 */
function getPreviewStatsForPanel(startDate, endDate) {
  try {
    const stats = getPreviewStats(startDate, endDate);
    
    return ContentService.createTextOutput(JSON.stringify(stats))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
