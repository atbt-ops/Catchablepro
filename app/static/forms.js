/* Form conveniences that used to live in inline handlers.
 *
 * Filter controls submit their form on change. That was an onchange attribute
 * on each one, which is exactly what script-src 'unsafe-inline' had to permit.
 * One delegated listener replaces all of them, and picks up any control added
 * later that carries the attribute — <select>s as well as the radio/checkbox
 * inputs in the job-filter rail.
 *
 * Deferred, unlike theme.js: nothing here affects the first paint.
 */
document.addEventListener('change', function (event) {
  var control = event.target;
  if (!control.matches) return;
  if (!control.matches('select[data-auto-submit], input[data-auto-submit]')) return;
  if (control.form) control.form.submit();
});
