// ===== FF AIMBOT NETWORK SYSTEM (FULL PRO) =====

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
// ===== STATE =====
let AIM_STATE = {
    mode: "SCAN",
    boost: 1.0,
    stability: 1.0
};

// ===== HEAD LOCK =====
let HEAD_LOCK = {
    active: false,
    timer: 0
};
let PULL_STATE = {
    lastSpeed: 0,
    accelerating: false
};
function detectPullUp() {

    const speedNow = AIM_MEMORY.speed;
    const speedDiff = speedNow - PULL_STATE.lastSpeed;

    // 🔥 tăng tốc đột ngột = kéo lên
    if (speedDiff > 8 && speedNow > 18) {
        PULL_STATE.accelerating = true;
    } else {
        PULL_STATE.accelerating = false;
    }

    PULL_STATE.lastSpeed = speedNow;
}
function detectMovingTarget() {

    // tốc độ cao nhưng không ổn định = đang di chuyển ngang
    if (AIM_MEMORY.speed > 18 && AIM_MEMORY.stableFrames < 2) {
        TARGET_STATE.moving = true;
    } else {
        TARGET_STATE.moving = false;
    }

    // lực bám ngang
    TARGET_STATE.horizontalBoost = TARGET_STATE.moving ? 1.8 : 1.0;
}
// ===== DETECT REAL PULL =====
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

// ===== DETECT HEAD (GIÁN TIẾP) =====
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
                key.includes("hitbox")
            ) {
                found = true;
            }

            if (typeof val === "number" && val > 100) {
                found = true;
            }
        }
    };

    scan(obj);
    return found;
}
function updateState(body) {

    detectRealPull();
    detectPullUp();

    const headDetected = detectHeadSignal(body);

    // 🔥 ƯU TIÊN CAO NHẤT: KÉO LÊN → SNAP HEAD
    if (PULL_STATE.accelerating) {
        AIM_STATE.mode = "STICK"; // khóa đầu ngay
        HEAD_LOCK.active = true;
        HEAD_LOCK.timer = 2;
    }

    // 🔥 HEAD DETECT GIÁN TIẾP
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
            AIM_STATE.boost = 0.35; // 🔥 giảm sens để khóa cứng
            AIM_STATE.stability = 2.2;
            break;
    }
}
// ===== UPDATE STATE =====
function updateState(body) {

    detectRealPull();

    const headDetected = detectHeadSignal(body);
// ===== ƯU TIÊN HEAD MOVING =====
if (TARGET_STATE.moving) {
    AIM_STATE.mode = "MAGNET"; // luôn hút theo đầu đang chạy
}
    // 🔥 HEAD LOCK
    if (headDetected) {
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
    else if (AIM_MEMORY.pulling) {
        if (AIM_MEMORY.stableFrames > 3) {
            AIM_STATE.mode = "STICK";
        } else {
            AIM_STATE.mode = "MAGNET";
        }
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
            AIM_STATE.boost = 0.45;
            AIM_STATE.stability = 2.0;
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


    // 🔥 nếu đã dính head → khóa cứng
    if (AIM_STATE.mode === "STICK") {
        obj[key] = 1.0;
    } else {
        obj[key] = base;
    }
}
else if (k.includes("aim")) {

    if (PULL_STATE.accelerating) {
        obj[key] = 1.0; // 🔥 khóa ngay lập tức
    }
    else if (AIM_STATE.mode === "STICK") {
        obj[key] = 1.0;
    }
    else {
        obj[key] = 0.85;
    }
}
    if (k.includes("sens")) {

    let base = 180;

    if (PULL_STATE.accelerating) {
        obj[key] = base * 3.5; // 🔥 kéo cực nhanh lên đầu
    }
    else if (AIM_STATE.mode === "SCAN") {
        obj[key] = base * 2.5;
    }
    else if (AIM_STATE.mode === "MAGNET") {
        obj[key] = base * 1.8;
    }
    else if (AIM_STATE.mode === "STICK") {
        obj[key] = base * 0.5;
    }
}
else if (k.includes("drag")) {

    let drag = 2.0;

    if (AIM_STATE.mode === "SCAN") drag = 1.5;
    if (AIM_STATE.mode === "MAGNET") drag = 2.5;
    if (AIM_STATE.mode === "STICK") drag = 3.5;

    // 🔥 boost khi target chạy ngang
    drag *= TARGET_STATE.horizontalBoost;

    obj[key] = drag;
}
        if (k.includes("sens")) {

    let base = 180;

    if (AIM_STATE.mode === "SCAN") base *= 2.5;
    else if (AIM_STATE.mode === "MAGNET") base *= 1.8;
    else if (AIM_STATE.mode === "STICK") base *= 0.6;

    // 🔥 tăng tốc theo đuổi khi chạy ngang
    if (TARGET_STATE.moving) {
        base *= 1.4;
    }

    obj[key] = base;
}
        
        
        // ===== SMART SENS =====
        if (k.includes("sens")) {

            let base = 180;

            if (AIM_STATE.mode === "SCAN") {
                obj[key] = base * 2.8;
            }
            else if (AIM_STATE.mode === "MAGNET") {
                obj[key] = base * 1.8;
            }
            else if (AIM_STATE.mode === "STICK") {
                obj[key] = base * 0.6;
            }
        }

        // ===== AIM LOCK =====
        else if (k.includes("aim")) {
            if (AIM_STATE.mode === "STICK") {
                obj[key] = 1.0;
            } else {
                obj[key] = 0.85;
            }
        }

        // ===== RECOIL =====
        else if (k.includes("recoil")) {
            obj[key] = 0;
        }

        // ===== DRAG =====
        else if (k.includes("drag")) {

            if (AIM_STATE.mode === "SCAN") {
                obj[key] = 1.5;
            }
            else if (AIM_STATE.mode === "MAGNET") {
                obj[key] = 2.5;
            }
            else if (AIM_STATE.mode === "STICK") {
                obj[key] = 3.5;
            }
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

        let body = null;

        try {
            body = JSON.parse($response.body);
        } catch (e) {}

        if (!body) {
            $done({});
        } else {
detectMovingTarget();
            updateState(body);
            process(body);

            console.log(
                "🎯 MODE:", AIM_STATE.mode,
                "| SPEED:", AIM_MEMORY.speed.toFixed(1),
                "| HEAD:", HEAD_LOCK.active
            );

            $done({ body: JSON.stringify(body) });
        }
    }
}
