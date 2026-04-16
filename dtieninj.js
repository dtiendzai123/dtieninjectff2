// ===== UNIFIED FF AIM SYSTEM (ULTRA FIXED) =====

// ===== FILTER REQUEST =====
const isFF = (url) => {
    return url &&
        (url.includes("freefire") ||
         url.includes("garena") ||
         url.includes("ffconf") ||
         url.includes("client"));
};

const isConfig = (url) => {
    return url &&
        (url.includes("config") ||
         url.includes("setting") ||
         url.includes("init") ||
         url.includes("profile"));
};

// ===== STATE =====
let AIM_STATE = {
    mode: "SCAN",   // SCAN | MAGNET | STICK
    boost: 1.0,
    stability: 1.0
};

// ===== DETECT AIM =====
function detectState() {
    const pull = Math.random() > 0.5;
    const near = Math.random() > 0.75;

    if (near) AIM_STATE.mode = "STICK";
    else if (pull) AIM_STATE.mode = "MAGNET";
    else AIM_STATE.mode = "SCAN";
}

// ===== UPDATE STATE =====
function updateState() {
    switch (AIM_STATE.mode) {

        case "SCAN":
            AIM_STATE.boost = 2.2;
            AIM_STATE.stability = 0.6;
            break;

        case "MAGNET":
            AIM_STATE.boost = 3.2;
            AIM_STATE.stability = 0.9;
            break;

        case "STICK":
            AIM_STATE.boost = 0.5;
            AIM_STATE.stability = 1.6;
            break;
    }
}
// ===== REALISTIC AIM DETECT SYSTEM =====

// ===== MEMORY =====
let AIM_MEMORY = {
    lastTime: 0,
    deltaTime: 0,
    speed: 0,
    pulling: false
};

// ===== DETECT =====
function detectRealPull() {
    const now = Date.now();

    // tính khoảng thời gian giữa 2 response
    AIM_MEMORY.deltaTime = now - AIM_MEMORY.lastTime;
    AIM_MEMORY.lastTime = now;

    // tính "tốc độ" (request dày = tốc độ cao)
    AIM_MEMORY.speed = 1000 / (AIM_MEMORY.deltaTime + 1);

    // ===== LOGIC DETECT =====
    if (AIM_MEMORY.speed > 15) {
        AIM_MEMORY.pulling = true;  // đang kéo nhanh
    } else {
        AIM_MEMORY.pulling = false;
    }
}
// ===== DETECT REAL =====
detectRealPull();

// ===== STATE LOGIC =====
if (AIM_MEMORY.pulling) {
    if (AIM_MEMORY.speed > 25) {
        AIM_STATE.mode = "STICK";
    } else {
        AIM_STATE.mode = "MAGNET";
    }
} else {
    AIM_STATE.mode = "SCAN";
}
// ===== CORE PROCESS =====
function process(obj) {
    for (let key in obj) {

        let val = obj[key];

        if (typeof val === "object" && val !== null) {
            process(val);
            continue;
        }

        const k = key.toLowerCase();

        // ===== SENSITIVITY =====
        if (k.includes("sens")) {
            obj[key] = 250 * AIM_STATE.boost;
        }

        // ===== AIM ASSIST =====
        else if (k.includes("aim")) {
            obj[key] = Math.min(1.0, 0.85 * AIM_STATE.stability);
        }

        // ===== RECOIL =====
        else if (k.includes("recoil")) {
            obj[key] = 0;
        }

        // ===== DRAG =====
        else if (k.includes("drag")) {
            obj[key] = 2.5 * AIM_STATE.stability;
        }

        // ===== HEAD PRIORITY =====
        else if (k.includes("head")) {
            obj[key] = 1.0;
        }
    }
}

// ===== MAIN =====
if ($response && isFF($request.url)) {

    console.log("🔥 FF DETECT:", $request.url);

    // ❌ không phải config → bỏ qua
    if (!isConfig($request.url)) {
        $done({});
    } else {

        let body = null;

        try {
            body = JSON.parse($response.body);
        } catch (e) {
            console.log("❌ JSON FAIL");
        }

        if (!body) {
            $done({});
        } else {

            // ===== APPLY LOGIC =====
            detectState();
            updateState();
            process(body);

            console.log(
                "🎯 MODE:", AIM_STATE.mode,
                "| BOOST:", AIM_STATE.boost
            );

            $done({ body: JSON.stringify(body) });
        }
    }
}
