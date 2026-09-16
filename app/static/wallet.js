/* Wallet top-up: preset/custom amount -> /topup (creates a Razorpay order)
 * -> Razorpay Checkout -> /verify (credits the balance) -> reload.
 *
 * Delegated listeners, no inline handlers — same CSP-safe pattern as forms.js.
 * Only runs on the wallet page (it's the only page that loads this file).
 */
document.addEventListener('click', function (event) {
  var preset = event.target.closest && event.target.closest('[data-topup-amount]');
  if (preset) {
    startTopup(parseInt(preset.getAttribute('data-topup-amount'), 10));
    return;
  }
  if (event.target && event.target.id === 'topup-custom-btn') {
    var input = document.getElementById('custom-amount');
    var rupees = input ? parseInt(input.value, 10) : NaN;
    if (!rupees || rupees <= 0) {
      setStatus('Enter a valid amount.');
      return;
    }
    startTopup(rupees * 100);
  }
});

function csrfToken() {
  var el = document.querySelector('input[name="csrf_token"]');
  return el ? el.value : '';
}

function setStatus(message) {
  var el = document.getElementById('topup-status');
  if (!el) return;
  el.textContent = message;
  el.hidden = !message;
}

function postForm(url, fields) {
  var body = new FormData();
  body.append('csrf_token', csrfToken());
  Object.keys(fields).forEach(function (key) {
    body.append(key, fields[key]);
  });
  return fetch(url, { method: 'POST', body: body }).then(function (resp) {
    return resp.json().then(function (data) {
      return { ok: resp.ok, data: data };
    });
  });
}

function startTopup(amountPaise) {
  setStatus('Starting checkout…');
  postForm('/employer/wallet/topup', { amount_paise: String(amountPaise) })
    .then(function (result) {
      if (!result.ok) {
        setStatus((result.data && result.data.error) || 'Could not start checkout.');
        return;
      }
      openCheckout(result.data);
    })
    .catch(function () {
      setStatus('Network error — try again.');
    });
}

function openCheckout(order) {
  if (typeof Razorpay === 'undefined') {
    setStatus('The payment widget failed to load — try refreshing the page.');
    return;
  }
  var rzp = new Razorpay({
    key: order.key_id,
    amount: order.amount_paise,
    currency: 'INR',
    name: 'Catch Able Pro',
    description: 'Wallet top-up',
    order_id: order.order_id,
    handler: function (response) { verifyPayment(response); },
    modal: { ondismiss: function () { setStatus(''); } },
    theme: { color: '#4f46e5' },
  });
  rzp.on('payment.failed', function () {
    setStatus('Payment failed — nothing was added to your wallet.');
  });
  setStatus('');
  rzp.open();
}

function verifyPayment(response) {
  setStatus('Confirming payment…');
  postForm('/employer/wallet/verify', {
    razorpay_order_id: response.razorpay_order_id,
    razorpay_payment_id: response.razorpay_payment_id,
    razorpay_signature: response.razorpay_signature,
  })
    .then(function (result) {
      if (result.ok && result.data && result.data.ok) {
        window.location.href = '/employer/wallet?funded=1';
      } else {
        window.location.href = '/employer/wallet?wallet_error=1';
      }
    })
    .catch(function () {
      window.location.href = '/employer/wallet?wallet_error=1';
    });
}
