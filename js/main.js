/**
 * PNU 직무연수 포털 - 메인 페이지 컨트롤러 (main.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  let allCourses = [];
  let currentFilterState = {
    keyword: "",
    category: "all",
    target: "all",
    type: "all",
    method: "all",
    status: "all",
    sort: "code-asc"
  };

  // DOM 요소 캐싱
  const elements = {
    syncBadge: document.getElementById("syncBadge"),
    syncText: document.getElementById("syncText"),
    refreshBtn: document.getElementById("refreshBtn"),
    searchInput: document.getElementById("searchInput"),
    searchClearBtn: document.getElementById("searchClearBtn"),
    categoryTabsContainer: document.getElementById("categoryTabs"),
    targetFilter: document.getElementById("targetFilter"),
    typeFilter: document.getElementById("typeFilter"),
    methodFilter: document.getElementById("methodFilter"),
    statusFilter: document.getElementById("statusFilter"),
    sortSelect: document.getElementById("sortSelect"),
    activeChipsBar: document.getElementById("activeChipsBar"),
    resultCount: document.getElementById("resultCount"),
    coursesGrid: document.getElementById("coursesGrid"),
    // 히어로 통계
    metricTotal: document.getElementById("metricTotal"),
    metricMandatory: document.getElementById("metricMandatory"),
    metricOnline: document.getElementById("metricOnline"),
    metricInPerson: document.getElementById("metricInPerson")
  };

  // URL 쿼리 파라미터 읽기
  function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.has("search")) currentFilterState.keyword = params.get("search");
    if (params.has("category")) currentFilterState.category = params.get("category");
    if (params.has("target")) currentFilterState.target = params.get("target");
    if (params.has("type")) currentFilterState.type = params.get("type");
    if (params.has("method")) currentFilterState.method = params.get("method");
    if (params.has("status")) currentFilterState.status = params.get("status");
    if (params.has("sort")) currentFilterState.sort = params.get("sort");

    // UI 컨트롤 상태 복원
    if (elements.searchInput) elements.searchInput.value = currentFilterState.keyword;
    if (elements.searchClearBtn) elements.searchClearBtn.style.display = currentFilterState.keyword ? "inline-flex" : "none";
    if (elements.targetFilter) elements.targetFilter.value = currentFilterState.target;
    if (elements.typeFilter) elements.typeFilter.value = currentFilterState.type;
    if (elements.methodFilter) elements.methodFilter.value = currentFilterState.method;
    if (elements.statusFilter) elements.statusFilter.value = currentFilterState.status;
    if (elements.sortSelect) elements.sortSelect.value = currentFilterState.sort;
  }

  // URL 쿼리 파라미터 갱신 (새로고침 없이 주소창 동기화)
  function syncUrlParams() {
    const params = new URLSearchParams();
    if (currentFilterState.keyword) params.set("search", currentFilterState.keyword);
    if (currentFilterState.category !== "all") params.set("category", currentFilterState.category);
    if (currentFilterState.target !== "all") params.set("target", currentFilterState.target);
    if (currentFilterState.type !== "all") params.set("type", currentFilterState.type);
    if (currentFilterState.method !== "all") params.set("method", currentFilterState.method);
    if (currentFilterState.status !== "all") params.set("status", currentFilterState.status);
    if (currentFilterState.sort !== "code-asc") params.set("sort", currentFilterState.sort);

    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }

  // 스켈레톤 로더 표시
  function renderSkeletons(count = 6) {
    if (!elements.coursesGrid) return;
    elements.coursesGrid.innerHTML = Array(count)
      .fill(0)
      .map(
        () => `
      <div class="skeleton-card">
        <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
          <div class="skeleton-box" style="width:70px; height:24px;"></div>
          <div class="skeleton-box" style="width:50px; height:20px;"></div>
        </div>
        <div class="skeleton-box" style="width:80%; height:26px; margin-bottom:12px;"></div>
        <div class="skeleton-box" style="width:100%; height:18px; margin-bottom:6px;"></div>
        <div class="skeleton-box" style="width:65%; height:18px; margin-bottom:24px;"></div>
        <div class="skeleton-box" style="width:100%; height:64px; margin-bottom:20px;"></div>
        <div style="display:flex; justify-content:space-between;">
          <div class="skeleton-box" style="width:80px; height:18px;"></div>
          <div class="skeleton-box" style="width:60px; height:18px;"></div>
        </div>
      </div>
    `
      )
      .join("");
  }

  // 상단 히어로 통계 수치 업데이트
  function updateHeroMetrics(courses) {
    if (!elements.metricTotal) return;
    const total = courses.length;
    const mandatory = courses.filter((c) => c.type.includes("필수")).length;
    const online = courses.filter((c) => c.method === "온라인").length;
    const inPerson = courses.filter((c) => c.method === "집합" || c.method === "혼합").length;

    elements.metricTotal.textContent = `${total}개`;
    elements.metricMandatory.textContent = `${mandatory}개`;
    elements.metricOnline.textContent = `${online}개`;
    elements.metricInPerson.textContent = `${inPerson}개`;
  }

  // 분야별 탭 렌더링
  function renderCategoryTabs() {
    if (!elements.categoryTabsContainer) return;
    const counts = PNU_FILTER.getCategoryCounts(allCourses);

    const categories = [
      { key: "all", label: "전체 분야" },
      { key: "법정의무교육", label: "법정의무교육" },
      { key: "정보화·AI·데이터", label: "정보화·AI·데이터" },
      { key: "직무공통·문서", label: "직무공통·문서" },
      { key: "예산·회계·계약", label: "예산·회계·계약" },
      { key: "인사·노무", label: "인사·노무" },
      { key: "대학행정 특화", label: "대학행정 특화" },
      { key: "소통·CS·민원", label: "소통·CS·민원" },
      { key: "리더십·역량", label: "리더십·역량" },
      { key: "안전·보건", label: "안전·보건" },
      { key: "어학·글로벌", label: "어학·글로벌" }
    ];

    elements.categoryTabsContainer.innerHTML = categories
      .map((cat) => {
        const count = counts[cat.key] || 0;
        const isActive = currentFilterState.category === cat.key;
        return `
        <button type="button" class="tab-btn ${isActive ? "active" : ""}" data-category="${cat.key}">
          <span>${cat.label}</span>
          <span class="tab-count tabular-nums">${count}</span>
        </button>
      `;
      })
      .join("");

    // 탭 클릭 이벤트 바인딩
    elements.categoryTabsContainer.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const catKey = btn.getAttribute("data-category");
        currentFilterState.category = catKey;
        renderCategoryTabs();
        updateView();
      });
    });
  }

  // 활성 필터 칩 렌더링
  function renderActiveChips() {
    if (!elements.activeChipsBar) return;
    const chips = [];

    if (currentFilterState.keyword) {
      chips.push({ key: "keyword", label: `검색어: "${currentFilterState.keyword}"` });
    }
    if (currentFilterState.category !== "all") {
      chips.push({ key: "category", label: `분야: ${currentFilterState.category}` });
    }
    if (currentFilterState.target !== "all") {
      chips.push({ key: "target", label: `대상: ${currentFilterState.target}` });
    }
    if (currentFilterState.type !== "all") {
      chips.push({ key: "type", label: `구분: ${currentFilterState.type}` });
    }
    if (currentFilterState.method !== "all") {
      chips.push({ key: "method", label: `방식: ${currentFilterState.method}` });
    }
    if (currentFilterState.status !== "all") {
      const statusMap = { open: "접수중", always: "상시", closed: "마감", upcoming: "접수예정" };
      chips.push({ key: "status", label: `상태: ${statusMap[currentFilterState.status] || currentFilterState.status}` });
    }

    if (chips.length === 0) {
      elements.activeChipsBar.innerHTML = "";
      return;
    }

    const chipsHtml = chips
      .map(
        (chip) => `
      <span class="chip-tag">
        ${PNU_FILTER.escapeHtml(chip.label)}
        <button type="button" class="chip-remove-btn" data-key="${chip.key}" title="필터 해제">✕</button>
      </span>
    `
      )
      .join("");

    elements.activeChipsBar.innerHTML = `
      ${chipsHtml}
      <button type="button" class="chip-reset-all-btn" id="chipResetAllBtn">전체 초기화 ↺</button>
    `;

    // 칩 개별 삭제 바인딩
    elements.activeChipsBar.querySelectorAll(".chip-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-key");
        if (key === "keyword") {
          currentFilterState.keyword = "";
          elements.searchInput.value = "";
          elements.searchClearBtn.style.display = "none";
        } else {
          currentFilterState[key] = "all";
          // UI select 동기화
          if (key === "category") renderCategoryTabs();
          if (key === "target" && elements.targetFilter) elements.targetFilter.value = "all";
          if (key === "type" && elements.typeFilter) elements.typeFilter.value = "all";
          if (key === "method" && elements.methodFilter) elements.methodFilter.value = "all";
          if (key === "status" && elements.statusFilter) elements.statusFilter.value = "all";
        }
        updateView();
      });
    });

    const resetAllBtn = document.getElementById("chipResetAllBtn");
    if (resetAllBtn) {
      resetAllBtn.addEventListener("click", resetAllFilters);
    }
  }

  // 전체 필터 초기화
  function resetAllFilters() {
    currentFilterState = {
      keyword: "",
      category: "all",
      target: "all",
      type: "all",
      method: "all",
      status: "all",
      sort: elements.sortSelect ? elements.sortSelect.value : "code-asc"
    };

    if (elements.searchInput) elements.searchInput.value = "";
    if (elements.searchClearBtn) elements.searchClearBtn.style.display = "none";
    if (elements.targetFilter) elements.targetFilter.value = "all";
    if (elements.typeFilter) elements.typeFilter.value = "all";
    if (elements.methodFilter) elements.methodFilter.value = "all";
    if (elements.statusFilter) elements.statusFilter.value = "all";

    renderCategoryTabs();
    updateView();
  }

  // 연수 카드 렌더링
  function renderCourseCards(courses) {
    if (!elements.coursesGrid) return;

    if (courses.length === 0) {
      elements.coursesGrid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3 class="empty-title">조건에 맞는 연수 과정을 찾을 수 없습니다</h3>
          <p class="empty-desc">검색어 철자를 확인하시거나, 선택된 필터를 초기화해 보세요.</p>
          <button type="button" class="btn btn-primary btn-sm" id="emptyResetBtn">필터 초기화</button>
        </div>
      `;
      const emptyBtn = document.getElementById("emptyResetBtn");
      if (emptyBtn) emptyBtn.addEventListener("click", resetAllFilters);
      return;
    }

    const keyword = currentFilterState.keyword;

    elements.coursesGrid.innerHTML = courses
      .map((item) => {
        // 이수구분 뱃지
        let typeBadgeClass = "badge-optional";
        if (item.type.includes("필수")) {
          typeBadgeClass = "badge-mandatory";
        } else if (item.type.includes("권장")) {
          typeBadgeClass = "badge-recommend";
        }

        // 교육방식 아이콘
        const methodIcon = item.method === "온라인" ? "💻" : item.method === "집합" ? "🏢" : "🔄";

        const highlightedTitle = PNU_FILTER.highlightKeyword(item.title, keyword);
        const highlightedSummary = PNU_FILTER.highlightKeyword(item.summary, keyword);

        return `
        <article class="course-card" data-code="${PNU_FILTER.escapeHtml(item.code)}">
          <div>
            <div class="card-top">
              <div class="card-badges">
                <span class="badge badge-category">${PNU_FILTER.escapeHtml(item.category)}</span>
                <span class="badge ${typeBadgeClass}">${PNU_FILTER.escapeHtml(item.type)}</span>
              </div>
              <span class="card-code">${PNU_FILTER.escapeHtml(item.code)}</span>
            </div>

            <h3 class="card-title">
              <a href="detail.html?id=${encodeURIComponent(item.code)}">${highlightedTitle}</a>
            </h3>

            <p class="card-summary">${highlightedSummary || "연수 상세 정보는 상세보기를 통해 확인하실 수 있습니다."}</p>

            <div class="card-meta-list">
              <div class="card-meta-item">
                <span class="meta-icon">⏱️</span>
                <span class="meta-label">시간:</span>
                <span class="meta-value">${PNU_FILTER.escapeHtml(item.hours || "-")}</span>
              </div>
              <div class="card-meta-item">
                <span class="meta-icon">${methodIcon}</span>
                <span class="meta-label">방식:</span>
                <span class="meta-value">${PNU_FILTER.escapeHtml(item.method || "-")}</span>
              </div>
              <div class="card-meta-item">
                <span class="meta-icon">👥</span>
                <span class="meta-label">대상:</span>
                <span class="meta-value" title="${PNU_FILTER.escapeHtml(item.target)}">${PNU_FILTER.escapeHtml(item.target || "전 직원")}</span>
              </div>
              <div class="card-meta-item">
                <span class="meta-icon">📅</span>
                <span class="meta-label">신청:</span>
                <span class="meta-value">${PNU_FILTER.escapeHtml(item.applyPeriod || "상시")}</span>
              </div>
            </div>
          </div>

          <div class="card-footer">
            <span class="card-dept">🏛️ ${PNU_FILTER.escapeHtml(item.dept || "부산대학교")}</span>
            <a href="detail.html?id=${encodeURIComponent(item.code)}" class="card-action-btn">
              상세보기 <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </article>
      `;
      })
      .join("");
  }

  // 필터링 적용 및 화면 갱신 통합 함수
  function updateView() {
    const filtered = PNU_FILTER.applyFilters(allCourses, currentFilterState);
    if (elements.resultCount) {
      elements.resultCount.innerHTML = `총 <strong>${filtered.length}</strong>개의 연수 과정`;
    }
    renderActiveChips();
    renderCourseCards(filtered);
    syncUrlParams();
  }

  // 데이터 로드 및 초기화
  async function loadData(forceRefresh = false) {
    if (elements.syncBadge) {
      const dot = elements.syncBadge.querySelector(".sync-dot");
      if (dot) dot.className = "sync-dot loading";
      if (elements.syncText) elements.syncText.textContent = "동기화 중...";
    }

    renderSkeletons(6);

    try {
      const result = await PNU_API.fetchCoursesData(forceRefresh);
      allCourses = result.courses;

      // 동기화 상태 뱃지 갱신
      if (elements.syncBadge) {
        const dot = elements.syncBadge.querySelector(".sync-dot");
        if (dot) dot.className = result.isFallback ? "sync-dot error" : "sync-dot";
        if (elements.syncText) {
          elements.syncText.textContent = result.isFallback ? "오프라인 모드" : `실시간 연동됨 (${result.syncTime})`;
        }
      }

      updateHeroMetrics(allCourses);
      renderCategoryTabs();
      updateView();
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      if (elements.syncBadge) {
        const dot = elements.syncBadge.querySelector(".sync-dot");
        if (dot) dot.className = "sync-dot error";
        if (elements.syncText) elements.syncText.textContent = "연동 실패";
      }
    }
  }

  // 검색 디바운스 처리 (200ms)
  let debounceTimer = null;
  if (elements.searchInput) {
    elements.searchInput.addEventListener("input", (e) => {
      const val = e.target.value;
      if (elements.searchClearBtn) {
        elements.searchClearBtn.style.display = val ? "inline-flex" : "none";
      }
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentFilterState.keyword = val;
        updateView();
      }, 200);
    });
  }

  // 검색창 클리어 버튼
  if (elements.searchClearBtn) {
    elements.searchClearBtn.addEventListener("click", () => {
      elements.searchInput.value = "";
      elements.searchClearBtn.style.display = "none";
      currentFilterState.keyword = "";
      updateView();
      elements.searchInput.focus();
    });
  }

  // 2차 필터 셀렉트 이벤트 바인딩
  const selectFilters = [
    { el: elements.targetFilter, key: "target" },
    { el: elements.typeFilter, key: "type" },
    { el: elements.methodFilter, key: "method" },
    { el: elements.statusFilter, key: "status" },
    { el: elements.sortSelect, key: "sort" }
  ];

  selectFilters.forEach(({ el, key }) => {
    if (el) {
      el.addEventListener("change", (e) => {
        currentFilterState[key] = e.target.value;
        updateView();
      });
    }
  });

  // 데이터 새로고침 버튼 바인딩
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener("click", () => {
      loadData(true);
    });
  }

  // 초기 실행
  readUrlParams();
  loadData();
});
