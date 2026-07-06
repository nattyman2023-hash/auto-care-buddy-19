self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      if ("caches" in self) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
      }

      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      await Promise.all(
        clients.map((client) => {
          const url = new URL(client.url);
          if (url.hostname.includes("lovable.app") || url.hostname.includes("lovableproject.com")) {
            url.search = "";
            url.hash = "";
            url.searchParams.set("sw-cleanup", Date.now().toString());
            return client.navigate(url.toString());
          }
          return Promise.resolve();
        }),
      );

      await self.registration.unregister();
    })(),
  );
});