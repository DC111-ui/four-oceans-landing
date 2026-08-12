(() => {
  const CFG = window.FOQ_CONFIG;

  const state = {
    step: 1,
    pickup: '',
    dropoff: '',
    size: null,
    packageTier: null,
    vehicleType: null,
    vehicleAuto: true,
    floorNumber: 0,
    hasLift: false,
    packagingMaterials: false,
    packagingLabor: false,
    crewAdjustment: 0,
    standardCrew: 2,
    moveDate: '',
    timeSlot: null,
    phone: '',
    inZone: null,
    distanceKm: null,
    lastQuote: null,
    pricingConfig: null,
    sessionToken: localStorage.getItem('foq_session_token') || null,
    sessionName: localStorage.getItem('foq_session_name') || null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    steps: $$('.quote-step[data-step]'),
    confirmation: $('.quote-step--confirmation'),
    progressSteps: $$('.quote-progress__step'),
    backBtn: $('#backBtn'),
    nextBtn: $('#nextBtn'),
    stickyTotal: $('#stickyTotal'),
    stickyTotalValue: $('#stickyTotalValue'),
    pickupSelect: $('#pickupSelect'),
    pickupOther: $('#pickupOther'),
    dropoffInput: $('#dropoffInput'),
    zoneStatus: $('#zoneStatus'),
    floorSelect: $('#floorSelect'),
    liftToggle: $('#liftToggle'),
    packagingMaterials: $('#packagingMaterials'),
    packagingLabor: $('#packagingLabor'),
    materialsFee: $('#materialsFee'),
    laborFee: $('#laborFee'),
    crewMinus: $('#crewMinus'),
    crewPlus: $('#crewPlus'),
    crewValue: $('#crewValue'),
    crewNote: $('#crewNote'),
    vehicleNote: $('#vehicleNote'),
    moveDate: $('#moveDate'),
    phoneInput: $('#phoneInput'),
    quoteReceipt: $('#quoteReceipt'),
    googleSignInDiv: $('#googleSignInDiv'),
    signedInStatus: $('#signedInStatus'),
    payDepositBtn: $('#payDepositBtn'),
    whatsappFallback: $('#whatsappFallback'),
    confirmationText: $('#confirmationText'),
    stepError: $('#stepError'),
  };

  const STANDARD_CREW = { basic: 1, mid: 2, premium: 3 };
  const AUTO_VEHICLE = { room_only: 'bakkie', room_furniture: 'bakkie', full_apartment: 'small_truck' };

  const todayISO = () => new Date().toISOString().slice(0, 10);
  els.moveDate.min = todayISO();

  /* ---------------------------------------------------------------- */
  /* Step navigation                                                   */
  /* ---------------------------------------------------------------- */

  function renderProgress() {
    els.progressSteps.forEach((el) => {
      const n = Number(el.dataset.stepIndicator);
      el.removeAttribute('data-active');
      el.removeAttribute('data-complete');
      if (n < state.step) el.setAttribute('data-complete', '');
      if (n === state.step) el.setAttribute('data-active', '');
    });
  }

  function showStep(n) {
    clearStepError();
    const activeSection = els.steps.find((el) => Number(el.dataset.step) === n);
    els.steps.forEach((el) => {
      el.hidden = Number(el.dataset.step) !== n;
    });
    if (activeSection) {
      activeSection.classList.remove('quote-step--entering');
      void activeSection.offsetHeight; // force reflow so the entrance animation restarts on every step change
      activeSection.classList.add('quote-step--entering');
    }
    renderProgress();
    els.stickyTotal.hidden = n < 2;
    els.backBtn.disabled = n === 1;
    els.nextBtn.textContent = n === 4 ? 'Done' : 'Next';
    els.nextBtn.style.display = n === 4 ? 'none' : '';
    els.backBtn.style.display = n === 4 ? 'none' : '';
    if (n === 4) fetchQuotePreview();
  }

  function validateStep(n) {
    if (n === 1) return state.inZone === true;
    if (n === 2) return state.size && state.packageTier && state.vehicleType;
    if (n === 3) return state.moveDate && state.timeSlot && state.phone.trim().length >= 7;
    return true;
  }

  function showStepError(message) {
    els.stepError.textContent = message;
    els.stepError.hidden = false;
  }
  function clearStepError() {
    els.stepError.hidden = true;
  }

  function explainBlockedStep(n) {
    if (n === 1) {
      if (!state.pickup || !state.dropoff) {
        els.zoneStatus.textContent = 'Select both a pickup and drop-off location to continue.';
      } else if (state.inZone === null) {
        els.zoneStatus.textContent = 'Still checking that route — one moment…';
      } else if (state.inZone === false) {
        els.zoneStatus.textContent = "That route isn't in our Hatfield service area yet — try a different address, or contact us directly.";
      }
      els.zoneStatus.setAttribute('data-state', 'error');
    }
    if (n === 2 && (!state.size || !state.packageTier || !state.vehicleType)) {
      showStepError('Pick a size, package and vehicle before continuing.');
    }
    if (n === 3 && !(state.moveDate && state.timeSlot && state.phone.trim().length >= 7)) {
      showStepError('Add a move date, time slot and a valid phone number before continuing.');
    }
  }

  els.nextBtn.addEventListener('click', () => {
    if (!validateStep(state.step)) {
      explainBlockedStep(state.step);
      return;
    }
    if (state.step < 4) {
      state.step += 1;
      showStep(state.step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  els.backBtn.addEventListener('click', () => {
    if (state.step > 1) {
      state.step -= 1;
      showStep(state.step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  /* ---------------------------------------------------------------- */
  /* Step 1: Route                                                     */
  /* ---------------------------------------------------------------- */

  els.pickupSelect.addEventListener('change', () => {
    const isOther = els.pickupSelect.value === '__other__';
    els.pickupOther.style.display = isOther ? '' : 'none';
    state.pickup = isOther ? els.pickupOther.value.trim() : els.pickupSelect.value;
    maybeCheckZone();
  });
  els.pickupOther.addEventListener('change', () => {
    state.pickup = els.pickupOther.value.trim();
    maybeCheckZone();
  });
  els.dropoffInput.addEventListener('change', () => {
    state.dropoff = els.dropoffInput.value.trim();
    maybeCheckZone();
  });

  let zoneCheckTimer = null;
  function maybeCheckZone() {
    if (!state.pickup || !state.dropoff) return;
    clearTimeout(zoneCheckTimer);
    zoneCheckTimer = setTimeout(checkZone, 400);
  }

  async function checkZone() {
    els.zoneStatus.textContent = 'Checking…';
    els.zoneStatus.removeAttribute('data-state');
    try {
      const res = await fetch(`${CFG.apiBase}/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pickup: state.pickup, dropoff: state.dropoff }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not check that route');

      state.inZone = data.inZone;
      state.distanceKm = data.distanceKm;

      if (data.inZone) {
        els.zoneStatus.textContent = `In our Hatfield service area — about ${data.distanceKm} km.`;
        els.zoneStatus.setAttribute('data-state', 'ok');
      } else {
        els.zoneStatus.textContent = "That's outside our current Hatfield service area — contact us directly.";
        els.zoneStatus.setAttribute('data-state', 'error');
      }
    } catch (err) {
      state.inZone = false;
      els.zoneStatus.textContent = err.message || 'Something went wrong checking that route.';
      els.zoneStatus.setAttribute('data-state', 'error');
    }
  }

  /* ---------------------------------------------------------------- */
  /* Step 2: Move details                                              */
  /* ---------------------------------------------------------------- */

  function wireRadioCards(field, onChange) {
    const group = $(`.quote-radio-cards[data-field="${field}"]`);
    if (!group) return;
    group.querySelectorAll('.quote-radio-card').forEach((btn) => {
      btn.setAttribute('aria-pressed', 'false');
      btn.addEventListener('click', () => {
        group.querySelectorAll('.quote-radio-card').forEach((b) => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        state[field] = btn.dataset.value;
        if (onChange) onChange(btn.dataset.value);
        refreshLiveTotal();
      });
    });
  }

  wireRadioCards('size', (size) => {
    state.standardCrew = STANDARD_CREW[state.packageTier] || 2;
    if (state.vehicleAuto) {
      const suggested = AUTO_VEHICLE[size];
      const group = $('.quote-radio-cards[data-field="vehicleType"]');
      group.querySelectorAll('.quote-radio-card').forEach((b) => {
        b.setAttribute('aria-pressed', b.dataset.value === suggested ? 'true' : 'false');
      });
      state.vehicleType = suggested;
      els.vehicleNote.textContent = 'Suggested for this size — pick the other option to switch.';
    }
  });

  wireRadioCards('packageTier', (tier) => {
    state.standardCrew = STANDARD_CREW[tier] || 2;
    state.crewAdjustment = 0;
    els.crewValue.textContent = state.standardCrew;
    updateCrewNote();
  });

  wireRadioCards('vehicleType', () => {
    state.vehicleAuto = false;
    els.vehicleNote.textContent = '';
  });

  wireRadioCards('timeSlot');

  els.floorSelect.addEventListener('change', () => {
    state.floorNumber = Number(els.floorSelect.value);
    refreshLiveTotal();
  });
  els.liftToggle.addEventListener('change', () => {
    state.hasLift = els.liftToggle.checked;
    refreshLiveTotal();
  });
  els.packagingMaterials.addEventListener('change', () => {
    state.packagingMaterials = els.packagingMaterials.checked;
    refreshLiveTotal();
  });
  els.packagingLabor.addEventListener('change', () => {
    state.packagingLabor = els.packagingLabor.checked;
    refreshLiveTotal();
  });

  const MAX_CREW = 6;
  function updateCrewButtons() {
    const count = Math.max(1, Math.min(MAX_CREW, state.standardCrew + state.crewAdjustment));
    els.crewValue.textContent = count;
    els.crewMinus.disabled = count <= 1;
    els.crewPlus.disabled = count >= MAX_CREW;
    updateCrewNote();
  }
  function updateCrewNote() {
    if (!state.pricingConfig) {
      els.crewNote.textContent = `${state.standardCrew} included with this package`;
      return;
    }
    const { addMoverFee, removeMoverCredit } = state.pricingConfig;
    els.crewNote.textContent = `${state.standardCrew} included · +R${addMoverFee}/extra, -R${removeMoverCredit} if fewer`;
  }
  els.crewMinus.addEventListener('click', () => {
    state.crewAdjustment -= 1;
    updateCrewButtons();
    refreshLiveTotal();
  });
  els.crewPlus.addEventListener('click', () => {
    state.crewAdjustment += 1;
    updateCrewButtons();
    refreshLiveTotal();
  });

  els.moveDate.addEventListener('change', () => { state.moveDate = els.moveDate.value; });
  els.phoneInput.addEventListener('input', () => { state.phone = els.phoneInput.value; });

  /* ---------------------------------------------------------------- */
  /* Live total (steps 2+)                                             */
  /* ---------------------------------------------------------------- */

  let liveTotalTimer = null;
  function refreshLiveTotal() {
    if (state.step < 2 || !state.pickup || !state.dropoff || !state.size || !state.packageTier) return;
    clearTimeout(liveTotalTimer);
    liveTotalTimer = setTimeout(fetchQuotePreview, 350);
  }

  function moveInputPayload() {
    return {
      pickup: state.pickup,
      dropoff: state.dropoff,
      size: state.size,
      packageTier: state.packageTier,
      vehicleType: state.vehicleType,
      floorNumber: state.floorNumber,
      hasLift: state.hasLift,
      packagingMaterials: state.packagingMaterials,
      packagingLabor: state.packagingLabor,
      crewAdjustment: state.crewAdjustment,
      moveDate: state.moveDate || todayISO(),
    };
  }

  async function fetchQuotePreview() {
    if (!state.size || !state.packageTier || !state.vehicleType) return;
    try {
      const res = await fetch(`${CFG.apiBase}/quote-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveInputPayload()),
      });
      const data = await res.json();
      if (!res.ok || data.inZone === false) return;

      state.lastQuote = data;
      els.stickyTotalValue.textContent = `R${Math.round(data.finalPrice)}`;
      if (state.step === 4) renderReceipt(data);
    } catch (err) {
      /* silent — live total is a nice-to-have, not blocking */
    }
  }

  async function loadPricingConfig() {
    try {
      const res = await fetch(`${CFG.apiBase}/pricing-config`);
      if (!res.ok) return;
      state.pricingConfig = await res.json();
      applyPricingHints();
    } catch (err) {
      /* fee hints are a nice-to-have; the real price still comes from /quote-preview */
    }
  }

  function applyPricingHints() {
    const cfg = state.pricingConfig;
    if (!cfg) return;

    $$('.quote-radio-card__price').forEach((el) => {
      const key = el.dataset.price;
      let amount = null;
      if (key in cfg.sizeFee) amount = cfg.sizeFee[key];
      else if (key in cfg.packageFee) amount = cfg.packageFee[key];
      else if (key === 'small_truck') amount = cfg.vehicleUpgradeFee;
      el.textContent = amount ? `+R${amount}` : 'included';
    });

    els.materialsFee.textContent = `+R${cfg.materialsFee}`;
    els.laborFee.textContent = `+R${cfg.packingLaborFee}`;
    updateCrewNote();
  }

  function renderReceipt(data) {
    const rows = data.items.map((item) =>
      `<div class="quote-receipt__row"><span>${item.label}</span><span>R${Math.round(item.amount)}</span></div>`
    ).join('');
    els.quoteReceipt.innerHTML = `
      ${rows}
      <div class="quote-receipt__total"><span>Total</span><span>R${Math.round(data.finalPrice)}</span></div>
      <div class="quote-receipt__deposit"><span>Deposit due now</span><span>R${Math.round(data.depositAmount)}</span></div>
      <div class="quote-receipt__balance"><span>Balance on move day</span><span>R${Math.round(data.balanceAmount)}</span></div>
    `;
  }

  /* ---------------------------------------------------------------- */
  /* Google Sign-In (checkout gate)                                    */
  /* ---------------------------------------------------------------- */

  function updateCheckoutUI() {
    if (state.sessionToken) {
      els.googleSignInDiv.hidden = true;
      els.signedInStatus.hidden = false;
      els.signedInStatus.textContent = `Signed in as ${state.sessionName || 'you'}`;
      els.payDepositBtn.disabled = false;
      els.payDepositBtn.textContent = 'Pay Deposit with PayFast';
    } else {
      els.googleSignInDiv.hidden = false;
      els.signedInStatus.hidden = true;
      els.payDepositBtn.disabled = true;
      els.payDepositBtn.textContent = 'Sign in with Google to Pay Deposit';
    }
  }

  async function handleGoogleCredential(response) {
    try {
      const res = await fetch(`${CFG.apiBase}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Sign-in failed');

      state.sessionToken = data.sessionToken;
      state.sessionName = data.name;
      localStorage.setItem('foq_session_token', data.sessionToken);
      localStorage.setItem('foq_session_name', data.name);
      updateCheckoutUI();
    } catch (err) {
      els.signedInStatus.hidden = false;
      els.signedInStatus.textContent = err.message || 'Sign-in failed, try again.';
    }
  }

  function initGoogleSignIn() {
    if (!CFG.googleOAuthClientId || !window.google || !window.google.accounts) return;
    window.google.accounts.id.initialize({
      client_id: CFG.googleOAuthClientId,
      callback: handleGoogleCredential,
    });
    window.google.accounts.id.renderButton(els.googleSignInDiv, { theme: 'outline', size: 'large', width: 280 });
  }

  els.payDepositBtn.addEventListener('click', async () => {
    if (!state.sessionToken) return;
    els.payDepositBtn.disabled = true;
    els.payDepositBtn.textContent = 'Redirecting…';
    try {
      const res = await fetch(`${CFG.apiBase}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.sessionToken}`,
        },
        body: JSON.stringify({
          ...moveInputPayload(),
          phone: state.phone,
          timeSlot: state.timeSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not create booking');

      submitToPayfast(data.payfast);
    } catch (err) {
      els.payDepositBtn.disabled = false;
      els.payDepositBtn.textContent = 'Pay Deposit with PayFast';
      showStepError(err.message || 'Something went wrong, please try again.');
    }
  });

  function submitToPayfast(payfast) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payfast.action_url;
    Object.entries(payfast.fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  /* ---------------------------------------------------------------- */
  /* WhatsApp fallback                                                  */
  /* ---------------------------------------------------------------- */

  function updateWhatsappFallback() {
    const msg = encodeURIComponent(
      `Hi, I'd like to book a Hatfield relocation. Pickup: ${state.pickup || '?'}, Drop-off: ${state.dropoff || '?'}, Date: ${state.moveDate || '?'}`
    );
    els.whatsappFallback.href = `https://wa.me/${CFG.whatsappNumber}?text=${msg}`;
  }

  /* ---------------------------------------------------------------- */
  /* Return-from-PayFast confirmation                                   */
  /* ---------------------------------------------------------------- */

  async function checkReturnStatus() {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    const status = params.get('status');
    if (!ref) return false;

    if (status === 'cancelled') {
      els.confirmationText.textContent = 'Payment was cancelled. Your booking was not confirmed — you can try again anytime.';
      showConfirmation();
      return true;
    }

    try {
      const res = await fetch(`${CFG.apiBase}/quote/${ref}`);
      const data = await res.json();
      if (res.ok && data.status === 'deposit_paid') {
        els.confirmationText.textContent = `Your deposit of R${Math.round(data.depositAmount)} has been received and your move is booked. We'll be in touch to confirm the details.`;
      } else {
        els.confirmationText.textContent = "We haven't received payment confirmation yet — this can take a minute. If it doesn't update, message us on WhatsApp.";
      }
    } catch (err) {
      els.confirmationText.textContent = "We couldn't confirm your booking status automatically — message us on WhatsApp to confirm.";
    }
    showConfirmation();
    return true;
  }

  function showConfirmation() {
    els.steps.forEach((el) => { el.hidden = true; });
    document.querySelector('.quote-progress').hidden = true;
    els.stickyTotal.hidden = true;
    document.querySelector('.quote-bottom-bar').hidden = true;
    els.confirmation.hidden = false;
  }

  /* ---------------------------------------------------------------- */
  /* Google Maps Places Autocomplete                                   */
  /* ---------------------------------------------------------------- */

  function initPlacesAutocomplete() {
    if (!CFG.googleMapsApiKey || !window.google || !window.google.maps) return;
    // Hatfield, Pretoria approx center; bias covers Hatfield/Brooklyn/Colbyn/Sunnyside/Arcadia/Menlo Park.
    const center = new google.maps.LatLng(-25.7487, 28.2379);
    const bounds = new google.maps.Circle({ center, radius: 4000 }).getBounds();
    const options = { bounds, strictBounds: false, componentRestrictions: { country: 'za' } };

    new google.maps.places.Autocomplete(els.dropoffInput, options).addListener('place_changed', () => {
      state.dropoff = els.dropoffInput.value.trim();
      maybeCheckZone();
    });
    new google.maps.places.Autocomplete(els.pickupOther, options).addListener('place_changed', () => {
      state.pickup = els.pickupOther.value.trim();
      maybeCheckZone();
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Boot                                                               */
  /* ---------------------------------------------------------------- */

  async function boot() {
    updateCrewButtons();
    updateCheckoutUI();

    const handledReturn = await checkReturnStatus();
    if (handledReturn) return;

    showStep(1);
    setInterval(updateWhatsappFallback, 1000);
    loadPricingConfig();

    if (CFG.googleMapsApiKey) {
      loadScript(`https://maps.googleapis.com/maps/api/js?key=${CFG.googleMapsApiKey}&libraries=places`)
        .then(initPlacesAutocomplete)
        .catch(() => {});
    }
    if (CFG.googleOAuthClientId) {
      loadScript('https://accounts.google.com/gsi/client')
        .then(initGoogleSignIn)
        .catch(() => {});
    }
  }

  boot();
})();
