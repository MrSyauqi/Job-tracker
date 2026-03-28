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

// LISTEN TO DATABASE
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

    const datalist = document.getElementById('customerData');
    if(datalist) datalist.innerHTML = Array.from(customers).map(name => `<option value="${name}">`).join('');
    
    renderJobs(pending, history);
    renderCharts(allData);
});

// FUNCTIONS
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value || !c.value) return alert("Fill Name and Issue!");
    await addDoc(jobsCol, { 
        title: t.value.toUpperCase(), 
        client: c.value.trim().toUpperCase(), 
        priority: parseInt(p.value), 
        status: 'pending', 
        notes: [], 
        createdAt: Date.now() 
    });
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

window.shareWA = (client, title, notes) => {
    const lastLog = notes.length > 0 ? notes[notes.length - 1] : "Job started.";
    const msg = `*FIELD SERVICE UPDATE*%0A*Customer:* ${client}%0A*Issue:* ${title}%0A*Update:* ${lastLog}%0A*Status:* IN PROGRESS`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
};

window.filterJobs = () => {
    const val = document.getElementById('searchInput').value.toUpperCase();
    const cards = document.querySelectorAll('#pV > div, #cV > div');
    cards.forEach(c => c.style.display = c.innerText.toUpperCase().includes(val) ? "block" : "none");
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

// RENDER ANALYTICS (Charts)
function renderCharts(data) {
    const sV = document.getElementById('sV');
    const stats = data.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = { p: 0, c: 0, total: 0 };
        job.status === 'pending' ? acc[job.client].p++ : acc[job.client].c++;
        acc[job.client].total++;
        return acc;
    }, {});

    let html = `<p class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Customer Statistics</p>`;
    for (let client in stats) {
        const percent = Math.round((stats[client].c / stats[client].total) * 100);
        const color = percent === 100 ? 'stroke-emerald-500' : 'stroke-blue-600';
        html += `
        <div class="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-5">
            <div class="relative h-14 w-14">
                <svg class="h-full w-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" class="stroke-slate-100" stroke-width="4"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" class="${color}" stroke-width="4" stroke-dasharray="100" stroke-dashoffset="${100-percent}" stroke-linecap="round" transform="rotate(-90 18 18)"></circle>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center text-[9px] font-black">${percent}%</div>
            </div>
            <div class="flex-1 uppercase">
                <h4 class="font-black text-slate-800 text-xs">${client}</h4>
                <div class="flex gap-3 text-[9px] font-bold text-slate-400">
                    <span>Total: ${stats[client].total}</span> <span class="text-emerald-500">Done: ${stats[client].c}</span>
                </div>
            </div>
        </div>`;
    }
    sV.innerHTML = html;
}

// RENDER LISTS
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
                <div class="flex flex-col gap-2">
                    <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Done</button>
                    <button onclick="window.shareWA('${j.client}', '${j.title}', ${JSON.stringify(j.notes)})" class="bg-green-100 text-green-700 px-2 py-1 rounded text-[9px] font-bold">Report 💬</button>
                </div>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map(n => `<div class="text-[10px] bg-slate-50 p-2 border-l-2 border-blue-500 rounded font-bold">${n}</div>`).join('')}</div>
                <div class="flex gap-2"><input id="n-${j.id}" class="flex-1 text-[11px] p-2 border rounded" placeholder="Add note..."><button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-black">ADD</button></div>
            </div>
        </div>`).join('');

    document.getElementById('cV').innerHTML = history.map(j => `
        <div class="bg-white p-3 rounded-xl border opacity-70 flex justify-between items-center mb-2">
            <div class="uppercase">
                <p class="font-black text-slate-400 text-xs">${j.client}</p>
                <p class="text-[9px] font-bold text-slate-400">${j.title} • ${j.date}</p>
            </div>
        </div>`).join('');
}
