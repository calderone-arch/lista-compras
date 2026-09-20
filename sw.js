self.addEventListener('push', function(event){
  var data = {};
  try{ data = event.data ? event.data.json() : {}; }catch(e){ data = { title: "Dispensa Fácil <3", body: event.data ? event.data.text() : "" }; }
  var title = data.title || "Dispensa Fácil <3";
  var options = {
    body: data.body || "Dar uma olhadinha na Dispensa 🧺",
    icon: "notif-icon.png",
    badge: "notif-icon.png"
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(function(clientList){
      for (var i = 0; i < clientList.length; i++){
        if ('focus' in clientList[i]) return clientList[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('.');
    })
  );
});
