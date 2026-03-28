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

// --- Customer Memory Logic ---
let savedCustomers = JSON.parse(localStorage.getItem('myCustomers')) || [];

function updateCustomerUI() {
    const list = document.getElementById('customerList');
    list.innerHTML = savedCustomers.map(name => `
        <button onclick="document.getElementById('jc').value='${name}'" class="customer-pill text-[10px] bg-white px-3 py-1 rounded-full border border-slate-200 font-bold hover:bg-blue-50 text-slate-600 shadow-sm">
            + ${name}
        </button>
    `).join('');
}

// --- Cloud Sync ---
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('connectionDot').className = "h-3 w-3 bg-green-500 rounded-full shadow-sm";
    let pending = [], history = [];
    snapshot.forEach(doc => {
        let d = doc.data(); d.id = doc.id;
        d.status === 'pending' ? pending.push(d) : history.push(d);
    });
    render(pending, history);
}, (err) => {
    alert("Cloud Error: Check your Firebase Rules!");
});

// --- Actions ---
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Enter Issue and Customer Name");

    // Save Customer to local memory
    const custName = c.value.trim();
    if (!savedCustomers.includes(custName)) {
        savedCustomers.push(custName);
        localStorage.setItem('myCustomers', JSON.stringify(savedCustomers));
        updateCustomerUI();
    }

    await addDoc(jobsCol, { 
        title: t.value, client: custName, priority: parseInt(p.value), 
        status: 'pending', notes: [], createdAt: Date.now() 
    });
    
    t.value = ''; c.value = '';
};

window.addNote = async (id, notes) => {
    const inp = document.getElementById(`n-${id}`);
    if (!inp.value) return;
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    notes.push(`[${time}] ${inp.value}`);
    await updateDoc(doc(db, "jobs", id), { notes });
    inp.value = '';
};

window.toggleLog = (id) => {
    const log = document.getElementById(`logbox-${id}`);
    log.classList.toggle('hidden');
};

window.finishJob = async (id) => {
    await updateDoc(doc(db, "jobs", id), { status: 'completed', date: new Date().toLocaleDateString() });
};

window.restoreJob = async (id) => {
    await updateDoc(doc(db, "jobs", id), { status: 'pending' });
};

// --- Render Engine ---
function render(pending, history) {
    const pV = document.getElementById('pV'), cV = document.getElementById('cV');
    pending.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);

    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    pV.innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-bold text-slate-800 text-lg">${j.priority === 3 ? '🚨 ' : ''}${j.title}</h3>
                    <p class="text-[10px] text-blue-600 font-black uppercase tracking-wider">${j.client} <span class="ml-1 text-slate-300">▼ Log</span></p>
                </div>
                <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">Done</button>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map(n => `<div class="text-[11px] bg-slate-50 p-2 border-l-2 border-blue-500 rounded">${n}</div>`).join('')}</div>
                <div class="flex gap-2">
                    <input id="n-${j.id}" class="flex-1 text-xs p-2 border rounded-lg bg-slate-50 outline-none focus:ring-1 focus:ring-blue-400" placeholder="Add technical note...">
                    <button onclick='window.addNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-3 py-1 rounded-lg text-[10px] font-bold">Add</button>
                </div>
            </div>
        </div>
    `).join('');

    cV.innerHTML = history.map(j => `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm opacity-90 mb-3">
            <div onclick="window.toggleLog('${j.id}')" class="flex justify-between items-center cursor-pointer">
                <div>
                    <div class="font-bold text-slate-400 line-through text-sm">${j.title}</div>
                    <div class="text-[9px] text-slate-400 font-bold uppercase">${j.client} • Fixed: ${j.date} <span class="text-blue-400 ml-1">View Log ▶</span></div>
                </div>
                <button onclick="window.restoreJob('${j.id}')" class="text-blue-500 text-[10px] font-bold px-2 py-1 bg-blue-50 rounded-lg">Restore</button>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-3 pt-3 border-t bg-slate-50 p-3 rounded-lg">
                <p class="text-[9px] font-black text-slate-400 mb-2 uppercase tracking-widest">Technician Notes:</p>
                ${j.notes.map(n => `<div class="text-[10px] text-slate-600 mb-1 pb-1 border-b border-slate-100">${n}</div>`).join('') || '<p class="text-[10px] italic">No notes recorded.</p>'}
            </div>
        </div>
    `).join('');
}

// Initializing the app
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
    updateCustomerUI();
});
