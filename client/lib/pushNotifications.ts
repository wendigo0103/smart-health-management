export async function registerHealthQueueServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/service-worker.js");
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!("Notification" in window)) return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

export async function showLocalQueueNotification(title: string, body: string): Promise<void> {
  const registration = await registerHealthQueueServiceWorker();
  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;
  if (registration?.showNotification) {
    await registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url: "/queue" },
      tag: "healthqueue-update",
    });
    return;
  }
  new Notification(title, { body });
}
