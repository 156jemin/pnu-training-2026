/**
 * PNU 직무연수 포털 - 실시간 검색 및 다차원 복합 필터 모듈 (filter.js)
 */

// 숫자 시간 추출 헬퍼 (예: "24시간(8주)" -> 24, "1시간" -> 1)
function parseHoursNumeric(hoursStr) {
  if (!hoursStr) return 0;
  const match = hoursStr.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// 안전한 HTML 이스케이프 함수
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 검색어 텍스트 하이라이트 함수
function highlightKeyword(text, keyword) {
  if (!text) return "";
  const safeText = escapeHtml(text);
  if (!keyword || !keyword.trim()) return safeText;

  const cleanKeyword = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${cleanKeyword})`, "gi");
  return safeText.replace(regex, '<mark class="highlight">$1</mark>');
}

/**
 * 주어진 필터 조건에 따라 과정 목록을 필터링 및 정렬합니다.
 * @param {Array} courses - 전체 연수 과정 배열
 * @param {Object} state - 현재 활성화된 필터 상태
 * @returns {Array} 필터링 및 정렬된 연수 과정 배열
 */
function applyFilters(courses, state) {
  if (!Array.isArray(courses)) return [];

  const { keyword, category, target, type, method, status, sort } = state;
  const query = (keyword || "").trim().toLowerCase();

  const filtered = courses.filter((item) => {
    // 1. 검색어 매칭 (과정명, 코드, 분야, 담당부서, 한줄소개, 주요내용)
    if (query) {
      const targetText = [
        item.code,
        item.title,
        item.category,
        item.dept,
        item.summary,
        item.contents,
        item.goals
      ]
        .join(" ")
        .toLowerCase();

      if (!targetText.includes(query)) {
        return false;
      }
    }

    // 2. 분야 (Category) 탭 필터
    if (category && category !== "all" && item.category !== category) {
      return false;
    }

    // 3. 대상 (Target) 필터
    if (target && target !== "all") {
      // '전 직원'인 경우 모든 대상 필터에 부합하도록 처리하거나 정확 매칭
      if (item.target !== target && item.target !== "전 직원") {
        return false;
      }
    }

    // 4. 이수구분 (Type) 필터 (필수, 권장, 선택)
    if (type && type !== "all") {
      if (!item.type.includes(type)) {
        return false;
      }
    }

    // 5. 교육방식 (Method) 필터 (온라인, 집합, 혼합)
    if (method && method !== "all") {
      if (item.method !== method) {
        return false;
      }
    }

    // 6. 신청상태 (Status) 필터 (open, always, closed, upcoming)
    if (status && status !== "all") {
      if (item.status.key !== status) {
        return false;
      }
    }

    return true;
  });

  // 정렬 (Sort) 적용
  return filtered.sort((a, b) => {
    switch (sort) {
      case "hours-desc":
        return parseHoursNumeric(b.hours) - parseHoursNumeric(a.hours);
      case "hours-asc":
        return parseHoursNumeric(a.hours) - parseHoursNumeric(b.hours);
      case "title-asc":
        return a.title.localeCompare(b.title, "ko-KR");
      case "code-asc":
      default:
        return a.code.localeCompare(b.code, "ko-KR");
    }
  });
}

/**
 * 카테고리별 과정 개수를 계산합니다.
 * @param {Array} courses
 * @returns {Object} { "all": 32, "법정의무교육": 6, ... }
 */
function getCategoryCounts(courses) {
  const counts = { all: courses.length };
  courses.forEach((item) => {
    if (item.category) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
  });
  return counts;
}

window.PNU_FILTER = {
  applyFilters,
  highlightKeyword,
  getCategoryCounts,
  parseHoursNumeric,
  escapeHtml
};
