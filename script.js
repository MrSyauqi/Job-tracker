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
    let allData = [];

    snapshot.forEach(doc => {
        let d = doc.data(); d.id = doc.id;
        allData.push(d);
        if (d.client) customers.add(d.client);
        d.status === 'pending' ? pending.push(d) : history.push(d);
    });

    const datalist = document.getElementById('customerData');
    if(datalist) datalist.innerHTML = Array.from(customers).map(name => `<option value="${name}">`).join('');
    
    render(pending, history);
    renderStats(allData);
});

// ACTIONS
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Fill fields");
    await addDoc(jobsCol, { title: t.value, client: c.value.trim(), priority: parseInt(p.value), status: 'pending', notes: [], createdAt: Date.now() });
    t.value = ''; c.value = '';
};

window.saveNote = async (id, currentNotes) => {
    const inp = document.getElementById(`n-${id}`);
    if (!inp.value) return;
    const now = new Date();
    const ts = `[${now.getDate()}/${now.getMonth()+1} ${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}]`;
    openLogs.add(id); 
    const newNotes = [...currentNotes, `${ts} ${inp.value}`];
    await updateDoc(doc(db, "jobs", id), { notes: newNotes });
    inp.value = '';
};

window.deleteNote = async (jobId, index, notes) => {
    if(!confirm("Delete log?")) return;
    openLogs.add(jobId);
    notes.splice(index, 1);
    await updateDoc(doc(db, "jobs", jobId), { notes: notes });
};

window.deleteJob = async (id) => {
    if(!confirm("Delete permanently?")) return;
    await deleteDoc(doc(db, "jobs", id));
};

window.toggleLog = (id) => {
    if (openLogs.has(id)) { openLogs.delete(id); } else { openLogs.add(id); }
    renderCurrentLists(); 
};

function renderCurrentLists() {
    document.querySelectorAll('[id^="logbox-"]').forEach(box => {
        const id = box.id.split('-')[1];
        if (openLogs.has(id)) box.classList.remove('hidden'); else box.classList.add('hidden');
    });
}

window.finishJob = async (id) => {
    openLogs.delete(id);
    await updateDoc(doc(db, "jobs", id), { status: 'completed', date: new Date().toLocaleDateString() });
};

window.restoreJob = async (id) => await updateDoc(doc(db, "jobs", id), { status: 'pending' });

function renderStats(data) {
    const sV = document.getElementById('sV');
    const stats = data.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = { p: 0, c: 0 };
        job.status === 'pending' ? acc[job.client].p++ : acc[job.client].c++;
        return acc;
    }, {});

    let html = `<div class="bg-blue-600 text-white p-4 rounded-2xl shadow-md mb-4">
                    <p class="text-[10px] font-black uppercase opacity-70">Total Efficiency</p>
                    <h2 class="text-3xl font-black">${Math.round((data.filter(j=>j.status==='completed').length / data.length || 0) * 100)}%</h2>
                </div>`;

    for (let client in stats) {
        html += `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h4 class="font-black text-slate-800 uppercase text-sm mb-2 border-b pb-1">${client}</h4>
            <div class="flex gap-4">
                <div class="flex-1 text-center border-r">
                    <p class="text-[9px] font-bold text-slate-400">ACTIVE</p>
                    <p class="text-xl font-black text-blue-600">${stats[client].p}</p>
                </div>
                <div class="flex-1 text-center">
                    <p class="text-[9px] font-bold text-slate-400">COMPLETED</p>
                    <p class="text-xl font-black text-emerald-500">${stats[client].c}</p>
                </div>
            </div>
        </div>`;
    }
    sV.innerHTML = html;
}

function render(pending, history) {
    const pV = document.getElementById('pV'), cV = document.getElementById('cV');
    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    pV.innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-black text-slate-800 text-lg uppercase">${j.client}</h3>
                    <p class="text-xs text-blue-600 font-bold uppercase">${j.title}</p>
                </div>
                <div class="flex flex-col gap-2 items-end">
                    <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">Done</button>
                    <button onclick="window.deleteJob('${j.id}')" class="text-[10px] text-red-300">Delete</button>
                </div>
            </div>
            <div id="logbox-${j.id}" class="${openLogs.has(j.id) ? '' : 'hidden'} mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map((n, i) => `<div class="flex justify-between bg-slate-50 p-2 rounded text-[11px] border-l-2 border-blue-500"><span>${n}</span><button onclick='window.deleteNote("${j.id}", ${i}, ${JSON.stringify(j.notes)})' class="text-red-300 ml-2">×</button></div>`).join('')}</div>
                <div class="flex gap-2"><input id="n-${j.id}" class="flex-1 text-xs p-2 border rounded bg-slate-50 outline-none" placeholder="Log..."><button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold uppercase">Add</button></div>
            </div>
        </div>`).join('');

    cV.innerHTML = history.map(j => `
        <div class="bg-white p-4 rounded-xl border border-slate-100 opacity-80 mb-2">
            <div class="flex justify-between items-center"><div onclick="window.toggleLog('${j.id}')" class="cursor-pointer"><div class="font-black text-slate-400 text-sm uppercase">${j.client}</div><div class="text-[10px] text-slate-400 font-bold">${j.title} • ${j.date}</div></div>
            <div class="flex gap-2"><button onclick="window.restoreJob('${j.id}')" class="text-blue-500 text-[10px] font-bold px-2 py-1 bg-blue-50 rounded">Restore</button><button onclick="window.deleteJob('${j.id}')" class="text-red-400 text-[10px] font-bold px-2">Delete</button></div></div>
            <div id="logbox-${j.id}" class="${openLogs.has(j.id) ? '' : 'hidden'} mt-2 text-[10px] text-slate-500 border-t pt-2">${j.notes.join('<br>') || 'No logs.'}</div>
        </div>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addBtn').onclick = window.addJob;
    const tabs = { 'pTabBtn': 'pV', 'cTabBtn': 'cV', 'sTabBtn': 'sV' };
    Object.keys(tabs).forEach(id => {
        document.getElementById(id).onclick = () => {
            Object.values(tabs).forEach(v => document.getElementById(v).classList.add('hidden'));
            document.getElementById(tabs[id]).classList.remove('hidden');
            Object.keys(tabs).forEach(t => document.getElementById(t).classList.remove('tab-active', 'text-slate-800'));
            document.getElementById(id).classList.add('tab-active', 'text-slate-800');
            // Hide input area if on Analytics tab
            document.getElementById('inputArea').classList.toggle('hidden', id === 'sTabBtn');
        };
    });
});
