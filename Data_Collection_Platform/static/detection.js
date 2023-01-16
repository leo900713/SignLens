const settingField = document.getElementById("settingField");
const inputText = document.getElementById("inputText");
const selectTime = document.getElementById("selectTime");
const recordBtn = document.getElementById("recordBtn");
const uploadField = document.getElementById("uploadField");
const dropBtn = document.getElementById("dropBtn");
const uploadBtn = document.getElementById("uploadBtn");
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const canvasCtx = canvas.getContext('2d');

let isRecordStart, isWaiting, isFinished;
let currentRound, currentFrame;
let label, times;
let detections = { label: "", times: 0, data: [] };

function initVariables() {
    inputText.disabled = false;
    selectTime.disabled = false;
    recordBtn.disabled = false;
    recordBtn.innerText = "開始錄製";
    isRecordStart = false;
    isWaiting = true;
    isFinished = false;
    currentRound = 1;
    currentFrame = 0;
    detections = {
        label: "",
        times: 0,
        data: [],
    };
}
function showSettingField() {
    settingField.classList.remove("d-none");
    uploadField.classList.add("d-none");
}
function showUploadField() {
    settingField.classList.add("d-none");
    uploadField.classList.remove("d-none");
}
function extractKeypoints(results) {
    pose = results.poseLandmarks ? [].concat(...results.poseLandmarks.map(lm => { return [lm.x, lm.y, lm.z, lm.visibility] })) : Array(33 * 4).fill(0);
    lh = results.leftHandLandmarks ? [].concat(...results.leftHandLandmarks.map(lm => { return [lm.x, lm.y, lm.z] })) : Array(21 * 3).fill(0);
    rh = results.rightHandLandmarks ? [].concat(...results.rightHandLandmarks.map(lm => { return [lm.x, lm.y, lm.z] })) : Array(21 * 3).fill(0);
    detections.data.push([...pose, ...lh, ...rh]);
}
function draw_keypoints(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 1 });
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 1 });
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 1 });
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, { color: '#CC0000', lineWidth: 1 });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, { color: '#CC0000', lineWidth: 1 });
    canvasCtx.font = "30px Arial";
    canvasCtx.fillStyle = "white";
    canvasCtx.fillText("Current Round: " + currentRound, 20, 40);
    canvasCtx.fillStyle = "green";
    canvasCtx.fillText("Counted Frames: " + currentFrame, 20, 80);
    canvasCtx.restore();
}
function draw_frame_status(status) {
    canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvasCtx.font = "30px Arial";
    canvasCtx.fillStyle = "white";
    canvasCtx.fillText("Current Round: " + currentRound, 20, 40);
    canvasCtx.fillStyle = "white";
    canvasCtx.fillText("Counted Frames: " + currentFrame, 20, 80);
    canvasCtx.fillStyle = "green";
    canvasCtx.fillText(status, 20, 120);
}
function updateFrame() {
    currentFrame++;
    if (currentFrame != 30) return;
    currentFrame = 0;
    currentRound++;
    if (currentRound > times) {
        console.log(detections);
        isRecordStart = false;
        isFinished = true;
        recordBtn.innerText = "完成！";
        setTimeout(() => {
            showUploadField();
        }, 2000);
        return;
    }
    isWaiting = true;
    setTimeout(() => {
        isWaiting = false;
    }, 1000);
}
function onResults(results) {
    extractKeypoints(results);
    draw_keypoints(results);
    updateFrame();
}
async function upload() {
    result = await fetch("/upload", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(detections),
    }).then(data => data.json());
    if (result.status) console.log("Uploaded!");
}
async function main() {
    await holistic.initialize();
    // await holistic.send({ image: video });
    initVariables();
}

recordBtn.addEventListener("click", () => {
    label = inputText.value;
    times = parseInt(selectTime.value);
    // times = 1;
    if (label == "") return alert("請輸入欲錄製之詞彙");
    if (isNaN(times) || times == 0) return alert("請選擇錄製次數");

    detections.label = label;
    detections.times = times;
    inputText.disabled = true;
    selectTime.disabled = true;
    recordBtn.disabled = true;
    recordBtn.innerText = "錄製中...";
    isRecordStart = true;
    setTimeout(() => {
        isWaiting = false;
    }, 1000);
});
dropBtn.addEventListener("click", () => {
    initVariables();
    showSettingField();
});
uploadBtn.addEventListener("click", async () => {
    await upload();
    initVariables();
    showSettingField();
});

const holistic = new Holistic({
    locateFile: (file) => {
        return `../static/holistic/${file}`;
        // return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
    }
});
holistic.onResults(onResults);

const camera = new Camera(video, {
    onFrame: async () => {
        if (isRecordStart) {
            if (isWaiting) {
                draw_frame_status("Wait for 1 second");
            } else {
                await holistic.send({ image: video });
            }
        } else {
            if (isFinished) {
                draw_frame_status("FINISHED");
            } else {
                canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
            }
        }
    },
    width: canvas.width,
    height: canvas.height
});
camera.start();

main();