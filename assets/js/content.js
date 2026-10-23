/* ======================================================================
   Baked content — the published baseline of the site.

   Everything you edit in the browser lives in your own browser's
   localStorage and is invisible to anyone else. To make your edits part of
   the published site:

     1. open the site, turn on edit mode (pencil button, bottom right)
     2. click "Backup" → you get ricky-jin-site-content-YYYY-MM-DD.json
     3. replace the object below with that file's contents
     4. republish

   Edits made in the browser are always layered on top of this object, so
   a published site can still be edited locally without being overwritten.
   ====================================================================== */
window.RICKY_SITE_CONTENT = {
  text: {},
  img: {},
  video: {}
};
