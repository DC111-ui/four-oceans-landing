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
    gitCoverRequested: false,
    goodsValue: 0,
    inZone: null,
    distanceKm: null,
    lastQuote: null,
    pricingConfig: null,
    calViewYear: new Date().getFullYear(),
    calViewMonth: new Date().getMonth(),
    sessionToken: localStorage.getItem('foq_session_token') || null,
    sessionName: localStorage.getItem('foq_session_name') || null,
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
    recommendedTruckValue: $('#recommendedTruckValue'),
    suggestedHelpersValue: $('#suggestedHelpersValue'),
    estimatedVolumeValue: $('#estimatedVolumeValue'),
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
    gitCoverToggle: $('#gitCoverToggle'),
    gitCoverDetail: $('#gitCoverDetail'),
    goodsValueInput: $('#goodsValueInput'),
    quoteReceipt: $('#quoteReceipt'),
    manualQuoteNotice: $('#manualQuoteNotice'),
    manualQuoteText: $('#manualQuoteText'),
    manualQuoteWhatsapp: $('#manualQuoteWhatsapp'),
    quotePriceSection: $('#quotePriceSection'),
    googleSignInDiv: $('#googleSignInDiv'),
    signedInStatus: $('#signedInStatus'),
    payDepositBtn: $('#payDepositBtn'),
    whatsappFallback: $('#whatsappFallback'),
    confirmationText: $('#confirmationText'),
    formError: $('#formError'),
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
      btn.className = 'quote-radio-card';
      btn.dataset.value = key;
      btn.setAttribute('aria-pressed', state.vehicleType === key ? 'true' : 'false');
      btn.innerHTML = `
        <strong>${def.label}</strong>
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
    refreshLiveTotal();
  }

  function openLoadAssistant() {
    els.loadAssistantModal.hidden = false;
  }
  function closeLoadAssistant() {
    els.loadAssistantModal.hidden = true;
  }
  els.loadAssistantTrigger.addEventListener('click', openLoadAssistant);
  els.loadAssistantClose.addEventListener('click', closeLoadAssistant);
  els.loadAssistantBackdrop.addEventListener('click', closeLoadAssistant);

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

    if (totalItemCount() === 0) {
      els.idealTruckValue.textContent = 'Add items to get a recommendation';
      els.recommendedTruckValue.textContent = 'Add items to get a recommendation';
      els.suggestedHelpersValue.textContent = '0';
      lastRecommendedVehicle = null;
      lastSuggestedHelpers = 0;
      els.applyRecommendationBtn.disabled = true;
      return;
    }

    const match = Object.entries(vehicles).find(([, v]) => volume <= v.volumeThreshold);
    if (match) {
      lastRecommendedVehicle = match[0];
      lastSuggestedHelpers = suggestedAdditionalHelpers(volume);
      els.idealTruckValue.textContent = match[1].label;
      els.recommendedTruckValue.textContent = match[1].label;
      els.suggestedHelpersValue.textContent = String(lastSuggestedHelpers);
      els.applyRecommendationBtn.disabled = false;
    } else {
      lastRecommendedVehicle = null;
      lastSuggestedHelpers = 0;
      els.idealTruckValue.textContent = "That's bigger than our largest truck — we'll quote this one personally.";
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
      const effectiveElevator = elevator && !tooSmall;
      const floorText = floorSelect.options[floorSelect.selectedIndex]?.text || 'Ground';
      const floorLabel = floor === 0 ? floorText : `${floorText} floor`;
      const amount = effectiveElevator ? cfg.elevatorSurcharge : floor * cfg.floorRate;
      const accessLabel = effectiveElevator ? 'elevator' : 'no elevator';
      return `${floorLabel}, ${accessLabel} → +R${amount}`;
    };
    els.pickupAccessPreview.textContent = describe(els.pickupFloorSelect, state.pickupFloor, state.pickupElevator, state.pickupElevatorTooSmall);
    els.dropoffAccessPreview.textContent = describe(els.dropoffFloorSelect, state.dropoffFloor, state.dropoffElevator, state.dropoffElevatorTooSmall);
  }

  els.pickupFloorSelect.addEventListener('change', () => {
    state.pickupFloor = Number(els.pickupFloorSelect.value);
    updateAccessPreview();
    refreshLiveTotal();
  });
  els.pickupLiftToggle.addEventListener('change', () => {
    state.pickupElevator = els.pickupLiftToggle.checked;
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
        refreshLiveTotal();
      });
    });
  }
  wireRadioCards('timeSlot');

  els.phoneInput.addEventListener('input', () => { state.phone = els.phoneInput.value; });

  function formatDateLabel(iso) {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
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
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${state.calViewYear}-${String(state.calViewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quote-calendar__day';
      btn.textContent = day;
      if (iso < todayIso) btn.disabled = true;
      if (iso === state.moveDate) btn.setAttribute('data-selected', '');
      if (iso === todayIso) btn.setAttribute('data-today', '');
      btn.addEventListener('click', () => {
        state.moveDate = iso;
        els.moveDateTrigger.textContent = formatDateLabel(iso);
        els.moveDateCalendar.hidden = true;
        refreshLiveTotal();
      });
      els.calGrid.appendChild(btn);
    }
  }

  els.moveDateTrigger.addEventListener('click', () => {
    els.moveDateCalendar.hidden = !els.moveDateCalendar.hidden;
    if (!els.moveDateCalendar.hidden) renderCalendarGrid();
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
  /* Form validation (checked at pay time, since this is a single form) */
  /* ---------------------------------------------------------------- */

  function validateForm() {
    const missing = [];
    if (state.inZone !== true) missing.push('a pickup and drop-off address inside our Hatfield service area');
    if (!state.vehicleType) missing.push('a truck (pick one, or use the load assistant)');
    if (!state.moveDate) missing.push('a move date');
    if (!state.timeSlot) missing.push('a time slot');
    if (!state.phone || state.phone.trim().length < 7) missing.push('a valid phone number');
    return missing;
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
    const missing = validateForm();
    if (missing.length) {
      showFormError(`Please add ${missing.join(', ')} before paying.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    clearFormError();
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
      if (!res.ok) {
        if (data.requiresManualQuote) {
          renderReceipt(data);
          return;
        }
        throw new Error(data.message || 'Could not create booking');
      }

      submitToPayfast(data.payfast);
    } catch (err) {
      els.payDepositBtn.disabled = false;
      els.payDepositBtn.textContent = 'Pay Deposit with PayFast';
      showFormError(err.message || 'Something went wrong, please try again.');
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

  function whatsappMessage() {
    return encodeURIComponent(
      `Hi, I'd like to book a Hatfield relocation. Pickup: ${state.pickup || '?'}, Drop-off: ${state.dropoff || '?'}, Date: ${state.moveDate || '?'}`
    );
  }
  function updateWhatsappFallback() {
    const url = `https://wa.me/${CFG.whatsappNumber}?text=${whatsappMessage()}`;
    els.whatsappFallback.href = url;
    els.manualQuoteWhatsapp.href = url;
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
    els.quoteMain.hidden = true;
    els.stickyTotal.hidden = true;
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
  /* Boot                                                               */
  /* ---------------------------------------------------------------- */

  async function boot() {
    updateHelpersButtons();
    updateTripsButtons();
    updateCheckoutUI();
    showReceiptPlaceholder('Add your pickup, drop-off and truck above to see your price.');

    const handledReturn = await checkReturnStatus();
    if (handledReturn) return;

    updateWhatsappFallback();
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
