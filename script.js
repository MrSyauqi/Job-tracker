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

// REAL-TIME LISTENER
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('connectionDot').classList.replace('bg-red-500', 'bg-green-500');
    let pending = [], history = [], allData = [];
    let customers = new Set();

    snapshot.forEach(doc => {
        let d = doc.data(); d.id = doc.id;
        allData.push(d);
        if (d.client) customers.add(d.client.toUpperCase());
        d.status === 'pending' ? pending.push(d) : history.push(d);
    });

    // Autocomplete
    const datalist = document.getElementById('customerData');
    if(datalist) datalist.innerHTML = Array.from(customers).map(name => `<option value="${name}">`).join('');
    
    renderJobs(pending, history);
    renderCharts(allData);
});

// ACTIONS
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Missing Customer or Task!");
    await addDoc(jobsCol, { title: t.value.toUpperCase(), client: c.value.trim().toUpperCase(), priority: parseInt(p.value), status: 'pending', notes: [], createdAt: Date.now() });
    t.value = ''; c.value = '';
};

window.finishJob = async (id) => {
    await updateDoc(doc(db, "jobs", id), { status: 'completed', date: new Date().toLocaleDateString('en-GB') });
};

window.saveNote = async (id, notes) => {
    const inp = document.getElementById(`n-${id}`);
    if (!inp.value) return;
    const ts = `[${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2,'0')}]`;
    await updateDoc(doc(db, "jobs", id), { notes: [...notes, `${ts} ${inp.value.toUpperCase()}`] });
    inp.value = '';
};

window.deleteJob = async (id) => {
    if(confirm("Permanently delete this record?")) await deleteDoc(doc(db, "jobs", id));
};

window.toggleLog = (id) => {
    const box = document.getElementById(`logbox-${id}`);
    if (openLogs.has(id)) { openLogs.delete(id); box.classList.add('hidden'); } 
    else { openLogs.add(id); box.classList.remove('hidden'); }
};

window.switchTab = (btnId, viewId) => {
    ['pTabBtn', 'cTabBtn', 'sTabBtn'].forEach(t => document.getElementById(t).className = "flex-1 py-4 text-slate-400 border-b-4 border-transparent");
    ['pV', 'cV', 'sV'].forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById(btnId).className = "flex-1 py-4 tab-active";
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById('inputSection').classList.toggle('hidden', viewId === 'sV');
};

// ANALYTICS (The Pie Chart Engine)
function renderCharts(data) {
    const sV = document.getElementById('sV');
    if(!sV) return;

    const stats = data.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = { p: 0, c: 0, total: 0 };
        job.status === 'pending' ? acc[job.client].p++ : acc[job.client].c++;
        acc[job.client].total++;
        return acc;
    }, {});

    let html = `<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Customer Case Summary</p>`;

    for (let client in stats) {
        const percent = Math.round((stats[client].c / stats[client].total) * 100);
        const offset = 100 - percent;
        const themeColor = percent === 100 ? 'stroke-emerald-500' : 'stroke-blue-600';

        html += `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-5 shadow-sm">
            <div class="relative h-16 w-16">
                <svg class="h-full w-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" class="stroke-slate-100" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" class="${themeColor}" stroke-width="3" 
                        stroke-dasharray="100" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center text-[10px] font-black">${percent}%</div>
            </div>
            <div class="flex-1">
                <h4 class="font-black text-slate-800 uppercase text-xs mb-1">${client}</h4>
                <div class="grid grid-cols-2 gap-y-1 text-[9px] font-bold">
                    <span class="text-slate-400">TOTAL: ${stats[client].total}</span>
                    <span class="text-emerald-500 text-right font-black">DONE: ${stats[client].c}</span>
                    <span class="text-blue-500">OPEN: ${stats[client].p}</span>
                </div>
            </div>
        </div>`;
    }
    sV.innerHTML = html || "<p class='text-center text-xs py-10'>No data yet.</p>";
}

// LIST RENDERER
function renderJobs(pending, history) {
    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    document.getElementById('pV').innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-black text-slate-800 text-lg uppercase">${j.client}</h3>
                    <p class="text-xs text-blue-600 font-bold uppercase tracking-tight">${j.title}</p>
                </div>
                <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-md uppercase">Done</button>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map(n => `<div class="text-[10px] bg-slate-50 p-2 border-l-2 border-blue-500 rounded font-bold">${n}</div>`).join('')}</div>
                <div class="flex gap-2"><input id="n-${j.id}" class="flex-1 text-[11px] p-2 border rounded" placeholder="Update log..."><button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-black">ADD</button></div>
                <button onclick="window.deleteJob('${j.id}')" class="text-[9px] text-red-300 mt-3 uppercase font-bold">Delete Case</button>
            </div>
        </div>`).join('');

    document.getElementById('cV').innerHTML = history.map(j => `
        <div class="bg-white p-3 rounded-xl border opacity-70 flex justify-between items-center">
            <div>
                <p class="font-black text-slate-400 text-xs uppercase">${j.client}</p>
                <p class="text-[9px] font-bold text-slate-400">${j.title} • ${j.date}</p>
            </div>
            <button onclick="window.deleteJob('${j.id}')" class="text-[9px] text-red-400 font-bold uppercase p-2">Clear</button>
        </div>`).join('');
}
