import type { DonePayload, LogClass, UIHandle } from "./types";

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
        <span class="dot"></span><span class="ttl">IInfoDX Crawler</span>
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

// 페이지 CSS와 격리된 진행 팝업 패널 (Shadow DOM)
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
        background: linear-gradient(135deg,#1f2330,#171a22); user-select: none; }
      .dot { width: 9px; height: 9px; border-radius: 50%; background:#ff9f0a; box-shadow:0 0 8px #ff9f0a; }
      .dot.run { animation: pulse 1s infinite; }
      .dot.done { background:#32d74b; box-shadow:0 0 8px #32d74b; }
      .dot.err { background:#ff453a; box-shadow:0 0 8px #ff453a; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      .ttl { font-weight: 700; letter-spacing:.3px; flex:1; }
      .x { cursor:pointer; opacity:.6; font-size:18px; line-height:1; padding:0 4px; }
      .x:hover { opacity:1; }
      .body { padding: 12px 14px; }
      /* 토큰 입력 */
      .token-wrap { margin-bottom: 10px; }
      .token-lbl { font-size: 11px; color: #8a90a0; margin-bottom: 4px; display: block; }
      .token-input { width: 100%; background: #0e1014; border: 1px solid #2c2f37;
        border-radius: 9px; padding: 8px 10px; color: #e7e9ee; font-size: 12px;
        outline: none; transition: border-color .15s; }
      .token-input:focus { border-color: #0a84ff; }
      .token-input::placeholder { color: #4a505c; }
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
      button.dl{ background:#32894b; }
      @media (max-width: 480px) {
        .panel { width: calc(100vw - 32px); }
        .status { font-size: 13px; }
        .chip b { font-size: 20px; }
        .chip span { font-size: 12px; }
        .log { height: 120px; font-size: 12px; }
        .ft { gap: 10px; }
        button { padding: 12px; font-size: 13px; }
        .token-input { font-size: 13px; }
      }
    </style>
    <div class="panel">
      <div class="hd" id="hd">
        <span class="dot run" id="dot"></span>
        <span class="ttl">IInfoDX Crawler</span>
        <span class="x" id="close">×</span>
      </div>
      <div class="body">
        <div class="token-wrap">
          <label class="token-lbl" for="token-input">IInfoDX 업로드 토큰 (선택)</label>
          <input id="token-input" class="token-input" type="text"
            placeholder="토큰을 붙여넣으면 크롤 완료 후 자동으로 서버에 업로드됩니다" />
        </div>
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
        <button class="dl" id="dl" disabled>JSON 다운로드</button>
      </div>
    </div>`;

  const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
    root.getElementById(id) as T;
  const logEl = $("log");

  $("close").addEventListener("click", () => {
    host.remove();
    onClose?.();
  });

  return {
    host,
    status: (t: string) => {
      $("status").textContent = t;
    },
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
    getToken: () => {
      return ($<HTMLInputElement>("token-input")).value.trim();
    },
    done: (data: DonePayload) => {
      $("dot").className = "dot done";
      const dl = $<HTMLButtonElement>("dl");
      dl.disabled = false;
      const jsonText = JSON.stringify(data.json, null, 2);
      dl.addEventListener("click", () => {
        const blob = new Blob([jsonText], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "iidx_scores.json";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    },
  };
}
