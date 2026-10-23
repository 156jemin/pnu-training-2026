/**
 * PNU 직무연수 포털 - 상세 페이지 컨트롤러 (detail.js)
 */

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = (urlParams.get("id") || "").trim();

  // DOM 캐싱
  const elements = {
    detailContainer: document.getElementById("detailContainer"),
    syncBadge: document.getElementById("syncBadge"),
    syncText: document.getElementById("syncText"),
    refreshBtn: document.getElementById("refreshBtn"),
    toastNotice: document.getElementById("toastNotice")
  };

  // 토스트 알림 표시 헬퍼
  function showToast(message) {
    if (!elements.toastNotice) return;
    elements.toastNotice.textContent = message;
    elements.toastNotice.classList.add("show");
    setTimeout(() => {
      elements.toastNotice.classList.remove("show");
    }, 2500);
  }

  // 앞뒤 공백이 있는 가운데 점( · ) 또는 개행으로 분리 (단어 내 붙어있는 중간점 '성희롱·성폭력'은 보존)
  function parseBulletList(str) {
    if (!str) return [];
    return str
      .split(/\s+[·•\-]\s+|\n+|\r+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  // 로딩 스켈레톤 표시
  function renderDetailSkeleton() {
    if (!elements.detailContainer) return;
    elements.detailContainer.innerHTML = `
      <div style="background:#fff; border-radius:12px; padding:32px; border:1px solid #e2e8f0; margin-bottom:24px;">
        <div class="skeleton-box" style="width:120px; height:24px; margin-bottom:16px;"></div>
        <div class="skeleton-box" style="width:70%; height:36px; margin-bottom:14px;"></div>
        <div class="skeleton-box" style="width:90%; height:20px; margin-bottom:28px;"></div>
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;">
          <div class="skeleton-box" style="height:70px;"></div>
          <div class="skeleton-box" style="height:70px;"></div>
          <div class="skeleton-box" style="height:70px;"></div>
        </div>
      </div>
    `;
  }

  // 과정 미발견 에러 렌더링
  function renderNotFound(searchedId) {
    if (!elements.detailContainer) return;
    document.title = "연수 과정을 찾을 수 없습니다 - 2026 부산대학교 직무연수 포털";
    elements.detailContainer.innerHTML = `
      <div class="empty-state" style="margin: 40px auto; max-width: 600px;">
        <div class="empty-icon">⚠️</div>
        <h2 class="empty-title">해당 연수 과정을 찾을 수 없습니다</h2>
        <p class="empty-desc">
          요청하신 과정코드(<strong>${PNU_FILTER.escapeHtml(searchedId || "알 수 없음")}</strong>)가 존재하지 않거나, 잘못된 링크로 접속하셨습니다.
        </p>
        <div style="display:flex; justify-content:center; gap:12px; margin-top:20px;">
          <a href="index.html" class="btn btn-primary">연수 목록으로 돌아가기</a>
        </div>
      </div>
    `;
  }

  // 상세 페이지 메인 렌더링
  function renderDetailPage(course, allCourses) {
    if (!elements.detailContainer) return;

    // 브라우저 탭 타이틀 변경
    document.title = `${course.title} - 2026 부산대학교 직무연수 포털`;

    // 이수구분 뱃지 스타일
    let typeBadgeClass = "badge-optional";
    if (course.type.includes("필수")) {
      typeBadgeClass = "badge-mandatory";
    } else if (course.type.includes("권장")) {
      typeBadgeClass = "badge-recommend";
    }

    // 학습목표 파싱
    const goalsList = parseBulletList(course.goals);
    // 커리큘럼/주요내용 파싱
    const contentsList = parseBulletList(course.contents);

    // 같은 분야 다른 연수 추천 (최대 3개)
    const relatedCourses = allCourses
      .filter((c) => c.category === course.category && c.code !== course.code)
      .slice(0, 3);

    // 전화번호 추출
    const phoneMatch = course.contact.match(/(\d{2,4}-\d{3,4}-\d{4})/);
    const phoneNumber = phoneMatch ? phoneMatch[1] : "";

    const html = `
      <!-- 네비게이션 & 브레드크럼 -->
      <div class="detail-nav-bar">
        <a href="index.html" class="back-link">
          <span aria-hidden="true">&larr;</span> 전체 연수 목록으로 돌아가기
        </a>
        <nav class="breadcrumb-nav" aria-label="브레드크럼">
          <a href="index.html">홈</a>
          <span class="breadcrumb-sep">/</span>
          <a href="index.html?category=${encodeURIComponent(course.category)}">${PNU_FILTER.escapeHtml(course.category)}</a>
          <span class="breadcrumb-sep">/</span>
          <span style="color:var(--text-primary); font-weight:600;">${PNU_FILTER.escapeHtml(course.code)}</span>
        </nav>
      </div>

      <!-- 메인 레이아웃 (본문 + 사이드바) -->
      <div class="detail-layout">
        <!-- 본문 칼럼 -->
        <div class="detail-content-col">
          <!-- 연수 히어로 카드 -->
          <div class="course-hero-card">
            <div class="hero-badges-row">
              <span class="course-code-badge">${PNU_FILTER.escapeHtml(course.code)}</span>
              <span class="badge badge-category">${PNU_FILTER.escapeHtml(course.category)}</span>
              <span class="badge ${typeBadgeClass}">${PNU_FILTER.escapeHtml(course.type)}</span>
              <span class="badge badge-status ${course.status.badgeClass}">${PNU_FILTER.escapeHtml(course.status.label)}</span>
            </div>

            <h1 class="detail-title">${PNU_FILTER.escapeHtml(course.title)}</h1>
            <p class="detail-summary-lead">${PNU_FILTER.escapeHtml(course.summary || "본 과정은 부산대학교 교직원의 전문성 강화를 위해 기획된 직무연수 프로그램입니다.")}</p>

            <!-- 핵심 스펙 6종 그리드 -->
            <div class="key-specs-grid">
              <div class="spec-box">
                <span class="spec-icon" aria-hidden="true">📅</span>
                <div class="spec-data">
                  <span class="spec-label">교육 진행 기간</span>
                  <span class="spec-value">${PNU_FILTER.escapeHtml(course.period || "상시 운영")}</span>
                </div>
              </div>

              <div class="spec-box">
                <span class="spec-icon" aria-hidden="true">⏱️</span>
                <div class="spec-data">
                  <span class="spec-label">인정 이수 시간</span>
                  <span class="spec-value tabular-nums">${PNU_FILTER.escapeHtml(course.hours || "-")}</span>
                </div>
              </div>

              <div class="spec-box">
                <span class="spec-icon" aria-hidden="true">👥</span>
                <div class="spec-data">
                  <span class="spec-label">수강 대상 및 정원</span>
                  <span class="spec-value">${PNU_FILTER.escapeHtml(course.target)} (${PNU_FILTER.escapeHtml(course.capacity || "무제한")})</span>
                </div>
              </div>

              <div class="spec-box">
                <span class="spec-icon" aria-hidden="true">📝</span>
                <div class="spec-data">
                  <span class="spec-label">수강 신청 기간</span>
                  <span class="spec-value">${PNU_FILTER.escapeHtml(course.applyPeriod || "상시 접수")}</span>
                </div>
              </div>

              <div class="spec-box">
                <span class="spec-icon" aria-hidden="true">🏛️</span>
                <div class="spec-data">
                  <span class="spec-label">교육 방식 / 주관</span>
                  <span class="spec-value">${PNU_FILTER.escapeHtml(course.method)} (${PNU_FILTER.escapeHtml(course.dept)})</span>
                </div>
              </div>

              <div class="spec-box">
                <span class="spec-icon" aria-hidden="true">📞</span>
                <div class="spec-data">
                  <span class="spec-label">문의처</span>
                  <span class="spec-value">${PNU_FILTER.escapeHtml(course.contact || "-")}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 섹션 1: 상세 소개 및 법적/교육 배경 -->
          <section class="content-section-card">
            <div class="section-head">
              <span class="section-icon">📖</span>
              <h2 class="section-title">연수 개요 및 상세 소개</h2>
            </div>
            <div class="detail-desc-text">
              ${PNU_FILTER.escapeHtml(course.description || "상세 소개 내용이 등록되지 않았습니다.")}
            </div>
          </section>

          <!-- 섹션 2: 학습 목표 -->
          <section class="content-section-card">
            <div class="section-head">
              <span class="section-icon">🎯</span>
              <h2 class="section-title">학습 목표</h2>
            </div>
            ${
              goalsList.length > 0
                ? `
              <ul class="goals-list">
                ${goalsList
                  .map(
                    (goal) => `
                  <li>
                    <span class="goal-check" aria-hidden="true">✓</span>
                    <span>${PNU_FILTER.escapeHtml(goal)}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            `
                : `<p class="detail-desc-text">${PNU_FILTER.escapeHtml(course.goals || "학습 목표가 등록되지 않았습니다.")}</p>`
            }
          </section>

          <!-- 섹션 3: 주요 커리큘럼 / 교육 내용 -->
          <section class="content-section-card">
            <div class="section-head">
              <span class="section-icon">📑</span>
              <h2 class="section-title">주요 교육 내용 및 커리큘럼</h2>
            </div>
            ${
              contentsList.length > 0
                ? `
              <div class="curriculum-grid">
                ${contentsList
                  .map(
                    (content, idx) => `
                  <div class="curriculum-item">
                    <span class="curriculum-num">${idx + 1}</span>
                    <span class="curriculum-text">${PNU_FILTER.escapeHtml(content)}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            `
                : `<p class="detail-desc-text">${PNU_FILTER.escapeHtml(course.contents || "주요 내용이 등록되지 않았습니다.")}</p>`
            }
          </section>
        </div>

        <!-- 우측 플로팅 액션 사이드바 -->
        <aside class="sticky-sidebar">
          <!-- 수강신청 액션 카드 -->
          <div class="apply-action-card">
            <div class="apply-status-indicator">
              <span class="sync-dot"></span>
              <span>현재 <strong>${PNU_FILTER.escapeHtml(course.status.label)}</strong> 상태입니다</span>
            </div>

            <a
              href="${PNU_FILTER.escapeHtml(course.link || "#")}"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-primary apply-cta-btn"
              id="applyCtaBtn"
            >
              연수 신청하기 <span aria-hidden="true">&nearr;</span>
            </a>

            <p class="apply-tip">
              * 교직원 포털 수강신청 시스템(HRD)으로 바로 연결되며, 신청 마감 전까지 접수 가능합니다.
            </p>

            <div class="sidebar-tools-row">
              <button type="button" class="btn btn-outline btn-sm" id="shareBtn" title="과정 안내 링크 복사">
                🔗 링크 복사
              </button>
              <button type="button" class="btn btn-outline btn-sm" id="printBtn" title="안내문 인쇄">
                🖨️ 인쇄하기
              </button>
            </div>
          </div>

          <!-- 담당 부서 문의처 카드 -->
          <div class="contact-card">
            <h4>🏛️ 운영 및 주관 부서</h4>
            <p style="font-size:0.875rem; color:var(--text-secondary); margin-bottom:12px;">
              <strong>${PNU_FILTER.escapeHtml(course.dept)}</strong>
            </p>
            ${
              phoneNumber
                ? `
              <a href="tel:${phoneNumber}" class="contact-phone-btn">
                📞 ${phoneNumber} 통화 연결
              </a>
            `
                : `
              <div style="font-size:0.85rem; color:var(--text-muted);">
                ${PNU_FILTER.escapeHtml(course.contact || "내선 번호 안내 준비 중")}
              </div>
            `
            }
          </div>

          <!-- 동일 분야 관련 연수 추천 -->
          ${
            relatedCourses.length > 0
              ? `
            <div class="related-courses-card">
              <h4>💡 같은 분야 다른 연수</h4>
              <div class="related-list">
                ${relatedCourses
                  .map(
                    (rc) => `
                  <a href="detail.html?id=${encodeURIComponent(rc.code)}" class="related-item">
                    <div class="related-title">${PNU_FILTER.escapeHtml(rc.title)}</div>
                    <div class="related-meta">${PNU_FILTER.escapeHtml(rc.hours)} · ${PNU_FILTER.escapeHtml(rc.method)} · ${PNU_FILTER.escapeHtml(rc.type)}</div>
                  </a>
                `
                  )
                  .join("")}
              </div>
            </div>
          `
              : ""
          }
        </aside>
      </div>
    `;

    elements.detailContainer.innerHTML = html;

    // 링크 복사 이벤트 바인딩
    const shareBtn = document.getElementById("shareBtn");
    if (shareBtn) {
      shareBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
          showToast("현재 연수 과정 링크가 클립보드에 복사되었습니다!");
        });
      });
    }

    // 인쇄 버튼 이벤트 바인딩
    const printBtn = document.getElementById("printBtn");
    if (printBtn) {
      printBtn.addEventListener("click", () => {
        window.print();
      });
    }
  }

  // 데이터 로드 및 초기화
  async function loadCourseDetail(forceRefresh = false) {
    if (!courseId) {
      renderNotFound("");
      return;
    }

    if (elements.syncBadge) {
      const dot = elements.syncBadge.querySelector(".sync-dot");
      if (dot) dot.className = "sync-dot loading";
      if (elements.syncText) elements.syncText.textContent = "동기화 중...";
    }

    renderDetailSkeleton();

    try {
      const result = await PNU_API.fetchCoursesData(forceRefresh);

      if (elements.syncBadge) {
        const dot = elements.syncBadge.querySelector(".sync-dot");
        if (dot) dot.className = result.isFallback ? "sync-dot error" : "sync-dot";
        if (elements.syncText) {
          elements.syncText.textContent = result.isFallback ? "오프라인 모드" : `실시간 연동됨 (${result.syncTime})`;
        }
      }

      const all = result.courses;
      const targetCourse = all.find((c) => c.code.toLowerCase() === courseId.toLowerCase());

      if (targetCourse) {
        renderDetailPage(targetCourse, all);
      } else {
        renderNotFound(courseId);
      }
    } catch (err) {
      console.error("상세 데이터 로드 실패:", err);
      renderNotFound(courseId);
    }
  }

  // 새로고침 버튼 바인딩
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener("click", () => {
      loadCourseDetail(true);
    });
  }

  loadCourseDetail();
});
