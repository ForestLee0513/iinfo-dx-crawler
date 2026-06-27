// 배포 URL 을 가리키는 "로더 북마크릿" 을 생성한다.
// 사용: DEPLOY_URL=https://your.site/iidx-crawler.js node scripts/make-bookmarklet.mjs
// 또는 인자로: node scripts/make-bookmarklet.mjs https://your.site/iidx-crawler.js
import { writeFileSync, mkdirSync } from "node:fs";

const url =
  process.argv[2] ||
  process.env.DEPLOY_URL ||
  "https://YOUR_DEPLOY_URL/iidx-crawler.js";

// maimai 예시와 동일한 패턴: <script src> 주입 + ?v= 캐시버스터(약 27시간 단위)
const loader =
  `javascript:(function(d){var s=d.createElement("script");` +
  `s.src="${url}?v="+Math.floor(Date.now()/1e5);` +
  `d.body.append(s)})(document);`;

mkdirSync("dist", { recursive: true });
writeFileSync("dist/bookmarklet.txt", loader);

console.log("\n[loader bookmarklet] (북마크 URL 칸에 붙여넣기)\n");
console.log(loader + "\n");
console.log("→ dist/bookmarklet.txt 에 저장됨");
if (url.includes("YOUR_DEPLOY_URL")) {
  console.log(
    "\n⚠️  배포 URL 미지정. 실제 URL 로 다시 실행:\n" +
      "   npm run build -- https://your.site/iidx-crawler.js\n" +
      "   (또는) node scripts/make-bookmarklet.mjs https://your.site/iidx-crawler.js",
  );
}
