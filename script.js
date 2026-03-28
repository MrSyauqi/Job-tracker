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

let openLogs = new Set(); 

onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('connectionDot').className = "h-3 w-3 bg-green-500 rounded-full shadow-sm";
    let pending = [], history = [];
    let customers = new Set();

    snapshot.forEach(doc => {
        let d = doc.data(); d.id = doc.id;
        if (d.client) customers.add(d.client);
        d.status === 'pending' ? pending.push(d) : history.push(d);
    });

    const datalist = document.getElementById('customerData');
    datalist.innerHTML = Array.from(customers).map(name => `<option value="${name}">`).join('');
    render(pending, history);
});

window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Fill all fields");
    await addDoc(jobsCol, { 
        title: t.value, client: c.value.trim(), priority: parseInt(p.value), 
        status: 'pending', notes: [], createdAt: Date.now() 
    });
    t.value = ''; c.value = '';
};

window.saveNote = async (id, currentNotes) => {
    const inp = document.getElementById(`n-${id}`);
    if (!inp.value) return;
    const now = new Date();
    const timeStamp = `[${now.getDate()}/${now.getMonth()+1} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}]`;
    openLogs.add(id); 
    const newNotes = [...currentNotes, `${timeStamp} ${inp.value}`];
    await updateDoc(doc(db, "jobs", id), { notes: newNotes });
    inp.value = '';
};

// NEW: Function to delete a specific log entry
window.deleteNote = async (jobId, noteIndex, currentNotes) => {
    if(!confirm("Delete this log entry?")) return;
    openLogs.add(jobId);
    currentNotes.splice(noteIndex, 1);
    await updateDoc(doc(db, "jobs", jobId), { notes: currentNotes });
};

// NEW: Function to delete an entire job permanently
window.deleteJob = async (id) => {
    if(!confirm("Permanently delete this entire job record?")) return;
    openLogs.delete(id);
    await deleteDoc(doc(db, "jobs", id));
};

window.toggleLog = (id) => {
    if (openLogs.has(id)) { openLogs.delete(id); } else { openLogs.add(id); }
    renderCurrentLists(); 
};

function renderCurrentLists() {
    const allLogs = document.querySelectorAll('[id^="logbox-"]');
    allLogs.forEach(box => {
        const id = box.id.split('-')[1];
        if (openLogs.has(id)) box.classList.remove('hidden'); else box.classList.add('hidden');
    });
}

window.finishJob = async (id) => {
    openLogs.delete(id);
    await updateDoc(doc(db, "jobs", id), { status: 'completed', date: new Date().toLocaleDateString() });
};

window.restoreJob = async (id) => {
    await updateDoc(doc(db, "jobs", id), { status: 'pending' });
};

function render(pending, history) {
    const pV = document.getElementById('pV'), cV = document.getElementById('cV');
    pending.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);
    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    pV.innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-black text-slate-800 text-lg uppercase leading-tight">${j.client}</h3>
                    <p class="text-xs text-blue-600 font-bold mt-1 uppercase tracking-tight">${j.title}</p>
                    <span class="text-[9px] text-slate-300 font-bold uppercase mt-1 inline-block tracking-widest">▼ LOG</span>
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">Done</button>
                    <button onclick="window.deleteJob('${j.id}')" class="text-[10px] text-red-400 font-bold hover:text-red-600">Delete Job</button>
                </div>
            </div>
            <div id="logbox-${j.id}" class="${openLogs.has(j.id) ? '' : 'hidden'} mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">
                    ${j.notes.map((n, index) => `
                        <div class="flex justify-between items-center bg-slate-50 p-2 border-l-2 border-blue-500 rounded">
                            <span class="text-[11px] font-medium text-slate-700">${n}</span>
                            <button onclick='window.deleteNote("${j.id}", ${index}, ${JSON.stringify(j.notes)})' class="text-slate-300 hover:text-red-500 px-2 text-xs">×</button>
                        </div>
                    `).join('')}
                </div>
                <div class="flex gap-2">
                    <input id="n-${j.id}" class="flex-1 text-xs p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-400" placeholder="Technical log...">
                    <button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-4 py-1 rounded-lg text-[10px] font-bold">Update</button>
                </div>
            </div>
        </div>
    `).join('');

    cV.innerHTML = history.map(j => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm opacity-90 mb-3">
            <div onclick="window.toggleLog('${j.id}')" class="flex justify-between items-center cursor-pointer">
                <div>
                    <div class="font-black text-slate-500 text-sm uppercase">${j.client}</div>
                    <div class="text-[10px] text-slate-400 font-bold tracking-tight">${j.title} • Fixed: ${j.date}</div>
                </div>
                <div class="flex gap-3 items-center">
                    <button onclick="window.restoreJob('${j.id}')" class="text-blue-500 text-[10px] font-bold px-2 py-1 bg-blue-50 rounded-lg">Restore</button>
                    <button onclick="window.deleteJob('${j.id}')" class="text-red-400 text-xs font-bold px-2">Delete</button>
                </div>
            </div>
            <div id="logbox-${j.id}" class="${openLogs.has(j.id) ? '' : 'hidden'} mt-3 pt-3 border-t bg-slate-50 p-3 rounded-lg">
                ${j.notes.map(n => `<div class="text-[10px] text-slate-600 mb-1 pb-1 border-b border-white">${n}</div>`).join('') || '<p class="text-[10px] italic">No logs.</p>'}
            </div>
        </div>
    `).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addBtn').onclick = window.addJob;
    document.getElementById('pTabBtn').onclick = () => {
        document.getElementById('pV').classList.remove('hidden'); document.getElementById('cV').classList.add('hidden');
        document.getElementById('pTabBtn').classList.add('tab-active'); document.getElementById('cTabBtn').classList.remove('tab-active');
    };
    document.getElementById('cTabBtn').onclick = () => {
        document.getElementById('cV').classList.remove('hidden'); document.getElementById('pV').classList.add('hidden');
        document.getElementById('cTabBtn').classList.add('tab-active'); document.getElementById('pTabBtn').classList.remove('tab-active');
    };
});
