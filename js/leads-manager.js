/**
 * Leads Manager - מערכת ניהול לידים עבור הגננת ברבור
 * משותף בין האתר הראשי לפאנל הניהול
 */

const LeadsManager = {
  /**
   * שמירת ליד חדש
   * @param {Object} leadData - נתוני הליד
   * @param {string} leadData.name - שם
   * @param {string} leadData.email - אימייל
   * @param {string} leadData.phone - טלפון
   * @param {string} leadData.type - סוג: 'PURCHASE' או 'INTERESTED'
   * @param {string} leadData.message - הודעה או מוצרים
   * @param {string} leadData.products - רשימת מוצרים (אופציונלי)
   * @param {number} leadData.price - מחיר (אופציונלי)
   */
  saveLead(leadData) {
    try {
      const leads = this.getAllLeads();
      
      const newLead = {
        id: this.generateId(),
        date: new Date().toISOString(),
        name: leadData.name || '',
        email: leadData.email || '',
        phone: leadData.phone || '',
        type: leadData.type || 'INTERESTED',
        message: leadData.message || '',
        products: leadData.products || '',
        price: leadData.price || ''
      };
      
      leads.push(newLead);
      localStorage.setItem('leads', JSON.stringify(leads));
      
      console.log('✅ ליד נשמר בהצלחה:', newLead);
      return true;
    } catch (error) {
      console.error('❌ שגיאה בשמירת ליד:', error);
      return false;
    }
  },
  
  /**
   * קבלת כל הלידים
   */
  getAllLeads() {
    try {
      const leads = localStorage.getItem('leads');
      return leads ? JSON.parse(leads) : [];
    } catch (error) {
      console.error('שגיאה בטעינת לידים:', error);
      return [];
    }
  },
  
  /**
   * ספירת סוג מסוים של לידים
   */
  countLeadsByType(type) {
    const leads = this.getAllLeads();
    return leads.filter(lead => lead.type === type).length;
  },
  
  /**
   * קבלת לידים לפי טווח תאריכים
   */
  getLeadsByDateRange(startDate, endDate) {
    const leads = this.getAllLeads();
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.date);
      return leadDate >= start && leadDate <= end;
    });
  },
  
  /**
   * ייצוא לידים ל-CSV
   */
  exportToCSV() {
    const leads = this.getAllLeads();
    
    if (leads.length === 0) {
      return null;
    }
    
    let csv = 'תאריך,מייל,טלפון,שם,סוג,מוצרים/הודעה,מחיר\n';
    
    leads.forEach(lead => {
      const row = [
        lead.date,
        lead.email || '',
        lead.phone || '',
        lead.name || '',
        lead.type,
        (lead.message || lead.products || '').replace(/"/g, '""'),
        lead.price || ''
      ];
      csv += `"${row.join('","')}"\n`;
    });
    
    return csv;
  },
  
  /**
   * מחיקת ליד
   */
  deleteLead(leadId) {
    try {
      let leads = this.getAllLeads();
      leads = leads.filter(lead => lead.id !== leadId);
      localStorage.setItem('leads', JSON.stringify(leads));
      return true;
    } catch (error) {
      console.error('שגיאה במחיקת ליד:', error);
      return false;
    }
  },
  
  /**
   * ייבוא לידים מ-CSV
   */
  importFromCSV(csvText) {
    try {
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      const leads = this.getAllLeads();
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',');
        
        const lead = {
          id: this.generateId(),
          date: values[0] || new Date().toISOString(),
          email: values[1] || '',
          phone: values[2] || '',
          name: values[3] || '',
          type: values[4] || 'INTERESTED',
          message: values[5] || '',
          products: values[5] || '',
          price: values[6] || ''
        };
        
        leads.push(lead);
      }
      
      localStorage.setItem('leads', JSON.stringify(leads));
      return leads.length;
    } catch (error) {
      console.error('שגיאה בייבוא CSV:', error);
      return false;
    }
  },
  
  /**
   * יצירת ID ייחודי
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  /**
   * סטטיסטיקות
   */
  getStats() {
    const leads = this.getAllLeads();
    const purchases = leads.filter(l => l.type === 'PURCHASE').length;
    const interested = leads.filter(l => l.type === 'INTERESTED').length;
    
    // חישוב סך כל ההכנסות
    const totalRevenue = leads
      .filter(l => l.price)
      .reduce((sum, l) => sum + parseFloat(l.price || 0), 0);
    
    // לידים אחרונים (7 ימים)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentLeads = leads.filter(l => new Date(l.date) >= sevenDaysAgo);
    
    return {
      total: leads.length,
      purchases,
      interested,
      totalRevenue: totalRevenue.toFixed(2),
      recentLeads: recentLeads.length,
      conversionRate: leads.length > 0 ? ((purchases / leads.length) * 100).toFixed(1) : 0
    };
  }
};

/**
 * Site Visits Tracker - מעקב אחר ביקורים באתר
 */
const VISITS_API_URL = 'https://script.google.com/macros/s/AKfycbyWkOujqP0acIasGuLcewHqlLKj5mWPTD_bcmRVgLudbpW4M-Twq-NwXTaoNd4J_IRNHg/exec';

const VisitsTracker = {
  /**
   * רישום ביקור חדש
   */
  trackVisit() {
    try {
      // בדיקה אם זה ביקור ראשון בסשן הנוכחי
      if (!sessionStorage.getItem('visitCounted')) {
        const visits = parseInt(localStorage.getItem('siteVisits') || '0');
        localStorage.setItem('siteVisits', visits + 1);
        sessionStorage.setItem('visitCounted', 'true');

        // עדכון ספירות יומי/שבועי/חודשי
        this.updatePeriodCounts();
        
        // שמירת מידע נוסף על הביקור
        this.saveVisitInfo();

        // שליחת ביקור לשרת (Google Sheets)
        this.trackVisitOnServer();
      }
    } catch (error) {
      console.error('שגיאה במעקב ביקורים:', error);
    }
  },

  /**
   * שליחת ביקור לשרת
   */
  trackVisitOnServer() {
    try {
      fetch(`${VISITS_API_URL}?action=trackVisit`).catch(() => {});
    } catch (e) {
      // שקט - לא קריטי
    }
  },

  updatePeriodCounts() {
    const now = new Date();
    const dayKey = now.toISOString().split('T')[0];
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const weekKey = this.getWeekKey(now);

    const storedDayKey = localStorage.getItem('siteVisitsDailyKey');
    const storedWeekKey = localStorage.getItem('siteVisitsWeeklyKey');
    const storedMonthKey = localStorage.getItem('siteVisitsMonthlyKey');

    let dailyCount = parseInt(localStorage.getItem('siteVisitsDailyCount') || '0');
    let weeklyCount = parseInt(localStorage.getItem('siteVisitsWeeklyCount') || '0');
    let monthlyCount = parseInt(localStorage.getItem('siteVisitsMonthlyCount') || '0');

    if (storedDayKey !== dayKey) {
      dailyCount = 0;
      localStorage.setItem('siteVisitsDailyKey', dayKey);
    }
    if (storedWeekKey !== weekKey) {
      weeklyCount = 0;
      localStorage.setItem('siteVisitsWeeklyKey', weekKey);
    }
    if (storedMonthKey !== monthKey) {
      monthlyCount = 0;
      localStorage.setItem('siteVisitsMonthlyKey', monthKey);
    }

    localStorage.setItem('siteVisitsDailyCount', dailyCount + 1);
    localStorage.setItem('siteVisitsWeeklyCount', weeklyCount + 1);
    localStorage.setItem('siteVisitsMonthlyCount', monthlyCount + 1);
  },

  getWeekKey(date) {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  },
  
  /**
   * שמירת מידע מפורט על הביקור
   */
  saveVisitInfo() {
    try {
      const visits = JSON.parse(localStorage.getItem('visitHistory') || '[]');
      
      visits.push({
        date: new Date().toISOString(),
        page: window.location.pathname,
        referrer: document.referrer || 'direct'
      });
      
      // שמירת רק 100 הביקורים האחרונים
      if (visits.length > 100) {
        visits.shift();
      }
      
      localStorage.setItem('visitHistory', JSON.stringify(visits));
    } catch (error) {
      console.error('שגיאה בשמירת מידע ביקור:', error);
    }
  },
  
  /**
   * קבלת מספר הביקורים
   */
  getTotalVisits() {
    return parseInt(localStorage.getItem('siteVisits') || '0');
  },
  
  /**
   * קבלת היסטוריית ביקורים
   */
  getVisitHistory() {
    try {
      return JSON.parse(localStorage.getItem('visitHistory') || '[]');
    } catch (error) {
      return [];
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LeadsManager, VisitsTracker };
}
