// CREDENTIALS & DEFAULTS
const ADMIN_USER = "Nazwa";
const ADMIN_PASS = "nazwa123";

let profileData = {};
let materiData = [];
let tugasData = [];

// INITIAL LOAD
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("educlass_logged_in") === "true") {
        showDashboard();
    } else {
        document.getElementById("loginPage").style.display = "flex";
        document.getElementById("dashboardPage").style.display = "none";
    }
    
    if (localStorage.getItem("educlass_theme") === "dark") {
        document.body.classList.add("dark-mode");
        const icon = document.getElementById("themeIcon");
        if (icon) icon.className = "fa-solid fa-sun";
    }

    startRealtimeClock();
});

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("educlass_theme", isDark ? "dark" : "light");

    const icon = document.getElementById("themeIcon");
    if (icon) {
        icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
    }
}

function handleMainLogin(e) {
    e.preventDefault();
    const user = document.getElementById("loginUsername").value.trim();
    const pass = document.getElementById("loginPassword").value;

    if ((user.toLowerCase() === ADMIN_USER.toLowerCase()) && pass === ADMIN_PASS) {
        if (document.getElementById("rememberMe").checked) {
            localStorage.setItem("educlass_logged_in", "true");
        }
        showDashboard();
    } else {
        alert("Username atau Password salah! 🥺 (Gunakan: Nazwa / nazwa123)");
    }
}

function handleLogout() {
    localStorage.removeItem("educlass_logged_in");
    document.getElementById("dashboardPage").style.display = "none";
    document.getElementById("loginPage").style.display = "flex";
    document.getElementById("mainLoginForm").reset();
}

function showDashboard() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("dashboardPage").style.display = "block";
    fetchDataFromServer();
}

function togglePasswordVisibility() {
    const passInput = document.getElementById("loginPassword");
    const eyeIcon = document.getElementById("togglePasswordIcon");

    if (passInput.type === "password") {
        passInput.type = "text";
        eyeIcon.classList.remove("fa-eye-slash");
        eyeIcon.classList.add("fa-eye");
    } else {
        passInput.type = "password";
        eyeIcon.classList.remove("fa-eye");
        eyeIcon.classList.add("fa-eye-slash");
    }
}

function startRealtimeClock() {
    function updateClock() {
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const wibTime = new Date(utc + (3600000 * 7));

        const hours = String(wibTime.getHours()).padStart(2, '0');
        const minutes = String(wibTime.getMinutes()).padStart(2, '0');
        const seconds = String(wibTime.getSeconds()).padStart(2, '0');
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateString = wibTime.toLocaleDateString('id-ID', options);

        const clockEl = document.getElementById("realtimeClock");
        const dateEl = document.getElementById("realtimeDate");

        if (clockEl) clockEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${hours}:${minutes}:${seconds} WIB`;
        if (dateEl) dateEl.innerText = dateString;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

function fetchDataFromServer() {
    fetch('/api/data')
        .then(res => res.json())
        .then(data => {
            profileData = data.profile || {};
            materiData = data.materi || [];
            tugasData = data.tugas || [];
            loadProfile();
            updateDashboardStats();
            populateMatkulFilters();
            renderData();
            checkDeadlineNotifications();
        })
        .catch(err => console.error("Gagal mengambil data dari server:", err));
}

function checkDeadlineNotifications() {
    const alertsContainer = document.getElementById("dashboardDeadlineAlerts");
    if (!alertsContainer) return;
    alertsContainer.innerHTML = "";

    const now = new Date();

    tugasData.forEach(tugas => {
        if (tugas.deadline && tugas.status !== "Selesai") {
            const dl = new Date(tugas.deadline);
            const diffHours = (dl - now) / (1000 * 60 * 60);

            if (diffHours > 0 && diffHours <= 48) {
                showToast(`⚠️ Deadline Dekat: ${tugas.judul} (${Math.round(diffHours)} jam lagi!)`, 'warning');

                alertsContainer.innerHTML += `
                    <div class="alert-item">
                        <div>
                            <strong>${tugas.matkul}</strong> - ${tugas.judul}
                            <br><small style="color:#e11d48;"><i class="fa-solid fa-clock"></i> Deadline: ${new Date(tugas.deadline).toLocaleString('id-ID')}</small>
                        </div>
                        <button class="btn btn-sm btn-pink-cute" onclick="switchSection('tugas')">Lihat</button>
                    </div>
                `;
            } else if (diffHours < 0) {
                alertsContainer.innerHTML += `
                    <div class="alert-item" style="background:#ffe4e6;">
                        <div>
                            <strong style="color:#e11d48;">Terlambat:</strong> ${tugas.judul} (${tugas.matkul})
                        </div>
                        <button class="btn btn-sm btn-danger" onclick="switchSection('tugas')">Detail</button>
                    </div>
                `;
            }
        }
    });

    if (alertsContainer.innerHTML === "") {
        alertsContainer.innerHTML = "<p style='color:#64748b; font-size:0.9rem;'>Tidak ada deadline mendesak saat ini. Aman! 🎉</p>";
    }
}

function showToast(msg, type = 'info') {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<i class="fa-solid fa-bell"></i> <span>${msg}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function updateDashboardStats() {
    document.getElementById("statTotalMateri").innerText = materiData.length;
    document.getElementById("statTotalTugas").innerText = tugasData.length;

    const selesai = tugasData.filter(t => t.status === "Selesai").length;
    const belumSelesai = tugasData.filter(t => t.status !== "Selesai").length;

    document.getElementById("statTugasSelesai").innerText = selesai;
    document.getElementById("statTugasBelumSelesai").innerText = belumSelesai;
}

function switchSection(secId) {
    document.querySelectorAll(".page-section").forEach(sec => sec.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));

    if (secId === 'dashboard') {
        document.getElementById("sectionDashboard").classList.add("active");
        document.querySelectorAll(".nav-item")[0].classList.add("active");
    } else if (secId === 'materi') {
        document.getElementById("sectionMateri").classList.add("active");
        document.querySelectorAll(".nav-item")[1].classList.add("active");
    } else if (secId === 'tugas') {
        document.getElementById("sectionTugas").classList.add("active");
        document.querySelectorAll(".nav-item")[2].classList.add("active");
    }
}

function populateMatkulFilters() {
    const matkulMateriSel = document.getElementById("filterMatkulMateri");
    const matkulTugasSel = document.getElementById("filterMatkulTugas");

    const allMatkulMateri = [...new Set(materiData.map(m => m.matkul))];
    const allMatkulTugas = [...new Set(tugasData.map(t => t.matkul))];

    if (matkulMateriSel) {
        matkulMateriSel.innerHTML = '<option value="ALL">Semua Mata Kuliah</option>';
        allMatkulMateri.forEach(m => {
            matkulMateriSel.innerHTML += `<option value="${m}">${m}</option>`;
        });
    }

    if (matkulTugasSel) {
        matkulTugasSel.innerHTML = '<option value="ALL">Semua Mata Kuliah</option>';
        allMatkulTugas.forEach(t => {
            matkulTugasSel.innerHTML += `<option value="${t}">${t}</option>`;
        });
    }
}

function loadProfile() {
    document.getElementById("sidebarNama").innerText = profileData.nama || "Nazwa";
    document.getElementById("sidebarNimClass").innerText = `TI24D`;
}

function openProfileModal() {
    document.getElementById("inputNama").value = profileData.nama || '';
    document.getElementById("inputNim").value = profileData.nim || '';
    document.getElementById("inputKelas").value = profileData.kelas || '';
    document.getElementById("profileModal").style.display = "flex";
}

function saveProfile(e) {
    e.preventDefault();
    const payload = {
        nama: document.getElementById("inputNama").value,
        nim: document.getElementById("inputNim").value,
        kelas: document.getElementById("inputKelas").value
    };

    fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => {
        profileData = res.profile;
        loadProfile();
        closeModal("profileModal");
        alert("Profil berhasil diperbarui! ✨");
    })
    .catch(err => alert("Gagal memperbarui profil"));
}

function applyFilters() {
    renderData();
}

function renderData() {
    const materiContainer = document.getElementById("materiList");
    const tugasContainer = document.getElementById("tugasList");

    const filterMatkulM = document.getElementById("filterMatkulMateri")?.value || "ALL";
    const filterMatkulT = document.getElementById("filterMatkulTugas")?.value || "ALL";

    let filteredMateri = materiData;
    if (filterMatkulM !== "ALL") {
        filteredMateri = materiData.filter(m => m.matkul === filterMatkulM);
    }

    materiContainer.innerHTML = "";
    if (filteredMateri.length === 0) {
        materiContainer.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#64748b; padding: 20px;'>Tidak ada materi perkuliahan 📚</p>";
    } else {
        filteredMateri.forEach((item) => {
            materiContainer.innerHTML += createCardHTML(item, 'materi');
        });
    }

    let filteredTugas = tugasData;
    if (filterMatkulT !== "ALL") {
        filteredTugas = tugasData.filter(t => t.matkul === filterMatkulT);
    }

    tugasContainer.innerHTML = "";
    if (filteredTugas.length === 0) {
        tugasContainer.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color:#64748b; padding: 20px;'>Tidak ada deadline tugas 📝</p>";
    } else {
        filteredTugas.forEach((item) => {
            tugasContainer.innerHTML += createCardHTML(item, 'tugas');
        });
    }
}

function createCardHTML(item, type) {
    const isTugas = type === 'tugas';
    
    let fileLink = item.filePath ? `<a href="${item.filePath}" download="${item.fileName}" class="btn btn-sm btn-secondary"><i class="fa-solid fa-cloud-arrow-down"></i> Unduh File (${item.fileName})</a>` : (item.fileName ? `<span style="font-size: 0.8rem; color:#64748b;"><i class="fa-solid fa-paperclip"></i> ${item.fileName}</span>` : '');

    let deadlineHTML = isTugas && item.deadline ? `<div class="card-deadline"><i class="fa-regular fa-clock"></i> Deadline: ${new Date(item.deadline).toLocaleString('id-ID')}</div>` : '';

    let statusBadgeHTML = '';
    let statusActionHTML = '';

    if (isTugas) {
        const st = item.status || "Belum Dikerjakan";
        let badgeClass = "status-belum-dikerjakan";
        if (st === "Sedang Dikerjakan") badgeClass = "status-sedang-dikerjakan";
        else if (st === "Selesai") badgeClass = "status-selesai";
        else if (st === "Terlambat") badgeClass = "status-terlambat";

        statusBadgeHTML = `
            <div style="margin-top:8px;">
                <span class="status-badge-custom ${badgeClass}">${st}</span>
                <select class="cute-select" style="font-size:0.75rem; padding:3px 8px;" onchange="updateTugasStatus('${item.id}', this.value)">
                    <option value="Belum Dikerjakan" ${st === 'Belum Dikerjakan' ? 'selected' : ''}>Belum Dikerjakan</option>
                    <option value="Sedang Dikerjakan" ${st === 'Sedang Dikerjakan' ? 'selected' : ''}>Sedang Dikerjakan</option>
                    <option value="Selesai" ${st === 'Selesai' ? 'selected' : ''}>Selesai</option>
                    <option value="Terlambat" ${st === 'Terlambat' ? 'selected' : ''}>Terlambat</option>
                </select>
            </div>
        `;

        const historyCount = item.history ? item.history.length : 0;
        statusActionHTML = `
            <div style="margin-top: 10px; display:flex; gap:8px; flex-wrap:wrap;">
                <button class="btn btn-sm btn-pink-cute" onclick="openSubmitModal('${item.id}', '${item.judul}')">
                    <i class="fa-solid fa-upload"></i> Upload Tugas
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openHistoryModal('${item.id}')">
                    <i class="fa-solid fa-clock-rotate-left"></i> Riwayat (${historyCount})
                </button>
            </div>
        `;
    }

    let editDeleteBtns = `
        <div>
            <button class="btn btn-sm btn-secondary" onclick="openFormModal('${type}', '${item.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-sm btn-danger" onclick="deleteData('${type}', '${item.id}')"><i class="fa-solid fa-trash-can"></i></button>
        </div>
    `;

    return `
        <div class="card ${isTugas ? 'tugas-card' : ''}">
            <div>
                <span class="card-tag">${item.matkul}</span>
                <h3>${item.judul}</h3>
                ${deadlineHTML}
                ${statusBadgeHTML}
                <p>${item.catatan || ''}</p>
            </div>
            <div>
                ${fileLink}
                ${statusActionHTML}
                <div class="card-footer">
                    <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">#${type.toUpperCase()}</span>
                    ${editDeleteBtns}
                </div>
            </div>
        </div>
    `;
}

function updateTugasStatus(tugasId, newStatus) {
    fetch(`/api/tugas/status/${tugasId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => res.json())
    .then(res => {
        fetchDataFromServer();
    });
}

function openFormModal(dataType, itemId = null) {
    document.getElementById("formDataType").value = dataType;
    const isEdit = itemId !== null;

    document.getElementById("modalFormTitle").innerText = isEdit ? `Edit ${dataType.toUpperCase()} ✨` : `Upload/Tambah ${dataType.toUpperCase()} ✨`;
    document.getElementById("editItemId").value = isEdit ? itemId : "";

    document.getElementById("fieldDeadline").style.display = dataType === 'tugas' ? 'block' : 'none';
    document.getElementById("fieldStatus").style.display = dataType === 'tugas' ? 'block' : 'none';

    if (isEdit) {
        const list = dataType === 'materi' ? materiData : tugasData;
        const item = list.find(i => i.id === itemId);
        if (item) {
            document.getElementById("formMatkul").value = item.matkul;
            document.getElementById("formJudul").value = item.judul;
            document.getElementById("formCatatan").value = item.catatan || "";
            if (dataType === 'tugas') {
                document.getElementById("formDeadline").value = item.deadline || "";
                document.getElementById("formStatus").value = item.status || "Belum Dikerjakan";
            }
            document.getElementById("fileInfoText").innerText = item.fileName ? `File tersimpan: ${item.fileName}` : "";
        }
    } else {
        document.getElementById("dataForm").reset();
        document.getElementById("fileInfoText").innerText = "";
    }

    document.getElementById("formModal").style.display = "flex";
}

function handleSaveData(e) {
    e.preventDefault();
    const dataType = document.getElementById("formDataType").value;
    const itemId = document.getElementById("editItemId").value;
    const matkul = document.getElementById("formMatkul").value;
    const judul = document.getElementById("formJudul").value;
    const catatan = document.getElementById("formCatatan").value;
    const deadline = document.getElementById("formDeadline").value;
    const status = document.getElementById("formStatus").value;
    const fileInput = document.getElementById("formFile");

    const formData = new FormData();
    formData.append("type", dataType);
    formData.append("matkul", matkul);
    formData.append("judul", judul);
    formData.append("catatan", catatan);
    if (dataType === 'tugas') {
        formData.append("deadline", deadline);
        formData.append("status", status);
    }
    
    if (fileInput.files && fileInput.files[0]) {
        formData.append("file", fileInput.files[0]);
    }

    let url = '/api/item';
    let method = 'POST';

    if (itemId !== "") {
        url = `/api/item/${dataType}/${itemId}`;
        method = 'PUT';
    }

    fetch(url, {
        method: method,
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        closeModal("formModal");
        fetchDataFromServer();
    })
    .catch(err => {
        alert("Terjadi kesalahan saat menyimpan data.");
    });
}

function openSubmitModal(tugasId, tugasJudul) {
    document.getElementById("submitTaskId").value = tugasId;
    document.getElementById("submitTaskTitle").innerText = `Tugas: ${tugasJudul}`;
    document.getElementById("submitTaskForm").reset();
    document.getElementById("submitModal").style.display = "flex";
}

function handleUploadTugas(e) {
    e.preventDefault();
    const tugasId = document.getElementById("submitTaskId").value;
    const fileInput = document.getElementById("submitFile");

    if (!fileInput.files || !fileInput.files[0]) {
        alert("Pilih file terlebih dahulu!");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("type", "pengumpulan");

    fetch(`/api/submit-tugas/${tugasId}`, {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        alert(res.message);
        closeModal("submitModal");
        fetchDataFromServer();
    })
    .catch(err => alert("Gagal mengumpulkan tugas."));
}

function openHistoryModal(tugasId) {
    const tugas = tugasData.find(t => t.id === tugasId);
    if (!tugas) return;

    document.getElementById("historyTaskTitle").innerText = `Tugas: ${tugas.judul} (${tugas.matkul})`;
    const container = document.getElementById("historyListContainer");
    container.innerHTML = "";

    if (!tugas.history || t.history.length === 0) {
        container.innerHTML = "<p style='color:#64748b; text-align:center;'>Belum ada riwayat pengumpulan tugas 📜</p>";
    } else {
        tugas.history.forEach((h, idx) => {
            const dateStr = new Date(h.date).toLocaleString('id-ID');
            container.innerHTML += `
                <div class="history-item">
                    <div>
                        <strong>#${tugas.history.length - idx} ${h.fileName}</strong>
                        <br><small style="color:#64748b;"><i class="fa-solid fa-clock"></i> ${dateStr}</small>
                    </div>
                    <a href="${h.filePath}" download="${h.fileName}" class="btn btn-sm btn-primary-cute">
                        <i class="fa-solid fa-download"></i> Unduh
                    </a>
                </div>
            `;
        });
    }

    document.getElementById("historyModal").style.display = "flex";
}

function deleteData(type, id) {
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
        fetch(`/api/item/${type}/${id}`, {
            method: 'DELETE'
        })
        .then(res => res.json())
        .then(res => {
            alert(res.message);
            fetchDataFromServer();
        })
        .catch(err => alert("Gagal menghapus data"));
    }
}

function filterData() {
    const keyword = document.getElementById("searchInput").value.toLowerCase();
    const cards = document.querySelectorAll(".card");

    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        if (text.includes(keyword)) {
            card.style.display = "flex";
        } else {
            card.style.display = "none";
        }
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = "none";
    }
};
