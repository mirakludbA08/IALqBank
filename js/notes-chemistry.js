/* Chemistry notes — configuration for the shared notes script (js/script.js).
   Load this after js/sitemap.js and before script.js on every chemistry notes page. The page
   list lives in js/sitemap.js, grouped by the units of the Pearson Edexcel IAL Chemistry
   specification (topics 1–20, practical units 3 and 6); it also builds the top navigation's
   Chemistry menu. Here it builds the sidebar and the prev/next links. */
window.NOTES_SUBJECT = 'chemistry';
window.NOTES_LOGO = 'Chemistry Notes';
window.NOTES_DIR = 'notes/chemistry/';
document.documentElement.setAttribute('data-subject', 'chemistry');

window.NOTES_SITE = (window.IALQB_SITE && window.IALQB_SITE.chemistry.notes) || [];
