// ===== UNIFIED FF AIM SYSTEM (REAL DETECT PRO) =====

// ===== FILTER =====
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

// ===== MEMORY (GIỮ TRẠNG THÁI) =====
let AIM_MEMORY = {
    lastTime: 0,
    delta: 0,
    speed: 0,
    pulling: false,
    stableFrames: 0
};

// ===== AIM STATE =====
let AIM_STATE = {
    mode: "SCAN", // SCAN | MAGNET | STICK
    boost: 1.0,
    stability: 1.0
};

// ===== DETECT REAL (KHÔNG RANDOM) =====
function detectRealPull() {
    const now = Date.now();

    AIM_MEMORY.delta = now - AIM_MEMORY.lastTime;
    AIM_MEMORY.lastTime = now;

    // tốc độ request
    AIM_MEMORY.speed = 1000 / (AIM_MEMORY.delta + 1);

    // detect kéo
    AIM_MEMORY.pulling = AIM_MEMORY.speed > 14;

    // detect ổn định (giữ tâm)
    if (AIM_MEMORY.speed > 20) {
        AIM_MEMORY.stableFrames++;
    } else {
        AIM_MEMORY.stableFrames = 0;
    }
}

// ===== UPDATE STATE (ƯU TIÊN STICKY HEAD) =====
function updateState() {

    if (AIM_MEMORY.pulling) {

        if (AIM_MEMORY.stableFrames > 3) {
            AIM_STATE.mode = "STICK"; // dính head
        } else {
            AIM_STATE.mode = "MAGNET"; // hút lên head
        }

    } else {
        AIM_STATE.mode = "SCAN"; // tìm mục tiêu
    }

    // ===== APPLY VALUE =====
    switch (AIM_STATE.mode) {

        case "SCAN":
            AIM_STATE.boost = 2.0;
            AIM_STATE.stability = 0.6;
            break;

        case "MAGNET":
            AIM_STATE.boost = 3.0;
            AIM_STATE.stability = 1.0;
            break;

        case "STICK":
            AIM_STATE.boost = 0.45;
            AIM_STATE.stability = 1.8;
            break;
    }
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

        // 🔥 SENS (không bị quá đà)
        if (k.includes("sens")) {
            obj[key] = 220 * AIM_STATE.boost;
        }

        // 🔥 AIM ASSIST (giữ head)
        else if (k.includes("aim")) {
            obj[key] = Math.min(1.0, 0.9 * AIM_STATE.stability);
        }

        // 🔥 RECOIL = 0
        else if (k.includes("recoil")) {
            obj[key] = 0;
        }

        // 🔥 DRAG (tracking)
        else if (k.includes("drag")) {
            obj[key] = 2.8 * AIM_STATE.stability;
        }

        // 🔥 HEAD PRIORITY
        else if (k.includes("head")) {
            obj[key] = 1.0;
        }
    }
}

// ===== MAIN =====
if ($response && isFF($request.url)) {

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

            // ===== DETECT REAL =====
            detectRealPull();

            // ===== UPDATE STATE =====
            updateState();

            // ===== APPLY =====
            process(body);

            console.log(
                "🎯 MODE:", AIM_STATE.mode,
                "| SPEED:", AIM_MEMORY.speed.toFixed(1),
                "| STABLE:", AIM_MEMORY.stableFrames
            );

            $done({ body: JSON.stringify(body) });
        }
    }
}
