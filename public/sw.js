self.addEventListener('push', function(event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/pwa-icon.png',
            badge: data.badge || '/pwa-icon.png',
            vibrate: data.vibrate || [200, 100, 200],
            data: {
                url: data.data?.url || '/'
            },
            actions: data.actions || [],
            tag: data.tag || 'notification',
            renotify: data.renotify || true,
            requireInteraction: true
        };

        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const targetUrl = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Se já houver uma aba aberta, foca nela e navega
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus().then(c => c.navigate(targetUrl));
                }
            }
            // Se não houver, abre uma nova
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
