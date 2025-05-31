import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

console.log("Firebase 모듈 임포트 완료");

const firebaseConfig = {
    apiKey: "AIzaSyBeIPr1H_de7eIZUagNAUvPbw-rYRteP9U", // 너의 Firebase API 키
    authDomain: "submit-33eb1.firebaseapp.com", // 너의 Firebase Auth 도메인
    projectId: "submit-33eb1", // 너의 Firebase 프로젝트 ID
    storageBucket: "submit-33eb1.appspot.com", // 너의 Firebase 스토리지 버킷
    messagingSenderId: "123176179541", // 너의 Firebase 메시징 발신자 ID
    appId: "1:123176179541:web:c40f2392c8b95fb93601dc" // 너의 Firebase 앱 ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
console.log("Firebase 초기화 완료");

// --- DOM Elements ---
const loginFormContainer = document.getElementById('loginFormContainer');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const messageDiv = document.getElementById('message');
const dataSectionDiv = document.getElementById('dataSection');
const musicListContainer = document.getElementById('musicListContainer');
const addMusicModal = document.getElementById('addMusicModal');
const closeAddMusicModalButton = document.getElementById('closeAddMusicModalButton');
const cancelAddMusicButton = document.getElementById('cancelAddMusicButton');
const addMusicForm = document.getElementById('addMusicForm');
const saveMusicButton = document.getElementById('saveMusicButton');
const addMusicMessage = document.getElementById('addMusicMessage');
const FIXED_EMAIL = "admin@admin.com";

const fabContainer = document.getElementById('fabContainer');
const fabButton = document.getElementById('fabButton');
const fabIconPlus = document.getElementById('fabIconPlus');
const fabIconClose = document.getElementById('fabIconClose');
const fabActions = document.getElementById('fabActions');
const openAddMusicFab = document.getElementById('openAddMusicFab');
const logoutFab = document.getElementById('logoutFab');

let fabOpen = false;

// --- Auth & UI Logic ---
function updateUI(user) {
    if (user) {
        loginFormContainer.classList.add('hidden');
        fabContainer.classList.remove('hidden');
        dataSectionDiv.classList.remove('hidden');
        loadAndDisplayMusicData();
    } else {
        loginFormContainer.classList.remove('hidden');
        fabContainer.classList.add('hidden');
        dataSectionDiv.classList.add('hidden');
        musicListContainer.innerHTML = '';
        messageDiv.textContent = '';
        if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
        }
        if (fabOpen) { // 로그아웃 시 FAB 메뉴가 열려있으면 닫기
            fabActions.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
            fabActions.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
            fabIconPlus.classList.remove('hidden');
            fabIconClose.classList.add('hidden');
            // fabButton.classList.remove('rotate-[360deg]'); // 회전 애니메이션은 아이콘 교체로 대체
            fabOpen = false;
        }
    }
}

onAuthStateChanged(auth, (user) => {
    updateUI(user);
    if (user) console.log("로그인 상태:", user.email);
    else console.log("로그아웃 상태");
});

// FAB 버튼 클릭 이벤트
fabButton.addEventListener('click', () => {
    fabOpen = !fabOpen;
    if (fabOpen) {
        fabActions.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
        fabActions.classList.add('opacity-100', 'pointer-events-auto', 'translate-y-0');
        fabIconPlus.classList.add('hidden');
        fabIconClose.classList.remove('hidden');
    } else {
        fabActions.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        fabActions.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
        fabIconPlus.classList.remove('hidden');
        fabIconClose.classList.add('hidden');
    }
});

// 글쓰기 FAB 클릭 이벤트
openAddMusicFab.addEventListener('click', () => {
    openModal();
    if (fabOpen) fabButton.click(); // FAB 메뉴 닫기
});

// 로그아웃 FAB 클릭 이벤트
logoutFab.addEventListener('click', async () => {
    if (fabOpen) fabButton.click(); // FAB 메뉴 닫기
    try {
        await signOut(auth);
    } catch (error) {
        console.error("로그아웃 실패:", error);
        alert("로그아웃 중 오류가 발생했습니다.");
    }
});

async function loadAndDisplayMusicData() {
    musicListContainer.innerHTML = '<p class="text-center text-gray-500">음악 목록을 불러오는 중...</p>';
    try {
        const musicCollection = collection(db, "musicbox");
        const q = query(musicCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            musicListContainer.innerHTML = '<p class="text-center text-gray-500">아직 등록된 음악이 없어요. 첫 곡을 추가해보세요!</p>';
            return;
        }
        musicListContainer.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const music = doc.data();
            const musicElement = createMusicItemElement(doc.id, music);
            musicListContainer.appendChild(musicElement);
        });
    } catch (error) {
        console.error("음악 데이터 로드 실패:", error);
        musicListContainer.innerHTML = '<p class="text-center text-red-500">음악 목록을 불러오는 데 실패했습니다.</p>';
    }
}

function getYouTubeVideoInfo(url) {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        const pathname = urlObj.pathname;
        let videoId = null;
        let isShorts = false;

        if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
            if (hostname.includes('youtu.be')) {
                videoId = pathname.substring(1).split(/[?#]/)[0];
            } else if (pathname === '/watch') {
                videoId = urlObj.searchParams.get('v');
            } else if (pathname.startsWith('/embed/')) {
                videoId = pathname.substring('/embed/'.length).split(/[?#]/)[0];
            } else if (pathname.startsWith('/shorts/')) {
                videoId = pathname.substring('/shorts/'.length).split(/[?#]/)[0];
                isShorts = true;
            }
        }

        if (videoId) {
            return { videoId: videoId, isShorts: isShorts };
        }
    } catch (e) {
        console.warn("URL에서 YouTube 정보 추출 중 오류:", url, e);
    }
    return null;
}

function createMusicItemElement(id, music) {
    const div = document.createElement('div');
    div.className = "bg-gray-50 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200";
    div.dataset.id = id;

    let playerHtml = '';
    const musicUrl = music.url;

    if (musicUrl) {
        const isAudioFile = /\.(mp3|m4a|ogg|wav|aac)$/i.test(musicUrl);
        const mainVideoInfo = getYouTubeVideoInfo(musicUrl);

        if (isAudioFile) {
            let audioType = '';
            if (/\.mp3$/i.test(musicUrl)) audioType = 'audio/mpeg';
            else if (/\.(m4a|aac)$/i.test(musicUrl)) audioType = 'audio/mp4';
            else if (/\.ogg$/i.test(musicUrl)) audioType = 'audio/ogg';
            else if (/\.wav$/i.test(musicUrl)) audioType = 'audio/wav';
            playerHtml = `
                <div class="my-3">
                    <audio controls preload="none" class="w-full rounded">
                        <source src="${musicUrl}" ${audioType ? `type="${audioType}"` : ''}>
                        브라우저가 오디오 재생을 지원하지 않습니다. <a href="${musicUrl}" target="_blank" class="text-indigo-500 hover:underline">직접 듣기</a>
                    </audio>
                </div>`;
        } else if (mainVideoInfo) {
            const embedUrl = `https://www.youtube.com/embed/${mainVideoInfo.videoId}`;
            const embedContainerClass = mainVideoInfo.isShorts ? 'youtube-shorts-container' : 'aspect-w-16 aspect-h-9';
            playerHtml = `
                <div class="${embedContainerClass} my-3 rounded overflow-hidden">
                    <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                </div>`;
        } else {
            playerHtml = `<div class="my-3"><a href="${musicUrl}" target="_blank" class="text-indigo-600 hover:text-indigo-800 hover:underline break-all">콘텐츠 보기/듣기: ${musicUrl}</a></div>`;
        }
    }

    function createLinkHtml(linkUrl, linkNumber) {
        let html = '';
        if (linkUrl) {
            const videoInfo = getYouTubeVideoInfo(linkUrl);
            if (videoInfo) {
                const embedUrl = `https://www.youtube.com/embed/${videoInfo.videoId}`;
                const embedContainerClass = videoInfo.isShorts ? 'youtube-shorts-container' : 'aspect-w-16 aspect-h-9';
                html = `
                    <div class="mt-3">
                        <p class="text-sm font-medium text-gray-700 mb-1">관련 링크 ${linkNumber} (YouTube${videoInfo.isShorts ? ' Shorts' : ''}):</p>
                        <div class="${embedContainerClass} rounded overflow-hidden">
                            <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                        </div>
                    </div>`;
            } else {
                html = `<div class="mt-3"><p class="text-sm font-medium text-gray-700 mb-1">관련 링크 ${linkNumber}:</p><a href="${linkUrl}" target="_blank" class="text-sm text-blue-500 hover:underline break-all">${linkUrl}</a></div>`;
            }
        }
        return html;
    }

    const link1Html = createLinkHtml(music.link1, 1);
    const link2Html = createLinkHtml(music.link2, 2);

    div.innerHTML = `
        <h4 class="text-xl font-semibold text-indigo-700 mb-1">${music.title || '제목 없음'}</h4>
        ${playerHtml}
        ${music.description ? `<p class="text-sm text-gray-600 my-3 whitespace-pre-wrap">${music.description}</p>` : ''}
        ${link1Html}
        ${link2Html}
        <p class="text-xs text-gray-400 mt-4 text-right">게시일: ${music.createdAt ? new Date(music.createdAt.seconds * 1000).toLocaleString() : '날짜 정보 없음'}</p>
    `;
    return div;
}

async function handleLogin() {
    const password = passwordInput.value;
    const recaptchaResponse = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : 'test_mode';
    if (!password) {
        messageDiv.textContent = "비밀번호를 입력해주세요.";
        messageDiv.className = "mt-4 text-sm text-center text-red-500";
        return;
    }
    if (!recaptchaResponse && typeof grecaptcha !== 'undefined') {
        messageDiv.textContent = "reCAPTCHA를 완료해주세요.";
        messageDiv.className = "mt-4 text-sm text-center text-red-500";
        return;
    }
    loginButton.disabled = true;
    loginButton.textContent = "로그인 중...";
    loginButton.classList.add("opacity-50", "cursor-not-allowed");
    messageDiv.textContent = "로그인 시도 중...";
    messageDiv.className = "mt-4 text-sm text-center text-gray-500";
    try {
        await signInWithEmailAndPassword(auth, FIXED_EMAIL, password);
        passwordInput.value = "";
    } catch (error) {
        console.error("로그인 실패:", error.code, error.message);
        messageDiv.textContent = "로그인 실패: " + mapAuthError(error.code);
        messageDiv.className = "mt-4 text-sm text-center text-red-600";
        if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "로그인";
        loginButton.classList.remove("opacity-50", "cursor-not-allowed");
    }
}

loginButton.addEventListener('click', handleLogin);
passwordInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        handleLogin();
    }
});

function openModal() {
    addMusicModal.classList.remove('hidden');
    addMusicModal.classList.add('modal-active');
    document.body.classList.add('modal-active');
}

function closeModal() {
    addMusicForm.reset();
    addMusicMessage.textContent = '';
    addMusicModal.classList.add('hidden');
    addMusicModal.classList.remove('modal-active');
    document.body.classList.remove('modal-active');
}

closeAddMusicModalButton.addEventListener('click', closeModal);
cancelAddMusicButton.addEventListener('click', closeModal);
addMusicModal.addEventListener('click', (event) => {
    if (event.target === addMusicModal) closeModal();
});

addMusicForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveMusicButton.disabled = true;
    saveMusicButton.textContent = "저장 중...";
    addMusicMessage.textContent = "데이터를 저장하고 있습니다...";
    addMusicMessage.className = "mt-4 text-sm text-center text-gray-500";
    const title = addMusicForm.musicTitle.value.trim();
    const url = addMusicForm.musicUrl.value.trim();
    const description = addMusicForm.musicDescription.value.trim();
    const link1 = addMusicForm.musicLink1.value.trim();
    const link2 = addMusicForm.musicLink2.value.trim();

    if (!title || !url) {
        addMusicMessage.textContent = "곡 제목과 곡 URL은 필수입니다.";
        addMusicMessage.className = "mt-4 text-sm text-center text-red-500";
        saveMusicButton.disabled = false;
        saveMusicButton.textContent = "저장";
        return;
    }
    try {
        await addDoc(collection(db, "musicbox"), {
            title: title,
            url: url,
            description: description,
            link1: link1,
            link2: link2,
            createdAt: serverTimestamp(),
            userId: auth.currentUser ? auth.currentUser.uid : null
        });
        addMusicMessage.textContent = "음악이 성공적으로 추가되었습니다!";
        addMusicMessage.className = "mt-4 text-sm text-center text-green-500";
        setTimeout(() => {
            closeModal();
            loadAndDisplayMusicData();
        }, 1500);
    } catch (error) {
        console.error("데이터 저장 실패: ", error);
        addMusicMessage.textContent = "데이터 저장에 실패했습니다: " + error.message;
        addMusicMessage.className = "mt-4 text-sm text-center text-red-500";
    } finally {
        saveMusicButton.disabled = false;
        saveMusicButton.textContent = "저장";
    }
});

function mapAuthError(errorCode) {
    switch (errorCode) {
        case "auth/invalid-email": return "잘못된 이메일 형식입니다.";
        case "auth/user-disabled": return "사용 중지된 계정입니다.";
        case "auth/user-not-found": case "auth/wrong-password": case "auth/invalid-credential":
            return "비밀번호가 올바르지 않습니다.";
        case "auth/too-many-requests": return "너무 많은 요청이 있었습니다. 잠시 후 다시 시도해주세요.";
        case "auth/network-request-failed": return "네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.";
        case "auth/captcha-check-failed": return "reCAPTCHA 인증에 실패했습니다.";
        default: return "알 수 없는 오류가 발생했습니다. (" + errorCode + ")";
    }
}
