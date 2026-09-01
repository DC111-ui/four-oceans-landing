(() => {
  const CFG = window.FOQ_CONFIG;

  const state = {
    pickup: '',
    dropoff: '',
    vehicleType: null,
    items: {},
    additionalHelpers: 0,
    pickupFloor: 0,
    pickupElevator: false,
    pickupElevatorTooSmall: false,
    dropoffFloor: 0,
    dropoffElevator: false,
    dropoffElevatorTooSmall: false,
    numberOfTrips: 1,
    packagingMaterials: false,
    packagingLabor: false,
    moveDate: '',
    timeSlot: null,
    phone: '',
    customerName: '',
    customerEmail: '',
    gitCoverRequested: false,
    goodsValue: 0,
    inZone: null,
    distanceKm: null,
    lastQuote: null,
    pricingConfig: null,
    calViewYear: new Date().getFullYear(),
    calViewMonth: new Date().getMonth(),
    acceptedReferenceId: null,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    quoteMain: $('#quoteMain'),
    confirmation: $('#confirmationSection'),
    stickyTotal: $('#stickyTotal'),
    stickyTotalValue: $('#stickyTotalValue'),
    pickupInput: $('#pickupInput'),
    dropoffInput: $('#dropoffInput'),
    zoneStatus: $('#zoneStatus'),
    vehicleCards: $('#vehicleCards'),
    loadAssistantTrigger: $('#loadAssistantTrigger'),
    loadAssistantModal: $('#loadAssistantModal'),
    loadAssistantBackdrop: $('#loadAssistantBackdrop'),
    loadAssistantClose: $('#loadAssistantClose'),
    applyRecommendationBtn: $('#applyRecommendationBtn'),
    itemsBedroom: $('#itemsBedroom'),
    itemsKitchen: $('#itemsKitchen'),
    itemsLiving: $('#itemsLiving'),
    itemsOffice: $('#itemsOffice'),
    itemsOutdoor: $('#itemsOutdoor'),
    itemsOther: $('#itemsOther'),
    idealTruckValue: $('#idealTruckValue'),
    recommendedTruckDetailValue: $('#recommendedTruckDetailValue'),
    suggestedHelpersDetailValue: $('#suggestedHelpersDetailValue'),
    estimatedVolumeValue: $('#estimatedVolumeValue'),
    recommendedTruckValue: $('#recommendedTruckValue'),
    suggestedHelpersValue: $('#suggestedHelpersValue'),
    helpersMinus: $('#helpersMinus'),
    helpersPlus: $('#helpersPlus'),
    helpersValue: $('#helpersValue'),
    helperNote: $('#helperNote'),
    pickupFloorSelect: $('#pickupFloorSelect'),
    pickupLiftToggle: $('#pickupLiftToggle'),
    pickupLiftTooSmall: $('#pickupLiftTooSmall'),
    pickupAccessPreview: $('#pickupAccessPreview'),
    dropoffFloorSelect: $('#dropoffFloorSelect'),
    dropoffLiftToggle: $('#dropoffLiftToggle'),
    dropoffLiftTooSmall: $('#dropoffLiftTooSmall'),
    dropoffAccessPreview: $('#dropoffAccessPreview'),
    tripsMinus: $('#tripsMinus'),
    tripsPlus: $('#tripsPlus'),
    tripsValue: $('#tripsValue'),
    packagingMaterials: $('#packagingMaterials'),
    packagingLabor: $('#packagingLabor'),
    materialsFee: $('#materialsFee'),
    laborFee: $('#laborFee'),
    moveDateTrigger: $('#moveDateTrigger'),
    moveDateCalendar: $('#moveDateCalendar'),
    calPrevMonth: $('#calPrevMonth'),
    calNextMonth: $('#calNextMonth'),
    calMonthLabel: $('#calMonthLabel'),
    calGrid: $('#calGrid'),
    phoneInput: $('#phoneInput'),
    customerNameInput: $('#customerNameInput'),
    customerEmailInput: $('#customerEmailInput'),
    gitCoverToggle: $('#gitCoverToggle'),
    gitCoverDetail: $('#gitCoverDetail'),
    goodsValueInput: $('#goodsValueInput'),
    quoteReceipt: $('#quoteReceipt'),
    manualQuoteNotice: $('#manualQuoteNotice'),
    manualQuoteText: $('#manualQuoteText'),
    manualQuoteWhatsapp: $('#manualQuoteWhatsapp'),
    quotePriceSection: $('#quotePriceSection'),
    acceptQuoteBtn: $('#acceptQuoteBtn'),
    whatsappFallback: $('#whatsappFallback'),
    confirmationText: $('#confirmationText'),
    confirmationBank: $('#confirmationBank'),
    invoiceLink: $('#invoiceLink'),
    emailInvoiceBtn: $('#emailInvoiceBtn'),
    emailInvoiceStatus: $('#emailInvoiceStatus'),
    confirmationWhatsapp: $('#confirmationWhatsapp'),
    formError: $('#formError'),
    navToggle: $('#navToggle'),
    navToggleIcon: $('#navToggleIcon'),
    mobileNavPanel: $('#mobileNavPanel'),
    progress: $('#quoteProgress'),
    progressFill: $('#quoteProgressFill'),
    progressLabel: $('#quoteProgressLabel'),
    pickupLiftTooSmallWrap: $('#pickupLiftTooSmallWrap'),
    dropoffLiftTooSmallWrap: $('#dropoffLiftTooSmallWrap'),
  };

  const MAX_ADDITIONAL_HELPERS = 10;
  const MAX_TRIPS = 5;
  const GROUP_CONTAINERS = {
    bedroom: els.itemsBedroom,
    kitchen: els.itemsKitchen,
    living: els.itemsLiving,
    office: els.itemsOffice,
    outdoor: els.itemsOutdoor,
    other: els.itemsOther,
  };
  const VEHICLE_BLURBS = {
    '1_3_ton': "Best for a single room or a light student move.",
    '1_3_ton_trailer': 'Extra capacity for a full room plus furniture.',
    '4_ton': 'For a 1–2 bedroom apartment or a heavier load.',
    '8_ton': 'Large household or multi-bedroom relocations.',
  };
  // Real Four Oceans Group fleet photography (client-approved, from the
  // poster campaign) -- the bakkie covers both 1.3t tiers, the box truck
  // covers both larger tiers, since that's the actual fleet: one bakkie
  // class, one box-truck class, not four distinct real vehicles.
  const VEHICLE_IMAGES = {
    '1_3_ton': 'assets/vehicles/bakkie.jpg',
    '1_3_ton_trailer': 'assets/vehicles/bakkie-trailer.jpg',
    '4_ton': 'assets/vehicles/box-truck.jpg',
    '8_ton': 'assets/vehicles/box-truck.jpg',
  };
  // Client-side display normalisation only (item 15) — keeps the tier names on a
  // single "<size> Load" pattern in the UI. The backend label/payload is untouched.
  function vehicleLabel(raw) {
    if (!raw) return raw;
    // "Standard Load + Trailer (…)" breaks the "<size> Load" adjective pattern
    // the other tiers use ("Extended Load", "Large Load") — normalise it.
    return raw.replace(/Standard Load\s*\+\s*Trailer/i, 'Trailer Load');
  }
  let lastRecommendedVehicle = null;
  let lastSuggestedHelpers = 0;

  // Placeholder heuristic, not a pricing rule: every ~15 volume units beyond the
  // first suggests one more pair of hands, on top of whatever crew the vehicle
  // already includes. The customer can still adjust the stepper afterwards.
  function suggestedAdditionalHelpers(volume) {
    return Math.max(0, Math.min(MAX_ADDITIONAL_HELPERS, Math.ceil(volume / 15) - 1));
  }

  const todayISO = () => new Date().toISOString().slice(0, 10);

  function showFormError(message) {
    els.formError.textContent = message;
    els.formError.hidden = false;
  }
  function clearFormError() {
    els.formError.hidden = true;
  }

  /* ---- Inline per-field validation (item 5) ---- */
  function fieldWrap(el) {
    return el.closest('.quote-field') || el;
  }
  function setFieldError(el, message) {
    const wrap = fieldWrap(el);
    if (wrap.classList.contains('quote-field')) {
      wrap.classList.add('quote-field--invalid');
      let msg = wrap.querySelector('.quote-field__error');
      if (!msg) {
        msg = document.createElement('p');
        msg.className = 'quote-field__error';
        msg.setAttribute('role', 'alert');
        wrap.appendChild(msg);
      }
      msg.textContent = message;
    } else {
      wrap.classList.add('quote-invalid-outline');
      let msg = wrap.nextElementSibling;
      if (!msg || !msg.classList.contains('quote-field__error')) {
        msg = document.createElement('p');
        msg.className = 'quote-field__error';
        msg.setAttribute('role', 'alert');
        msg.style.display = 'flex';
        wrap.insertAdjacentElement('afterend', msg);
      }
      msg.textContent = message;
      msg.style.display = 'flex';
    }
  }
  function clearFieldError(el) {
    const wrap = fieldWrap(el);
    wrap.classList.remove('quote-field--invalid', 'quote-invalid-outline');
    const inWrap = wrap.querySelector && wrap.querySelector('.quote-field__error');
    if (inWrap) inWrap.remove();
    const after = wrap.nextElementSibling;
    if (after && after.classList && after.classList.contains('quote-field__error')) after.remove();
  }
  // { focus target, its .quote-field wrapper anchor, validity test, message }
  function validationChecks() {
    return [
      { el: els.pickupInput, ok: () => state.inZone === true,
        msg: 'Enter a pickup and drop-off address inside our Hatfield service area.' },
      { el: els.vehicleCards, ok: () => !!state.vehicleType,
        msg: 'Pick a truck, or use the load assistant.' },
      { el: els.moveDateTrigger, ok: () => !!state.moveDate,
        msg: 'Choose a move date.' },
      { el: $('.quote-radio-cards[data-field="timeSlot"]'), ok: () => !!state.timeSlot,
        msg: 'Choose a morning or afternoon slot.' },
      { el: els.customerNameInput, ok: () => state.customerName && state.customerName.trim().length >= 2,
        msg: 'Enter your full name.' },
      { el: els.customerEmailInput, ok: () => state.customerEmail && /\S+@\S+\.\S+/.test(state.customerEmail),
        msg: 'Enter a valid email address — your invoice goes here.' },
      { el: els.phoneInput, ok: () => state.phone && state.phone.trim().length >= 7,
        msg: 'Enter a valid phone number.' },
    ];
  }

  function totalItemCount() {
    return Object.values(state.items).reduce((sum, qty) => sum + qty, 0);
  }

  /* ---------------------------------------------------------------- */
  /* Route                                                              */
  /* ---------------------------------------------------------------- */

  els.pickupInput.addEventListener('change', () => {
    state.pickup = els.pickupInput.value.trim();
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
    refreshLiveTotal();
  }

  /* ---------------------------------------------------------------- */
  /* Truck selection + load assistant                                  */
  /* ---------------------------------------------------------------- */

  function renderVehicleCards() {
    const vehicles = state.pricingConfig?.vehicles;
    if (!vehicles) return;
    els.vehicleCards.innerHTML = '';
    Object.entries(vehicles).forEach(([key, def]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quote-radio-card quote-radio-card--vehicle';
      btn.dataset.value = key;
      btn.setAttribute('aria-pressed', state.vehicleType === key ? 'true' : 'false');
      const image = VEHICLE_IMAGES[key];
      const label = vehicleLabel(def.label);
      btn.innerHTML = `
        ${image ? `<img class="quote-radio-card__image" src="${image}" alt="${label}" loading="lazy">` : ''}
        <strong>${label}</strong>
        <span>${VEHICLE_BLURBS[key] || ''}</span>
        <span class="quote-radio-card__price">from R${def.baseFare}</span>
      `;
      btn.addEventListener('click', () => selectVehicle(key));
      els.vehicleCards.appendChild(btn);
    });
  }

  function selectVehicle(key) {
    state.vehicleType = key;
    $$('#vehicleCards .quote-radio-card').forEach((c) => {
      c.setAttribute('aria-pressed', c.dataset.value === key ? 'true' : 'false');
    });
    document.dispatchEvent(new Event('foq:field-change'));
    refreshLiveTotal();
  }

  const loadAssistantPanel = $('#loadAssistantModal .quote-modal__panel');
  let loadAssistantLastFocus = null;

  function focusables(container) {
    return Array.from(container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.disabled && el.offsetParent !== null);
  }

  function openLoadAssistant() {
    loadAssistantLastFocus = document.activeElement;
    els.loadAssistantModal.hidden = false;
    document.body.style.overflow = 'hidden';
    const f = focusables(loadAssistantPanel);
    (f[0] || loadAssistantPanel).focus();
  }
  function closeLoadAssistant() {
    els.loadAssistantModal.hidden = true;
    document.body.style.overflow = '';
    if (loadAssistantLastFocus && loadAssistantLastFocus.focus) loadAssistantLastFocus.focus();
  }
  els.loadAssistantTrigger.addEventListener('click', openLoadAssistant);
  els.loadAssistantClose.addEventListener('click', closeLoadAssistant);
  els.loadAssistantBackdrop.addEventListener('click', closeLoadAssistant);

  // Focus trap + Esc for the modal (item 11)
  els.loadAssistantModal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeLoadAssistant(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(loadAssistantPanel);
    if (!f.length) return;
    const firstEl = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
  });

  // Collapsible category accordions (item 6)
  $$('#loadAssistantModal .quote-accordion__head').forEach((head) => {
    head.addEventListener('click', () => {
      const acc = head.closest('.quote-accordion');
      const panel = acc.querySelector('.quote-accordion__panel');
      const open = acc.hasAttribute('data-open');
      if (open) { acc.removeAttribute('data-open'); panel.hidden = true; head.setAttribute('aria-expanded', 'false'); }
      else { acc.setAttribute('data-open', ''); panel.hidden = false; head.setAttribute('aria-expanded', 'true'); }
    });
  });

  function updateGroupCounts() {
    const catalog = state.pricingConfig?.itemCatalog || {};
    const totals = {};
    Object.entries(state.items).forEach(([key, qty]) => {
      const g = catalog[key]?.group || 'other';
      totals[g] = (totals[g] || 0) + qty;
    });
    $$('#loadAssistantModal .quote-accordion__count').forEach((badge) => {
      const g = badge.dataset.countFor;
      const n = totals[g] || 0;
      badge.textContent = n;
      if (n > 0) badge.removeAttribute('data-empty'); else badge.setAttribute('data-empty', '');
    });
  }

  els.applyRecommendationBtn.addEventListener('click', () => {
    if (lastRecommendedVehicle) {
      selectVehicle(lastRecommendedVehicle);
      state.additionalHelpers = lastSuggestedHelpers;
      updateHelpersButtons();
      refreshLiveTotal();
    }
    closeLoadAssistant();
  });

  function renderItemCatalog() {
    const catalog = state.pricingConfig?.itemCatalog;
    if (!catalog) return;

    Object.values(GROUP_CONTAINERS).forEach((el) => { el.innerHTML = ''; });

    Object.entries(catalog).forEach(([key, def]) => {
      const container = GROUP_CONTAINERS[def.group] || els.itemsOther;
      const row = document.createElement('div');
      row.className = 'quote-item-row';
      row.dataset.qty = '0';
      row.innerHTML = `
        <span class="quote-item-row__label">${def.label}</span>
        <span class="quote-item-row__stepper">
          <button type="button" class="quote-item-row__btn" data-action="minus" aria-label="Fewer ${def.label}">−</button>
          <span class="quote-item-row__qty">0</span>
          <button type="button" class="quote-item-row__btn" data-action="plus" aria-label="More ${def.label}">+</button>
        </span>
      `;
      const qtyEl = row.querySelector('.quote-item-row__qty');
      const minusBtn = row.querySelector('[data-action="minus"]');
      const plusBtn = row.querySelector('[data-action="plus"]');

      const setQty = (qty) => {
        qty = Math.max(0, Math.min(20, qty));
        if (qty > 0) state.items[key] = qty; else delete state.items[key];
        qtyEl.textContent = qty;
        row.dataset.qty = String(qty);
        minusBtn.disabled = qty <= 0;
        updateVolumeNote();
      };

      minusBtn.addEventListener('click', () => setQty((state.items[key] || 0) - 1));
      plusBtn.addEventListener('click', () => setQty((state.items[key] || 0) + 1));
      minusBtn.disabled = true;

      container.appendChild(row);
    });
  }

  function updateVolumeNote() {
    const catalog = state.pricingConfig?.itemCatalog;
    const vehicles = state.pricingConfig?.vehicles;
    if (!catalog || !vehicles) return;

    const volume = Object.entries(state.items).reduce((sum, [key, qty]) => sum + qty * (catalog[key]?.volume || 0), 0);
    els.estimatedVolumeValue.textContent = `${volume.toFixed(1)} units`;
    updateGroupCounts();

    if (totalItemCount() === 0) {
      els.idealTruckValue.textContent = 'Add items to get a recommendation';
      els.recommendedTruckDetailValue.textContent = 'Add items to get a recommendation';
      els.suggestedHelpersDetailValue.textContent = '0';
      els.recommendedTruckValue.textContent = 'Add items to get a recommendation';
      els.suggestedHelpersValue.textContent = '0 helpers';
      lastRecommendedVehicle = null;
      lastSuggestedHelpers = 0;
      els.applyRecommendationBtn.disabled = true;
      return;
    }

    const match = Object.entries(vehicles).find(([, v]) => volume <= v.volumeThreshold);
    if (match) {
      lastRecommendedVehicle = match[0];
      lastSuggestedHelpers = suggestedAdditionalHelpers(volume);
      const helpersLabel = `${lastSuggestedHelpers} helper${lastSuggestedHelpers === 1 ? '' : 's'}`;
      const matchLabel = vehicleLabel(match[1].label);
      els.idealTruckValue.textContent = matchLabel;
      els.recommendedTruckDetailValue.textContent = matchLabel;
      els.suggestedHelpersDetailValue.textContent = String(lastSuggestedHelpers);
      els.recommendedTruckValue.textContent = matchLabel;
      els.suggestedHelpersValue.textContent = helpersLabel;
      els.applyRecommendationBtn.disabled = false;
    } else {
      lastRecommendedVehicle = null;
      lastSuggestedHelpers = 0;
      els.idealTruckValue.textContent = "That's bigger than our largest truck — we'll quote this one personally.";
      els.recommendedTruckDetailValue.textContent = 'Manual quote required';
      els.suggestedHelpersDetailValue.textContent = '—';
      els.recommendedTruckValue.textContent = 'Manual quote required';
      els.suggestedHelpersValue.textContent = '—';
      els.applyRecommendationBtn.disabled = true;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Move requirements                                                  */
  /* ---------------------------------------------------------------- */

  function updateHelpersButtons() {
    els.helpersValue.textContent = state.additionalHelpers;
    els.helpersMinus.disabled = state.additionalHelpers <= 0;
    els.helpersPlus.disabled = state.additionalHelpers >= MAX_ADDITIONAL_HELPERS;
  }
  els.helpersMinus.addEventListener('click', () => {
    state.additionalHelpers = Math.max(0, state.additionalHelpers - 1);
    updateHelpersButtons();
    refreshLiveTotal();
  });
  els.helpersPlus.addEventListener('click', () => {
    state.additionalHelpers = Math.min(MAX_ADDITIONAL_HELPERS, state.additionalHelpers + 1);
    updateHelpersButtons();
    refreshLiveTotal();
  });

  function updateTripsButtons() {
    els.tripsValue.textContent = state.numberOfTrips;
    els.tripsMinus.disabled = state.numberOfTrips <= 1;
    els.tripsPlus.disabled = state.numberOfTrips >= MAX_TRIPS;
  }
  els.tripsMinus.addEventListener('click', () => {
    state.numberOfTrips = Math.max(1, state.numberOfTrips - 1);
    updateTripsButtons();
    refreshLiveTotal();
  });
  els.tripsPlus.addEventListener('click', () => {
    state.numberOfTrips = Math.min(MAX_TRIPS, state.numberOfTrips + 1);
    updateTripsButtons();
    refreshLiveTotal();
  });

  function updateAccessPreview() {
    const cfg = state.pricingConfig;
    if (!cfg) return;
    const describe = (floorSelect, floor, elevator, tooSmall) => {
      const effectiveLift = elevator && !tooSmall;
      const floorText = floorSelect.options[floorSelect.selectedIndex]?.text || 'Ground';
      if (floor === 0) return 'Ground floor — no lift needed · no access charge';
      const amount = effectiveLift ? cfg.elevatorSurcharge : cfg.floorRate;
      const accessLabel = tooSmall
        ? 'lift too small, stair carry'
        : (effectiveLift ? 'lift available' : 'no lift, stair carry');
      const suffix = amount > 0 ? ` → +R${amount}` : ' · no access charge';
      return `${floorText} floor · ${accessLabel}${suffix}`;
    };
    els.pickupAccessPreview.textContent = describe(els.pickupFloorSelect, state.pickupFloor, state.pickupElevator, state.pickupElevatorTooSmall);
    els.dropoffAccessPreview.textContent = describe(els.dropoffFloorSelect, state.dropoffFloor, state.dropoffElevator, state.dropoffElevatorTooSmall);
  }

  els.pickupFloorSelect.addEventListener('change', () => {
    state.pickupFloor = Number(els.pickupFloorSelect.value);
    updateAccessPreview();
    refreshLiveTotal();
  });
  // "Lift is too small" only makes sense once a lift has been declared —
  // reveal it with the toggle, and clear it when the lift is unchecked (item 2).
  function syncLiftTooSmall(side) {
    const on = els[`${side}LiftToggle`].checked;
    els[`${side}LiftTooSmallWrap`].hidden = !on;
    if (!on && els[`${side}LiftTooSmall`].checked) {
      els[`${side}LiftTooSmall`].checked = false;
      state[`${side}ElevatorTooSmall`] = false;
    }
  }
  els.pickupLiftToggle.addEventListener('change', () => {
    state.pickupElevator = els.pickupLiftToggle.checked;
    syncLiftTooSmall('pickup');
    updateAccessPreview();
    refreshLiveTotal();
  });
  els.pickupLiftTooSmall.addEventListener('change', () => {
    state.pickupElevatorTooSmall = els.pickupLiftTooSmall.checked;
    updateAccessPreview();
    refreshLiveTotal();
  });
  els.dropoffFloorSelect.addEventListener('change', () => {
    state.dropoffFloor = Number(els.dropoffFloorSelect.value);
    updateAccessPreview();
    refreshLiveTotal();
  });
  els.dropoffLiftToggle.addEventListener('change', () => {
    state.dropoffElevator = els.dropoffLiftToggle.checked;
    syncLiftTooSmall('dropoff');
    updateAccessPreview();
    refreshLiveTotal();
  });
  els.dropoffLiftTooSmall.addEventListener('change', () => {
    state.dropoffElevatorTooSmall = els.dropoffLiftTooSmall.checked;
    updateAccessPreview();
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

  /* ---------------------------------------------------------------- */
  /* Schedule                                                           */
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
        document.dispatchEvent(new Event('foq:field-change'));
        refreshLiveTotal();
      });
    });
  }
  wireRadioCards('timeSlot');

  els.phoneInput.addEventListener('input', () => { state.phone = els.phoneInput.value; });
  els.customerNameInput.addEventListener('input', () => { state.customerName = els.customerNameInput.value; });
  els.customerEmailInput.addEventListener('input', () => { state.customerEmail = els.customerEmailInput.value; });

  function formatDateLabel(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function pickDate(iso) {
    state.moveDate = iso;
    els.moveDateTrigger.textContent = formatDateLabel(iso);
    els.moveDateCalendar.hidden = true;
    els.moveDateTrigger.focus();
    document.dispatchEvent(new Event('foq:field-change'));
    refreshLiveTotal();
  }

  // Roving-tabindex arrow-key navigation across the day grid (item 10).
  // Clamps within the visible month; month changes stay on the ‹ › buttons.
  function focusCalendarDay(fromBtn, deltaDays) {
    const days = Array.from(els.calGrid.querySelectorAll('.quote-calendar__day:not(.quote-calendar__day--blank)'));
    const idx = days.indexOf(fromBtn);
    if (idx === -1) return;
    const next = Math.max(0, Math.min(days.length - 1, idx + deltaDays));
    const target = days[next];
    days.forEach((d) => { d.tabIndex = -1; });
    target.tabIndex = 0;
    target.focus();
  }

  function renderCalendarGrid() {
    const first = new Date(state.calViewYear, state.calViewMonth, 1);
    const daysInMonth = new Date(state.calViewYear, state.calViewMonth + 1, 0).getDate();
    const startWeekday = first.getDay();
    els.calMonthLabel.textContent = first.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

    const todayIso = todayISO();
    els.calGrid.innerHTML = '';
    for (let i = 0; i < startWeekday; i++) {
      const blank = document.createElement('span');
      blank.className = 'quote-calendar__day quote-calendar__day--blank';
      els.calGrid.appendChild(blank);
    }
    let firstEnabled = null;
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${state.calViewYear}-${String(state.calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quote-calendar__day';
      btn.textContent = day;
      const fullLabel = new Date(`${iso}T00:00:00`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      btn.setAttribute('aria-label', fullLabel);
      btn.tabIndex = -1;
      if (iso < todayIso) { btn.disabled = true; btn.setAttribute('aria-disabled', 'true'); }
      else if (!firstEnabled) firstEnabled = btn;
      if (iso === state.moveDate) { btn.setAttribute('data-selected', ''); btn.setAttribute('aria-selected', 'true'); btn.tabIndex = 0; }
      else { btn.setAttribute('aria-selected', 'false'); }
      if (iso === todayIso) { btn.setAttribute('data-today', ''); btn.setAttribute('aria-current', 'date'); }
      btn.addEventListener('click', () => pickDate(iso));
      btn.addEventListener('keydown', (e) => {
        const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
        if (e.key in map) { e.preventDefault(); focusCalendarDay(btn, map[e.key]); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!btn.disabled) pickDate(iso); }
        else if (e.key === 'Escape') { els.moveDateCalendar.hidden = true; els.moveDateTrigger.focus(); }
      });
      els.calGrid.appendChild(btn);
    }
    // Ensure exactly one grid tab-stop, then move focus into it.
    const selected = els.calGrid.querySelector('.quote-calendar__day[data-selected]');
    const entry = selected || firstEnabled;
    if (entry) { entry.tabIndex = 0; }
  }

  els.moveDateTrigger.addEventListener('click', () => {
    els.moveDateCalendar.hidden = !els.moveDateCalendar.hidden;
    if (!els.moveDateCalendar.hidden) {
      renderCalendarGrid();
      const entry = els.calGrid.querySelector('.quote-calendar__day[tabindex="0"]');
      if (entry) setTimeout(() => entry.focus(), 0);
    }
  });
  els.calPrevMonth.addEventListener('click', () => {
    state.calViewMonth -= 1;
    if (state.calViewMonth < 0) { state.calViewMonth = 11; state.calViewYear -= 1; }
    renderCalendarGrid();
  });
  els.calNextMonth.addEventListener('click', () => {
    state.calViewMonth += 1;
    if (state.calViewMonth > 11) { state.calViewMonth = 0; state.calViewYear += 1; }
    renderCalendarGrid();
  });
  document.addEventListener('click', (e) => {
    if (!els.moveDateCalendar.hidden && !els.moveDateCalendar.contains(e.target) && e.target !== els.moveDateTrigger) {
      els.moveDateCalendar.hidden = true;
    }
  });

  /* ---------------------------------------------------------------- */
  /* Goods in Transit cover + special items                            */
  /* ---------------------------------------------------------------- */

  els.gitCoverToggle.addEventListener('change', () => {
    state.gitCoverRequested = els.gitCoverToggle.checked;
    els.gitCoverDetail.hidden = !state.gitCoverRequested;
    if (!state.gitCoverRequested) {
      state.goodsValue = 0;
      els.goodsValueInput.value = '';
    }
    refreshLiveTotal();
  });
  els.goodsValueInput.addEventListener('input', () => {
    state.goodsValue = Number(els.goodsValueInput.value) || 0;
    refreshLiveTotal();
  });

  /* ---------------------------------------------------------------- */
  /* Live quote                                                         */
  /* ---------------------------------------------------------------- */

  function canQuote() {
    return state.inZone === true && !!state.vehicleType;
  }

  let liveTotalTimer = null;
  function refreshLiveTotal() {
    clearTimeout(liveTotalTimer);
    liveTotalTimer = setTimeout(fetchQuotePreview, 350);
  }

  function moveInputPayload() {
    return {
      pickup: state.pickup,
      dropoff: state.dropoff,
      vehicleType: state.vehicleType,
      items: state.items,
      pickupFloor: state.pickupFloor,
      pickupElevator: state.pickupElevator,
      pickupElevatorTooSmall: state.pickupElevatorTooSmall,
      dropoffFloor: state.dropoffFloor,
      dropoffElevator: state.dropoffElevator,
      dropoffElevatorTooSmall: state.dropoffElevatorTooSmall,
      additionalHelpers: state.additionalHelpers,
      numberOfTrips: state.numberOfTrips,
      packagingMaterials: state.packagingMaterials,
      packagingLabor: state.packagingLabor,
      goodsValue: state.goodsValue,
      moveDate: state.moveDate || todayISO(),
    };
  }

  function showReceiptPlaceholder(message) {
    els.manualQuoteNotice.hidden = true;
    els.quotePriceSection.hidden = true;
    els.quoteReceipt.innerHTML = `<div class="quote-receipt__loading">${message}</div>`;
    els.stickyTotal.hidden = true;
  }

  async function fetchQuotePreview() {
    if (!canQuote()) {
      const message = state.inZone === false
        ? "That's outside our current Hatfield service area — contact us directly."
        : 'Add your pickup, drop-off and truck above to see your price.';
      showReceiptPlaceholder(message);
      return;
    }
    try {
      const res = await fetch(`${CFG.apiBase}/quote-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(moveInputPayload()),
      });
      const data = await res.json();
      if (!res.ok) {
        showReceiptPlaceholder(data.message || "We couldn't calculate a price for that — check the details above.");
        return;
      }
      if (data.inZone === false) {
        showReceiptPlaceholder("That's outside our current Hatfield service area — contact us directly.");
        return;
      }

      state.lastQuote = data;
      els.stickyTotal.hidden = false;
      if (!data.requiresManualQuote) {
        els.stickyTotalValue.textContent = `R${Math.round(data.finalPrice)}`;
      } else {
        els.stickyTotalValue.textContent = 'Custom quote';
      }
      renderReceipt(data);
    } catch (err) {
      /* silent — live total is a nice-to-have, not blocking */
    }
  }

  async function loadPricingConfig() {
    try {
      const res = await fetch(`${CFG.apiBase}/pricing-config`);
      if (!res.ok) return;
      state.pricingConfig = await res.json();
      renderVehicleCards();
      renderItemCatalog();
      applyPricingHints();
      updateAccessPreview();
    } catch (err) {
      /* fee hints/inventory list need this; retry isn't critical enough to loop on */
    }
  }

  function applyPricingHints() {
    const cfg = state.pricingConfig;
    if (!cfg) return;

    els.materialsFee.textContent = `+R${cfg.materialsFee}`;
    els.laborFee.textContent = `+R${cfg.packingLaborFee}`;
    els.helperNote.textContent = `+R${cfg.helperFee} each, beyond your vehicle's standard crew`;
  }

  function renderReceipt(data) {
    if (data.requiresManualQuote) {
      els.manualQuoteText.textContent = data.reason || "This one needs a proper look before we can price it.";
      els.manualQuoteNotice.hidden = false;
      els.quotePriceSection.hidden = true;
      els.quoteReceipt.innerHTML = '';
      return;
    }
    els.manualQuoteNotice.hidden = true;
    els.quotePriceSection.hidden = false;

    const helpers = data.standardHelpers || 0;
    const crewLabel = `Driver${helpers > 0 ? ` + ${helpers} helper${helpers > 1 ? 's' : ''}` : ''}`;
    const rows = data.items.map((item) =>
      `<div class="quote-receipt__row"><span>${item.label}</span><span>R${Math.round(item.amount)}</span></div>`
    ).join('');
    els.quoteReceipt.innerHTML = `
      <div class="quote-receipt__row"><span>Standard crew</span><span>${crewLabel}</span></div>
      ${rows}
      <div class="quote-receipt__total"><span>Total</span><span>R${Math.round(data.finalPrice)}</span></div>
      <div class="quote-receipt__deposit"><span>Deposit due now (50%)</span><span>R${Math.round(data.depositAmount)}</span></div>
      <div class="quote-receipt__balance"><span>Balance on move day</span><span>R${Math.round(data.balanceAmount)}</span></div>
    `;
  }

  /* ---------------------------------------------------------------- */
  /* Form validation — inline per field, checked at pay time (item 5)  */
  /* ---------------------------------------------------------------- */

  // Clear a field's error as soon as the user supplies a valid value.
  function wireLiveClear() {
    const revalidate = () => {
      validationChecks().forEach((c) => { if (c.ok()) clearFieldError(c.el); });
    };
    [els.customerNameInput, els.customerEmailInput, els.phoneInput].forEach((el) => {
      el.addEventListener('input', revalidate);
      el.addEventListener('blur', revalidate);
    });
    els.pickupInput.addEventListener('change', revalidate);
    els.dropoffInput.addEventListener('change', revalidate);
    document.addEventListener('foq:field-change', revalidate);
  }

  function runValidation() {
    const failed = [];
    validationChecks().forEach((c) => {
      if (c.ok()) {
        clearFieldError(c.el);
      } else {
        setFieldError(c.el, c.msg);
        failed.push(c);
      }
    });
    return failed;
  }

  /* ---------------------------------------------------------------- */
  /* Accept quote (no sign-in — name/email captured directly)          */
  /* ---------------------------------------------------------------- */

  els.acceptQuoteBtn.addEventListener('click', async () => {
    const failed = runValidation();
    if (failed.length) {
      showFormError(`${failed.length} thing${failed.length > 1 ? 's need' : ' needs'} your attention above.`);
      const firstWrap = fieldWrap(failed[0].el);
      firstWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusTarget = failed[0].el.matches('input, select, button') ? failed[0].el : failed[0].el.querySelector('input, select, button');
      if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), 300);
      return;
    }
    clearFormError();
    els.acceptQuoteBtn.disabled = true;
    els.acceptQuoteBtn.textContent = 'Submitting…';
    try {
      const res = await fetch(`${CFG.apiBase}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...moveInputPayload(),
          phone: state.phone,
          timeSlot: state.timeSlot,
          customerName: state.customerName,
          customerEmail: state.customerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresManualQuote) {
          renderReceipt(data);
          return;
        }
        throw new Error(data.message || 'Could not create booking');
      }

      state.acceptedReferenceId = data.referenceId;
      showConfirmation(data);
    } catch (err) {
      els.acceptQuoteBtn.disabled = false;
      els.acceptQuoteBtn.textContent = 'Accept Quote';
      showFormError(err.message || 'Something went wrong, please try again.');
    }
  });

  els.emailInvoiceBtn.addEventListener('click', async () => {
    if (!state.acceptedReferenceId) return;
    els.emailInvoiceBtn.disabled = true;
    els.emailInvoiceStatus.hidden = false;
    els.emailInvoiceStatus.textContent = 'Sending…';
    try {
      const res = await fetch(`${CFG.apiBase}/quote/${state.acceptedReferenceId}/email-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.customerEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not send the invoice');
      els.emailInvoiceStatus.textContent = `Sent to ${data.email}.`;
    } catch (err) {
      els.emailInvoiceStatus.textContent = err.message || 'Something went wrong, please try again.';
    } finally {
      els.emailInvoiceBtn.disabled = false;
    }
  });

  /* ---------------------------------------------------------------- */
  /* WhatsApp — formatted order summary, both pre- and post-accept     */
  /* ---------------------------------------------------------------- */

  function buildWhatsappMessage(opts = {}) {
    const lines = ['Hi, I have a Four Oceans Group booking:'];
    if (opts.referenceId) lines.push(`Ref: ${opts.referenceId}`);
    lines.push(`Pickup: ${state.pickup || '?'}`);
    lines.push(`Drop-off: ${state.dropoff || '?'}`);
    if (state.lastQuote?.vehicleLabel) lines.push(`Vehicle: ${state.lastQuote.vehicleLabel}`);
    lines.push(`Date: ${state.moveDate || '?'} (${state.timeSlot || '?'})`);
    if (opts.finalPrice != null) lines.push(`Total: R${Math.round(opts.finalPrice)}`);
    if (opts.depositAmount != null) lines.push(`Deposit: R${Math.round(opts.depositAmount)}`);
    lines.push(`Name: ${state.customerName || '?'}`);
    lines.push(`Phone: ${state.phone || '?'}`);
    if (opts.note) lines.push(opts.note);
    return lines.join('\n');
  }
  function whatsappUrl(message) {
    return `https://wa.me/${CFG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  }
  function updateWhatsappFallback() {
    const url = whatsappUrl(buildWhatsappMessage({
      finalPrice: state.lastQuote?.finalPrice,
      depositAmount: state.lastQuote?.depositAmount,
    }));
    els.whatsappFallback.href = url;
    els.manualQuoteWhatsapp.href = url;
  }

  /* ---------------------------------------------------------------- */
  /* Confirmation (shown immediately on accept — no payment redirect)  */
  /* ---------------------------------------------------------------- */

  function showConfirmation(data) {
    els.confirmationText.textContent = `Thanks, ${state.customerName || 'there'}! Your booking is confirmed — pay the deposit below via EFT using your reference, then send us proof of payment on WhatsApp.`;

    els.invoiceLink.href = data.invoiceUrl;

    const bank = data.bankDetails;
    const copyRow = (label, value) => `
      <div class="quote-receipt__row quote-receipt__row--copy">
        <span>${label}</span>
        <span class="quote-receipt__copywrap"><span>${value}</span><button type="button" class="quote-copy-btn" data-copy="${String(value).replace(/"/g, '&quot;')}">Copy</button></span>
      </div>`;
    els.confirmationBank.innerHTML = `
      <div class="quote-receipt__row"><span>Account holder</span><span>${bank.accountHolder}</span></div>
      <div class="quote-receipt__row"><span>Bank</span><span>${bank.bankName}</span></div>
      ${copyRow('Account number', bank.accountNumber)}
      ${copyRow('Branch code', bank.branchCode)}
      ${copyRow('SWIFT code', bank.swiftCode)}
      ${copyRow('Payment reference', data.referenceId)}
      <div class="quote-receipt__total"><span>Deposit to pay</span><span>R${Math.round(data.depositAmount)}</span></div>
    `;
    els.confirmationBank.querySelectorAll('.quote-copy-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const text = btn.dataset.copy;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
          } else {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
          }
          const prev = btn.textContent;
          btn.textContent = 'Copied';
          btn.setAttribute('data-copied', '');
          setTimeout(() => { btn.textContent = prev; btn.removeAttribute('data-copied'); }, 1600);
        } catch (e) { /* clipboard blocked — leave the value visible to select manually */ }
      });
    });

    els.confirmationWhatsapp.href = whatsappUrl(buildWhatsappMessage({
      referenceId: data.referenceId,
      finalPrice: data.finalPrice,
      depositAmount: data.depositAmount,
      note: "I've made the EFT deposit for the above — please confirm my booking.",
    }));

    els.quoteMain.hidden = true;
    els.stickyTotal.hidden = true;
    if (els.progress) els.progress.hidden = true;
    els.confirmation.hidden = false;
    window.scrollTo({ top: 0 });
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

    new google.maps.places.Autocomplete(els.pickupInput, options).addListener('place_changed', () => {
      state.pickup = els.pickupInput.value.trim();
      maybeCheckZone();
    });
    new google.maps.places.Autocomplete(els.dropoffInput, options).addListener('place_changed', () => {
      state.dropoff = els.dropoffInput.value.trim();
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
  /* Header mobile nav (ported from script.js's pattern)               */
  /* ---------------------------------------------------------------- */

  function initMobileNav() {
    if (!els.navToggle || !els.mobileNavPanel) return;
    const HAMBURGER = 'M4 7H20M4 12H20M4 17H20';
    const CLOSE = 'M6 6L18 18M6 18L18 6';
    const setOpen = (open) => {
      els.mobileNavPanel.hidden = !open;
      els.navToggle.setAttribute('aria-expanded', String(open));
      if (els.navToggleIcon) els.navToggleIcon.setAttribute('d', open ? CLOSE : HAMBURGER);
    };
    els.navToggle.addEventListener('click', () => setOpen(els.mobileNavPanel.hidden));
    els.mobileNavPanel.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  }

  /* ---------------------------------------------------------------- */
  /* Step / scroll progress indicator (item 4)                         */
  /* ---------------------------------------------------------------- */

  function initProgress() {
    if (!els.progressFill || !els.progressLabel) return;
    const sections = $$('.quote-section[data-step]');
    const total = sections.length;
    if (!total) return;

    const setStep = (n, label) => {
      const pct = Math.round((n / total) * 100);
      els.progressFill.style.width = `${pct}%`;
      els.progressLabel.textContent = `Step ${n} of ${total} · ${label}`;
      if (els.progress) els.progress.setAttribute('aria-valuenow', String(pct));
    };
    setStep(1, sections[0].dataset.stepLabel || 'Route');

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const n = Number(entry.target.dataset.step);
          setStep(n, entry.target.dataset.stepLabel || '');
        });
      }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ---------------------------------------------------------------- */
  /* Boot                                                               */
  /* ---------------------------------------------------------------- */

  async function boot() {
    updateHelpersButtons();
    updateTripsButtons();
    showReceiptPlaceholder('Add your pickup, drop-off and truck above to see your price.');
    initMobileNav();
    initProgress();
    wireLiveClear();

    updateWhatsappFallback();
    setInterval(updateWhatsappFallback, 1000);
    loadPricingConfig();

    if (CFG.googleMapsApiKey) {
      loadScript(`https://maps.googleapis.com/maps/api/js?key=${CFG.googleMapsApiKey}&libraries=places`)
        .then(initPlacesAutocomplete)
        .catch(() => {});
    }
  }

  boot();
})();
