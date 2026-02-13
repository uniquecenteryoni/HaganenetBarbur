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
    } else if (action === 'updateLeadStatus') {
      return updateLeadStatusFromPanel(data.email, data.status);
    } else if (action === 'updateLead') {
      return updateLeadFromPanel(data.email, data.updates);
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
  } else if (action === 'extractLeads') {
    return extractLeadsFromPanel();
  } else if (action === 'getLeadsData') {
    return getLeadsDataForPanel();
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
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();

    const customersMap = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const emailCell = row.find(v => typeof v === 'string' && v.includes('@')) || row[1];
      const email = (emailCell || '').toString().trim().toLowerCase();
      if (!email || !email.includes('@')) continue;

      const name = (row[3] || row[2] || row[1] || email.split('@')[0] || 'ללא שם').toString().trim();
      if (!customersMap[email]) {
        customersMap[email] = { email: email, name: name };
      }
    }

    const customers = Object.values(customersMap).sort((a, b) => a.name.localeCompare(b.name));
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

/**
 * עדכון סטטוס ליד
 */
function updateLeadStatusFromPanel(email, status) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    // מצא את השורה עם המייל הזה
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) { // עמודה B = מייל
        // עדכן עמודה F (6) = סטטוס
        sheet.getRange(i + 1, 6).setValue(status);
        break;
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * עדכון ליד (שם/טלפון/סוג/סטטוס/מוצרים/מחיר)
 */
function updateLeadFromPanel(email, updates) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) { // עמודה B = מייל
        if (updates.name !== undefined) sheet.getRange(i + 1, 4).setValue(updates.name);   // D
        if (updates.phone !== undefined) sheet.getRange(i + 1, 3).setValue(updates.phone); // C
        if (updates.type !== undefined) sheet.getRange(i + 1, 5).setValue(updates.type);   // E
        if (updates.status !== undefined) sheet.getRange(i + 1, 6).setValue(updates.status); // F
        if (updates.products !== undefined) sheet.getRange(i + 1, 7).setValue(updates.products); // G
        if (updates.price !== undefined) sheet.getRange(i + 1, 8).setValue(updates.price); // H
        break;
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * ייבוא לידים מהמייל (קורא לפונקציה הקיימת)
 */
function extractLeadsFromPanel() {
  try {
    const count = extractFormspreeLeadsSilent();
    
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
 * ייבוא לידים מהאימייל עם UI (לשימוש ידני מהגיליון)
 */
function extractFormspreeLeads() {
  return extractFormspreeLeadsSilent();
}

/**
 * גרסה שקטה לייבוא לידים (ללא UI)
 */
function extractFormspreeLeadsSilent() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
  const labelName = "Processed_Formspree";
  let label = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);

  const lastLeadDate = getLastLeadDate(sheet);
  const afterQuery = lastLeadDate ? (' after:' + formatDateForGmail(lastLeadDate)) : '';
  const query = 'from:noreply@formspree.io label:inbox -in:trash -in:spam -label:' + labelName + afterQuery;
  const threads = GmailApp.search(query);
  let count = 0;

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      if (msg.isInTrash()) return;
      const msgDate = msg.getDate();
      if (lastLeadDate && msgDate <= lastLeadDate) return;
      let body = msg.getPlainBody().replace(/&amp;#34;/g, '"').replace(/&#34;/g, '"').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      
      const name = extractValue(body, /name[:]?\s*\n*(.*)/i);
      const phone = extractValue(body, /phone[:]?\s*\n*(.*)/i);
      const email = extractValue(body, /email[:]?\s*\n*(.*)/i);
      
      const messageMatch = body.match(/message[:]?(\s)*\n*([\s\S]*?)(?=סה"כ|₪|tag|$)/i);
      let cleanProducts = "";
      if (messageMatch) {
        const rawText = messageMatch[2] || messageMatch[1] || '';
        const items = rawText.match(/\d+\.\s*([^\n\r]+)/g);
        cleanProducts = items ? items.map(item => item.replace(/^\d+\.\s*/, '').replace(/🎁/g, '').trim()).join("\n") : rawText.trim();
      }
      
      const price = (body.match(/(?:סה"כ|₪)\s*[:]*\s*([\d.]+)/i) || ["", "0.00"])[1];
      const tag = (body.match(/tag[:]?(\s)*\n*(.*)/i) || ["", "Formspree"])[2].trim();

      if (email || name) {
        sheet.appendRow([msg.getDate(), email, phone, name, tag, 'לא טופל', cleanProducts, price]);
        count++;
      }
    });
    thread.addLabel(label);
  });

  return count;
}

function getLastLeadDate(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    let maxDate = null;
    values.forEach(row => {
      const val = row[0];
      if (!val) return;
      const d = val instanceof Date ? val : new Date(val);
      if (!isNaN(d.getTime()) && (!maxDate || d > maxDate)) {
        maxDate = d;
      }
    });
    return maxDate;
  } catch (e) {
    return null;
  }
}

function formatDateForGmail(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return y + '/' + m + '/' + d;
}

/**
 * קבלת נתוני לידים כולל סטטוס
 * מבנה העמודות: A=תאריך, B=מייל, C=טלפון, D=שם, E=מקור, F=סטטוס, G=מוצרים, H=מחיר
 */
function getLeadsDataForPanel() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    const leads = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      leads.push({
        date: row[0],                    // A - תאריך
        email: row[1],                   // B - מייל
        phone: row[2],                   // C - טלפון
        name: row[3],                    // D - שם מלא
        type: row[4],                    // E - מקור הליד
        status: row[5] || 'לא טופל',    // F - סטטוס (ברירת מחדל)
        products: row[6] || '',          // G - מה רכש
        price: row[7] || '0',            // H - עלות מוצר
        message: row[6] || ''            // G - גם בשדה message לתאימות
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      leads: leads
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * הוראות התקנה:
 * 1. פתחי את Google Apps Script: Extensions → Apps Script
 * 2. העתיקי את כל התוכן של הקובץ הזה
 * 3. הדביקי אותו בסוף הקוד הקיים בקובץ Code.gs
 * 4. שמרי (Ctrl+S) ופרסי מחדש (Deploy → New deployment)
 * 
 * שינויים חדשים:
 * - הוספת updateLeadStatus - עדכון סטטוס ליד אחרי שליחת קובץ
 * - הוספת extractLeadsFromPanel - ייבוא לידים מהמייל דרך הפאנל
 * - הוספת getLeadsData - טעינת לידים כולל שדה סטטוס
 * 
 * הערה: ודאי שהגדרת את SPREADSHEET_ID בקוד הראשי!
 */
