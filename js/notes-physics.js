/* Physics notes — configuration for the shared notes script (js/script.js).
   Load this after js/sitemap.js and before script.js on every physics notes page. The page
   list lives in js/sitemap.js, where it also builds the top navigation's Physics menu; here it
   builds the sidebar, the prev/next links and the home page unit cards. */
window.NOTES_SUBJECT = 'physics';
window.NOTES_LOGO = 'Physics Notes';
window.NOTES_DIR = 'pages/';
document.documentElement.setAttribute('data-subject', 'physics');
// Marks a notes page, so css/styles.css (loaded on every page of the site) styles only these pages.
document.documentElement.classList.add('is-notes');

window.NOTES_SITE = (window.IALQB_SITE && window.IALQB_SITE.physics.notes) || [];
