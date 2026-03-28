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
    let pending = [], history = [], allData = [];
    let customers = new Set();

    snapshot.forEach(doc => {
        let d = doc.data(); d.id = doc.id;
        allData.push(d);
        if (d.client) customers.add(d.client);
        d.status === 'pending' ? pending.push(d) : history.push(d);
    });

    const datalist = document.getElementById('customerData');
    if(datalist) datalist.innerHTML = Array.from(customers).map(name => `<option value="${name}">`).join('');
    
    renderJobs(pending, history);
    renderCustomerCharts(allData);
});

// FUNCTIONS
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Enter Info");
    await addDoc(jobsCol, { title: t.value, client: c.value.trim(), priority: parseInt(p.value), status: 'pending', notes: [], createdAt: Date.now() });
    t.value = ''; c.value = '';
};

window.saveNote = async (id, notes) => {
    const inp = document.getElementById(`n-${id}`);
    if (!inp.value) return;
    const now = new Date();
    const ts = `[${now.getDate()}/${now.getMonth()+1} ${now.getHours()}:${now.getMinutes().toString().padStart(2,'0')}]`;
    openLogs.add(id);
    await updateDoc(doc(db, "jobs", id), { notes: [...notes, `${ts} ${inp.value}`] });
    inp.value = '';
};

window.deleteNote = async (id, idx, notes) => {
    if(!confirm("Delete log?")) return;
    notes.splice(idx, 1);
    await updateDoc(doc(db, "jobs", id), { notes: notes });
};

window.deleteJob = async (id) => {
    if(!confirm("Delete?")) return;
    await deleteDoc(doc(db, "jobs", id));
};

window.toggleLog = (id) => {
    const box = document.getElementById(`logbox-${id}`);
    if (openLogs.has(id)) { openLogs.delete(id); box.classList.add('hidden'); } 
    else { openLogs.add(id); box.classList.remove('hidden'); }
};

window.finishJob = async (id) => {
    openLogs.delete(id);
    await updateDoc(doc(db, "jobs", id), { status: 'completed', date: new Date().toLocaleDateString() });
};

window.restoreJob = async (id) => await updateDoc(doc(db, "jobs", id), { status: 'pending' });

// CHART RENDERER
function renderCustomerCharts(data) {
    const sV = document.getElementById('sV');
    const stats = data.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = { p: 0, c: 0, total: 0 };
        job.status === 'pending' ? acc[job.client].p++ : acc[job.client].c++;
        acc[job.client].total++;
        return acc;
    }, {});

    let html = `<p class="text-[10px] font-black text-slate-400 mb-4 px-1 uppercase tracking-widest">Customer Job Statistics</p>`;

    for (let client in stats) {
        const percent = Math.round((stats[client].c / stats[client].total) * 100);
        const offset = 100 - percent; // SVG Circle Stroke Offset

        html += `
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
            <div class="relative h-16 w-16">
                <svg class="h-full w-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" class="stroke-slate-100" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" class="stroke-blue-600 transition-all duration-1000" stroke-width="3" 
                        stroke-dasharray="100" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-700">${percent}%</div>
            </div>
            
            <div class="flex-1">
                <h4 class="font-black text-slate-800 uppercase text-sm leading-tight mb-1">${client}</h4>
                <div class="flex gap-4">
                    <div><p class="text-[8px] font-bold text-slate-400 uppercase">Registered</p><p class="text-sm font-black text-slate-800">${stats[client].total}</p></div>
                    <div><p class="text-[8px] font-bold text-slate-400 uppercase">Complete</p><p class="text-sm font-black text-emerald-500">${stats[client].c}</p></div>
                    <div><p class="text-[8px] font-bold text-slate-400 uppercase">Pending</p><p class="text-sm font-black text-blue-600">${stats[client].p}</p></div>
                </div>
            </div>
        </div>`;
    }
    sV.innerHTML = html;
}

function renderJobs(pending, history) {
    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    document.getElementById('pV').innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority} mb-3">
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
                <div class="flex gap-2"><input id="n-${j.id}" class="flex-1 text-xs p-2 border rounded bg-slate-50 outline-none" placeholder="Add note..."><button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold">ADD</button></div>
            </div>
        </div>`).join('');

    document.getElementById('cV').innerHTML = history.map(j => `
        <div class="bg-white p-4 rounded-xl border border-slate-100 opacity-80 mb-2">
            <div class="flex justify-between items-center"><div onclick="window.toggleLog('${j.id}')" class="cursor-pointer"><div class="font-black text-slate-400 text-sm uppercase">${j.client}</div><div class="text-[10px] text-slate-400 font-bold">${j.title} • ${j.date}</div></div>
            <div class="flex gap-2"><button onclick="window.restoreJob('${j.id}')" class="text-blue-500 text-[10px] font-bold px-2 py-1 bg-blue-50 rounded">Restore</button><button onclick="window.deleteJob('${j.id}')" class="text-red-400 text-[10px] font-bold px-2">Delete</button></div></div>
            <div id="logbox-${j.id}" class="${openLogs.has(j.id) ? '' : 'hidden'} mt-2 text-[10px] text-slate-500 border-t pt-2">${j.notes.join('<br>') || 'No logs.'}</div>
        </div>`).join('');
}

// NAVIGATION
document.getElementById('pTabBtn').onclick = () => switchTab('pTabBtn', 'pV');
document.getElementById('cTabBtn').onclick = () => switchTab('cTabBtn', 'cV');
document.getElementById('sTabBtn').onclick = () => switchTab('sTabBtn', 'sV');

function switchTab(btnId, viewId) {
    ['pTabBtn', 'cTabBtn', 'sTabBtn'].forEach(id => document.getElementById(id).className = "flex-1 py-4 text-slate-400 border-b-4 border-transparent");
    ['pV', 'cV', 'sV'].forEach(id => document.getElementById(id).classList.add('hidden'));
    
    document.getElementById(btnId).className = "flex-1 py-4 text-blue-600 border-b-4 border-blue-600 font-black";
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById('inputSection').classList.toggle('hidden', viewId === 'sV');
}
