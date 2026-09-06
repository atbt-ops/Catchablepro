/* Form conveniences that used to live in inline handlers.
 *
 * Filter <select>s submit their form on change. That was an onchange attribute
 * on each one, which is exactly what script-src 'unsafe-inline' had to permit.
 * One delegated listener replaces all five, and picks up any select added later
 * that carries the attribute.
 *
 * Deferred, unlike theme.js: nothing here affects the first paint.
 */
document.addEventListener('change', function (event) {
  var select = event.target;
  if (!select.matches || !select.matches('select[data-auto-submit]')) return;
  if (select.form) select.form.submit();
});
