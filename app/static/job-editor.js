/* Rich-text editor for the job description form.
 *
 * Moved out of job_new.html so the Content-Security-Policy can drop
 * script-src 'unsafe-inline'. The code is unchanged; only its address is.
 */
(function () {
  var editor = document.getElementById('rt-editor');
  var hidden = document.getElementById('description-input');
  var form = document.getElementById('job-form');
  if (!editor || !hidden || !form) return;

  // Restore previous content (e.g. after a validation error).
  editor.innerHTML = hidden.value || '';

  document.querySelectorAll('.rt-btn').forEach(function (btn) {
    // Keep the caret/selection in the editor when a button is pressed.
    btn.addEventListener('mousedown', function (e) { e.preventDefault(); });
    btn.addEventListener('click', function () {
      var cmd = btn.dataset.cmd;
      editor.focus();
      if (cmd === 'createLink') {
        var url = window.prompt('Link URL (https://…)');
        if (!url) return;
        document.execCommand('createLink', false, url);
      } else if (cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, btn.dataset.value);
      } else {
        document.execCommand(cmd, false, null);
      }
    });
  });

  // Ship the markup with the form; the server sanitizes it before storing.
  form.addEventListener('submit', function () {
    hidden.value = editor.innerHTML.trim();
  });
})();
