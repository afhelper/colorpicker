import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, getDocs, serverTimestamp, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

// Add Music Modal Elements
const addMusicModal = document.getElementById('addMusicModal');
const closeAddMusicModalButton = document.getElementById('closeAddMusicModalButton');
const cancelAddMusicButton = document.getElementById('cancelAddMusicButton');
const addMusicForm = document.getElementById('addMusicForm');
const saveMusicButton = document.getElementById('saveMusicButton');
const addMusicMessage = document.getElementById('addMusicMessage');

// Edit Music Modal Elements
const editMusicModal = document.getElementById('editMusicModal');
const closeEditMusicModalButton = document.getElementById('closeEditMusicModalButton');
const cancelEditMusicButton = document.getElementById('cancelEditMusicButton');
const editMusicForm = document.getElementById('editMusicForm');
const editMusicMessage = document.getElementById('editMusicMessage');
const editMusicIdInput = document.getElementById('editMusicId');
const editMusicTitleInput = document.getElementById('editMusicTitle');
const editMusicUrlInput = document.getElementById('editMusicUrl');
const editMusicDescriptionInput = document.getElementById('editMusicDescription');
const editMusicLink1Input = document.getElementById('editMusicLink1');
const editMusicLink2Input = document.getElementById('editMusicLink2');

const FIXED_EMAIL = "admin@admin.com";

const fabContainer = document.getElementById('fabContainer');
const fabButton = document.getElementById('fabButton');
const fabIconPlus = document.getElementById('fabIconPlus');
const fabIconClose = document.getElementById('fabIconClose');
const fabActions = document.getElementById('fabActions');
const openAddMusicFab = document.getElementById('openAddMusicFab');
const logoutFab = document.getElementById('logoutFab');

let fabOpen = false;
let isAdminModeActive = false;
let currentOpenDropdown = null;
let currentEditingDocId = null;

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
        isAdminModeActive = false;
        closeAnyOpenDropdown();
        if (fabOpen) {
            fabActions.classList.remove('opacity-100', 'pointer-events-auto', 'translate-y-0');
            fabActions.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
            fabIconPlus.classList.remove('hidden');
            fabIconClose.classList.add('hidden');
            fabOpen = false;
        }
    }
}

onAuthStateChanged(auth, (user) => {
    updateUI(user);
    if (user) console.log("로그인 상태:", user.email);
    else console.log("로그아웃 상태");
});

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

openAddMusicFab.addEventListener('click', () => {
    openAddModal();
    if (fabOpen) fabButton.click();
});

logoutFab.addEventListener('click', async () => {
    if (fabOpen) fabButton.click();
    try {
        await signOut(auth);
    } catch (error) {
        console.error("로그아웃 실패:", error);
        alert("로그아웃 중 오류가 발생했습니다.");
    }
});

async function loadAndDisplayMusicData() {
    if (!auth.currentUser) return;

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
        querySnapshot.forEach((docSnapshot) => {
            const music = docSnapshot.data();
            const musicElement = createMusicItemElement(docSnapshot.id, music);
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
    div.className = "music-item bg-gray-50 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-200";
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
        } else { // URL이 있지만 YouTube나 오디오 파일이 아닌 경우
            playerHtml = `<div class="my-3"><a href="${musicUrl}" target="_blank" class="text-indigo-600 hover:text-indigo-800 hover:underline break-all">콘텐츠 보기/듣기: ${musicUrl}</a></div>`;
        }
    } else { // musicUrl이 비어있는 경우 (선택 사항이므로)
        playerHtml = `<div class="my-3"><p class="text-sm text-gray-500">제공된 음악 URL이 없습니다.</p></div>`;
    }





    function createLinkHtml(linkUrl, linkNumber) {
        let html = '';
        if (linkUrl) {
            const videoInfo = getYouTubeVideoInfo(linkUrl);

            const chainIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 text-gray-500">
      <path stroke-linecap="round" stroke-linejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
    </svg>`;


            const firstLineHtml = `
            <div class="flex items-center space-x-1">
                ${chainIconSvg}
                <span class="text-sm font-medium text-gray-700">#${linkNumber}</span>
            </div>`;

            if (videoInfo) {
                const embedUrl = `https://www.youtube.com/embed/${videoInfo.videoId}`;
                const embedContainerClass = videoInfo.isShorts ? 'youtube-shorts-container' : 'aspect-w-16 aspect-h-9';

                const youtubeIconSvg = `
                <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current text-red-600 transition-colors">
                    <title>YouTube</title>
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>`;

                const shortsBadge = videoInfo.isShorts ? '<span class="text-xs bg-gray-200 text-black-700 px-1.5 py-0.5 rounded-full font-semibold">Shorts</span>' : '';

                let secondLineIconsHtml = '';
                if (shortsBadge) {
                    secondLineIconsHtml = `
                    <div class="flex items-center space-x-1.5 mt-1">
                        ${youtubeIconSvg}
                        ${shortsBadge}
                    </div>`;
                } else {
                    secondLineIconsHtml = `
                    <div class="flex items-center mt-1">
                        ${youtubeIconSvg}
                    </div>`;
                }

                html = `
                <div class="mt-3">
                    <div class="mb-2"> 
                        ${firstLineHtml}
                        ${secondLineIconsHtml}
                    </div>
                    <div class="${embedContainerClass} rounded overflow-hidden shadow-sm">
                        <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                    </div>
                </div>`;
            } else {
                const linkIdentifierWithColonHtml = `
                <div class="flex items-center space-x-1">
                    ${chainIconSvg}
                    <span class="text-sm font-medium text-gray-700">#${linkNumber}:</span>
                </div>`;

                html = `
                <div class="mt-3">
                    <div class="mb-2">
                        ${linkIdentifierWithColonHtml} 
                    </div>
                    <a href="${linkUrl}" target="_blank" class="text-sm text-blue-500 hover:underline break-all block pl-5">
                        ${linkUrl}
                    </a>
                </div>`;
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

    if (isAdminModeActive) {
        addAdminControls(div, id, music);
    }
    return div;
}

async function handleLogin() {
    const passwordVal = passwordInput.value; // 변수명 변경 (전역 password와 충돌 방지)
    const recaptchaResponse = (typeof grecaptcha !== 'undefined') ? grecaptcha.getResponse() : 'test_mode';
    if (!passwordVal) {
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
        await signInWithEmailAndPassword(auth, FIXED_EMAIL, passwordVal);
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

function openAddModal() {
    addMusicForm.reset();
    addMusicMessage.textContent = '';
    addMusicModal.classList.remove('hidden');
    addMusicModal.classList.add('modal-active');
    document.body.classList.add('modal-active');
}

function closeAddModal() {
    addMusicForm.reset();
    addMusicMessage.textContent = '';
    addMusicModal.classList.add('hidden');
    addMusicModal.classList.remove('modal-active');
    document.body.classList.remove('modal-active');
}

closeAddMusicModalButton.addEventListener('click', closeAddModal);
cancelAddMusicButton.addEventListener('click', closeAddModal);
addMusicModal.addEventListener('click', (event) => {
    if (event.target === addMusicModal) closeAddModal();
});

addMusicForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveMusicButton.disabled = true;
    saveMusicButton.textContent = "저장 중...";
    addMusicMessage.textContent = "데이터를 저장하고 있습니다...";
    addMusicMessage.className = "mt-4 text-sm text-center text-gray-500";
    const title = addMusicForm.musicTitle.value.trim();
    const url = addMusicForm.musicUrl.value.trim(); // URL은 이제 필수가 아님
    const description = addMusicForm.musicDescription.value.trim();
    const link1 = addMusicForm.musicLink1.value.trim();
    const link2 = addMusicForm.musicLink2.value.trim();

    // 곡 제목만 필수 항목으로 변경
    if (!title) {
        addMusicMessage.textContent = "곡 제목은 필수입니다.";
        addMusicMessage.className = "mt-4 text-sm text-center text-red-500";
        saveMusicButton.disabled = false;
        saveMusicButton.textContent = "저장";
        return;
    }
    try {
        await addDoc(collection(db, "musicbox"), {
            title: title,
            url: url, // 비어있을 수 있음
            description: description,
            link1: link1,
            link2: link2,
            createdAt: serverTimestamp(),
            userId: auth.currentUser ? auth.currentUser.uid : null
        });
        addMusicMessage.textContent = "음악이 성공적으로 추가되었습니다!";
        addMusicMessage.className = "mt-4 text-sm text-center text-green-500";
        setTimeout(() => {
            closeAddModal();
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

function toggleAdminMode() {
    isAdminModeActive = !isAdminModeActive;
    console.log("관리자 모드:", isAdminModeActive ? "활성화" : "비활성화");
    loadAndDisplayMusicData();
}

function addAdminControls(itemElement, musicId, musicData) {
    if (itemElement.querySelector('.admin-controls-container')) return;

    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'admin-controls-container';

    const moreButton = document.createElement('button');
    moreButton.className = 'more-options-button';
    moreButton.title = '더 보기';
    moreButton.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>

    `;
    moreButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleDropdownMenu(event.currentTarget, musicId, musicData);
    });

    controlsContainer.appendChild(moreButton);
    itemElement.appendChild(controlsContainer);
}

function toggleDropdownMenu(buttonElement, musicId, musicData) {
    closeAnyOpenDropdown(buttonElement.nextSibling);

    let dropdown = buttonElement.nextSibling;
    if (dropdown && dropdown.classList.contains('dropdown-menu')) {
        dropdown.remove();
        currentOpenDropdown = null;
    } else {
        dropdown = createDropdownMenu(musicId, musicData);
        buttonElement.parentNode.appendChild(dropdown);
        currentOpenDropdown = dropdown;
    }
}

function createDropdownMenu(musicId, musicData) {
    const menu = document.createElement('div');
    menu.className = 'dropdown-menu';

    const editButton = document.createElement('button');
    editButton.textContent = '수정';
    editButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(musicId, musicData);
        closeAnyOpenDropdown();
    });

    const deleteButton = document.createElement('button');
    deleteButton.textContent = '삭제';
    deleteButton.className = 'delete-option';
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteMusic(musicId, musicData.title);
        closeAnyOpenDropdown();
    });

    menu.appendChild(editButton);
    menu.appendChild(deleteButton);
    return menu;
}

function closeAnyOpenDropdown(excludeMenu = null) {
    if (currentOpenDropdown && currentOpenDropdown !== excludeMenu) {
        currentOpenDropdown.remove();
        currentOpenDropdown = null;
    }
}

function openEditModal(docId, musicData) {
    currentEditingDocId = docId;
    editMusicIdInput.value = docId;
    editMusicTitleInput.value = musicData.title || '';
    editMusicUrlInput.value = musicData.url || ''; // URL은 필수가 아님
    editMusicDescriptionInput.value = musicData.description || '';
    editMusicLink1Input.value = musicData.link1 || '';
    editMusicLink2Input.value = musicData.link2 || '';

    editMusicMessage.textContent = '';
    editMusicModal.classList.remove('hidden');
    editMusicModal.classList.add('modal-active');
    document.body.classList.add('modal-active');
}

function closeEditModal() {
    editMusicForm.reset();
    editMusicMessage.textContent = '';
    editMusicModal.classList.add('hidden');
    editMusicModal.classList.remove('modal-active');
    document.body.classList.remove('modal-active');
    currentEditingDocId = null;
}

closeEditMusicModalButton.addEventListener('click', closeEditModal);
cancelEditMusicButton.addEventListener('click', closeEditModal);
editMusicModal.addEventListener('click', (event) => {
    if (event.target === editMusicModal) closeEditModal();
});

editMusicForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!currentEditingDocId) return;

    const updateButton = document.getElementById('updateMusicButton');
    updateButton.disabled = true;
    updateButton.textContent = "업데이트 중...";
    editMusicMessage.textContent = "데이터를 업데이트하고 있습니다...";
    editMusicMessage.className = "mt-4 text-sm text-center text-gray-500";

    const updatedMusic = {
        title: editMusicTitleInput.value.trim(),
        url: editMusicUrlInput.value.trim(), // URL은 필수가 아님
        description: editMusicDescriptionInput.value.trim(),
        link1: editMusicLink1Input.value.trim(),
        link2: editMusicLink2Input.value.trim(),
    };

    // 곡 제목만 필수 항목으로 변경 (수정 시에도 동일)
    if (!updatedMusic.title) {
        editMusicMessage.textContent = "곡 제목은 필수입니다.";
        editMusicMessage.className = "mt-4 text-sm text-center text-red-500";
        updateButton.disabled = false;
        updateButton.textContent = "업데이트";
        return;
    }

    try {
        const musicDocRef = doc(db, "musicbox", currentEditingDocId);
        await updateDoc(musicDocRef, updatedMusic);

        editMusicMessage.textContent = "음악 정보가 성공적으로 업데이트되었습니다!";
        editMusicMessage.className = "mt-4 text-sm text-center text-green-500";
        setTimeout(() => {
            closeEditModal();
            loadAndDisplayMusicData();
        }, 1500);

    } catch (error) {
        console.error("데이터 업데이트 실패: ", error);
        editMusicMessage.textContent = "데이터 업데이트에 실패했습니다: " + error.message;
        editMusicMessage.className = "mt-4 text-sm text-center text-red-500";
    } finally {
        updateButton.disabled = false;
        updateButton.textContent = "업데이트";
    }
});

async function handleDeleteMusic(docId, musicTitle = "해당 곡") {
    if (confirm(`"${musicTitle}" 음악을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
        try {
            const musicDocRef = doc(db, "musicbox", docId);
            await deleteDoc(musicDocRef);
            console.log("문서 삭제 완료:", docId);
            const itemToRemove = musicListContainer.querySelector(`.music-item[data-id="${docId}"]`);
            if (itemToRemove) {
                itemToRemove.remove();
                if (musicListContainer.children.length === 0) {
                    musicListContainer.innerHTML = '<p class="text-center text-gray-500">아직 등록된 음악이 없어요. 첫 곡을 추가해보세요!</p>';
                }
            } else {
                loadAndDisplayMusicData();
            }
            alert(`"${musicTitle}"이(가) 삭제되었습니다.`);
        } catch (error) {
            console.error("문서 삭제 실패: ", error);
            alert("삭제 중 오류가 발생했습니다: " + error.message);
        }
    }
}

document.addEventListener('keydown', function (event) {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable;

    if (auth.currentUser && !isInputFocused) {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
            event.preventDefault();
            toggleAdminMode();
        }
    }
});

document.addEventListener('click', (event) => {
    if (currentOpenDropdown &&
        !currentOpenDropdown.contains(event.target) &&
        !event.target.closest('.more-options-button')) {
        closeAnyOpenDropdown();
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