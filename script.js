// Khoi tao Icon Lucide
lucide.createIcons();

let model = null;
let isWebcamActive = false;
const video = document.getElementById('webcam');
const imgPreview = document.getElementById('imagePreview');
const placeholder = document.getElementById('placeholderText');
const overlay = document.getElementById('aiOverlay');

// 1. NAP MO HINH TENSORFLOW MOBILENET
async function loadAIModel() {
    try {
        model = await mobilenet.load();
        document.getElementById('aiModelStatus').innerText = "AI Model: Ready (MobileNet)";
    } catch (err) {
        document.getElementById('aiModelStatus').innerText = "AI Error!";
        console.error("Loi nap mo hinh AI:", err);
    }
}
loadAIModel();

/// 2. BAT / TAT CAMERA (TỰ ĐỘNG CHỌN CAMERA SAU TRÊN ĐIỆN THOẠI)
async function toggleWebcam() {
    if (isWebcamActive) {
        const stream = video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        video.classList.add('hidden');
        placeholder.classList.remove('hidden');
        isWebcamActive = false;
        document.getElementById('btnWebcam').querySelector('span').innerText = "Mở Camera";
        overlay.classList.add('hidden');
    } else {
        try {
            imgPreview.classList.add('hidden');
            
            // Cấu hình ưu tiên Camera sau (facingMode: environment)
            const constraints = {
                video: {
                    facingMode: { ideal: "environment" }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            video.classList.remove('hidden');
            placeholder.classList.add('hidden');
            isWebcamActive = true;
            document.getElementById('btnWebcam').querySelector('span').innerText = "Tắt Camera";
        } catch (err) {
            alert("Không thể mở Camera! Nếu dùng điện thoại, hãy đảm bảo bạn chọn đúng địa chỉ IP Wi-Fi hoặc dùng nút Tải/Chụp Ảnh nhé.");
            console.error(err);
        }
    }
}

// 3. XU LY TAI ANH LEN
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (isWebcamActive) toggleWebcam();

        const reader = new FileReader();
        reader.onload = function(e) {
            imgPreview.src = e.target.result;
            imgPreview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// 4. PHAN TICH ANH/CAMERA BANG AI
async function classifyCurrentInput() {
    if (!model) {
        alert("Mô hình AI đang nạp, vui lòng đợi vài giây...");
        return;
    }

    let elementToScan = null;
    if (isWebcamActive) {
        elementToScan = video;
    } else if (!imgPreview.classList.contains('hidden')) {
        elementToScan = imgPreview;
    } else {
        alert("Vui lòng Bật Webcam hoặc Tải ảnh rác lên trước khi bấm Phân Tích!");
        return;
    }

    overlay.classList.remove('hidden');
    document.getElementById('detectedLabel').innerText = "Đang xử lý...";

    const predictions = await model.classify(elementToScan);
    if (predictions && predictions.length > 0) {
        const topResult = predictions[0];
        const rawName = topResult.className.toLowerCase();
        const confidence = Math.round(topResult.probability * 100);

        processWasteClassification(rawName, confidence);
    }
}

// Dán API Key của Google Gemini vào đây (nhớ điền API Key thật nhé)
const GEMINI_API_KEY = "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";

// 5. GHI NHAN KET QUA & SINH ADAPTIVE NUDGE BẰNG GEMINI API
async function processWasteClassification(rawName, confidence) {
    let category = "Rác Hỗn Hợp / Khác";
    let points = "+5 Điểm";
    let isRecyclable = "Cần phân loại kỹ";

    // Phân loại cơ bản
    if (rawName.includes('bottle') || rawName.includes('plastic') || rawName.includes('pop bottle') || rawName.includes('water bottle')) {
        category = "Rác Tái Chế (Chai Nhựa / Chai Thuỷ Tinh)";
        points = "+20 Điểm Xanh";
        isRecyclable = "♻️ Tái chế được";
    } else if (rawName.includes('carton') || rawName.includes('paper') || rawName.includes('envelope') || rawName.includes('box')) {
        category = "Rác Tái Chế (Hộp Giấy / Bìa Carton)";
        points = "+15 Điểm Xanh";
        isRecyclable = "♻️ Tái chế được";
    } else if (rawName.includes('banana') || rawName.includes('apple') || rawName.includes('fruit') || rawName.includes('food')) {
        category = "Rác Hữu Cơ (Thức Ăn / Thực Vật)";
        points = "+10 Điểm Xanh";
        isRecyclable = "🌱 Phân huỷ sinh học";
    } else if (rawName.includes('can') || rawName.includes('tin') || rawName.includes('brass')) {
        category = "Rác Kim Loại (Vỏ Lon/Đồ Kim Loại)";
        points = "+25 Điểm Xanh";
        isRecyclable = "♻️ Tái chế cao";
    }

    // Hiển thị thông tin phân loại lên màn hình ngay
    document.getElementById('confidenceText').innerText = `ACCURACY: ${confidence}%`;
    document.getElementById('detectedLabel').innerText = category.split('(')[0];
    document.getElementById('resCategory').innerText = category;
    document.getElementById('resPoints').innerText = points;
    document.getElementById('resRecyclable').innerText = isRecyclable;
    document.getElementById('resNudge').innerText = "🤖 Gemini AI đang suy nghĩ thông điệp Nudge cá nhân hóa...";

    // GỌI GEMINI API ĐỂ TỰ ĐỘNG VIẾT CÂU NUDGE TRUYỀN CẢM HỨNG
    try {
        const prompt = `Bạn là trợ lý EcoAI School thân thiện. Một học sinh vừa vứt rác thuộc nhóm: "${category}". Hãy viết 1 câu thông điệp Nudge (Thúc đẩy hành vi) ngắn gọn (khoảng 2-3 câu), hài hước, truyền cảm hứng, khen ngợi học sinh và nhắc tới điểm thi đua của lớp. Không dùng gạch đầu dòng, viết tự nhiên dạng hội thoại.`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const aiNudgeText = data.candidates[0].content.parts[0].text;
            document.getElementById('resNudge').innerText = `"${aiNudgeText.trim()}"`;
        } else {
            document.getElementById('resNudge').innerText = `"Cảm ơn bạn đã phân loại rác đúng! Hãy tiếp tục phát huy để mang về nhiều Điểm Xanh cho lớp nhé!"`;
        }
    } catch (err) {
        console.error("Lỗi gọi Gemini API:", err);
        document.getElementById('resNudge').innerText = `"Tuyệt vời! Bạn vừa đóng góp điểm xanh cho môi trường học đường!"`;
    }
}
    let category = "Rác Hỗn Hợp / Khác";
    let points = "+5 Điểm";
    let isRecyclable = "Cần phân loại kỹ";
    let nudge = "Cảm ơn bạn đã thu gom rác! Hãy đảm bảo bỏ rác đúng thùng rác nhé.";

    if (rawName.includes('bottle') || rawName.includes('plastic') || rawName.includes('pop bottle') || rawName.includes('water bottle')) {
        category = "Rác Tái Chế (Chai Nhựa / Chai Thuỷ Tinh)";
        points = "+20 Điểm Xanh";
        isRecyclable = "♻️ Tái chế được";
        nudge = "Tuyệt vời! Chai nhựa tái chế này giúp giảm lượng rác thải ra đại dương. Lớp bạn vừa nhận thêm 20 Điểm Xanh!";
    } else if (rawName.includes('carton') || rawName.includes('paper') || rawName.includes('envelope') || rawName.includes('box')) {
        category = "Rác Tái Chế (Hộp Giấy / Bìa Carton)";
        points = "+15 Điểm Xanh";
        isRecyclable = "♻️ Tái chế được";
        nudge = "Xuất sắc! Giấy vụn và bìa carton sẽ được gom để tái chế làm vở mới cho học sinh khó khăn.";
    } else if (rawName.includes('banana') || rawName.includes('apple') || rawName.includes('fruit') || rawName.includes('food')) {
        category = "Rác Hữu Cơ (Thức Ăn / Thực Vật)";
        points = "+10 Điểm Xanh";
        isRecyclable = "🌱 Phân huỷ sinh học";
        nudge = "Đã ghi nhận! Rác hữu cơ này sẽ được ủ làm phân bón compost cho vườn hoa nhà trường.";
    } else if (rawName.includes('can') || rawName.includes('tin') || rawName.includes('brass')) {
        category = "Rác Kim Loại (Vỏ Lon/Đồ Kim Loại)";
        points = "+25 Điểm Xanh";
        isRecyclable = "♻️ Tái chế cao";
        nudge = "Lon nhôm có giá trị tái chế rất cao. Bạn đang giúp tiết kiệm 95% năng lượng sản xuất lon mới đấy!";
    }

    document.getElementById('confidenceText').innerText = `ACCURACY: ${confidence}%`;
    document.getElementById('detectedLabel').innerText = category.split('(')[0];
    document.getElementById('resCategory').innerText = category;
    document.getElementById('resPoints').innerText = points;
    document.getElementById('resRecyclable').innerText = isRecyclable;
    document.getElementById('resNudge').innerText = `"${nudge}"`;
}

// 6. KHOI TAO BIEU DO CHART.JS
const ctx = document.getElementById('behaviorChart').getContext('2d');
new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Chai nhựa', 'Hộp giấy', 'Lon nhôm', 'Rác hữu cơ', 'Khác'],
        datasets: [{
            label: 'Số lượng quét',
            data: [145, 98, 62, 85, 30],
            backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#84cc16', '#64748b'],
            borderRadius: 8
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
    }
});