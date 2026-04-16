// ===== FF AIMBOT NETWORK SYSTEM (CLEAN PRO) =====

// ===== FILTER =====
const isFF = (url) => url && (
    url.includes("freefire") ||
    url.includes("garena") ||
    url.includes("ffconf") ||
    url.includes("client")
);

const isConfig = (url) => url && (
    url.includes("config") ||
    url.includes("setting") ||
    url.includes("init") ||
    url.includes("profile")
);

// ===== MEMORY =====
let AIM_MEMORY = {
    lastTime: 0,
    delta: 0,
    speed: 0,
    pulling: false,
    stableFrames: 0
};

let TARGET_STATE = {
    moving: false,
    horizontalBoost: 1.0
};

let AIM_STATE = {
    mode: "SCAN",
    boost: 1.0,
    stability: 1.0
};

let HEAD_LOCK = {
    active: false,
    timer: 0
};

let PULL_STATE = {
    lastSpeed: 0,
    accelerating: false
};

// ===== DETECT REAL =====
function detectRealPull() {
    const now = Date.now();

    AIM_MEMORY.delta = now - AIM_MEMORY.lastTime;
    AIM_MEMORY.lastTime = now;

    AIM_MEMORY.speed = 1000 / (AIM_MEMORY.delta + 1);

    AIM_MEMORY.pulling = AIM_MEMORY.speed > 14;

    if (AIM_MEMORY.speed > 20) {
        AIM_MEMORY.stableFrames++;
    } else {
        AIM_MEMORY.stableFrames = 0;
    }
}

// ===== DETECT KÉO LÊN =====
function detectPullUp() {
    const speedNow = AIM_MEMORY.speed;
    const diff = speedNow - PULL_STATE.lastSpeed;

    PULL_STATE.accelerating = diff > 8 && speedNow > 18;
    PULL_STATE.lastSpeed = speedNow;
}

// ===== DETECT ĐỊCH CHẠY NGANG =====
function detectMovingTarget() {
    TARGET_STATE.moving = AIM_MEMORY.speed > 18 && AIM_MEMORY.stableFrames < 2;
    TARGET_STATE.horizontalBoost = TARGET_STATE.moving ? 1.8 : 1.0;
}

// ===== DETECT HEAD =====
function detectHeadSignal(obj) {
    let found = false;

    const scan = (o) => {
        for (let k in o) {
            const val = o[k];

            if (typeof val === "object" && val !== null) {
                scan(val);
                continue;
            }

            const key = k.toLowerCase();

            if (
                key.includes("head") ||
                key.includes("critical") ||
                key.includes("hitbox") ||
                (typeof val === "number" && val > 100)
            ) {
                found = true;
            }
        }
    };

    scan(obj);
    return found;
}

// ===== UPDATE STATE =====
function updateState(body) {

    detectRealPull();
    detectPullUp();
    detectMovingTarget();

    const headDetected = detectHeadSignal(body);

    // 🔥 SNAP KHI KÉO LÊN
    if (PULL_STATE.accelerating) {
        HEAD_LOCK.active = true;
        HEAD_LOCK.timer = 2;
    }
    else if (headDetected) {
        HEAD_LOCK.active = true;
        HEAD_LOCK.timer = 3;
    }

    if (HEAD_LOCK.timer > 0) {
        HEAD_LOCK.timer--;
    } else {
        HEAD_LOCK.active = false;
    }

    // ===== MODE =====
    if (HEAD_LOCK.active) {
        AIM_STATE.mode = "STICK";
    }
    else if (TARGET_STATE.moving) {
        AIM_STATE.mode = "MAGNET";
    }
    else if (AIM_MEMORY.pulling) {
        AIM_STATE.mode = "MAGNET";
    }
    else {
        AIM_STATE.mode = "SCAN";
    }

    // ===== VALUE =====
    switch (AIM_STATE.mode) {
        case "SCAN":
            AIM_STATE.boost = 2.5;
            AIM_STATE.stability = 0.6;
            break;

        case "MAGNET":
            AIM_STATE.boost = 3.2;
            AIM_STATE.stability = 1.0;
            break;

        case "STICK":
            AIM_STATE.boost = 0.35;
            AIM_STATE.stability = 2.2;
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

        // ===== SENS =====
        if (k.includes("sens")) {

            let base = 180;

            if (PULL_STATE.accelerating) base *= 3.5;
            else if (AIM_STATE.mode === "SCAN") base *= 2.5;
            else if (AIM_STATE.mode === "MAGNET") base *= 1.8;
            else if (AIM_STATE.mode === "STICK") base *= 0.5;

            if (TARGET_STATE.moving) base *= 1.4;

            obj[key] = base;
        }

        // ===== AIM =====
        else if (k.includes("aim")) {

            if (PULL_STATE.accelerating) obj[key] = 1.0;
            else if (AIM_STATE.mode === "STICK") obj[key] = 1.0;
            else if (TARGET_STATE.moving) obj[key] = 1.0;
            else obj[key] = 0.85;
        }

        // ===== RECOIL =====
        else if (k.includes("recoil")) {
            obj[key] = 0;
        }

        // ===== DRAG =====
        else if (k.includes("drag")) {

            let drag = 2.0;

            if (AIM_STATE.mode === "SCAN") drag = 1.5;
            else if (AIM_STATE.mode === "MAGNET") drag = 2.5;
            else if (AIM_STATE.mode === "STICK") drag = 3.5;

            drag *= TARGET_STATE.horizontalBoost;

            obj[key] = drag;
        }

        // ===== HEAD PRIORITY =====
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

        let body;

        try {
            body = JSON.parse($response.body);
        } catch (e) {
            $done({});
        }

        if (!body) {
            $done({});
        } else {

            updateState(body);
            process(body);

            console.log(
                "🎯 MODE:", AIM_STATE.mode,
                "| SPEED:", AIM_MEMORY.speed.toFixed(1),
                "| PULL:", PULL_STATE.accelerating,
                "| MOVE:", TARGET_STATE.moving,
                "| HEAD:", HEAD_LOCK.active
            );

            $done({ body: JSON.stringify(body) });
        }
    }
}
