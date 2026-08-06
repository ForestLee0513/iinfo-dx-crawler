# IIDX Difficulty Crawler

beatmania IIDX (e-amusement / eagate) 의 난이도별 성적표를 크롤링해서
`{ SP: [...], DP: [...] }` JSON 으로 뽑아주는 도구.

크롤링 대상: `https://p.eagate.573.jp/game/2dx/33/djdata/music/difficulty.html`
(style 0=SP / 1=DP, difficult 0~11 = LV1~12, offset +50, `.navi-next` 가 있으면 다음 페이지)

## 2단(2-tier) 구조

1. **로더 북마크릿** (`dist/bookmarklet.txt`) — 북마크에 등록하는 아주 짧은 스크립트.
   배포된 로직 스크립트를 `<script src>` 로 주입한다. (maimai 북마크릿과 동일한 패턴)
2. **로직 스크립트** (`dist/iidx-crawler.js`) — Vite 가 IIFE 로 minify 한 실제 코드.
   별도 URL(GitHub Pages, Cloudflare Pages, Netlify, Gist+jsDelivr 등)에 배포해서 사용.

로직을 고치면 `dist/iidx-crawler.js` 만 다시 배포하면 되고, **북마크는 그대로 두면 된다.**
(`?v=` 캐시버스터가 약 27시간마다 바뀌어 갱신을 유도한다.)

## 결과 데이터 스키마

```jsonc
{
  "SP": {
    "1":  [ /* LV1 곡들 */ ],
    "12": [
      {
        "title": "Astra Blaze",
        "difficulty": "ANOTHER",     // ANOTHER / HYPER / LEGGENDARIA ...
        "level": 12,                  // difficult + 1 (키와 동일, 편의용)
        "score": {
          "lamp": "FAILED",           // NO-PLAY | FAILED | A-CLEAR | E-CLEAR | CLEAR | H-CLEAR | EXH-CLEAR | F-COMBO
          "exScore": 2076,            // EX SCORE (정수) | null
          "grade": "B"                // F E D C B A AA AAA | null(중도 종료)
        }
      }
    ]
    // ... 1~12 레벨 키
  },
  "DP": { /* 동일 구조, 1~12 */ }
}
```

각 style 은 레벨(1~12)을 키로 갖는 객체이며, 빈 레벨도 `[]` 로 키가 존재한다.
램프 매핑: `clflg1=FAILED, 2=A-CLEAR, 3=E-CLEAR, 4=CLEAR, 5=H-CLEAR, 6=EXH-CLEAR, 7=F-COMBO`,
`clflg0=NO-PLAY`. 알파벳/EX 점수는 이미지 파일명·텍스트에서 추출.

## 디렉터리

```
src/
  constants.js   설정/상수 (LAMP, GRADES, CONFIG)
  parser.js      순수 DOM 파싱 함수 (parseRow / parseDoc) — 단위 테스트 대상
  crawler.js     fetch + 페이지네이션 루프 (fetchImpl 주입 가능 → 테스트 용이)
  ui.js          Shadow DOM 팝업 패널
  main.js        ★ 배포용 엔트리 (eagate 에서 실행)
  dev.js         로컬 개발용 엔트리 (fixture mock fetch)
test/
  parser.test.js / crawler.test.js   (vitest + jsdom)
  fixtures/sample.html               실제 저장 페이지 (테스트 고정 입력)
scripts/
  make-bookmarklet.mjs               로더 북마크릿 생성기
```

## 개발

```bash
npm install
npm run dev        # http://localhost:5173 — fixture 로 UI/로직 미리보기 (eagate 접속 불필요)
npm test           # 단위/통합 테스트
npm run test:watch
```

`npm run dev` 는 eagate 에 붙지 않고 `test/fixtures/sample.html` 을 mock fetch 로 흘려
오른쪽 위 팝업이 실제처럼 동작하는 걸 보여준다. UI/파서 수정 시 여기서 바로 확인.

## 빌드 & 배포

```bash
# 1) 로직 빌드 + 로더 북마크릿 생성 (배포 URL 지정)
npm run build -- https://your.site/iidx-crawler.js

# 결과:
#   dist/iidx-crawler.js   ← 이 파일을 배포 URL 에 올린다
#   dist/bookmarklet.txt   ← 이 한 줄을 브라우저 북마크 URL 로 등록한다
```

배포 예시 (GitHub Pages): `dist/iidx-crawler.js` 를 레포에 푸시 →
`https://<user>.github.io/<repo>/iidx-crawler.js` 가 곧 배포 URL.

> 로직 스크립트는 eagate 페이지 컨텍스트에서 실행되므로, 다른 도메인에서 호스팅해도
> `fetch(..., {credentials:'include'})` 가 eagate 세션 쿠키를 그대로 사용한다.

## 사용

1. 로그인된 `p.eagate.573.jp` 페이지를 연다.
2. 등록한 북마크를 클릭 → 오른쪽 위 팝업이 뜬다.
3. **IInfoDX 업로드 토큰을 입력한다(필수).** 토큰을 넣어야 **[데이터 갱신]** 버튼이 활성화된다.
4. **[데이터 갱신]** 클릭(또는 입력창에서 Enter) → 그때부터 크롤링이 시작되고 진행 영역이 노출된다.
5. 크롤이 끝나면 성적 CSV(SP/DP)와 프로필이 **자동으로 서버에 업로드**된다. 추출 결과는 `window.__iidxData` 로도 접근 가능.

> 토큰 입력 전에는 크롤이 시작되지 않는다(입력 게이트). 예전의 "JSON 다운로드" 버튼은
> 서버 업로드 흐름으로 대체되었다.

### 로그인 검증 / 로그아웃 처리

실행 시 헤더(`#id_nav_menu_3.ea-menu` 안의 konamiid 영역)로 로그인 여부를 확인한다.
로그아웃 상태이면 크롤을 시작하지 않고 안내 패널을 띄우며, **로그인 페이지로 이동** 버튼을 제공한다.

> ⚠️ **자동 재시작은 지원되지 않는다.** 북마크릿으로 주입된 스크립트는 로그인 페이지로
> 이동하는 순간 사라지고, 로그인 후 스스로 다시 주입될 방법이 없다. 따라서 로그인을
> 마친 뒤에는 **북마크를 다시 클릭**해야 한다. (크롤러가 모든 페이지를 직접 fetch 하므로,
> 로그인만 되어 있으면 eagate 의 어느 페이지에서 눌러도 동작한다.)
>
> 진짜 자동 재시작이 필요하면 Tampermonkey 같은 유저스크립트(@match + 영속 상태)나
> 확장 프로그램이 필요하다.

## 주의

- 과도한 요청 방지를 위해 페이지 사이 `CONFIG.delay`(기본 400ms) 간격을 둔다.
- 다른 버전(33→34 등)으로 바뀌면 `src/constants.js` 의 `CONFIG.path` 만 수정.
- 개인 성적 데이터이므로 배포 URL 에는 로직만 올리고, 추출 결과는 본인만 보관할 것.
