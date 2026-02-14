/**
 * עדכון נדרש ל-Google Apps Script
 * העתיקי את הפונקציות האלה ל-Apps Script שלך (להחליף הכל)
 */

// --- תפריט ראשי (פועל רק בתוך גיליון) ---
function onOpen() {
  try {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📧 מערכת דיוור')
    .addItem('🔄 עדכן לידים מ-Inbox', 'extractFormspreeLeadsMenu')
    .addSeparator()
    .addItem('📤 ממשק שליחת קבצים', 'showFileSenderDialog')
    .addSeparator()
    .addItem('פתח ממשק שליחת ניוזלטר', 'showDialog')
    .addToUi();
  } catch(e) { Logger.log('onOpen: ' + e); }
}

// --- הגדרות ---
const SPREADSHEET_ID = '1KBinCX3LC2NhDAR__2TPgexY5QM1Q4QDjmwuwqD03TU';
const SIGNATURE_FILE_ID = '14wfppVQEsnZHzRbMRbh3T_UJk0hoJovY';

// --- תבנית מייל ---
function getEmailTemplate(productsHtml) {
  return `
    <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; line-height: 1.6;">
      <p>שלום יקרה!</p>
      <p>איזה כיף שרכשת מהאתר החדש שלי ❤️</p>
      <p>מצרפת לך את הקבצים:</p>
      <p style="background-color: #f9f9f9; padding: 10px; border-right: 4px solid #4CAF50;">
        <b>${productsHtml}</b>
      </p>
      <p>
        אני זמינה לכל שאלה או התייעצות כאן ובעמודי 
        <a href="https://www.instagram.com/haganenet.barbur/" target="_blank" style="color: #E1306C; text-decoration: none; font-weight: bold;">האינסטגרם</a> 
        ו<a href="https://www.facebook.com/haganenet.barbur" target="_blank" style="color: #4267B2; text-decoration: none; font-weight: bold;">הפייסבוק</a> שלי.
      </p>
      <p>אשמח שתחזרי לספר איך היה השימוש בקבצים ולהמליץ לגננות ואמהות נוספות.</p>
      <p>שיהיה סוף שבוע נעים!</p>
      <br>
      <img src="cid:signature" style="max-width:300px;">
    </div>`;
}

// --- Web App API ---
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getLeads') return getLeadsForPanel();
  if (action === 'getStats') return getStatsForPanel();
  if (action === 'getFilteredCount') return getFilteredCountForPanel(JSON.parse(e.parameter.filters));
  if (action === 'getCustomersList') return getCustomersListForPanel();
  if (action === 'getFilesList') return getFilesListForPanel();
  if (action === 'getPreviewStats') return getPreviewStatsForPanel(e.parameter.startDate, e.parameter.endDate);
  if (action === 'extractLeads') return extractLeadsFromPanel();
  if (action === 'getLeadsData') return getLeadsDataForPanel();
  if (action === 'deleteLead') return deleteLeadFromPanel(e.parameter.email, e.parameter.date);
  if (action === 'sendManualEmail') return sendManualEmailFromPanel(JSON.parse(e.parameter.emails), JSON.parse(e.parameter.files));
  if (action === 'processAndSendFiles') return processAndSendFilesFromPanel(e.parameter.startDate, e.parameter.endDate, e.parameter.key);
  if (action === 'trackVisit') return trackVisitForPanel();
  if (action === 'getVisits') return getVisitsForPanel();
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    if (action === 'sendNewsletter') return sendNewsletterFromPanel(data.data);
    if (action === 'sendManualEmail') return sendManualEmailFromPanel(data.emails, data.files);
    if (action === 'processAndSendFiles') return processAndSendFilesFromPanel(data.startDate, data.endDate, data.key);
    if (action === 'updateLeadStatus') return updateLeadStatusFromPanel(data.email, data.status);
    if (action === 'updateLead') return updateLeadFromPanel(data.email, data.updates);
    if (action === 'deleteLead') return deleteLeadFromPanel(data.email, data.date);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- ייבוא לידים ---
function extractFormspreeLeads() {
  const result = extractFormspreeLeadsSilent();
  Logger.log('הסתיים! נוספו ' + result.count + ' לידים חדשים. (threads: ' + result.threadsFound + ', scanned: ' + result.messagesScanned + ', duplicates: ' + result.duplicatesSkipped + ')');
  return result.count;
}

// גרסת תפריט בלבד (לא נקראת מהוובאפ)
function extractFormspreeLeadsMenu() {
  const result = extractFormspreeLeadsSilent();
  try {
    SpreadsheetApp.getUi().alert('הסתיים! נוספו ' + result.count + ' לידים חדשים.');
  } catch (e) {
    Logger.log('הסתיים! נוספו ' + result.count + ' לידים חדשים.');
  }
  return result.count;
}

function extractLeadsFromPanel() {
  try {
    const result = extractFormspreeLeadsSilent();
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      count: result.count,
      threadsFound: result.threadsFound,
      messagesScanned: result.messagesScanned,
      duplicatesSkipped: result.duplicatesSkipped,
      debug: result.debug
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function extractFormspreeLeadsSilent() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Sheet1') || ss.getSheets()[0];
  const labelName = "Processed_Formspree";
  const label = GmailApp.getUserLabelByName(labelName) || GmailApp.createLabel(labelName);

  const lastLeadDate = getLastLeadDate(sheet);
  const afterQuery = lastLeadDate ? (' after:' + formatDateForGmail(lastLeadDate)) : '';
  
  // חיפוש בלי סינון לפי תגית - בודקים מול הגיליון במקום
  const query = 'from:noreply@formspree.io -in:trash -in:spam' + afterQuery;
  const threads = GmailApp.search(query);
  
  // בניית סט של לידים קיימים בגיליון (לפי מייל+תאריך)
  const existingData = sheet.getDataRange().getValues();
  const existingKeys = new Set();
  for (let i = 1; i < existingData.length; i++) {
    const email = (existingData[i][1] || '').toString().trim().toLowerCase();
    const date = existingData[i][0] ? new Date(existingData[i][0]).getTime() : 0;
    if (email) existingKeys.add(email + '|' + date);
  }
  
  let count = 0;
  let threadsFound = threads.length;
  let messagesScanned = 0;
  let duplicatesSkipped = 0;

  threads.forEach(thread => {
    const messages = thread.getMessages();
    messages.forEach(msg => {
      if (msg.isInTrash()) return;
      messagesScanned++;
      const msgDate = msg.getDate();
      if (lastLeadDate && msgDate <= lastLeadDate) return;
      const body = msg.getPlainBody()
        .replace(/&amp;#34;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&');

      const name = extractValue(body, /name[:]?\s*\n*(.*)/i);
      const phone = extractValue(body, /phone[:]?\s*\n*(.*)/i);
      const email = extractValue(body, /email[:]?\s*\n*(.*)/i);
      
      // בדיקת כפילות מול הגיליון
      const key = email.toLowerCase().trim() + '|' + msgDate.getTime();
      if (existingKeys.has(key)) { duplicatesSkipped++; return; }

      const messageMatch = body.match(/message[:]?\s*\n*([\s\S]*?)(?=סה"כ|₪|tag|$)/i);
      let cleanProducts = "";
      if (messageMatch) {
        const rawText = messageMatch[1] || '';
        const items = rawText.match(/\d+\.\s*([^\n\r]+)/g);
        cleanProducts = items
          ? items.map(item => item.replace(/^\d+\.\s*/, '').replace(/🎁/g, '').trim()).join("\n")
          : rawText.trim();
      }

      const price = (body.match(/(?:סה"כ|₪)\s*[:]*\s*([\d.]+)/i) || ["", "0.00"])[1];
      const tag = (body.match(/tag[:]?\s*\n*(.*)/i) || ["", "Formspree"])[1].trim();

      if (email || name) {
        sheet.appendRow([msg.getDate(), email, phone, name, tag, 'לא טופל', cleanProducts, price]);
        existingKeys.add(key); // לזכור שנוסף
        count++;
      }
    });
    thread.addLabel(label);
  });

  return { 
    count: count, 
    threadsFound: threadsFound, 
    messagesScanned: messagesScanned, 
    duplicatesSkipped: duplicatesSkipped,
    debug: {
      query: query,
      lastLeadDate: lastLeadDate ? lastLeadDate.toISOString() : null,
      afterQuery: afterQuery,
      existingKeysCount: existingKeys.size,
      scriptUser: (function(){ try { return Session.getEffectiveUser().getEmail(); } catch(e) { return 'no-permission'; } })()
    }
  };
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
      if (!isNaN(d.getTime()) && (!maxDate || d > maxDate)) maxDate = d;
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

// --- קבצים וקבוצות ---
function processAndSendFiles(startDate, endDate, specificKey = null) {
  const folders = DriveApp.getFoldersByName("חנות קבצים");
  if (!folders.hasNext()) throw new Error("תיקיית 'חנות קבצים' לא נמצאה");
  const folder = folders.next();
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59);

  const groups = {};
  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][0]);
    if (rowDate >= start && rowDate <= end && data[i][6]) {
      const productList = data[i][6].split("\n").map(p => cleanProductName(p)).filter(p => p).sort();
      const cartKey = productList.join("|");
      if (!groups[cartKey]) groups[cartKey] = { products: productList, emails: [], rows: [] };
      groups[cartKey].emails.push(data[i][1]);
      groups[cartKey].rows.push(i + 1);
    }
  }

  const sigBlob = DriveApp.getFileById(SIGNATURE_FILE_ID).getBlob();
  let sentCount = 0;

  for (let key in groups) {
    if (specificKey && key !== specificKey) continue;
    const group = groups[key];
    const attachments = [];
    group.products.forEach(pName => {
      const files = folder.getFilesByName(pName + ".pdf");
      if (files.hasNext()) attachments.push(files.next().getBlob());
    });

    const productsHtml = group.products.map((p, idx) => (idx + 1) + ". " + p).join("<br>");
    const mainRecipient = group.emails[0];
    const bccRecipients = group.emails.slice(1).join(",");

    MailApp.sendEmail({
      to: mainRecipient,
      bcc: bccRecipients,
      subject: "הקבצים שרכשת מהגננת ברבור 🎁",
      htmlBody: getEmailTemplate(productsHtml),
      inlineImages: { "signature": sigBlob },
      attachments: attachments
    });

    sentCount += group.emails.length;
    group.rows.forEach(row => {
      sheet.getRange(row, 6).setValue("טופל");
      sheet.getRange(row, 9).setValue("נשלח");
    });
  }
  return sentCount;
}

function sendManualEmail(emails, fileNames) {
  const folder = DriveApp.getFoldersByName("חנות קבצים").next();
  const attachments = fileNames.map(name => {
    const f = folder.getFilesByName(name);
    return f.hasNext() ? f.next().getBlob() : null;
  }).filter(a => a);

  const productsHtml = fileNames.map((p, idx) => (idx + 1) + ". " + p.replace(".pdf", "")).join("<br>");
  const sigBlob = DriveApp.getFileById(SIGNATURE_FILE_ID).getBlob();

  if (typeof emails === 'string') emails = [emails];

  emails.forEach(email => {
    MailApp.sendEmail({
      to: email,
      subject: "הקבצים שביקשת מהגננת ברבור 🎁",
      htmlBody: getEmailTemplate(productsHtml),
      inlineImages: { "signature": sigBlob },
      attachments: attachments
    });

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        sheet.getRange(i + 1, 6).setValue("טופל");
        break;
      }
    }
  });

  return "נשלח בהצלחה ל-" + emails.length + " נמענים.";
}

// --- פונקציות עזר ---
function cleanProductName(name) {
  return name.replace(/מתנה/g, '')
    .replace(/🎁/g, '')
    .replace(/\d+\./g, '')
    .replace(/[-.]$|[-.](?=\s)/g, '')
    .trim();
}

function getCustomersList() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getRange("A2:D" + sheet.getLastRow()).getValues();
  const customers = {};
  data.forEach(row => {
    const email = row[1] ? row[1].toString().trim().toLowerCase() : "";
    const name = row[3] || "ללא שם";
    if (email && email.includes("@") && !customers[email]) {
      customers[email] = { email: email, name: name };
    }
  });
  return Object.values(customers).sort((a, b) => a.name.localeCompare(b.name));
}

function getFilesList() {
  const folders = DriveApp.getFoldersByName("חנות קבצים");
  if (!folders.hasNext()) return [];
  const files = folders.next().getFiles();
  const list = [];
  while (files.hasNext()) {
    const f = files.next();
    if (f.getName().toLowerCase().endsWith(".pdf")) list.push(f.getName());
  }
  return list.sort();
}

function getPreviewStats(startDate, endDate) {
  const data = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0].getDataRange().getValues();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59);
  const groups = {};
  for (let i = 1; i < data.length; i++) {
    const rowDate = new Date(data[i][0]);
    if (rowDate >= start && rowDate <= end && data[i][6]) {
      const products = data[i][6].split("\n").map(p => cleanProductName(p)).filter(p => p).sort();
      const key = products.join("|");
      if (!groups[key]) groups[key] = { products: products, customers: [] };
      groups[key].customers.push(data[i][3] + " (" + data[i][1] + ")");
    }
  }
  return groups;
}

function extractValue(body, regex) {
  const match = body.match(regex);
  return match ? match[1].trim() : "";
}

function showFileSenderDialog() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('FileSender').setWidth(600).setHeight(700);
    SpreadsheetApp.getUi().showModalDialog(html, 'מערכת שליחת קבצים');
  } catch(e) { Logger.log('showFileSenderDialog: ' + e); }
}

function showDialog() {
  try {
    const html = HtmlService.createHtmlOutputFromFile('Index').setWidth(600).setHeight(850);
    SpreadsheetApp.getUi().showModalDialog(html, 'מערכת דיוור - הגננת ברבור');
  } catch(e) { Logger.log('showDialog: ' + e); }
}

// --- ניוזלטר ---
function getProductList() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const products = data.slice(1).map(row => row[6]).filter(p => p && p !== "");
  return [...new Set(products)];
}

function getFilteredEmails(filters) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const rows = data.slice(1);
  return rows.filter(row => {
    const rowDate = new Date(row[0]);
    const rowEmail = row[1] ? row[1].toString().trim().toLowerCase() : "";
    if (!rowEmail.includes("@")) return false;
    if (filters.startDate && rowDate < new Date(filters.startDate)) return false;
    if (filters.endDate && rowDate > new Date(filters.endDate)) return false;
    if (filters.product && filters.product !== "All" && row[6] !== filters.product) return false;
    return true;
  }).map(row => row[1].toString().trim().toLowerCase());
}

function sendNewsletter(payload) {
  try {
    const recipients = payload.isTest ? ["haganenet.barbur@gmail.com"] : [...new Set(getFilteredEmails(payload.filters))];
    if (recipients.length === 0) throw new Error("לא נמצאו נמענים");
    const sigBlob = DriveApp.getFileById(SIGNATURE_FILE_ID).getBlob();
    const fullHtml = `<div dir="rtl" style="font-family: Arial; text-align: right;">${payload.bodyHtml}<br><br><img src="cid:signature" style="max-width:300px;"></div>`;
    recipients.forEach(email => MailApp.sendEmail({ to: email, subject: payload.subject, htmlBody: fullHtml, inlineImages: { "signature": sigBlob } }));
    return recipients.length;
  } catch (e) { throw new Error(e.message); }
}

// --- פונקציות לפאנל הניהול ---
function getLeadsForPanel() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const leads = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      leads.push({
        date: row[0] ? new Date(row[0]).toISOString() : null,
        email: row[1] || '',
        phone: row[2] || '',
        name: row[3] || '',
        type: row[4] || 'UNKNOWN',
        status: row[5] || 'לא טופל',
        products: row[6] || '',
        price: row[7] || '0',
        sent: row[8] || ''
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, leads: leads }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getStatsForPanel() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    let totalLeads = data.length - 1;
    let purchases = 0;
    let interested = 0;
    let last7Days = 0;
    let totalSales = 0;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const type = row[4] || '';
      const date = row[0] ? new Date(row[0]) : null;
      const price = parseFloat(row[7]) || 0;
      if (type === 'PURCHASE' || type === 'PURCHASE_WHATSAPP') {
        purchases++;
        totalSales += price;
      }
      if (type === 'INTERESTED') interested++;
      if (date && date >= sevenDaysAgo) last7Days++;
    }
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      stats: { totalLeads, purchases, interested, last7Days, totalSales }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getLeadsDataForPanel() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    const leads = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      leads.push({
        date: row[0],
        email: row[1],
        phone: row[2],
        name: row[3],
        type: row[4],
        status: row[5] || 'לא טופל',
        products: row[6] || '',
        price: row[7] || '0',
        message: row[6] || ''
      });
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, leads: leads }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendNewsletterFromPanel(payload) {
  try {
    const recipients = payload.isTest
      ? ["haganenet.barbur@gmail.com"]
      : getFilteredEmailsList(payload.filters);
    if (recipients.length === 0) throw new Error('לא נמצאו נמענים');
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
        inlineImages: { "signature": sigBlob }
      });
    });
    return ContentService.createTextOutput(JSON.stringify({ success: true, count: recipients.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendManualEmailFromPanel(emails, fileNames) {
  try {
    const result = sendManualEmail(emails, fileNames);
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function processAndSendFilesFromPanel(startDate, endDate, specificKey) {
  try {
    const count = processAndSendFiles(startDate, endDate, specificKey);
    return ContentService.createTextOutput(JSON.stringify({ success: true, count: count }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

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
  return [...new Set(emails)];
}

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

function getFilesListForPanel() {
  try {
    const files = getFilesList();
    Logger.log('getFilesListForPanel: found ' + files.length + ' files');
    if (files.length > 0) Logger.log('First files: ' + files.slice(0, 5).join(', '));
    return ContentService.createTextOutput(JSON.stringify(files))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('getFilesListForPanel ERROR: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString(), files: [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

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

function updateLeadStatusFromPanel(email, status) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        sheet.getRange(i + 1, 6).setValue(status);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateLeadFromPanel(email, updates) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === email) {
        if (updates.name !== undefined) sheet.getRange(i + 1, 4).setValue(updates.name);
        if (updates.phone !== undefined) sheet.getRange(i + 1, 3).setValue(updates.phone);
        if (updates.type !== undefined) sheet.getRange(i + 1, 5).setValue(updates.type);
        if (updates.status !== undefined) sheet.getRange(i + 1, 6).setValue(updates.status);
        if (updates.products !== undefined) sheet.getRange(i + 1, 7).setValue(updates.products);
        if (updates.price !== undefined) sheet.getRange(i + 1, 8).setValue(updates.price);
        break;
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteLeadFromPanel(email, date) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      const rowEmail = (data[i][1] || '').toString().trim();
      const rowDate = data[i][0] ? new Date(data[i][0]).toISOString() : '';
      if (rowEmail === email && (!date || rowDate === date)) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({ success: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'lead not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- מונה מבקרים ---
function getOrCreateVisitsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Visits');
  if (!sheet) {
    sheet = ss.insertSheet('Visits');
    sheet.appendRow(['date', 'count']);
  }
  return sheet;
}

function trackVisitForPanel() {
  try {
    const sheet = getOrCreateVisitsSheet();
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    const data = sheet.getDataRange().getValues();
    
    let found = false;
    for (let i = 1; i < data.length; i++) {
      const rowDate = Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (rowDate === today) {
        const currentCount = parseInt(data[i][1]) || 0;
        sheet.getRange(i + 1, 2).setValue(currentCount + 1);
        found = true;
        break;
      }
    }
    
    if (!found) {
      sheet.appendRow([today, 1]);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getVisitsForPanel() {
  try {
    const sheet = getOrCreateVisitsSheet();
    const data = sheet.getDataRange().getValues();
    const now = new Date();
    const today = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    let daily = 0, weekly = 0, monthly = 0, total = 0;
    
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][0]);
      const count = parseInt(data[i][1]) || 0;
      const dateStr = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      
      total += count;
      if (dateStr === today) daily = count;
      if (rowDate >= sevenDaysAgo) weekly += count;
      if (rowDate >= thirtyDaysAgo) monthly += count;
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      visits: { daily, weekly, monthly, total }
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
