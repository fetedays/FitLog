// 핏로그 (FitLog) PWA Service Worker
const CACHE_NAME = 'fitlog-cache-v1.0.1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg'
];

// 1. 서비스 워커 설치 시 핵심 에셋 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 2. 서비스 워커 활성화 시 이전 버전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. 네트워크 요청 가로채기 (오프라인 지원 및 캐시 우선/네트워크 폴백)
self.addEventListener('fetch', (event) => {
  // GET 요청만 캐시 처리
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 구글 앱스 스크립트 웹훅 및 구글 API는 캐시하지 않고 항상 네트워크로 직접 통신
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // 네트워크 우선 + 캐시 폴백 (항상 최신 코드 반영, 오프라인 시 캐시 사용)
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // 페이지 이동 요청 시 캐시된 index.html 반환
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
