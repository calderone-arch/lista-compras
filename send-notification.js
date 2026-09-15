const webpush = require('web-push');

const VAPID_PUBLIC = "BAECmivetXT3UdBHGMqs0lEd8pHmiJHD5A6GFLB6QkCS7rEHiNBN7EPFAOCYUYmQVxN2RpKm534Q92wDssUwN_E";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBS_BIN_ID = "6aa8b01fffd5d1605307c372";
const ACCESS_KEY = "$2a$10$MH7BQnixsh0Pxih/NNqFle9rNQOwUKC71SJ5iS69ihH/l7LkZ2Rx.";
const SUBS_API = "https://api.jsonbin.io/v3/b/" + SUBS_BIN_ID;

webpush.setVapidDetails('mailto:lista-da-casa@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

async function main(){
  const res = await fetch(SUBS_API + "/latest", { headers: { "X-Access-Key": ACCESS_KEY } });
  const json = await res.json();
  const subs = (json.record && json.record.subs) || [];

  if(subs.length === 0){
    console.log("Nenhuma inscrição encontrada ainda.");
    return;
  }

  const payload = JSON.stringify({
    title: "Lista da Casa",
    body: "Dar uma olhadinha na Dispensa 🧺"
  });

  const stillValid = [];
  for (const sub of subs){
    try{
      await webpush.sendNotification(sub, payload);
      stillValid.push(sub);
      console.log("Enviado com sucesso para", sub.endpoint.slice(0, 40) + "...");
    }catch(err){
      console.log("Falha ao enviar (status " + err.statusCode + "):", sub.endpoint.slice(0, 40) + "...");
      if(err.statusCode !== 404 && err.statusCode !== 410){
        stillValid.push(sub);
      }
    }
  }

  await fetch(SUBS_API, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Access-Key": ACCESS_KEY,
      "X-Bin-Versioning": "false"
    },
    body: JSON.stringify({ subs: stillValid })
  });
}

main().catch(function(e){ console.error(e); process.exit(1); });
