import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

// This variable remembers which ID you clicked to open
let openLogs = new Set(); 

// --- Real-time Sync ---
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

// --- Actions ---
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Fill all fields");
    await addDoc(jobsCol, { 
        title: t.value, client: c.value.trim(), priority: parseInt(p.value), 
        status: 'pending', notes: [], createdAt: Date.now() 
    });
    t.value = ''; c.value = '';
};

// Fixed Note logic with Date/Time + Keeping the box open
window.saveNote = async (id, currentNotes) => {
    const inp = document.getElementById(`n-${id}`);
    if (!inp.value) return;

    const now = new Date();
    const timeStamp = `[${now.getDate()}/${now.getMonth()+1} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}]`;
    
    // Ensure this ID stays in the 'open' set
    openLogs.add(id);

    const newNotes = [...currentNotes, `${timeStamp} ${inp.value}`];
    await updateDoc(doc(db, "jobs", id), { notes: newNotes });
    inp.value = '';
};

window.toggleLog = (id) => {
    if (openLogs.has(id)) {
        openLogs.delete(id);
    } else {
        openLogs.add(id);
    }
    const logSection = document.getElementById(`logbox-${id}`);
    if (logSection) logSection.classList.toggle('hidden');
};

window.finishJob = async (id) => {
    openLogs.delete(id); // Close it when done
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

    pV.innerHTML = pending.map(j => {
        const isOpen = openLogs.has(j.id) ? '' : 'hidden';
        return `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-bold text-slate-800 text-lg leading-tight">${j.priority === 3 ? '🚨 ' : ''}${j.title}</h3>
                    <p class="text-[10px] text-blue-600 font-black uppercase tracking-wider">${j.client} <span class="ml-1 text-slate-300">▼ Log</span></p>
                </div>
                <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">Done</button>
            </div>
            <div id="logbox-${j.id}" class="${isOpen} mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map(n => `<div class="text-[11px] bg-slate-50 p-2 border-l-2 border-blue-500 rounded font-medium text-slate-700">${n}</div>`).join('')}</div>
                <div class="flex gap-2">
                    <input id="n-${j.id}" class="flex-1 text-xs p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-400" placeholder="Add technical note...">
                    <button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-4 py-1 rounded-lg text-[10px] font-bold">Update</button>
                </div>
            </div>
        </div>
    `}).join('');

    cV.innerHTML = history.map(j => {
        const isOpen = openLogs.has(j.id) ? '' : 'hidden';
        return `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm opacity-90 mb-3">
            <div onclick="window.toggleLog('${j.id}')" class="flex justify-between items-center cursor-pointer">
                <div>
                    <div class="font-bold text-slate-400 line-through text-sm">${j.title}</div>
                    <div class="text-[9px] text-slate-400 font-bold uppercase">${j.client} • Fixed: ${j.date} <span class="text-blue-400 ml-1 font-black">History ▶</span></div>
                </div>
                <button onclick="window.restoreJob('${j.id}')" class="text-blue-500 text-[10px] font-bold px-2 py-1 bg-blue-50 rounded-lg">Restore</button>
            </div>
            <div id="logbox-${j.id}" class="${isOpen} mt-3 pt-3 border-t bg-slate-50 p-3 rounded-lg">
                ${j.notes.map(n => `<div class="text-[10px] text-slate-600 mb-1 pb-1 border-b border-white">${n}</div>`).join('') || '<p class="text-[10px] italic text-slate-400 text-center">No logs recorded.</p>'}
            </div>
        </div>
    `}).join('');
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
