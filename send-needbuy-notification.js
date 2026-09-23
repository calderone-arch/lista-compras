const webpush = require('web-push');

const VAPID_PUBLIC = "BAECmivetXT3UdBHGMqs0lEd8pHmiJHD5A6GFLB6QkCS7rEHiNBN7EPFAOCYUYmQVxN2RpKm534Q92wDssUwN_E";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBS_BIN_ID = "6aa8b01fffd5d1605307c372";
const ACCESS_KEY = "$2a$10$MH7BQnixsh0Pxih/NNqFle9rNQOwUKC71SJ5iS69ihH/l7LkZ2Rx.";
const SUBS_API = "https://api.jsonbin.io/v3/b/" + SUBS_BIN_ID;

webpush.setVapidDetails('mailto:lista-da-casa@example.com', VAPID_PUBLIC, VAPID_PRIVATE);

function buildBody(names){
  var quoted = names.map(function(n){ return '"' + n + '"'; });
  if(names.length <= 3){
    return "Precisa comprar " + quoted.join(", ");
  }
  return "Precisa comprar " + quoted.slice(0, 3).join(", ") + " e outros";
}

async function fetchSubsRecord(){
  const res = await fetch(SUBS_API + "/latest", { headers: { "X-Access-Key": ACCESS_KEY } });
  const raw = await res.text();
  console.log("HTTP status:", res.status, "| Content-Type:", res.headers.get("content-type"));
  if(!res.ok){
    console.log("Corpo da resposta (erro):", raw.slice(0, 800));
    throw new Error("Falha ao buscar inscrições (HTTP " + res.status + ")");
  }
  try{
    return JSON.parse(raw).record || {};
  }catch(e){
    console.log("Corpo da resposta (não era JSON):", raw.slice(0, 800));
    throw new Error("Resposta inesperada da API jsonbin (não é JSON) — veja o log acima.");
  }
}

async function main(){
  const record = await fetchSubsRecord();
  const subs = record.subs || [];
  const pendingNeedBuy = record.pendingNeedBuy || [];

  if(pendingNeedBuy.length === 0){
    console.log("Nada pra avisar.");
    return;
  }
  if(subs.length === 0){
    console.log("Tem itens pendentes mas ninguém inscrito. Limpando a fila mesmo assim.");
    await fetch(SUBS_API, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Access-Key": ACCESS_KEY, "X-Bin-Versioning": "false" },
      body: JSON.stringify({ subs: subs, pending: record.pending || [], pendingNeedBuy: [] })
    });
    return;
  }

  const payload = JSON.stringify({
    title: "Despensa Fácil <3",
    body: buildBody(pendingNeedBuy)
  });

  const stillValid = [];
  for (const sub of subs){
    try{
      await webpush.sendNotification(sub, payload);
      stillValid.push(sub);
      console.log("Enviado para", sub.endpoint.slice(0, 40) + "...");
    }catch(err){
      console.log("Falha (status " + err.statusCode + "):", sub.endpoint.slice(0, 40) + "...");
      if(err.statusCode !== 404 && err.statusCode !== 410){
        stillValid.push(sub);
      }
    }
  }

  await fetch(SUBS_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-Access-Key": ACCESS_KEY, "X-Bin-Versioning": "false" },
    body: JSON.stringify({ subs: stillValid, pending: record.pending || [], pendingNeedBuy: [] })
  });
}

main().catch(function(e){ console.error(e); process.exit(1); });
