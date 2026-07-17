(function () {
  "use strict";

  const data = window.OSavePresentation;
  const slides = Array.from(document.querySelectorAll(".slide"));
  const slideIndex = document.getElementById("slideIndex");
  const sidebar = document.getElementById("sidebar");
  const menuButton = document.getElementById("menuButton");
  const counter = document.getElementById("slideCounter");
  const sectionLabel = document.getElementById("sectionLabel");
  const progressBar = document.getElementById("progressBar");
  const previousButton = document.getElementById("previousButton");
  const nextButton = document.getElementById("nextButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const video = document.getElementById("presentationVideo");
  const videoEmbed = document.getElementById("presentationVideoEmbed");
  const videoStatusTitle = document.getElementById("videoStatusTitle");
  const videoStatusDetail = document.getElementById("videoStatusDetail");
  const videoOpenLink = document.getElementById("videoOpenLink");
  const mobileSidebarQuery = window.matchMedia("(max-width: 820px)");
  let currentSlide = 0;
  let configuredEmbedUrl = "";
  let touchStartX = 0;
  let touchStartY = 0;
  let desktopSidebarOpen = true;
  let lastDialogTrigger = null;
  let titleSolarInitialized = false;
  let titleSolarFrame = null;
  let titleSolarCleanup = null;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const photoLightbox = document.getElementById("photoLightbox");
  const photoLightboxClose = document.getElementById("photoLightboxClose");
  const photoLightboxImage = document.getElementById("photoLightboxImage");
  const photoLightboxPrevious = document.getElementById("photoLightboxPrevious");
  const photoLightboxNext = document.getElementById("photoLightboxNext");
  let activePhotoGroup = 0;
  let activePhotoIndex = 0;
  let lastPhotoTrigger = null;

  const pad = (value) => String(value).padStart(2, "0");
  const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);
  const formatDuration = (value) => value.replace(/^(\d+)d$/, "$1 days");

  function isInteractiveTarget(target) {
    return Boolean(target.closest("button, a, input, select, textarea, video, iframe, dialog"));
  }

  function normalizeVideoEmbedUrl(url) {
    if (!url) return "";
    const trimmed = String(url).trim();
    if (!trimmed) return "";
    const driveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    return trimmed;
  }

  function isVideoSlide(index) {
    return slides[index]?.classList.contains("video-slide") ?? false;
  }

  function updateVideoPlayback(activeIndex) {
    const onVideoSlide = isVideoSlide(activeIndex);

    if (video) {
      if (!onVideoSlide && !video.paused) video.pause();
      video.hidden = !onVideoSlide || !video.src;
    }

    if (videoEmbed && configuredEmbedUrl) {
      videoEmbed.src = onVideoSlide ? configuredEmbedUrl : "about:blank";
      videoEmbed.hidden = !onVideoSlide;
    }
  }

  function setSidebarOpen(open) {
    if (mobileSidebarQuery.matches) {
      sidebar.classList.remove("is-hidden");
      sidebar.classList.toggle("is-open", open);
    } else {
      desktopSidebarOpen = open;
      sidebar.classList.remove("is-open");
      sidebar.classList.toggle("is-hidden", !open);
    }

    sidebar.toggleAttribute("inert", !open);
    sidebar.setAttribute("aria-hidden", String(!open));
    menuButton.setAttribute("aria-expanded", String(open));
  }

  function toggleSidebar() {
    const open = mobileSidebarQuery.matches
      ? sidebar.classList.contains("is-open")
      : !sidebar.classList.contains("is-hidden");
    setSidebarOpen(!open);
  }

  function closeSidebar() {
    if (mobileSidebarQuery.matches) setSidebarOpen(false);
  }

  function showSlide(index, updateHash) {
    const nextIndex = Math.max(0, Math.min(slides.length - 1, index));
    currentSlide = nextIndex;

    slides.forEach((slide, slideNumber) => {
      const active = slideNumber === currentSlide;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      slide.toggleAttribute("inert", !active);
    });

    Array.from(slideIndex.children).forEach((item, itemIndex) => {
      const active = itemIndex === currentSlide;
      item.classList.toggle("is-active", active);
      item.querySelector("button").setAttribute("aria-current", active ? "page" : "false");
    });

    const activeSlide = slides[currentSlide];
    document.body.classList.toggle("title-screen", currentSlide === 0);
    if (currentSlide === 0) requestAnimationFrame(ensureTitleSolarSystem);
    counter.textContent = `${pad(currentSlide + 1)} / ${pad(slides.length)}`;
    sectionLabel.textContent = activeSlide.dataset.section;
    progressBar.style.width = `${((currentSlide + 1) / slides.length) * 100}%`;
    progressBar.parentElement.setAttribute("aria-valuenow", String(currentSlide + 1));
    previousButton.disabled = currentSlide === 0;
    nextButton.disabled = currentSlide === slides.length - 1;
    document.title = `${activeSlide.dataset.title} | ROOCH x O!Save`;
    updateFullscreenButton(Boolean(document.fullscreenElement));

    if (updateHash) history.replaceState(null, "", `#slide-${currentSlide + 1}`);
    updateVideoPlayback(currentSlide);
    closeSidebar();
  }

  slides.forEach((slide, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span>${pad(index + 1)}</span><strong>${slide.dataset.title}</strong>`;
    button.addEventListener("click", () => showSlide(index, true));
    item.appendChild(button);
    slideIndex.appendChild(item);
  });
  progressBar.parentElement.setAttribute("aria-valuemax", String(slides.length));

  previousButton.addEventListener("click", () => showSlide(currentSlide - 1, true));
  nextButton.addEventListener("click", () => showSlide(currentSlide + 1, true));
  menuButton.addEventListener("click", toggleSidebar);
  document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
  mobileSidebarQuery.addEventListener("change", (event) => {
    setSidebarOpen(event.matches ? false : desktopSidebarOpen);
  });
  setSidebarOpen(!mobileSidebarQuery.matches);

  document.addEventListener("keydown", (event) => {
    if (photoLightbox.open) return;
    if (event.key === "Escape" && mobileSidebarQuery.matches && sidebar.classList.contains("is-open")) {
      setSidebarOpen(false);
      return;
    }
    if (event.target.closest("input, select, textarea, video, iframe, dialog, [contenteditable='true']")) return;
    if (event.target.closest("[role='tab']")) return;
    if (event.target.closest("button, a") && [" ", "Enter"].includes(event.key)) return;
    if (["ArrowRight", "PageDown", " ", "Enter"].includes(event.key)) {
      event.preventDefault();
      showSlide(currentSlide + 1, true);
    }
    if (["ArrowLeft", "PageUp", "Backspace"].includes(event.key)) {
      event.preventDefault();
      showSlide(currentSlide - 1, true);
    }
    if (event.key === "Home") showSlide(0, true);
    if (event.key === "End") showSlide(slides.length - 1, true);
  });

  document.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0].clientX;
    touchStartY = event.changedTouches[0].clientY;
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    if (isInteractiveTarget(event.target)) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    showSlide(currentSlide + (deltaX < 0 ? 1 : -1), true);
  }, { passive: true });

  function updateFullscreenButton(presenting) {
    const idleLabel = "Present Fullscreen";
    fullscreenButton.textContent = presenting ? "Exit" : idleLabel;
    fullscreenButton.setAttribute("aria-label", presenting ? "Exit presentation mode" : "Enter presentation mode");
  }

  async function togglePresentationMode() {
    try {
      if (!document.fullscreenElement) {
        document.body.classList.add("present-mode");
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_error) {
      const presenting = document.body.classList.toggle("present-mode");
      updateFullscreenButton(presenting);
    }
  }

  fullscreenButton.addEventListener("click", togglePresentationMode);
  document.addEventListener("fullscreenchange", () => {
    const presenting = Boolean(document.fullscreenElement);
    document.body.classList.toggle("present-mode", presenting);
    updateFullscreenButton(presenting);
  });

  const companyDialog = document.getElementById("companyDialog");
  const dialogClose = document.getElementById("dialogClose");
  document.querySelectorAll("[data-company]").forEach((button) => {
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-controls", "companyDialog");
    button.addEventListener("click", () => {
      const company = data.companies[button.dataset.company];
      lastDialogTrigger = button;
      document.getElementById("dialogLogo").src = company.logo;
      document.getElementById("dialogLogo").alt = `${company.title} logo`;
      document.getElementById("dialogCategory").textContent = company.category;
      document.getElementById("dialogTitle").textContent = company.title;
      document.getElementById("dialogDescription").textContent = company.description;
      document.getElementById("dialogPoints").innerHTML = company.highlights
        ? company.highlights.map((highlight) => `<li class="dialog-highlight"><span class="dialog-highlight-icon" aria-hidden="true">${highlight.icon}</span><span><strong>${highlight.title}</strong><small>${highlight.text}</small></span></li>`).join("")
        : company.points.map((point) => `<li>${point}</li>`).join("");
      companyDialog.showModal();
      dialogClose.focus();
    });
  });
  dialogClose.addEventListener("click", () => companyDialog.close());
  companyDialog.addEventListener("close", () => {
    if (lastDialogTrigger) lastDialogTrigger.focus();
    lastDialogTrigger = null;
  });
  companyDialog.addEventListener("click", (event) => {
    if (event.target === companyDialog) companyDialog.close();
  });

  const manufacturingStatus = Array.isArray(data.manufacturingStatus) ? data.manufacturingStatus : [];
  const galleryTargets = {
    oil: { gallery: "expansionOilGallery", count: "expansionOilCount" },
    pancit: { gallery: "expansionPancitGallery", count: "expansionPancitCount" },
    logistics: { gallery: "expansionLogisticsGallery", count: "expansionLogisticsCount" }
  };

  function renderActivePhoto() {
    const group = manufacturingStatus[activePhotoGroup];
    const photo = group.photos[activePhotoIndex];
    photoLightboxImage.src = photo.src;
    photoLightboxImage.alt = `${photo.title} - ${group.title}`;
  }

  function openPhoto(groupIndex, photoIndex, trigger) {
    activePhotoGroup = groupIndex;
    activePhotoIndex = photoIndex;
    lastPhotoTrigger = trigger;
    renderActivePhoto();
    photoLightbox.showModal();
    photoLightboxClose.focus();
  }

  function movePhoto(direction) {
    const photos = manufacturingStatus[activePhotoGroup].photos;
    activePhotoIndex = (activePhotoIndex + direction + photos.length) % photos.length;
    renderActivePhoto();
  }

  manufacturingStatus.forEach((group, groupIndex) => {
    const target = galleryTargets[group.id];
    if (!target) return;
    const gallery = document.getElementById(target.gallery);
    document.getElementById(target.count).textContent = `${group.photos.length} photos`;
    group.photos.forEach((photo, photoIndex) => {
      const button = document.createElement("button");
      const image = document.createElement("img");
      button.type = "button";
      button.className = "expansion-photo";
      button.setAttribute("aria-label", `Expand ${photo.title}`);
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-controls", "photoLightbox");
      image.src = photo.src;
      image.alt = photo.title;
      image.loading = "lazy";
      image.decoding = "async";
      button.append(image);
      button.addEventListener("click", () => openPhoto(groupIndex, photoIndex, button));
      gallery.appendChild(button);
    });
  });

  photoLightboxClose.addEventListener("click", () => photoLightbox.close());
  photoLightboxPrevious.addEventListener("click", () => movePhoto(-1));
  photoLightboxNext.addEventListener("click", () => movePhoto(1));
  photoLightbox.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    movePhoto(event.key === "ArrowRight" ? 1 : -1);
  });
  photoLightbox.addEventListener("click", (event) => {
    if (event.target === photoLightbox) photoLightbox.close();
  });
  photoLightbox.addEventListener("close", () => {
    photoLightboxImage.removeAttribute("src");
    if (lastPhotoTrigger) lastPhotoTrigger.focus();
    lastPhotoTrigger = null;
  });

  const achievementList = document.getElementById("achievementList");
  const achievementImage = document.getElementById("achievementImage");
  const achievementMedia = document.getElementById("achievementPanel");
  const achievementUnavailable = document.getElementById("achievementUnavailable");
  const achievementCategory = document.getElementById("achievementCategory");
  const achievementTitle = document.getElementById("achievementTitle");
  const achievementDescription = document.getElementById("achievementDescription");
  const achievementTabs = [];
  function moveTab(event, buttons, index, select) {
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    const nextIndex = (index + direction + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
    select(nextIndex);
  }
  function selectAchievement(index) {
    const achievement = data.achievements[index];
    if (!achievement) return;
    achievementMedia.classList.add("is-changing");
    achievementImage.alt = achievement.title;
    achievementCategory.textContent = achievement.group;
    achievementTitle.textContent = achievement.title;
    const captionSeparator = achievement.caption.indexOf(": ");
    const captionLead = captionSeparator >= 0 ? achievement.caption.slice(0, captionSeparator + 1) : "";
    const captionBody = captionSeparator >= 0 ? achievement.caption.slice(captionSeparator + 2) : achievement.caption;
    achievementDescription.innerHTML = captionLead
      ? `<strong>${captionLead}</strong> ${captionBody}`
      : captionBody;
    achievementImage.hidden = !achievement.image;
    achievementUnavailable.hidden = Boolean(achievement.image);
    if (achievement.image) {
      achievementImage.addEventListener("load", () => achievementMedia.classList.remove("is-changing"), { once: true });
      achievementImage.src = achievement.image;
      if (achievementImage.complete) requestAnimationFrame(() => achievementMedia.classList.remove("is-changing"));
    } else {
      achievementImage.removeAttribute("src");
      requestAnimationFrame(() => achievementMedia.classList.remove("is-changing"));
    }
    achievementTabs.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
      button.setAttribute("aria-selected", String(buttonIndex === index));
      button.setAttribute("tabindex", buttonIndex === index ? "0" : "-1");
    });
  }
  const achievementGroups = ["Tech & Solutions", "Infra & Energy", "FMCG & Logistics"];
  const achievementGroupClasses = ["achievement-group-tech", "achievement-group-infra", "achievement-group-fmcg"];
  achievementGroups.forEach((group, groupIndex) => {
    const groupSection = document.createElement("section");
    groupSection.className = `achievement-group ${achievementGroupClasses[groupIndex]}`;
    groupSection.innerHTML = `<h3>${group}</h3><div class="achievement-items"></div>`;
    const groupItems = groupSection.querySelector(".achievement-items");
    data.achievements.forEach((achievement, index) => {
      if (achievement.group !== group) return;
      const button = document.createElement("button");
      button.type = "button";
      button.role = "tab";
      button.className = "achievement-item";
      button.setAttribute("aria-controls", "achievementPanel");
      button.setAttribute("aria-label", `${achievement.title}: ${achievement.subtitle}`);
      button.innerHTML = `<strong>${achievement.title}</strong><small>${achievement.subtitle}</small>`;
      const achievementIndex = achievementTabs.length;
      button.addEventListener("click", () => selectAchievement(index));
      button.addEventListener("keydown", (event) => moveTab(event, achievementTabs, achievementIndex, selectAchievement));
      groupItems.appendChild(button);
      achievementTabs.push(button);
    });
    achievementList.appendChild(groupSection);
  });
  selectAchievement(0);

  const maxOilDemand = Math.max(...data.oilDemand.map((item) => item.cases));
  const totalOilDemand = data.oilDemand.reduce((total, item) => total + item.cases, 0);
  document.getElementById("oilDemandTable").innerHTML = `${data.oilDemand.map((item) => `
    <tr>
      <td>${item.region}</td>
      <td>${formatNumber(item.cases)} cases</td>
    </tr>`).join("")}
    <tr class="oil-demand-total">
      <th scope="row">Total Monthly Demand</th>
      <th>${formatNumber(totalOilDemand)} cases</th>
    </tr>`;

  document.getElementById("oilDemandChart").innerHTML = `
    <div class="demand-chart-plot">
      <span class="demand-chart-gridline demand-chart-gridline-top" aria-hidden="true"></span>
      <span class="demand-chart-gridline demand-chart-gridline-quarter" aria-hidden="true"></span>
      <span class="demand-chart-gridline demand-chart-gridline-half" aria-hidden="true"></span>
      <span class="demand-chart-gridline demand-chart-gridline-three-quarter" aria-hidden="true"></span>
      <div class="demand-bars">
        ${data.oilDemand.map((item) => `
          <div class="demand-bar-column" role="img" aria-label="${item.region}: ${formatNumber(item.cases)} cases per month" style="--bar-height:${(item.cases / maxOilDemand) * 100}%;--bar-color:${item.color}">
            <span class="demand-bar-value">${item.cases >= 1000 ? `${(item.cases / 1000).toFixed(1)}K` : formatNumber(item.cases)}</span>
            <i class="demand-bar-fill"></i>
            <span class="demand-bar-label">${item.code}</span>
          </div>`).join("")}
      </div>
    </div>
    <p class="demand-chart-legend"><strong>Legend:</strong> ${data.oilDemand.map((item) => `${item.code}: ${item.region.split(",")[0]}`).join(" | ")}</p>`;

  const pancitRecurringDemand = data.pancitDemand.filter((item) => !item.isSample);
  const pancitRecurringCases = pancitRecurringDemand.reduce((total, item) => total + item.cases, 0);
  const pancitRecurringPieces = pancitRecurringDemand.reduce((total, item) => total + item.pieces, 0);
  const maxPancitDemand = Math.max(...pancitRecurringDemand.map((item) => item.cases));
  document.getElementById("pancitDemandTable").innerHTML = `${data.pancitDemand.map((item) => `
    <tr class="${item.isSample ? "pancit-sample-row" : ""}">
      <td><span class="pancit-product-name">${item.product}</span><small>${item.size}</small>${item.isSample ? "<em>Initial sampling</em>" : ""}</td>
      <td>${formatNumber(item.cases)}</td>
      <td>${formatNumber(item.pieces)}</td>
    </tr>`).join("")}
    <tr class="oil-demand-total">
      <th scope="row">Recurring total</th>
      <th>${formatNumber(pancitRecurringCases)}</th>
      <th>${formatNumber(pancitRecurringPieces)}</th>
    </tr>`;

  document.getElementById("pancitDemandChart").innerHTML = `
    <div class="demand-chart-plot">
      <span class="demand-chart-gridline demand-chart-gridline-top" aria-hidden="true"></span>
      <span class="demand-chart-gridline demand-chart-gridline-quarter" aria-hidden="true"></span>
      <span class="demand-chart-gridline demand-chart-gridline-half" aria-hidden="true"></span>
      <span class="demand-chart-gridline demand-chart-gridline-three-quarter" aria-hidden="true"></span>
      <div class="demand-bars">
        ${data.pancitDemand.map((item) => `
          <div class="demand-bar-column ${item.isSample ? "is-sample" : ""}" role="img" aria-label="${item.product} ${item.size}: ${formatNumber(item.cases)} cases per month" style="--bar-height:${Math.max(item.isSample ? 1 : (item.cases / maxPancitDemand) * 100, 1)}%;--bar-color:${item.color}">
            <span class="demand-bar-value">${item.cases >= 1000 ? `${Math.round(item.cases / 1000)}K` : formatNumber(item.cases)}</span>
            <i class="demand-bar-fill"></i>
            <span class="demand-bar-label">${item.product} ${item.size}</span>
          </div>`).join("")}
      </div>
    </div>
    <p class="demand-chart-legend"><strong>Legend:</strong> Bihon 454g: 50K | Canton 300g: 30K | Canton 100g: 1K sample</p>`;

  document.getElementById("pancitRecurringPieces").textContent = `${formatNumber(pancitRecurringPieces)}`;
  document.getElementById("pancitWarehouses").innerHTML = data.pancitWarehouses.map(([code, name, cases]) => `
    <div class="warehouse-cell" role="img" aria-label="${name}: ${formatNumber(cases)} cases per month"><strong>${code}</strong><span>${name}</span><small>${formatNumber(cases)} cases / month</small></div>`).join("");

  const OIL_RATES = {
    p350: { fixedCurrDay: 12600, fixedCurrNight: 7200, expHourly: 7200 },
    p1L:  { fixedCurrDay: 4800,  fixedCurrNight: 3600, expHourly: 1800 },
    c1L:  { fixedCurrDay: 4800,  fixedCurrNight: 3600, expHourly: 1800 }
  };
  const OIL_KEYS = ["p350","p1L","c1L"];
  const capacityTabs = [];
  let selectedOilIndex = 0;

  function computeScenario(ratesObj, skuDays, hours, totalDays) {
    const dayHrs = Math.ceil(hours / 2);
    const nightHrs = Math.floor(hours / 2);

    const currDay = ratesObj.fixedCurrDay;
    const currNight = ratesObj.fixedCurrNight;
    const currDaily = currDay + currNight;
    const currMonthlyPotential = currDaily * 30;
    const currActualMixed = currDaily * skuDays;

    const expDay = ratesObj.expHourly * dayHrs;
    const expNight = ratesObj.expHourly * nightHrs;
    const expDaily = expDay + expNight;
    const expMonthlyPotential = expDaily * totalDays;
    const expActualMixed = expDaily * skuDays;

    return { currDay, currNight, currDaily, currMonthlyPotential, currActualMixed, expDay, expNight, expDaily, expMonthlyPotential, expActualMixed };
  }

  function updateOilSimulation(selectedIndex) {
    const hours = parseInt(document.getElementById("oil-input-hours").value);
    const totalDays = parseInt(document.getElementById("oil-input-days").value);

    document.getElementById("oil-val-hours").textContent = `${hours} hours`;
    document.getElementById("oil-val-days").textContent = `${totalDays} days`;
    document.getElementById("oil-kpi-hours").textContent = `${hours} hours`;
    document.getElementById("oil-kpi-days").textContent = `${totalDays} days/month`;
    if (hours >= 16) document.getElementById("oil-kpi-shifts").textContent = "3 shifts (full)";
    else if (hours >= 10) document.getElementById("oil-kpi-shifts").textContent = "2 shifts (double)";
    else document.getElementById("oil-kpi-shifts").textContent = "1 shift (single)";

    document.getElementById("oil-mix-p350").max = totalDays;
    document.getElementById("oil-mix-p1L").max = totalDays;
    document.getElementById("oil-mix-c1L").max = totalDays;

    let d_p350 = parseInt(document.getElementById("oil-mix-p350").value);
    let d_p1L  = parseInt(document.getElementById("oil-mix-p1L").value);
    let d_c1L  = parseInt(document.getElementById("oil-mix-c1L").value);
    let sum = d_p350 + d_p1L + d_c1L;
    const warning = document.getElementById("oil-mix-warning");
    if (sum !== totalDays) {
      warning.hidden = false;
      if (sum === 0) { d_p350 = Math.floor(totalDays/3); d_p1L = Math.floor(totalDays/3); d_c1L = totalDays - d_p350 - d_p1L; }
      else { const f = totalDays / sum; d_p350 = Math.round(d_p350*f); d_p1L = Math.round(d_p1L*f); d_c1L = totalDays - d_p350 - d_p1L; }
      document.getElementById("oil-mix-p350").value = d_p350;
      document.getElementById("oil-mix-p1L").value = d_p1L;
      document.getElementById("oil-mix-c1L").value = d_c1L;
    } else warning.hidden = true;

    document.getElementById("oil-days-status").textContent = `${totalDays} of ${totalDays} days`;
    document.getElementById("oil-val-mix-p350").textContent = `${d_p350} days`;
    document.getElementById("oil-val-mix-p1L").textContent = `${d_p1L} days`;
    document.getElementById("oil-val-mix-c1L").textContent = `${d_c1L} days`;

    const skuDays = [d_p350, d_p1L, d_c1L];
    const calcs = OIL_KEYS.map((k, i) => computeScenario(OIL_RATES[k], skuDays[i], hours, totalDays));
    const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

    // Chart bars — dark blue bar stays at fixed baseline, green bar scales relative to it
    const BASELINE_PCT = 30;
    calcs.forEach((calc, i) => {
      const p = OIL_KEYS[i];
      const currBar = document.getElementById(`oil-bar-${p}-curr`);
      const expBar = document.getElementById(`oil-bar-${p}-exp`);
      const currValue = document.getElementById(`oil-value-${p}-curr`);
      const expValue = document.getElementById(`oil-value-${p}-exp`);
      if (currBar) {
        currBar.style.height = `${BASELINE_PCT}%`;
        currBar.setAttribute("aria-label", `Current allocated output: ${calc.currActualMixed.toLocaleString()} bottles`);
      }
      if (expBar) {
        const ratio = calc.currActualMixed > 0 ? calc.expActualMixed / calc.currActualMixed : 1;
        const expPct = Math.max(BASELINE_PCT, Math.min(100, BASELINE_PCT * ratio));
        expBar.style.height = `${expPct}%`;
        expBar.setAttribute("aria-label", `Expanded allocated output: ${calc.expActualMixed.toLocaleString()} bottles`);
      }
      if (currValue) currValue.textContent = compactNumber.format(calc.currActualMixed);
      if (expValue) expValue.textContent = compactNumber.format(calc.expActualMixed);
    });

    // Update selected comparison card (single pass, no re-computation)
    const c = calcs[selectedIndex];
    const cap = data.oilCapacity[selectedIndex];
    const fmt = (v) => `${v.toLocaleString()} bottles`;
    document.getElementById("currentDay").textContent = fmt(c.currDay);
    document.getElementById("currentNight").textContent = fmt(c.currNight);
    document.getElementById("currentDaily").textContent = fmt(c.currDaily);
    document.getElementById("currentMonthly").textContent = fmt(c.currMonthlyPotential);
    document.getElementById("expandedDay").textContent = fmt(c.expDay);
    document.getElementById("expandedNight").textContent = fmt(c.expNight);
    document.getElementById("expandedDaily").textContent = fmt(c.expDaily);
    document.getElementById("expandedMonthly").textContent = fmt(c.expMonthlyPotential);

    const growth = c.expMonthlyPotential > c.currMonthlyPotential ? Math.round((c.expMonthlyPotential - c.currMonthlyPotential) / c.currMonthlyPotential * 100) : 0;
    document.getElementById("growthBadge").textContent = `+${growth}% Production Capacity`;

    const parts = cap.label.split(" ");
    const product = parts.slice(0, 2).join(" ");
    const tag = parts.slice(2).join(" ") || cap.label;
    document.getElementById("oilProdIcon").classList.toggle("is-canola", selectedIndex === 2);
    document.getElementById("oilProdIcon").classList.toggle("is-palm", selectedIndex !== 2);
    document.getElementById("oilProdLabel").textContent = product;
    document.getElementById("oilProdTag").textContent = tag;

    capacityTabs.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === selectedIndex);
      button.setAttribute("aria-selected", String(buttonIndex === selectedIndex));
      button.setAttribute("tabindex", buttonIndex === selectedIndex ? "0" : "-1");
    });
  }

  function selectCapacity(index) {
    selectedOilIndex = index;
    updateOilSimulation(index);
  }

  // Build tabs
  data.oilCapacity.forEach((capacity, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.textContent = capacity.label;
    button.addEventListener("click", () => selectCapacity(index));
    button.addEventListener("keydown", (event) => moveTab(event, capacityTabs, index, selectCapacity));
    document.getElementById("oilCapacityTabs").appendChild(button);
    capacityTabs.push(button);
  });

  ["oil-input-hours","oil-input-days","oil-mix-p350","oil-mix-p1L","oil-mix-c1L"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => updateOilSimulation(selectedOilIndex));
  });
  updateOilSimulation(0);

  function renderCycle(targetId, steps, options = {}) {
    const radius = options.radius || 33;
    const stepMarkup = steps.map((step, index) => {
      const isObjectStep = !Array.isArray(step);
      const label = isObjectStep ? step.label : step[0];
      const duration = isObjectStep ? step.duration : step[1];
      const sublabel = isObjectStep ? step.sublabel : "";
      const phase = isObjectStep ? step.phase : (options.phases?.[index] || "");
      const angle = -90 + (index * 360) / steps.length;
      const radians = angle * Math.PI / 180;
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);
      const readableDuration = formatDuration(duration);
      const content = `<i>${pad(index + 1)}</i><strong>${label}</strong>${sublabel ? `<small>${sublabel}</small>` : ""}<span>${readableDuration}</span>`;
      if (options.interactive) {
        return `<button type="button" class="cycle-step ${phase}" role="listitem" aria-label="${label}, ${sublabel}, ${readableDuration}" aria-pressed="${index === 0}" data-cycle-index="${index}" style="--step-x:${x.toFixed(3)}%;--step-y:${y.toFixed(3)}%">${content}</button>`;
      }
      return `<div class="cycle-step ${phase}" role="listitem" aria-label="${label}, ${readableDuration}" style="--step-x:${x.toFixed(3)}%;--step-y:${y.toFixed(3)}%">${content}</div>`;
    }).join("");
    document.getElementById(targetId).innerHTML = `<div class="cycle-track" aria-hidden="true"></div>${stepMarkup}`;
  }

  function renderOilWorkingCapital() {
    const oil = data.oilWorkingCapital;
    document.getElementById("oilCapitalHeadline").textContent = oil.headline.value;
    document.getElementById("oilCapitalHeadlineLabel").textContent = oil.headline.label;
    document.getElementById("oilCapitalKpis").innerHTML = oil.kpis.map(([label, value, note]) => `<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("");
    document.getElementById("oilPurchaseRows").innerHTML = oil.purchases.map(item => `<div class="oil-purchase-row"><span>${item.label}<small>${item.monthly}</small></span><strong>${item.containers}<small>${item.weekly}</small></strong></div>`).join("");
    document.getElementById("oilProductRows").innerHTML = oil.products.map(item => `<div class="oil-product-row ${item.tone}"><span>${item.label}<small>${item.daily} / day</small></span><strong>${item.weekly}<small>units / week</small></strong></div>`).join("");
    document.getElementById("oilInventoryRows").innerHTML = oil.products.map(item => `<div class="${item.tone}"><span>${item.label}</span><strong>${item.inventory}</strong></div>`).join("");
    document.getElementById("oilShipmentChart").innerHTML = oil.shipments.map(([week, palm, canola]) => `<div class="shipment-week"><div class="shipment-bars"><i class="palm" style="--bar:${palm}"></i><i class="canola" style="--bar:${canola}"></i></div><span>${week}</span><strong>${palm + canola}</strong></div>`).join("");
    document.getElementById("oilOutputTable").innerHTML = oil.products.map(item => `<div class="${item.tone}"><span>${item.label}</span><strong>${item.daily}<small>/ day</small></strong><b>${item.weekly}<small>/ week</small></b></div>`).join("");
    document.getElementById("oilCashCycle").innerHTML = oil.cashCycle.map(item => `<div class="${item.tone}"><span>${item.label}</span><i><b style="width:${item.share}%"></b></i><strong>${item.days}d</strong></div>`).join("");

    const detail = document.getElementById("oilCycleDetail");
    const selectStep = index => {
      const step = oil.cycle[index];
      detail.innerHTML = `<span>Step ${pad(index + 1)}</span><div><strong>${step.label} ${step.sublabel}</strong><p>${step.detail}</p></div>`;
      document.querySelectorAll("#oilCycleFlow .cycle-step").forEach((button, buttonIndex) => {
        button.classList.toggle("is-selected", buttonIndex === index);
        button.setAttribute("aria-pressed", String(buttonIndex === index));
      });
    };
    renderCycle("oilCycleFlow", oil.cycle, { interactive: true, radius: 38 });
    document.querySelectorAll("#oilCycleFlow .cycle-step").forEach(button => button.addEventListener("click", () => selectStep(Number(button.dataset.cycleIndex))));
    selectStep(0);
  }

  function renderPancitWorkingCapital() {
    const pancit = data.pancitWorkingCapital;
    document.getElementById("pancitCapitalHeadline").textContent = pancit.headline.value;
    document.getElementById("pancitCapitalHeadlineLabel").textContent = pancit.headline.label;
    document.getElementById("pancitCapitalKpis").innerHTML = pancit.kpis.map(([label, value, note]) => `<div><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join("");
    document.getElementById("pancitMonthlyRequirement").textContent = pancit.kpis[1][1];
    document.getElementById("pancitWeeklyOutput").textContent = pancit.kpis[2][1];
    document.getElementById("pancitCollectionDays").textContent = pancit.kpis[3][1];
    document.getElementById("pancitMaterialsRows").innerHTML = pancit.materials.map(item => `<div class="oil-purchase-row"><span>${item.label}<small>${item.note}</small></span><strong>${item.value}</strong></div>`).join("");
    document.getElementById("pancitMaterialsInsight").innerHTML = pancit.materials.map(item => `<div class="blue"><span>${item.label}</span><strong>${item.value}</strong></div>`).join("");

    const mixColors = { blue: "#24a9e8", gold: "#f2c14e", green: "#45c486" };
    document.getElementById("pancitMixBar").innerHTML = pancit.productionMix.map(item => `<i style="--size:${item.size};--tone:${mixColors[item.tone]}"></i>`).join("");
    document.getElementById("pancitMixLegend").innerHTML = pancit.productionMix.map(item => `<span><i style="--tone:${mixColors[item.tone]}"></i>${item.label} ${item.share}</span>`).join("");

    const detail = document.getElementById("pancitCycleDetail");
    const selectStep = index => {
      const step = pancit.cycle[index];
      detail.innerHTML = `<span>Step ${pad(index + 1)}</span><div><strong>${step.label} ${step.sublabel}</strong><p>${step.detail}</p></div>`;
      document.querySelectorAll("#pancitCycleFlow .cycle-step").forEach((button, buttonIndex) => {
        button.classList.toggle("is-selected", buttonIndex === index);
        button.setAttribute("aria-pressed", String(buttonIndex === index));
      });
    };
    renderCycle("pancitCycleFlow", pancit.cycle, { interactive: true, radius: 38 });
    document.querySelectorAll("#pancitCycleFlow .cycle-step").forEach(button => button.addEventListener("click", () => selectStep(Number(button.dataset.cycleIndex))));
    selectStep(0);
  }

  renderOilWorkingCapital();
  renderPancitWorkingCapital();

  function ensureTitleSolarSystem() {
    if (titleSolarInitialized || currentSlide !== 0) return;
    if (typeof THREE === "undefined") {
      window.setTimeout(ensureTitleSolarSystem, 100);
      return;
    }

    const container = document.getElementById("solarSystemContainer");
    if (!container || !container.clientWidth || !container.clientHeight) {
      window.setTimeout(ensureTitleSolarSystem, 100);
      return;
    }
    titleSolarInitialized = true;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 7.5, 13);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.prepend(renderer.domElement);

    const solarGroup = new THREE.Group();
    scene.add(solarGroup);

    const sunGeometry = new THREE.SphereGeometry(1.1, 16, 16);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, wireframe: true, transparent: true, opacity: 0.18 });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    solarGroup.add(sunMesh);

    const glowGeometry = new THREE.RingGeometry(1.2, 1.25, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
    glowRing.rotation.x = Math.PI / 2;
    solarGroup.add(glowRing);

    const orbitMaterials = [];
    function createOrbit(radius) {
      const points = [];
      for (let index = 0; index <= 64; index += 1) {
        const angle = (index / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0 });
      orbitMaterials.push(material);
      solarGroup.add(new THREE.Line(geometry, material));
    }
    [3.2, 5, 6.8].forEach(createOrbit);

    const planets = [
      { id: "lbl-hanvins", radius: 3.2, angle: 0, speed: 0.007, size: 0.22 },
      { id: "lbl-vertex", radius: 5, angle: 0, speed: 0.005, size: 0.22 },
      { id: "lbl-men2solutions", radius: 5, angle: Math.PI, speed: 0.005, size: 0.2 },
      { id: "lbl-men2parent", radius: 6.8, angle: 0, speed: 0.0035, size: 0.24 },
      { id: "lbl-mamapina", radius: 6.8, angle: Math.PI, speed: 0.0035, size: 0.18 }
    ];
    planets.forEach((planet) => {
      planet.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(planet.size, 8, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      solarGroup.add(planet.mesh);
    });

    const men2Group = new THREE.Group();
    solarGroup.add(men2Group);
    const moons = [
      { id: "lbl-men2dagupan", radius: 1.15, angle: 0, speed: 0.022, size: 0.15 },
      { id: "lbl-men2marikina", radius: 1.15, angle: (Math.PI * 2) / 3, speed: 0.022, size: 0.15 },
      { id: "lbl-jcbs", radius: 1.15, angle: (Math.PI * 4) / 3, speed: 0.022, size: 0.15 }
    ];
    moons.forEach((moon) => {
      moon.mesh = new THREE.Mesh(
        new THREE.SphereGeometry(moon.size, 8, 8),
        new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
      );
      men2Group.add(moon.mesh);
    });

    const moonOrbitPoints = [];
    for (let index = 0; index <= 32; index += 1) {
      const angle = (index / 32) * Math.PI * 2;
      moonOrbitPoints.push(new THREE.Vector3(Math.cos(angle) * 1.15, 0, Math.sin(angle) * 1.15));
    }
    const moonOrbit = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(moonOrbitPoints),
      new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0 })
    );
    const moonOrbitMaterial = moonOrbit.material;
    men2Group.add(moonOrbit);
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const pointLight = new THREE.PointLight(0x0ea5e9, 2, 40);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const updateTheme = () => {
      const isLight = document.documentElement.getAttribute("data-theme") !== "dark";
      const sky = isLight ? 0x0284c7 : 0x38bdf8;
      const skyDark = isLight ? 0x0284c7 : 0x0ea5e9;
      const orange = isLight ? 0xea580c : 0xf97316;
      sunMaterial.color.setHex(skyDark);
      glowMaterial.color.setHex(sky);
      pointLight.color.setHex(skyDark);
      moonOrbitMaterial.color.setHex(orange);
      orbitMaterials.forEach((material) => material.color.setHex(sky));
    };
    const themeObserver = new MutationObserver(updateTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    updateTheme();

    const sunOverlay = document.getElementById("threeSunOverlay");
    let mouseX = 0;
    let mouseY = 0;
    const onMouseMove = (event) => {
      mouseX = (event.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      mouseY = (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
    };
    window.addEventListener("mousemove", onMouseMove);

    function updateOverlayPosition(mesh, element, radius) {
      if (!element) return;
      const position = new THREE.Vector3();
      mesh.getWorldPosition(position);
      let scale = 1;
      let zIndex = 10;
      if (radius) {
        const depthFactor = (position.z + radius) / (2 * radius);
        scale = 0.7 + depthFactor * 0.45;
        zIndex = position.z > 0 ? 20 : 8;
      }
      position.project(camera);
      element.style.left = `${(position.x * 0.5 + 0.5) * width}px`;
      element.style.top = `${(position.y * -0.5 + 0.5) * height}px`;
      element.style.transform = `translate(-50%, -50%) scale(${scale})`;
      element.style.zIndex = String(zIndex);
    }

    function renderFrame(advance, timestamp) {
      planets.forEach((planet) => {
        if (advance) planet.angle += planet.speed;
        planet.mesh.position.x = Math.cos(planet.angle) * planet.radius;
        planet.mesh.position.z = Math.sin(planet.angle) * planet.radius;
        if (advance) planet.mesh.rotation.y += 0.01;
        if (planet.id === "lbl-men2parent") men2Group.position.copy(planet.mesh.position);
      });
      moons.forEach((moon) => {
        if (advance) moon.angle += moon.speed;
        moon.mesh.position.x = Math.cos(moon.angle) * moon.radius;
        moon.mesh.position.z = Math.sin(moon.angle) * moon.radius;
      });

      const time = reducedMotionQuery.matches ? 0 : timestamp;
      solarGroup.rotation.y = time * 0.0001;
      const targetX = Math.sin(time * 0.00035) * 1.8 + (reducedMotionQuery.matches ? 0 : mouseX * 2);
      const targetY = 7 + Math.cos(time * 0.0002625) * 0.5 - (reducedMotionQuery.matches ? 0 : mouseY * 1.5);
      const targetZ = 13 + Math.sin(time * 0.0001575);
      camera.position.x += (targetX - camera.position.x) * 0.08;
      camera.position.y += (targetY - camera.position.y) * 0.08;
      camera.position.z += (targetZ - camera.position.z) * 0.08;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      updateOverlayPosition(sunMesh, sunOverlay);
      planets.forEach((planet) => updateOverlayPosition(planet.mesh, document.getElementById(planet.id), planet.radius));
      moons.forEach((moon) => updateOverlayPosition(moon.mesh, document.getElementById(moon.id), 6.8));
    }

    let lastRenderTime = 0;
    function animate(timestamp) {
      titleSolarFrame = requestAnimationFrame(animate);
      if (currentSlide !== 0 || reducedMotionQuery.matches || timestamp - lastRenderTime < 1000 / 30) return;
      lastRenderTime = timestamp;
      renderFrame(true, Date.now());
    }
    renderFrame(false, 0);
    titleSolarFrame = requestAnimationFrame(animate);

    const onResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    const onReducedMotionChange = () => renderFrame(false, reducedMotionQuery.matches ? 0 : Date.now());
    reducedMotionQuery.addEventListener("change", onReducedMotionChange);

    titleSolarCleanup = () => {
      themeObserver.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      reducedMotionQuery.removeEventListener("change", onReducedMotionChange);
      if (titleSolarFrame) cancelAnimationFrame(titleSolarFrame);
      renderer.dispose();
      renderer.domElement.remove();
      titleSolarFrame = null;
      titleSolarCleanup = null;
    };
    window.addEventListener("pagehide", () => {
      if (titleSolarCleanup) titleSolarCleanup();
    }, { once: true });
  }

  const videoPlaceholder = document.getElementById("videoPlaceholder");
  configuredEmbedUrl = normalizeVideoEmbedUrl(data.videoEmbedUrl);

  if (data.videoSrc) {
    video.src = data.videoSrc;
    video.hidden = true;
    videoEmbed.hidden = true;
    videoPlaceholder.hidden = true;
    if (videoOpenLink) {
      videoOpenLink.hidden = true;
      videoOpenLink.removeAttribute("href");
    }
    if (videoStatusTitle) videoStatusTitle.textContent = "Presentation video ready";
    if (videoStatusDetail) videoStatusDetail.textContent = "Loaded from local media file.";
  } else if (configuredEmbedUrl) {
    video.hidden = true;
    videoEmbed.hidden = false;
    videoPlaceholder.hidden = true;
    if (videoOpenLink) {
      videoOpenLink.href = configuredEmbedUrl;
      videoOpenLink.hidden = false;
    }
    if (videoStatusTitle) videoStatusTitle.textContent = "Presentation video ready";
    if (videoStatusDetail) videoStatusDetail.textContent = "Use the player controls, or open the video in Google Drive if playback is blocked.";
  } else {
    video.hidden = true;
    videoEmbed.hidden = true;
    videoPlaceholder.hidden = false;
    if (videoOpenLink) {
      videoOpenLink.hidden = true;
      videoOpenLink.removeAttribute("href");
    }
  }

  const hashMatch = window.location.hash.match(/^#slide-(\d+)$/);
  showSlide(hashMatch ? Number(hashMatch[1]) - 1 : 0, false);
  window.addEventListener("hashchange", () => {
    const nextHash = window.location.hash.match(/^#slide-(\d+)$/);
    if (nextHash) showSlide(Number(nextHash[1]) - 1, false);
  });
})();
