import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDQ-z3DZqCULVOMlMNxXRhKUa9pHlhKwUc",
    authDomain: "workbasetrial.firebaseapp.com",
    projectId: "workbasetrial",
    storageBucket: "workbasetrial.firebasestorage.app",
    messagingSenderId: "122123476567",
    appId: "1:122123476567:web:aa60037c0393daeadc0d12"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const jobsCol = collection(db, "jobs");

// --- Real-time Sync ---
const q = query(jobsCol, orderBy("createdAt", "desc"));
onSnapshot(q, (snapshot) => {
    document.getElementById('connectionDot').classList.replace('bg-red-500', 'bg-green-500');
    let pending = [], history = [];
    snapshot.forEach(doc => {
        let d = doc.data(); d.id = doc.id;
        d.status === 'pending' ? pending.push(d) : history.push(d);
    });
    render(pending, history);
});

// --- Actions ---
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value) return;
    await addDoc(jobsCol, { 
        title: t.value, 
        client: c.value || "Site", 
        priority: parseInt(p.value), 
        status: 'pending', 
        notes: [], 
        createdAt: Date.now() 
    });
    t.value = ''; c.value = '';
};

window.addNote = async (id, currentNotes) => {
    const inp = document.getElementById(`n-${id}`);
    if (!inp.value) return;
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    currentNotes.push(`[${time}] ${inp.value}`);
    await updateDoc(doc(db, "jobs", id), { notes: currentNotes });
    inp.value = '';
};

window.toggleLog = (id) => {
    const el = document.getElementById(`logbox-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    el.classList.toggle('hidden');
    if (arrow) arrow.innerText = el.classList.contains('hidden') ? '▶' : '▼';
};

window.finishJob = async (id) => {
    await updateDoc(doc(db, "jobs", id), { status: 'completed', date: new Date().toLocaleDateString() });
};

window.restoreJob = async (id) => {
    await updateDoc(doc(db, "jobs", id), { status: 'pending' });
};

// --- Rendering & Sorting ---
function render(pending, history) {
    const pV = document.getElementById('pV'), cV = document.getElementById('cV');
    
    // Sort: Priority First (3-2-1), then Time
    pending.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);

    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    // Render Active Jobs
    pV.innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-bold text-slate-800">${j.priority === 3 ? '🚨 ' : ''}${j.title}</h3>
                    <p class="text-[10px] text-blue-600 font-bold uppercase">${j.client} <span id="arrow-${j.id}" class="ml-1 text-slate-400">▶</span></p>
                </div>
                <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-md">Done</button>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map(n => `<div class="text-[11px] bg-slate-50 p-2 border-l-2 border-blue-500 rounded mb-1 note-item">${n}</div>`).join('')}</div>
                <div class="flex gap-2">
                    <input id="n-${j.id}" class="flex-1 text-xs p-2 border rounded-lg bg-slate-50" placeholder="Update technical log...">
                    <button onclick='window.addNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-3 py-1 rounded-lg text-[10px] font-bold">Add</button>
                </div>
            </div>
        </div>
    `).join('');

    // Render History with Log Viewer
    cV.innerHTML = history.map(j => `
        <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm opacity-90 history-card">
            <div class="flex justify-between items-center">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <div class="font-bold text-slate-400 line-through text-sm">${j.title}</div>
                    <div class="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">${j.client} • Fixed: ${j.date} <span id="arrow-${j.id}" class="text-blue-400 ml-1">View Log ▶</span></div>
                </div>
                <button onclick="window.restoreJob('${j.id}')" class="text-blue-500 text-[10px] font-bold px-2 py-1 bg-blue-50 rounded">Restore</button>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-2 pt-2 border-t border-slate-100 bg-slate-50 p-2 rounded">
                <p class="text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest">Resolution Steps:</p>
                ${j.notes.map(n => `<div class="text-[10px] text-slate-500 mb-1 border-b border-slate-100 pb-1">${n}</div>`).join('') || '<p class="text-[10px] italic text-slate-300">No notes found.</p>'}
            </div>
        </div>
    `).join('');
}

// Tab Switching and Button Binding
document.getElementById('pTabBtn').onclick = () => {
    document.getElementById('pV').classList.remove('hidden'); document.getElementById('cV').classList.add('hidden');
    document.getElementById('pTabBtn').classList.add('tab-active'); document.getElementById('cTabBtn').classList.remove('tab-active');
};
document.getElementById('cTabBtn').onclick = () => {
    document.getElementById('cV').classList.remove('hidden'); document.getElementById('pV').classList.add('hidden');
    document.getElementById('cTabBtn').classList.add('tab-active'); document.getElementById('pTabBtn').classList.remove('tab-active');
};
document.getElementById('addBtn').onclick = window.addJob;
