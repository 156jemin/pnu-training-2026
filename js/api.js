/**
 * PNU 직무연수 포털 - 구글 스프레드시트 실시간 연동 모듈 (api.js)
 * PapaParse를 이용하여 Google Sheets gviz CSV를 실시간 파싱하고
 * 네트워크 오류 시 window.MOCK_COURSES로 자동 폴백합니다.
 */

const SHEET_CONFIG = {
  // 사용자가 복사하여 수정한 시트 ID로 전환
  sheetId: "1AnF5bq0evawE9FnfA6QiyEq50rLtkSNR0tgggCkuGBk",
  gid: "0",
  // 이전 원본 시트 ID (백업용)
  fallbackSheetId: "1sWeq6LCPTp0I6ith07XQizLm-KcDvAcbeNZBHkOBOvk"
};

// 실시간 캐시 버스팅이 포함된 gviz CSV 엔드포인트 URL 생성
function getSheetCsvUrl(useFallbackId = false) {
  const timestamp = Date.now();
  const id = useFallbackId ? SHEET_CONFIG.fallbackSheetId : SHEET_CONFIG.sheetId;
  const gidParam = useFallbackId ? "gid=1980309032" : `gid=${SHEET_CONFIG.gid}`;
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&${gidParam}&headers=1&_t=${timestamp}`;
}

// 신청기간 및 현재 날짜(2026년 기준) 기반 접수 상태 판별 함수
function determineCourseStatus(applyPeriod) {
  if (!applyPeriod) return { label: "상시", key: "always", badgeClass: "always" };
  const trimmed = applyPeriod.trim();
  if (trimmed === "상시" || trimmed.includes("상시")) {
    return { label: "상시", key: "always", badgeClass: "always" };
  }

  // 날짜 범위 포맷 (예: 2026-03-02~03-11 또는 2026-03-02 ~ 2026-03-11)
  const rangeMatch = trimmed.match(/(\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-)?(\d{2}-\d{2})/);
  if (rangeMatch) {
    const startDateStr = rangeMatch[1];
    const yearPrefix = startDateStr.slice(0, 4);
    const endDateStr = rangeMatch[2] ? rangeMatch[2] + rangeMatch[3] : `${yearPrefix}-${rangeMatch[3]}`;

    // 2026년 가상 오늘 날짜 (시스템 시간 기반 또는 2026년 시뮬레이션)
    const today = new Date();
    const simulatedDate = today.getFullYear() === 2026 ? today : new Date("2026-04-10");
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    if (simulatedDate < start) {
      return { label: "접수예정", key: "upcoming", badgeClass: "upcoming" };
    } else if (simulatedDate <= end) {
      return { label: "접수중", key: "open", badgeClass: "open" };
    } else {
      return { label: "마감", key: "closed", badgeClass: "closed" };
    }
  }

  return { label: "접수중", key: "open", badgeClass: "open" };
}

// 개별 과정 데이터 객체 정규화
function normalizeCourseItem(item) {
  const code = (item["과정코드"] || item.code || "").trim();
  const title = (item["과정명"] || item.title || "").trim();
  const category = (item["분야"] || item.category || "").trim();
  const target = (item["대상"] || item.target || "").trim();
  const type = (item["이수구분"] || item.type || "").trim();
  const method = (item["교육방식"] || item.method || "").trim();
  const hours = (item["교육시간"] || item.hours || "").trim();
  const capacity = (item["정원"] || item.capacity || "").trim();
  const period = (item["교육기간"] || item.period || "").trim();
  const applyPeriod = (item["신청기간"] || item.applyPeriod || "").trim();
  const dept = (item["담당부서"] || item.dept || "").trim();
  const summary = (item["한줄소개"] || item.summary || "").trim();
  const description = (item["상세소개"] || item.description || "").trim();
  const goals = (item["학습목표"] || item.goals || "").trim();
  const contents = (item["주요내용"] || item.contents || "").trim();
  const link = (item["신청링크"] || item.link || "").trim();
  const contact = (item["문의"] || item.contact || "").trim();

  const status = determineCourseStatus(applyPeriod);

  return {
    code,
    title,
    category,
    target,
    type,
    method,
    hours,
    capacity,
    period,
    applyPeriod,
    dept,
    summary,
    description,
    goals,
    contents,
    link,
    contact,
    status
  };
}

/**
 * 구글 시트에서 실시간으로 연수 데이터를 불러옵니다.
 * @param {boolean} forceRefresh - 캐시를 우회하고 강제 새로고침 여부
 * @returns {Promise<{courses: Array, source: string, syncTime: string}>}
 */
async function fetchCoursesData(forceRefresh = false) {
  const now = new Date();
  const syncTimeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // 1차 시도: 사용자의 새 시트
  try {
    const result = await attemptFetchSheet(getSheetCsvUrl(false), forceRefresh, syncTimeStr);
    return result;
  } catch (err1) {
    console.warn("새 구글 시트 조회 실패(권한 설정 필요), 보조 시트로 시도:", err1.message);
    try {
      const result2 = await attemptFetchSheet(getSheetCsvUrl(true), forceRefresh, syncTimeStr);
      return result2;
    } catch (err2) {
      console.warn("보조 시트 조회 실패, 로컬 백업 데이터로 전환:", err2.message);
      return loadFallbackMockData(syncTimeStr);
    }
  }
}

async function attemptFetchSheet(url, forceRefresh, syncTimeStr) {
  const response = await fetch(url, {
    method: "GET",
    cache: forceRefresh ? "no-store" : "no-cache",
    headers: {
      "Pragma": "no-cache",
      "Cache-Control": "no-cache"
    }
  });

  if (!response.ok) {
    throw new Error(`Google Sheets HTTP ${response.status}: ${response.statusText}`);
  }

  const csvText = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      complete: (results) => {
        let rows = results.data;

        if (!rows || rows.length === 0 || !rows[0]["과정코드"]) {
          const unparsed = Papa.parse(csvText, { header: false, skipEmptyLines: true }).data;
          if (unparsed.length > 1) {
            const headers = unparsed[0];
            rows = unparsed.slice(1).map(line => {
              const obj = {};
              headers.forEach((h, idx) => {
                obj[h] = line[idx] || "";
              });
              return obj;
            });
          }
        }

        const validCourses = rows
          .filter(r => r["과정코드"] && r["과정코드"].trim().startsWith("PNU-"))
          .map(normalizeCourseItem);

        if (validCourses.length > 0) {
          resolve({
            courses: validCourses,
            source: "Google Sheets (실시간)",
            syncTime: syncTimeStr,
            isFallback: false
          });
        } else {
          reject(new Error("유효한 과정 데이터가 없습니다."));
        }
      },
      error: (err) => {
        reject(err);
      }
    });
  });
}

// 오프라인/오류용 Mock Fallback 로더
function loadFallbackMockData(syncTimeStr) {
  const fallbackList = (window.MOCK_COURSES || []).map(normalizeCourseItem);
  return {
    courses: fallbackList,
    source: "로컬 백업 데이터 (오프라인 모드)",
    syncTime: syncTimeStr,
    isFallback: true
  };
}

// 전역 공개
window.PNU_API = {
  fetchCoursesData,
  determineCourseStatus
};
