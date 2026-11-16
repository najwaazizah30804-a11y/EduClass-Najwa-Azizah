const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Path direktori
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const UPLOAD_MATERI_PATH = path.join(__dirname, 'public', 'uploads', 'materi');
const UPLOAD_TUGAS_PATH = path.join(__dirname, 'public', 'uploads', 'tugas');
const UPLOAD_PENGUMPULAN_PATH = path.join(__dirname, 'public', 'uploads', 'pengumpulan');

[path.join(__dirname, 'data'), UPLOAD_MATERI_PATH, UPLOAD_TUGAS_PATH, UPLOAD_PENGUMPULAN_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const defaultData = {
    profile: {
        nama: "Nazwa",
        nim: "20241010",
        kelas: "TI24D"
    },
    materi: [
        {
            id: "materi-1",
            matkul: "Pemrograman Web",
            judul: "Pengenalan HTML, CSS & JavaScript",
            catatan: "Pelajari dasar penulisan tag dan manipulasi DOM.",
            filePath: "",
            fileName: ""
        }
    ],
    tugas: [
        {
            id: "tugas-1",
            matkul: "Basis Data (Basdat)",
            judul: "Membuat ERD Sistem Informasi Kampus",
            deadline: "2026-11-05T23:59",
            catatan: "Kumpulkan dalam bentuk PDF atau gambar.",
            filePath: "",
            fileName: "",
            status: "Belum Dikerjakan",
            history: []
        }
    ]
};

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
}

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return defaultData;
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.body.type || req.query.type || 'materi';
        if (type === 'tugas') {
            cb(null, UPLOAD_TUGAS_PATH);
        } else if (type === 'pengumpulan') {
            cb(null, UPLOAD_PENGUMPULAN_PATH);
        } else {
            cb(null, UPLOAD_MATERI_PATH);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

// API ROUTES
app.get('/api/data', (req, res) => {
    const db = readDB();
    const now = new Date();
    db.tugas.forEach(t => {
        if (t.deadline && t.status !== "Selesai") {
            const dl = new Date(t.deadline);
            if (dl < now) {
                t.status = "Terlambat";
            }
        }
    });

    res.json(db);
});

app.put('/api/profile', (req, res) => {
    const db = readDB();
    db.profile = {
        nama: req.body.nama || db.profile.nama,
        nim: req.body.nim || db.profile.nim,
        kelas: req.body.kelas || db.profile.kelas
    };
    writeDB(db);
    res.json({ message: "Profil berhasil diperbarui ✨", profile: db.profile });
});

app.post('/api/item', upload.single('file'), (req, res) => {
    const db = readDB();
    const { type, matkul, judul, catatan, deadline, status } = req.body;
    
    const newItem = {
        id: type + '-' + Date.now(),
        matkul,
        judul,
        catatan: catatan || "",
        fileName: req.file ? req.file.originalname : "",
        filePath: req.file ? `/uploads/${type}/${req.file.filename}` : ""
    };

    if (type === 'tugas') {
        newItem.deadline = deadline || "";
        newItem.status = status || "Belum Dikerjakan";
        newItem.history = [];
        db.tugas.push(newItem);
    } else {
        db.materi.push(newItem);
    }

    writeDB(db);
    res.json({ message: "Data berhasil ditambahkan ✨", item: newItem });
});

app.put('/api/item/:type/:id', upload.single('file'), (req, res) => {
    const db = readDB();
    const { type, id } = req.params;
    const { matkul, judul, catatan, deadline, status } = req.body;

    const list = type === 'tugas' ? db.tugas : db.materi;
    const index = list.findIndex(item => item.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    const currentItem = list[index];
    currentItem.matkul = matkul;
    currentItem.judul = judul;
    currentItem.catatan = catatan || "";

    if (type === 'tugas') {
        currentItem.deadline = deadline || "";
        if (status) currentItem.status = status;
    }

    if (req.file) {
        currentItem.fileName = req.file.originalname;
        currentItem.filePath = `/uploads/${type}/${req.file.filename}`;
    }

    writeDB(db);
    res.json({ message: "Data berhasil diperbarui ✨", item: currentItem });
});

app.put('/api/tugas/status/:id', (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const { status } = req.body;

    const index = db.tugas.findIndex(item => item.id === id);
    if (index !== -1) {
        db.tugas[index].status = status;
        writeDB(db);
        return res.json({ message: "Status tugas diperbarui ✨", item: db.tugas[index] });
    }
    res.status(404).json({ message: "Tugas tidak ditemukan" });
});

app.post('/api/submit-tugas/:id', upload.single('file'), (req, res) => {
    const db = readDB();
    const { id } = req.params;
    const index = db.tugas.findIndex(item => item.id === id);

    if (index === -1) {
        return res.status(404).json({ message: "Tugas tidak ditemukan" });
    }

    if (req.file) {
        if (!db.tugas[index].history) db.tugas[index].history = [];

        const newHistory = {
            fileName: req.file.originalname,
            filePath: `/uploads/pengumpulan/${req.file.filename}`,
            date: new Date().toISOString()
        };

        db.tugas[index].history.unshift(newHistory);
        db.tugas[index].status = "Selesai";
        writeDB(db);

        return res.json({ message: "Tugas berhasil dikumpulkan! 🎉", item: db.tugas[index] });
    } else {
        return res.status(400).json({ message: "File pengumpulan tidak disertakan!" });
    }
});

app.delete('/api/item/:type/:id', (req, res) => {
    const db = readDB();
    const { type, id } = req.params;

    if (type === 'tugas') {
        db.tugas = db.tugas.filter(item => item.id !== id);
    } else {
        db.materi = db.materi.filter(item => item.id !== id);
    }

    writeDB(db);
    res.json({ message: "Data berhasil dihapus 🗑️" });
});

app.listen(PORT, () => {
    console.log(`Server EduClass Nazwa berjalan di http://localhost:${PORT}`);
});
