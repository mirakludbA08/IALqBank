/* Biology notes — configuration for the shared notes script (js/script.js).
   Load this after js/sitemap.js and before script.js on every biology notes page. The page
   list lives in js/sitemap.js, grouped by the units of the Pearson Edexcel IAL Biology
   specification (topics 1–8, practical units 3 and 6); it also builds the top navigation's
   Biology menu. Here it builds the sidebar and the prev/next links. */
window.NOTES_SUBJECT = 'biology';
window.NOTES_LOGO = 'Biology Notes';
window.NOTES_DIR = 'notes/biology/';
document.documentElement.setAttribute('data-subject', 'biology');

window.NOTES_SITE = (window.IALQB_SITE && window.IALQB_SITE.biology.notes) || [];
