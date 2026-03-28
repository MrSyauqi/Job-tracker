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
    document.getElementById('connectionDot').className = "h-3 w-3 bg-green-500 rounded-full shadow-sm animate-none";
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
    
    render(pending, history);
    renderStats(allData);
});

// ACTIONS
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Enter Customer & Issue");
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
    notes.splice(index, 1);
    await updateDoc(doc(db, "jobs", jobId), { notes: notes });
};

window.deleteJob = async (id) => {
    if(!confirm("Delete permanently?")) return;
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

// ANALYTICS FUNCTION
function renderStats(data) {
    const sV = document.getElementById('sV');
    if(!sV) return;

    const stats = data.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = { p: 0, c: 0 };
        job.status === 'pending' ? acc[job.client].p++ : acc[job.client].c++;
        return acc;
    }, {});

    const topClient = Object.keys(stats).sort((a,b) => (stats[b].p + stats[b].c) - (stats[a].p + stats[a].c))[0] || "None";
    const efficiency = Math.round((data.filter(j=>j.status==='completed').length / data.length || 0) * 100);

    let html = `
        <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-blue-600 text-white p-4 rounded-2xl shadow-sm">
                <p class="text-[9px] font-black uppercase opacity-60">Efficiency</p>
                <h2 class="text-3xl font-black">${efficiency}%</h2>
            </div>
            <div class="bg-slate-800 text-white p-4 rounded-2xl shadow-sm">
                <p class="text-[9px] font-black uppercase opacity-60">Top Client</p>
                <h2 class="text-sm font-black truncate uppercase mt-1">${topClient}</h2>
            </div>
        </div>
        <p class="text-[10px] font-black text-slate-400 mb-2 px-1">CUSTOMER PERFORMANCE</p>
    `;

    for (let client in stats) {
        html += `
        <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
            <h4 class="font-black text-slate-700 uppercase text-xs w-1/2">${client}</h4>
            <div class="flex gap-4 w-1/2 justify-end">
                <div class="text-center"><p class="text-[8px] font-bold text-slate-400">ACTIVE</p><p class="text-sm font-black text-blue-600">${stats[client].p}</p></div>
                <div class="text-center"><p class="text-[8px] font-bold text-slate-400">DONE</p><p class="text-sm font-black text-emerald-500">${stats[client].c}</p></div>
            </div>
        </div>`;
    }
    sV.innerHTML = html;
}

// MAIN RENDER
function render(pending, history) {
    const pV = document.getElementById('pV'), cV = document.getElementById('cV');
    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    pV.innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-black text-slate-800 text-lg uppercase leading-tight">${j.client}</h3>
                    <p class="text-xs text-blue-600 font-bold uppercase tracking-tighter mt-1">${j.title}</p>
                </div>
                <div class="flex flex-col gap-2 items-end">
                    <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">Done</button>
                    <button onclick="window.deleteJob('${j.id}')" class="text-[10px] text-red-300">Delete</button>
                </div>
            </div>
            <div id="logbox-${j.id}" class="${openLogs.has(j.id) ? '' : 'hidden'} mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map((n, i) => `<div class="flex justify-between bg-slate-50 p-2 rounded text-[11px] border-l-2 border-blue-500"><span>${n}</span><button onclick='window.deleteNote("${j.id}", ${i}, ${JSON.stringify(j.notes)})' class="text-red-300 ml-2">×</button></div>`).join('')}</div>
                <div class="flex gap-2"><input id="n-${j.id}" class="flex-1 text-xs p-2 border rounded bg-slate-50 outline-none" placeholder="Add technical note..."><button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold">ADD</button></div>
            </div>
        </div>`).join('');

    cV.innerHTML = history.map(j => `
        <div class="bg-white p-4 rounded-xl border border-slate-100 opacity-80 mb-2">
            <div class="flex justify-between items-center">
                <div onclick="window.toggleLog('${j.id}')" class="cursor-pointer">
                    <div class="font-black text-slate-400 text-sm uppercase">${j.client}</div>
                    <div class="text-[10px] text-slate-400 font-bold">${j.title} • ${j.date}</div>
                </div>
                <div class="flex gap-2"><button onclick="window.restoreJob('${j.id}')" class="text-blue-500 text-[10px] font-bold px-2 py-1 bg-blue-50 rounded">Restore</button>
                <button onclick="window.deleteJob('${j.id}')" class="text-red-400 text-[10px] font-bold px-2">Delete</button></div>
            </div>
            <div id="logbox-${j.id}" class="${openLogs.has(j.id) ? '' : 'hidden'} mt-2 text-[10px] text-slate-500 border-t pt-2">${j.notes.join('<br>') || 'No logs.'}</div>
        </div>`).join('');
}

// TAB LISTENER (FIXED)
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addBtn').onclick = window.addJob;
    const tabs = ['pTabBtn', 'cTabBtn', 'sTabBtn'];
    const views = ['pV', 'cV', 'sV'];

    tabs.forEach((tabId, idx) => {
        document.getElementById(tabId).onclick = () => {
            // Reset all tabs
            tabs.forEach(t => document.getElementById(t).className = "nav-tab flex-1 py-4 text-slate-400 border-b-4 border-transparent");
            views.forEach(v => document.getElementById(v).classList.add('hidden'));
            
            // Set active
            document.getElementById(tabId).className = "nav-tab flex-1 py-4 text-blue-600 border-b-4 border-blue-600 font-black";
            document.getElementById(views[idx]).classList.remove('hidden');
            
            // Toggle input section visibility
            document.getElementById('inputSection').classList.toggle('hidden', tabId === 'sTabBtn');
        };
    });
});
