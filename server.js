/**
 * ton-deposit-app — Cloudflare Worker
 * ------------------------------------------------
 * 3 endpoints:
 *  GET  /tonconnect-manifest.json   -> بيانات التطبيق لـ TonConnect
 *  POST /api/deposit                -> تسجيل إيداع "معلّق" بعد ما المستخدم يبعت المعاملة
 *  GET  /api/verify-deposit?id=...  -> تتأكد من البلوكتشين فعليًا وتضيف الرصيد
 *  POST /api/withdraw                -> سحب رصيد المستخدم لمحفظته
 *
 * التخزين: Cloudflare KV (APP_DATA) بدل قاعدة بيانات كاملة.
 * المفاتيح المستخدمة في KV:
 *   user:<userId>            -> { balance: number }
 *   deposit:<depositId>      -> { userId, amount, txHash, status }
 */

const RECEIVER_WALLET_ADDRESS = "UQAACNWWtTtN7ILkhRERwYUTzo06Bd1Tv_8Yk5gPioIMFoUD";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/tonconnect-manifest.json") {
      return json({
        url: "https://ahmedrabieharoun-eng.github.io/affa",
        name: "My TON App",
        iconUrl: "https://res.cloudinary.com/q1tmmkbe/image/upload/v1787498355/ChatGPT_Image_Aug_23_2026_06_20_10_PM.png",
      });
    }

    if (url.pathname === "/api/deposit" && request.method === "POST") {
      return handleCreateDeposit(request, env);
    }

    if (url.pathname === "/api/verify-deposit" && request.method === "GET") {
      return handleVerifyDeposit(request, env);
    }

    if (url.pathname === "/api/withdraw" && request.method === "POST") {
      return handleWithdraw(request, env);
    }

    return new Response("Not found", { status: 404 });
  },
};

/* ───────── Helpers ───────── */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getUser(env, userId) {
  const raw = await env.APP_DATA.get(`user:${userId}`);
  return raw ? JSON.parse(raw) : { balance: 0 };
}
async function setUser(env, userId, data) {
  await env.APP_DATA.put(`user:${userId}`, JSON.stringify(data));
}

/* ───────── 1) تسجيل إيداع معلّق ───────── */
async function handleCreateDeposit(request, env) {
  const { userId, amount, txHash } = await request.json();
  if (!userId || !amount || !txHash) {
    return json({ error: "بيانات ناقصة" }, 400);
  }

  const depositId = crypto.randomUUID();
  await env.APP_DATA.put(
    `deposit:${depositId}`,
    JSON.stringify({ userId, amount, txHash, status: "pending" })
  );

  return json({ depositId });
}

/* ───────── 2) التحقق الفعلي من البلوكتشين ───────── */
async function handleVerifyDeposit(request, env) {
  const url = new URL(request.url);
  const depositId = url.searchParams.get("id");
  const raw = await env.APP_DATA.get(`deposit:${depositId}`);
  if (!raw) return json({ error: "غير موجود" }, 404);

  const deposit = JSON.parse(raw);
  if (deposit.status === "completed") {
    return json({ status: "completed", amount: deposit.amount });
  }

  // نسأل toncenter عن آخر المعاملات الواردة على محفظتنا
  // (لازم تحصل على مفتاح API مجاني من https://toncenter.com/)
  const res = await fetch(
    `https://toncenter.com/api/v2/getTransactions?address=${RECEIVER_WALLET_ADDRESS}&limit=20`,
    { headers: { "X-API-Key": env.TONCENTER_API_KEY } }
  );
  const data = await res.json();

  const found = (data.result || []).some((tx) => {
    const inMsg = tx.in_msg;
    if (!inMsg) return false;
    const valueTon = Number(inMsg.value) / 1e9;
    // بنتأكد من: القيمة مطابقة، والمرسل مطابق للهاش اللي المستخدم بعتهولنا
    return (
      Math.abs(valueTon - deposit.amount) < 0.001 &&
      tx.transaction_id?.hash === deposit.txHash
    );
  });

  if (!found) {
    return json({ status: "pending" });
  }

  // تأكدنا فعليًا من البلوكتشين -> نضيف الرصيد
  const user = await getUser(env, deposit.userId);
  user.balance += deposit.amount;
  await setUser(env, deposit.userId, user);

  deposit.status = "completed";
  await env.APP_DATA.put(`deposit:${depositId}`, JSON.stringify(deposit));

  return json({ status: "completed", amount: deposit.amount });
}

/* ───────── 3) السحب ───────── */
async function handleWithdraw(request, env) {
  const { userId, amount, toAddress } = await request.json();
  if (!userId || !amount || !toAddress) {
    return json({ error: "بيانات ناقصة" }, 400);
  }

  const user = await getUser(env, userId);
  if (user.balance < amount) {
    return json({ error: "الرصيد غير كافٍ" }, 400);
  }

  // ⚠️ هنا المفروض تبني وتوقّع وتبعت معاملة TON فعلية من "المحفظة الساخنة" بتاعتك
  // للسحوبات لـ toAddress. الجزء ده تقني ودقيق (توقيع، seqno، إلخ)
  // ومحتاج اختبار على testnet الأول قبل أي فلوس حقيقية.
  // انصحك تستخدم مكتبة زي @ton/ton أو @ton/crypto وتبني الـ transfer
  // باستخدام WalletContractV4 + mnemonic مخزّن في env.HOT_WALLET_MNEMONIC (secret).

  user.balance -= amount;
  await setUser(env, userId, user);

  return json({ status: "queued", message: "السحب هيتنفذ ويتراجع لو فشل الإرسال الفعلي" });
}
