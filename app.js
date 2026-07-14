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
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

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

  const maxOilDemand = Math.max(...data.oilDemand.map((item) => item[1]));
  document.getElementById("oilDemandBars").innerHTML = data.oilDemand.map(([region, cases]) => `
    <div class="region-row" role="img" aria-label="${region}: ${formatNumber(cases)} cases per month">
      <span>${region}</span>
      <i class="bar-track"><b class="bar-fill" style="width:${(cases / maxOilDemand) * 100}%"></b></i>
      <strong>${formatNumber(cases)}</strong>
    </div>`).join("");

  document.getElementById("pancitWarehouses").innerHTML = data.pancitWarehouses.map(([code, name, cases]) => `
    <div class="warehouse-cell" role="img" aria-label="${name}: ${formatNumber(cases)} cases per month"><strong>${code}</strong><span>${name}</span><small>${formatNumber(cases)} cases / month</small></div>`).join("");

  const capacityFields = ["Day", "Night", "Daily", "Monthly"];
  const capacityTabs = [];
  function selectCapacity(index) {
    const capacity = data.oilCapacity[index];
    document.getElementById("capacityProductLabel").textContent = capacity.label;
    document.getElementById("capacityGrowth").textContent = capacity.growth;
    capacityFields.forEach((field, fieldIndex) => {
      document.getElementById(`current${field}`).textContent = formatNumber(capacity.current[fieldIndex]);
      document.getElementById(`expanded${field}`).textContent = formatNumber(capacity.expanded[fieldIndex]);
    });
    capacityTabs.forEach((button, buttonIndex) => {
      button.classList.toggle("is-active", buttonIndex === index);
      button.setAttribute("aria-selected", String(buttonIndex === index));
      button.setAttribute("tabindex", buttonIndex === index ? "0" : "-1");
    });
  }
  data.oilCapacity.forEach((capacity, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "tab";
    button.setAttribute("aria-controls", "oilCapacityContent");
    button.textContent = capacity.label;
    button.addEventListener("click", () => selectCapacity(index));
    button.addEventListener("keydown", (event) => moveTab(event, capacityTabs, index, selectCapacity));
    document.getElementById("oilCapacityTabs").appendChild(button);
    capacityTabs.push(button);
  });
  selectCapacity(0);

  function renderCycle(targetId, steps) {
    const radius = 33;
    const stepMarkup = steps.map(([label, duration], index) => {
      const angle = -90 + (index * 360) / steps.length;
      const radians = angle * Math.PI / 180;
      const x = 50 + radius * Math.cos(radians);
      const y = 50 + radius * Math.sin(radians);
      const readableDuration = formatDuration(duration);
      return `<div class="cycle-step" role="listitem" aria-label="${label}, ${readableDuration}" style="--step-x:${x.toFixed(3)}%;--step-y:${y.toFixed(3)}%"><i>${pad(index + 1)}</i><strong>${label}</strong><span>${readableDuration}</span></div>`;
    }).join("");
    document.getElementById(targetId).innerHTML = `<div class="cycle-track" aria-hidden="true"></div>${stepMarkup}`;
  }
  renderCycle("oilCycleFlow", data.oilCycle);
  renderCycle("pancitCycleFlow", data.pancitCycle);

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
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true, transparent: true, opacity: 0.18 });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    solarGroup.add(sunMesh);

    const glowGeometry = new THREE.RingGeometry(1.2, 1.25, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
    const glowRing = new THREE.Mesh(glowGeometry, glowMaterial);
    glowRing.rotation.x = Math.PI / 2;
    solarGroup.add(glowRing);

    function createOrbit(radius) {
      const points = [];
      for (let index = 0; index <= 64; index += 1) {
        const angle = (index / 64) * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.12 });
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
      new THREE.LineBasicMaterial({ color: 0xea580c, transparent: true, opacity: 0.12 })
    );
    men2Group.add(moonOrbit);
    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const pointLight = new THREE.PointLight(0x0284c7, 2, 40);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const sunOverlay = document.getElementById("threeSunOverlay");
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
        if (planet.id === "lbl-men2parent") men2Group.position.copy(planet.mesh.position);
      });
      moons.forEach((moon) => {
        if (advance) moon.angle += moon.speed;
        moon.mesh.position.x = Math.cos(moon.angle) * moon.radius;
        moon.mesh.position.z = Math.sin(moon.angle) * moon.radius;
      });

      const time = reducedMotionQuery.matches ? 0 : timestamp;
      solarGroup.rotation.y = time * 0.0001;
      camera.position.x = Math.sin(time * 0.00035) * 1.8;
      camera.position.y = 7 + Math.cos(time * 0.0002625) * 0.5;
      camera.position.z = 13 + Math.sin(time * 0.0001575);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      updateOverlayPosition(sunMesh, sunOverlay);
      planets.forEach((planet) => updateOverlayPosition(planet.mesh, document.getElementById(planet.id), planet.radius));
      moons.forEach((moon) => updateOverlayPosition(moon.mesh, document.getElementById(moon.id), 6.8));
    }

    let lastRenderTime = 0;
    function animate(timestamp) {
      requestAnimationFrame(animate);
      if (currentSlide !== 0 || reducedMotionQuery.matches || timestamp - lastRenderTime < 1000 / 30) return;
      lastRenderTime = timestamp;
      renderFrame(true, Date.now());
    }
    renderFrame(false, 0);
    requestAnimationFrame(animate);

    window.addEventListener("resize", () => {
      width = container.clientWidth;
      height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderFrame(false, reducedMotionQuery.matches ? 0 : Date.now());
    });
    reducedMotionQuery.addEventListener("change", () => renderFrame(false, reducedMotionQuery.matches ? 0 : Date.now()));
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
    videoEmbed.hidden = true;
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
