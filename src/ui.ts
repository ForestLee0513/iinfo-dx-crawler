import type { LogClass, UIHandle } from "./types";

// 공통: 격리된 호스트 + 그림자 루트 생성 (기존 패널 제거)
function createHost(): { host: HTMLElement; root: ShadowRoot } {
  const old = document.getElementById("iidx-crawler-host");
  if (old) old.remove();
  const host = document.createElement("div");
  host.id = "iidx-crawler-host";
  host.style.cssText =
    "all:initial;position:fixed;top:16px;right:16px;z-index:2147483647;";
  document.body.appendChild(host);
  return { host, root: host.attachShadow({ mode: "open" }) };
}

// 로그아웃 상태 안내 패널.
// 자동 재시작은 불가능하므로(주입 스크립트는 페이지 이동 시 사라짐),
// 로그인 페이지로 유도하고 "다시 실행"을 안내한다.
export function showLoginRequired(loginUrl: string): void {
  const { host, root } = createHost();
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .panel { width: 340px; max-width: 92vw; background: #16181d; color: #e7e9ee;
        border: 1px solid #2c2f37; border-radius: 14px; overflow: hidden;
        box-shadow: 0 12px 40px rgba(0,0,0,.45); }
      .hd { display:flex; align-items:center; gap:8px; padding:12px 14px;
        background: linear-gradient(135deg,#2a1d1d,#1a1414); }
      .dot { width:9px; height:9px; border-radius:50%; background:#ff453a; box-shadow:0 0 8px #ff453a; }
      .ttl { font-weight:700; flex:1; font-size:13px; }
      .x { cursor:pointer; opacity:.6; font-size:18px; padding:0 4px; } .x:hover{opacity:1;}
      .body { padding:14px; font-size:13px; line-height:1.6; color:#cdd2db; }
      .body b { color:#fff; }
      .hint { margin-top:8px; font-size:12px; color:#8a90a0; }
      .ft { display:flex; gap:8px; padding:12px 14px; border-top:1px solid #20242c; }
      button { flex:1; cursor:pointer; border:none; border-radius:9px; padding:10px;
        font-size:12px; font-weight:600; color:#fff; background:#2a2e38; transition:.15s; }
      button:hover{ filter:brightness(1.2); }
      button.go{ background:#0a84ff; }
      /* 모바일: 좌우 16px 여백으로 거의 전체 폭 사용 + 터치 타깃 확대 */
      @media (max-width: 480px) {
        .panel { width: calc(100vw - 32px); border-radius: 12px; }
        .body { font-size: 14px; }
        .hint { font-size: 13px; }
        .ft { gap: 10px; }
        button { padding: 13px; font-size: 13px; }
      }
    </style>
    <div class="panel">
      <div class="hd">
        <span class="dot"></span><span class="ttl">IIDX Crawler</span>
        <span class="x" id="close">×</span>
      </div>
      <div class="body">
        <b>로그인이 필요합니다.</b><br>
        e-amusement 에 로그인되어 있지 않습니다.
        <div class="hint">로그인 페이지로 이동한 뒤, 로그인이 끝나면
        <b>이 북마크를 다시 클릭</b>해 주세요. (자동 재시작은 지원되지 않습니다)</div>
      </div>
      <div class="ft">
        <button class="go" id="go">로그인 페이지로 이동</button>
        <button id="close2">닫기</button>
      </div>
    </div>`;

  const close = () => host.remove();
  (root.getElementById("close") as HTMLElement).addEventListener("click", close);
  (root.getElementById("close2") as HTMLElement).addEventListener("click", close);
  (root.getElementById("go") as HTMLElement).addEventListener("click", () => {
    location.href = loginUrl;
  });
}

// 페이지 CSS 와 격리된 진행 팝업 패널 (Shadow DOM)
// onClose: 패널을 닫을 때(×) 호출 — 네비게이션 가드 해제 등에 사용.
export function buildUI(onClose?: () => void): UIHandle {
  const { host, root } = createHost();

  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .panel { width: 380px; max-width: 92vw; background: #16181d; color: #e7e9ee;
        border: 1px solid #2c2f37; border-radius: 14px; overflow: hidden;
        box-shadow: 0 12px 40px rgba(0,0,0,.45); font-size: 13px; }
      .hd { display: flex; align-items: center; gap: 8px; padding: 12px 14px;
        background: linear-gradient(135deg,#1f2330,#171a22); cursor: move; user-select: none; }
      .dot { width: 9px; height: 9px; border-radius: 50%; background:#ff9f0a; box-shadow:0 0 8px #ff9f0a; }
      .dot.run { animation: pulse 1s infinite; }
      .dot.done { background:#32d74b; box-shadow:0 0 8px #32d74b; }
      .dot.err { background:#ff453a; box-shadow:0 0 8px #ff453a; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      .ttl { font-weight: 700; letter-spacing:.3px; flex:1; }
      .x { cursor:pointer; opacity:.6; font-size:18px; line-height:1; padding:0 4px; }
      .x:hover { opacity:1; }
      .body { padding: 12px 14px; }
      .status { font-size:12px; color:#aeb4c0; margin-bottom:8px; min-height:16px; }
      .barwrap { height:8px; background:#0e1014; border-radius:6px; overflow:hidden; }
      .bar { height:100%; width:0%; background:linear-gradient(90deg,#0a84ff,#32d74b); transition:width .25s; }
      .pct { text-align:right; font-size:11px; color:#7a818d; margin-top:4px; }
      .counts { display:flex; gap:8px; margin:10px 0; }
      .chip { flex:1; background:#0e1014; border:1px solid #2c2f37; border-radius:9px; padding:8px; text-align:center; }
      .chip b { display:block; font-size:18px; color:#fff; }
      .chip span { font-size:11px; color:#8a90a0; }
      .log { height:150px; overflow-y:auto; background:#0b0d11; border:1px solid #20242c;
        border-radius:9px; padding:8px; font-family: ui-monospace, "SF Mono", Menlo, monospace;
        font-size:11px; line-height:1.5; color:#9aa3b2; white-space:pre-wrap; }
      .log .ok { color:#32d74b; } .log .warn { color:#ff9f0a; } .log .hi { color:#0a84ff; }
      .ft { display:flex; gap:8px; padding:12px 14px; border-top:1px solid #20242c; }
      button { flex:1; cursor:pointer; border:none; border-radius:9px; padding:9px;
        font-size:12px; font-weight:600; color:#fff; background:#2a2e38; transition:.15s; }
      button:hover:not(:disabled){ filter:brightness(1.2); }
      button:disabled{ opacity:.4; cursor:not-allowed; }
      button.copy{ background:#0a84ff; } button.dl{ background:#32894b; }
      /* 모바일: 좌우 16px 여백으로 거의 전체 폭 사용 + 로그/터치 타깃 조정 */
      @media (max-width: 480px) {
        .panel { width: calc(100vw - 32px); }
        .hd { cursor: default; } /* 모바일은 드래그 비활성 → 상단 고정 */
        .status { font-size: 13px; }
        .chip b { font-size: 20px; }
        .chip span { font-size: 12px; }
        .log { height: 120px; font-size: 12px; }
        .ft { gap: 10px; }
        button { padding: 12px; font-size: 13px; }
      }
    </style>
    <div class="panel">
      <div class="hd" id="hd">
        <span class="dot run" id="dot"></span>
        <span class="ttl">IIDX Crawler</span>
        <span class="x" id="close">×</span>
      </div>
      <div class="body">
        <div class="status" id="status">준비 중…</div>
        <div class="barwrap"><div class="bar" id="bar"></div></div>
        <div class="pct" id="pct">0%</div>
        <div class="counts">
          <div class="chip"><b id="cSP">0</b><span>SP 곡</span></div>
          <div class="chip"><b id="cDP">0</b><span>DP 곡</span></div>
        </div>
        <div class="log" id="log"></div>
      </div>
      <div class="ft">
        <button class="copy" id="copy" disabled>JSON 복사</button>
        <button class="dl" id="dl" disabled>다운로드</button>
      </div>
    </div>`;

  const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    root.getElementById(id) as T;
  const logEl = $("log");

  // 드래그 이동 (Pointer Events → 마우스·터치 공통). 헤더에서 시작.
  // 모바일(좁은 화면)에서는 드래그를 막고 상단에 고정한다.
  const isMobile =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 480px)").matches;
  if (!isMobile) {
    const hd = $("hd");
    hd.style.touchAction = "none"; // 드래그 중 스크롤·제스처 방지(터치)
    let sx = 0, sy = 0, ox = 0, oy = 0, drag = false;
    hd.addEventListener("pointerdown", (e) => {
      drag = true; sx = e.clientX; sy = e.clientY;
      const rect = host.getBoundingClientRect(); ox = rect.left; oy = rect.top;
      host.style.right = "auto";
      hd.setPointerCapture?.(e.pointerId); // 헤더 밖으로 나가도 move/up 수신
    });
    hd.addEventListener("pointermove", (e) => {
      if (!drag) return;
      host.style.left = ox + e.clientX - sx + "px";
      host.style.top = oy + e.clientY - sy + "px";
    });
    const end = (e: PointerEvent) => {
      drag = false;
      hd.releasePointerCapture?.(e.pointerId);
    };
    hd.addEventListener("pointerup", end);
    hd.addEventListener("pointercancel", end);
  }

  $("close").addEventListener("click", () => {
    host.remove();
    onClose?.();
  });

  return {
    host,
    status: (t: string) => { $("status").textContent = t; },
    progress: (f: number) => {
      const p = Math.round(f * 100);
      ($("bar") as HTMLDivElement).style.width = p + "%";
      $("pct").textContent = p + "%";
    },
    counts: (sp: number, dp: number) => {
      $("cSP").textContent = String(sp);
      $("cDP").textContent = String(dp);
    },
    log: (t: string, cls?: LogClass) => {
      const line = document.createElement("div");
      if (cls) line.className = cls;
      line.textContent = t;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    },
    fail: (msg?: string) => {
      $("dot").className = "dot err";
      if (msg) $("status").textContent = msg;
    },
    done: (data: unknown) => {
      $("dot").className = "dot done";
      const copy = $<HTMLButtonElement>("copy");
      const dl = $<HTMLButtonElement>("dl");
      copy.disabled = false;
      dl.disabled = false;
      copy.addEventListener("click", () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
          copy.textContent = "복사됨!";
          setTimeout(() => { copy.textContent = "JSON 복사"; }, 1500);
        });
      });
      dl.addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "iidx_scores.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    },
  };
}
