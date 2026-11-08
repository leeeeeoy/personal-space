import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const translations = JSON.parse(
  await readFile(new URL('../src/content.json', import.meta.url), 'utf8'),
)
const content = translations.ko
const appSource = await readFile(
  new URL('../src/App.tsx', import.meta.url),
  'utf8',
)
const mainSource = await readFile(
  new URL('../src/main.tsx', import.meta.url),
  'utf8',
)
const portfolioSource = await readFile(
  new URL('../src/pages/PortfolioPage.tsx', import.meta.url),
  'utf8',
)
const notesPageSource = await readFile(
  new URL('../src/pages/NotesPage.tsx', import.meta.url),
  'utf8',
)
const notesSource = await readFile(
  new URL('../src/notes.ts', import.meta.url),
  'utf8',
)
const siteChromeSource = await readFile(
  new URL('../src/components/SiteChrome.tsx', import.meta.url),
  'utf8',
)
const htmlSource = await readFile(
  new URL('../index.html', import.meta.url),
  'utf8',
)
const stylesSource = await readFile(
  new URL('../src/styles.css', import.meta.url),
  'utf8',
)
const workerConfig = JSON.parse(
  await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'),
)
const robotsSource = await readFile(
  new URL('../public/robots.txt', import.meta.url),
  'utf8',
)
const sitemapSource = await readFile(
  new URL('../public/sitemap.xml', import.meta.url),
  'utf8',
)

test('public portfolio content includes approved contact and excludes private data', () => {
  assert.equal(content.experiences.length, 3)
  assert.equal(content.projects.length, 3)
  assert.equal(content.featuredImpacts.length, 4)
  assert.ok(
    content.featuredImpacts.every(
      ({ paragraphs }) =>
        paragraphs.length >= 2 && paragraphs.every((text) => text.trim()),
    ),
  )
  assert.doesNotMatch(
    JSON.stringify(content.featuredImpacts),
    /서비스 규모|등록 사용자|다운로드/,
  )
  assert.equal(content.profile.eyebrow, 'SOFTWARE ENGINEER · SINCE 2022')
  assert.equal(content.profile.role, 'Software Engineer')
  assert.equal(content.profile.email, 'hoheho18@gmail.com')
  assert.doesNotMatch(
    JSON.stringify(content.experiences[0].metrics),
    /5K\+|7K\+|등록 사용자|회원/,
  )
  assert.ok(
    content.experiences
      .flatMap(({ metrics }) => metrics)
      .filter(({ label }) => /다운로드|회원|사용자|MAU|관리 단지/.test(label))
      .every(({ label }) => label.startsWith('서비스 규모 ·')),
  )
  assert.ok(
    content.experiences.every(({ highlights }) => highlights.length >= 3),
  )
  assert.ok(content.projects.every(({ highlights }) => highlights.length >= 3))
  assert.deepEqual(
    content.experiences.map(({ website }) => website),
    [
      'https://clify.co.kr/',
      'https://www.seoulexchange.kr/',
      'https://www.dozn.co.kr/',
    ],
  )
  assert.ok(
    content.experiences.every(({ caseStudies }) =>
      caseStudies.every(({ problem, action, result }) =>
        [problem, action, result].every(Boolean),
      ),
    ),
  )
  const pleasantProject = content.experiences.find(
    ({ company }) => company === '유쾌한프로젝트',
  )
  assert.match(JSON.stringify(pleasantProject), /LCOV.*76\.5%/)
  assert.match(JSON.stringify(pleasantProject), /Codemagic/)
  assert.deepEqual(
    pleasantProject.caseStudies
      .find(({ title }) => title === 'Android·iOS 배포 자동화')
      .flow.map(({ steps }) => steps.length),
    [3, 3],
  )
  for (const [language, { experiences, featuredImpacts }] of Object.entries(
    translations,
  )) {
    assert.match(translations[language].profile.intro, /Android.*iOS/)
    assert.match(translations[language].profile.intro, /Flutter/)
    assert.doesNotMatch(translations[language].profile.role, /full.?stack/i)
    assert.deepEqual(
      experiences[0].responsibilities.map(({ area }) => area),
      ['Mobile', 'Web', 'Backend', 'Reliability'],
    )
    assert.doesNotMatch(
      JSON.stringify(experiences[0].metrics),
      /5K\+|7K\+|registered users|등록 사용자/,
    )
    const booking = experiences[0].caseStudies.find(({ title }) =>
      /예약 연동|Cross-database/.test(title),
    )
    const connect = experiences[0].caseStudies.find(({ title }) =>
      title.includes('Clify Connect'),
    )
    const kiosk = experiences[0].caseStudies.find(({ title }) =>
      title.includes('FAV'),
    )
    const quality = experiences[0].caseStudies.find(({ title }) =>
      /자동화 테스트|automated tests/.test(title),
    )
    const cms = experiences[0].caseStudies.find(({ title }) =>
      /상담센터 운영 API|Counseling-center APIs/.test(title),
    )
    const inspection = experiences[0].caseStudies.find(({ title }) =>
      /검사 웹의 계약별|Contract-specific assessments/.test(title),
    )
    assert.match(cms.action, /초기 구축에 참여|contributed to the initial/)
    assert.match(cms.action, /로그인.*예약.*결제|login.*booking.*payment/)
    assert.match(
      cms.result,
      /기존 역할·권한 체계|existing role and authorization/,
    )
    assert.match(cms.action, /로그아웃|logout/)
    assert.match(cms.result, /근사 처리|approximation/)
    assert.match(cms.result, /개발 브랜치|development branches/)
    assert.match(inspection.action, /R&D/)
    assert.match(inspection.action, /이용권|service-pass/)
    assert.match(inspection.result, /별도로 확인|separate confirmation/)
    assert.match(booking.title, /예약|booking/i)
    assert.match(booking.action, /초기 예약 연동 API|initial integration APIs/)
    assert.match(
      booking.result,
      /카드 결제.*콜백 유실|Card payments.*lost callbacks/,
    )
    assert.doesNotMatch(
      JSON.stringify([booking, featuredImpacts[0]]),
      /월 10|3~4개월|3–4 months/,
    )
    assert.match(quality.result, /19/)
    assert.match(quality.result, /8.*17/)
    assert.match(quality.result, /초기 구축 당시 LCOV|Initial LCOV/)
    assert.match(quality.result, /실제 API 계약|real API-contract/)
    const faultResult = featuredImpacts[2].paragraphs.at(-1)
    assert.match(
      faultResult,
      /선택한 19개 오류 변형 중|19 selected fault variants/,
    )
    assert.match(faultResult, /8.*17/)
    assert.match(
      quality.result,
      /앱 전체의 결함 검출률.*아닙니다|not an app-wide defect detection rate/,
    )
    assert.doesNotMatch(
      JSON.stringify(featuredImpacts),
      /AI는 초안 작성에만|AI only for drafts/,
    )
    assert.ok(
      experiences.every(({ responsibilities }) =>
        responsibilities.every(({ area, description }) => area && description),
      ),
    )
    assert.match(connect.title, /Clify Connect/)
    assert.match(connect.action, /React 19.*TypeScript.*Spring/)
    assert.match(connect.action, /Connect 모듈|Connect module/)
    assert.match(connect.result, /AWS Amplify/)
    assert.match(kiosk.title, /FAV/)
    assert.match(kiosk.action, /React/)
    assert.match(
      experiences[0].summary,
      /모바일.*웹|mobile apps and web services/,
    )
    assert.match(
      experiences[0].responsibilities.find(({ area }) => area === 'Web')
        .description,
      /Clify Connect.*FAV/,
    )
    assert.doesNotMatch(experiences[0].highlights.join(' '), /Clify Connect/)
    const analytics = experiences[0].highlights.find((text) =>
      text.includes('BigQuery'),
    )
    assert.match(analytics, /아직 검증하지 않았습니다|remain unverified/)
    assert.match(featuredImpacts[3].paragraphs.at(-1), /Android OOM/)
    const cmsSummary = featuredImpacts[1].paragraphs.join(' ')
    assert.match(cmsSummary, /CMS 초기|initial CMS/)
    assert.match(cmsSummary, /참여|contributed/)
    assert.match(cmsSummary, /Spring Boot/)
    assert.match(cmsSummary, /React/)
    assert.match(cmsSummary, /AWS Amplify/)
    assert.match(
      connect.result,
      /외부 고객.*별도 검증|external-customer.*separate verification/,
    )
    assert.match(
      translations[language].skillGroups[0].description,
      /주력|Primary focus/,
    )
    assert.match(experiences[1].metrics[3].label, /미출시|unreleased/)
    assert.match(
      translations[language].projects[2].highlights.join(' '),
      /8명.*5명|eight-person.*five people/,
    )
    assert.doesNotMatch(
      JSON.stringify(translations[language]),
      /\/Users\/|\/home\/|https:\/\/github\.com\/simpaticohq\/|cms_reservation_id/,
    )
  }
  const seoulExchange = content.experiences.find(
    ({ company }) => company === '서울거래',
  )
  assert.equal(
    seoulExchange.caseStudies[0].title,
    '운영과 함께 진행한 Flutter 앱 재개발',
  )
  assert.match(seoulExchange.caseStudies[0].result, /출시 직전 검증 단계/)
  assert.match(
    seoulExchange.caseStudies[0].result,
    /운영 출시는 진행하지 못했지만/,
  )
  assert.match(
    JSON.stringify(seoulExchange.highlights),
    /WebSocket 연결이 끊기면 다시 연결/,
  )
  const dozn = content.experiences.find(({ company }) => company === '더즌')
  assert.match(dozn.summary, /기존 React Native 앱을 대체하는 Flutter 앱/)
  assert.match(dozn.caseStudies[0].result, /2022년 9월 Flutter 앱을 출시/)
  assert.match(
    JSON.stringify(dozn.highlights),
    /앱을 설치하지 않은 사용자도 전자투표에 참여/,
  )
  assert.doesNotMatch(dozn.summary, /모바일·웹 전반.*주도/)
  assert.match(portfolioSource, /className="company-link"/)
  assert.match(portfolioSource, /content\.featuredImpacts\.map/)
  assert.match(portfolioSource, /caseStudy\.flow\.map/)
  assert.match(siteChromeSource, /<dialog/)
  assert.match(siteChromeSource, /Built with/)
  assert.match(siteChromeSource, /built-with-cloudflare\.svg/)
  assert.match(stylesSource, /github-invertocat-white\.svg/)
  assert.match(content.ui.architectureLegacy, /방문 합계.*API/)
  assert.deepEqual(
    content.profile.links.map(({ label }) => label),
    ['GitHub', 'Blog', 'LinkedIn'],
  )
  assert.match(portfolioSource, /<LinkIcon label="Email"/)

  const serialized = JSON.stringify(content)
  assert.doesNotMatch(serialized, /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/)
  assert.deepEqual(serialized.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi), [
    'hoheho18@gmail.com',
  ])
  assert.doesNotMatch(serialized, /서울특별시\s+\S+구|상세\s?주소/)

  for (const project of content.projects) {
    assert.match(project.image.src, /^https:\/\/assets\.leeeeeoy\.xyz\//)
    assert.ok(project.image.width > 0 && project.image.height > 0)
  }
})

test('Clarity loads only after consent and only on production', async () => {
  const analyticsSource = await readFile(
    new URL('../src/analytics.ts', import.meta.url),
    'utf8',
  )
  assert.match(analyticsSource, /xti7rw64s1/)
  assert.match(analyticsSource, /leeeeeoy\.xyz/)
  assert.match(analyticsSource, /analytics_Storage: 'granted'/)
  assert.match(analyticsSource, /analytics_Storage: 'denied'/)
  assert.match(appSource, /if \(consent === 'granted'\) loadClarity\(\)/)
  assert.match(analyticsSource, /localStorage\.setItem\(CLARITY_CONSENT_KEY/)
})

test('theme follows the system preference and remembers an explicit choice', async () => {
  assert.match(htmlSource, /<script src="\/theme\.js"><\/script>/)
  const source = await readFile(
    new URL('../public/theme.js', import.meta.url),
    'utf8',
  )
  for (const [saved, systemDark, blocked, expected] of [
    ['dark', false, false, 'dark'],
    ['light', true, false, 'light'],
    ['invalid', true, false, 'dark'],
    ['dark', false, true, 'light'],
  ]) {
    const documentElement = { dataset: {}, style: {} }
    let themeColor
    vm.runInNewContext(source, {
      matchMedia: () => ({ matches: systemDark }),
      localStorage: {
        getItem() {
          if (blocked) throw new Error('blocked')
          return saved
        },
      },
      document: {
        documentElement,
        querySelector: () => ({
          setAttribute: (_, value) => {
            themeColor = value
          },
        }),
      },
    })
    assert.equal(documentElement.dataset.theme, expected)
    assert.equal(documentElement.style.colorScheme, expected)
    assert.equal(themeColor, expected === 'dark' ? '#000000' : '#ffffff')
  }
  assert.match(appSource, /localStorage\.setItem\(THEME_KEY, nextTheme\)/)
  assert.match(stylesSource, /:root\[data-theme=['"]dark['"]\]/)
})

test('motion is progressive and respects reduced-motion preferences', () => {
  assert.match(appSource, /new IntersectionObserver/)
  assert.match(appSource, /observer\.unobserve\(entry\.target\)/)
  assert.match(portfolioSource + notesPageSource, /data-reveal/)
  assert.match(stylesSource, /@keyframes hero-enter/)
  assert.match(stylesSource, /@keyframes disclosure-enter/)
  assert.match(
    stylesSource,
    /@media \(hover: hover\) and \(pointer: fine\) and \(prefers-reduced-motion: no-preference\)/,
  )
  assert.match(stylesSource, /@media \(prefers-reduced-motion: reduce\)/)
})

test('engineering notes have list and detail routes without a router dependency', () => {
  assert.match(appSource, /window\.location\.pathname\.split\('\/'\)/)
  assert.match(appSource, /<NotesPage slug=\{noteSlug\}/)
  assert.match(notesPageSource, /localizedHref\(['"]\/notes\/['"]\)/)
  assert.match(notesPageSource, /ui\.notesCompatibility/)
  assert.match(notesPageSource, /localizedHref\(['"]\/lab\/['"]\)/)
  assert.match(notesPageSource, /notes\.find/)
  assert.match(
    notesPageSource,
    /localizedHref\(`\/notes\/\$\{item\.slug\}\/`\)/,
  )
  assert.match(notesSource, /id: 'Engineering'/)
  assert.match(notesSource, /id: 'Decision'/)
  assert.match(notesSource, /notes: Note\[\] = \[\]/)
  assert.match(notesPageSource, /noteCategories\.map/)
  assert.match(notesPageSource, /notes\.filter/)
  assert.equal(
    workerConfig.assets.not_found_handling,
    'single-page-application',
  )
  assert.equal(
    workerConfig.env.preview.assets.not_found_handling,
    'single-page-application',
  )
})

test('section navigation keeps the URL free of hash fragments', () => {
  assert.doesNotMatch(appSource + siteChromeSource, /href=["'][^"']*#/)
  assert.match(siteChromeSource, /sessionStorage\.setItem\(SCROLL_TARGET_KEY/)
  assert.match(appSource, /sessionStorage\.removeItem\(SCROLL_TARGET_KEY\)/)
  assert.match(appSource, /document\.getElementById\('content'\)\?\.focus\(\)/)
  assert.match(mainSource, /window\.addEventListener\('hashchange'/)
  assert.match(mainSource, /legacyPortfolioHref\(pathname, search, hash\)/)
})

test('social previews use the optimized R2 image', () => {
  assert.match(
    htmlSource,
    /https:\/\/assets\.leeeeeoy\.xyz\/portfolio-v2\/og\.jpg/,
  )
  assert.match(htmlSource, /property="og:image:width" content="1200"/)
  assert.match(htmlSource, /property="og:image:height" content="630"/)
  assert.match(htmlSource, /name="twitter:card" content="summary_large_image"/)
})

test('search metadata describes the portfolio and keeps it crawlable', () => {
  assert.match(htmlSource, /name="robots" content="max-image-preview:large"/)
  assert.match(htmlSource, /property="og:site_name" content="Yoel Jang"/)
  assert.match(htmlSource, /name="twitter:title"/)
  assert.match(htmlSource, /name="twitter:description"/)

  const structuredData = JSON.parse(
    htmlSource.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )[1],
  )
  assert.deepEqual(
    structuredData['@graph'].map(({ '@type': type }) => type),
    ['WebSite', 'ProfilePage', 'Person'],
  )
  assert.equal(
    structuredData['@graph'][1].mainEntity['@id'],
    structuredData['@graph'][2]['@id'],
  )
  assert.match(robotsSource, /Sitemap: https:\/\/leeeeeoy\.xyz\/sitemap\.xml/)
  assert.match(sitemapSource, /<loc>https:\/\/leeeeeoy\.xyz\/<\/loc>/)
  for (const path of ['portfolio', 'lab', 'writing']) {
    assert.ok(
      sitemapSource.includes(`<loc>https://leeeeeoy.xyz/${path}/</loc>`),
    )
  }
  assert.equal(
    structuredData['@graph'][1].url,
    'https://leeeeeoy.xyz/portfolio/',
  )
})

test('legacy Flutter service worker retires without intercepting new app requests', async () => {
  const source = await readFile(
    new URL('../public/flutter_service_worker.js', import.meta.url),
    'utf8',
  )
  const handlers = new Map()
  let skipped = false
  let unregistered = false
  let navigated
  vm.runInNewContext(source, {
    console,
    self: {
      addEventListener: (name, handler) => handlers.set(name, handler),
      skipWaiting: () => {
        skipped = true
      },
      registration: {
        unregister: async () => {
          unregistered = true
        },
      },
      clients: {
        matchAll: async () => [
          {
            url: 'https://leeeeeoy.xyz/notes/?lang=en',
            navigate: (url) => {
              navigated = url
            },
          },
        ],
      },
    },
  })
  handlers.get('install')()
  let activation
  handlers.get('activate')({
    waitUntil: (work) => {
      activation = work
    },
  })
  await activation
  assert.equal(skipped, true)
  assert.equal(unregistered, true)
  assert.equal(navigated, 'https://leeeeeoy.xyz/notes/?lang=en')
  assert.equal(handlers.has('fetch'), false)
})
