const CACHE_NAME = "yyc3-ems-v2.0.0"
const OFFLINE_URL = "/offline"

// 需要缓存的静态资源
const STATIC_CACHE_URLS = [
  "/",
  "/offline",
  "/Family-001.png",
  "/icon.svg",
  "/manifest.json",
]

// 安装 Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker 安装中...")
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("缓存静态资源...")
      return cache.addAll(STATIC_CACHE_URLS)
    }),
  )
  // 立即激活
  self.skipWaiting()
})

// 激活 Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker 激活中...")
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("yyc3-ems-") && name !== CACHE_NAME)
          .map((name) => {
            console.log("删除旧缓存:", name)
            return caches.delete(name)
          }),
      )
    }),
  )
  // 立即控制所有客户端
  self.clients.claim()
})

// 拦截网络请求
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return
  }

  // HTML 页面请求 - 网络优先策略
  if (request.destination === "document") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL)
          })
        }),
    )
    return
  }

  // API 请求 - 网络优先，缓存备用
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (request.method === "GET" && response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          if (request.method === "GET") {
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse
              }
              return new Response(
                JSON.stringify({
                  error: "网络连接失败",
                  offline: true,
                  message: "当前处于离线状态，显示的是缓存数据",
                }),
                {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                },
              )
            })
          }
        }),
    )
    return
  }

  // 静态资源 - 缓存优先策略
  if (
    request.destination === "image" ||
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
      }),
    )
    return
  }
})

// 后台同步
self.addEventListener("sync", (event) => {
  console.log("后台同步事件:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(syncData())
  }
})

// 推送通知
self.addEventListener("push", (event) => {
  console.log("收到推送消息:", event)

  const options = {
    body: event.data ? event.data.text() : "您有新的消息",
    icon: "/yyc3-icons/Web App/android-chrome-192.png",
    badge: "/yyc3-icons/Web App/android-chrome-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "查看详情",
      },
      {
        action: "close",
        title: "关闭",
      },
    ],
  }

  event.waitUntil(
    self.registration.showNotification("言语云企业管理系统", options),
  )
})

// 通知点击事件
self.addEventListener("notificationclick", (event) => {
  console.log("通知被点击:", event)

  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"))
  }
})

// 同步数据函数
async function syncData() {
  try {
    console.log("执行后台数据同步...")
    const offlineActions = await getOfflineActions()

    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        })
        await removeOfflineAction(action.id)
      } catch (error) {
        console.error("同步操作失败:", error)
      }
    }

    console.log("后台数据同步完成")
  } catch (error) {
    console.error("后台同步失败:", error)
  }
}

// 获取离线操作记录
async function getOfflineActions() {
  return []
}

// 删除离线操作记录
async function removeOfflineAction(actionId) {
  console.log("删除离线操作:", actionId)
}
