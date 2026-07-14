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
  const mobileSidebarQuery = window.matchMedia("(max-width: 820px)");
  let currentSlide = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let desktopSidebarOpen = true;

  const pad = (value) => String(value).padStart(2, "0");
  const formatNumber = (value) => new Intl.NumberFormat("en-US").format(value);

  function isInteractiveTarget(target) {
    return Boolean(target.closest("button, a, input, select, textarea, video, dialog"));
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
    if (nextIndex !== currentSlide && video && !video.paused) video.pause();
    currentSlide = nextIndex;

    slides.forEach((slide, slideNumber) => {
      const active = slideNumber === currentSlide;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });

    Array.from(slideIndex.children).forEach((item, itemIndex) => {
      const active = itemIndex === currentSlide;
      item.classList.toggle("is-active", active);
      item.querySelector("button").setAttribute("aria-current", active ? "page" : "false");
    });

    const activeSlide = slides[currentSlide];
    counter.textContent = `${pad(currentSlide + 1)} / ${pad(slides.length)}`;
    sectionLabel.textContent = activeSlide.dataset.section;
    progressBar.style.width = `${((currentSlide + 1) / slides.length) * 100}%`;
    previousButton.disabled = currentSlide === 0;
    nextButton.disabled = currentSlide === slides.length - 1;
    document.title = `${activeSlide.dataset.title} | ROOCH x O!Save`;

    if (updateHash) history.replaceState(null, "", `#slide-${currentSlide + 1}`);
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

  previousButton.addEventListener("click", () => showSlide(currentSlide - 1, true));
  nextButton.addEventListener("click", () => showSlide(currentSlide + 1, true));
  menuButton.addEventListener("click", toggleSidebar);
  document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
  mobileSidebarQuery.addEventListener("change", (event) => {
    setSidebarOpen(event.matches ? false : desktopSidebarOpen);
  });
  setSidebarOpen(!mobileSidebarQuery.matches);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileSidebarQuery.matches && sidebar.classList.contains("is-open")) {
      setSidebarOpen(false);
      return;
    }
    if (event.target.closest("input, select, textarea, video, dialog, [contenteditable='true']")) return;
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

  async function togglePresentationMode() {
    try {
      if (!document.fullscreenElement) {
        document.body.classList.add("present-mode");
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_error) {
      document.body.classList.toggle("present-mode");
    }
  }

  fullscreenButton.addEventListener("click", togglePresentationMode);
  document.addEventListener("fullscreenchange", () => {
    document.body.classList.toggle("present-mode", Boolean(document.fullscreenElement));
    fullscreenButton.textContent = document.fullscreenElement ? "Exit" : "Present";
  });

  const companyDialog = document.getElementById("companyDialog");
  document.querySelectorAll("[data-company]").forEach((button) => {
    button.addEventListener("click", () => {
      const company = data.companies[button.dataset.company];
      document.getElementById("dialogLogo").src = company.logo;
      document.getElementById("dialogLogo").alt = `${company.title} logo`;
      document.getElementById("dialogCategory").textContent = company.category;
      document.getElementById("dialogTitle").textContent = company.title;
      document.getElementById("dialogDescription").textContent = company.description;
      document.getElementById("dialogPoints").innerHTML = company.points.map((point) => `<li>${point}</li>`).join("");
      companyDialog.showModal();
    });
  });
  document.getElementById("dialogClose").addEventListener("click", () => companyDialog.close());
  companyDialog.addEventListener("click", (event) => {
    if (event.target === companyDialog) companyDialog.close();
  });

  const achievementList = document.getElementById("achievementList");
  const achievementImage = document.getElementById("achievementImage");
  function selectAchievement(index) {
    const achievement = data.achievements[index];
    achievementImage.src = achievement.image;
    achievementImage.alt = achievement.title;
    document.getElementById("achievementCategory").textContent = achievement.category;
    document.getElementById("achievementTitle").textContent = achievement.title;
    document.getElementById("achievementDescription").textContent = achievement.description;
    Array.from(achievementList.children).forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
      button.setAttribute("aria-selected", String(buttonIndex === index));
    });
  }
  data.achievements.forEach((achievement, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.innerHTML = `<span>${pad(index + 1)}</span><strong>${achievement.title}</strong><small>${achievement.category}</small>`;
    button.addEventListener("click", () => selectAchievement(index));
    achievementList.appendChild(button);
  });
  selectAchievement(0);

  const maxOilDemand = Math.max(...data.oilDemand.map((item) => item[1]));
  document.getElementById("oilDemandBars").innerHTML = data.oilDemand.map(([region, cases]) => `
    <div class="region-row">
      <span>${region}</span>
      <i><b style="width:${(cases / maxOilDemand) * 100}%"></b></i>
      <strong>${formatNumber(cases)}</strong>
    </div>`).join("");

  document.getElementById("pancitWarehouses").innerHTML = data.pancitWarehouses.map(([code, name, cases]) => `
    <div class="warehouse-cell"><strong>${code}</strong><span>${name}</span><small>${formatNumber(cases)} cases</small></div>`).join("");

  const capacityFields = ["Day", "Night", "Daily", "Monthly"];
  function selectCapacity(index) {
    const capacity = data.oilCapacity[index];
    document.getElementById("capacityProductLabel").textContent = capacity.label;
    document.getElementById("capacityGrowth").textContent = capacity.growth;
    capacityFields.forEach((field, fieldIndex) => {
      document.getElementById(`current${field}`).textContent = formatNumber(capacity.current[fieldIndex]);
      document.getElementById(`expanded${field}`).textContent = formatNumber(capacity.expanded[fieldIndex]);
    });
    Array.from(document.getElementById("oilCapacityTabs").children).forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
      button.setAttribute("aria-selected", String(buttonIndex === index));
    });
  }
  data.oilCapacity.forEach((capacity, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.textContent = capacity.label;
    button.addEventListener("click", () => selectCapacity(index));
    document.getElementById("oilCapacityTabs").appendChild(button);
  });
  selectCapacity(0);

  function renderCycle(targetId, steps) {
    document.getElementById(targetId).innerHTML = steps.map(([label, duration], index) => `
      <div class="cycle-step"><i>${pad(index + 1)}</i><strong>${label}</strong><span>${duration}</span></div>`).join("");
  }
  renderCycle("oilCycleFlow", data.oilCycle);
  renderCycle("pancitCycleFlow", data.pancitCycle);

  const videoPlaceholder = document.getElementById("videoPlaceholder");
  if (data.videoSrc) {
    video.src = data.videoSrc;
    video.hidden = false;
    videoPlaceholder.hidden = true;
  } else {
    video.hidden = true;
    videoPlaceholder.hidden = false;
  }

  const hashMatch = window.location.hash.match(/^#slide-(\d+)$/);
  showSlide(hashMatch ? Number(hashMatch[1]) - 1 : 0, false);
  window.addEventListener("hashchange", () => {
    const nextHash = window.location.hash.match(/^#slide-(\d+)$/);
    if (nextHash) showSlide(Number(nextHash[1]) - 1, false);
  });
})();
