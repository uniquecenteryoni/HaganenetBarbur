#!/bin/bash

# גננת בר - סקריפט הפעלה לדמו

echo "🌟 ברוכה הבאה לאתר גננת בר! 🌟"
echo ""
echo "הכנת האתר הושלמה בהצלחה!"
echo ""
echo "מה נבנה:"
echo "✅ מבנה HTML רספונסיבי מלא"
echo "✅ עיצוב CSS מודרני בסגול, קרם ולבן"
echo "✅ תפריט ניווט קפוא עם גלילה חלקה"
echo "✅ סעיפי האתר: מי אני, קבצים לרכישה, מאמרים, צור קשר"
echo "✅ גריד מוצרים עם קרוסלות תמונות"
echo "✅ אינטגרציה עם אינסטגרם"
echo "✅ טופס יצירת קשר עם ולידציה"
echo "✅ התאמה מלאה למובייל"
echo ""
echo "📂 קבצי האתר:"
echo "   • index.html - העמוד הראשי"
echo "   • css/style.css - עיצוב ראשי"
echo "   • css/responsive.css - התאמות רספונסיביות"
echo "   • js/main.js - פונקציות כלליות"
echo "   • js/carousel.js - קרוסלות תמונות"
echo "   • js/instagram.js - אינטגרציה עם אינסטגרם"
echo "   • js/products.js - ניהול מוצרים"
echo ""
echo "🖼️  תמונות נדרשות:"
echo "   הוסף תמונות לתיקיית images/ או השתמש ב-placeholder-generator.html"
echo ""
echo "🚀 הפעלת האתר:"

# בדיקה איזה שרת זמין
if command -v python3 &> /dev/null; then
    echo "   python3 -m http.server 8000"
    echo "   ואז פתח: http://localhost:8000"
elif command -v python &> /dev/null; then
    echo "   python -m SimpleHTTPServer 8000"
    echo "   ואז פתח: http://localhost:8000"
elif command -v node &> /dev/null; then
    echo "   npx serve ."
    echo "   או פשוט פתח את index.html בדפדפן"
else
    echo "   פתח את index.html ישירות בדפדפן"
fi

echo ""
echo "📝 הוראות נוספות:"
echo "   קרא את README.md לפרטים מלאים על התאמה אישית"
echo ""
echo "💡 רעיונות לשיפור:"
echo "   • הוסף תמונות אמיתיות"
echo "   • חבר מערכת תשלומים"
echo "   • הוסף תוכן למאמרים"
echo "   • התאם את הטקסטים האישיים"
echo ""
echo "🎨 האתר בנוי בהשראת themontessorinotebook.com"
echo "עם התאמה מלאה לתרבות הישראלית ולכיוון RTL"
echo ""
echo "בהצלחה עם האתר החדש! 🌈"