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

// Update Date/Time Display
const dt = new Date();
document.getElementById('currentDateTime').innerText = dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + " | " + dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('connectionDot').className = "h-4 w-4 bg-green-500 rounded-full";
    let pending = [], history = [], allData = [];
    let customers = new Set();

    snapshot.forEach(doc => {
        let d = doc.data(); d.id = doc.id;
        allData.push(d);
        if (d.client) customers.add(d.client.toUpperCase());
        d.status === 'Solved' ? history.push(d) : pending.push(d);
    });

    const datalist = document.getElementById('customerData');
    if(datalist) datalist.innerHTML = Array.from(customers).map(name => `<option value="${name}">`).join('');
    
    renderTable(pending, document.getElementById('pV'));
    renderTable(history, document.getElementById('cV'));
    renderCharts(allData);
});

window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Enter Customer & Issue");
    await addDoc(jobsCol, { 
        title: t.value, 
        client: c.value.toUpperCase(), 
        priority: p.value, 
        ticket: r.value || "",
        status: p.value === 'Solved' ? 'Solved' : 'Pending', 
        createdAt: Date.now(),
        dateStr: new Date().toLocaleDateString('en-GB')
    });
    t.value = ''; c.value = ''; r.value = '';
};

window.solveJob = async (id) => await updateDoc(doc(db, "jobs", id), { status: 'Solved' });
window.deleteJob = async (id) => { if(confirm("Delete entry?")) await deleteDoc(doc(db, "jobs", id)); };

function renderTable(data, container) {
    container.innerHTML = data.map(j => {
        const statusColor = j.status === 'Solved' ? 'bg-white text-slate-600' : 'bg-red-600 text-white';
        const statusText = j.status === 'Critical' ? 'Pending - Critical' : j.status;
        
        return `
        <tr class="border-b text-[12px] hover:bg-slate-50 transition">
            <td class="p-4 border-r font-bold text-slate-700 bg-slate-50/50 uppercase">${j.client}</td>
            <td class="p-4 border-r text-slate-500">${j.dateStr}</td>
            <td class="p-4 border-r text-slate-700 leading-relaxed">${j.title}</td>
            <td class="p-4 border-r">
                <div class="${statusColor} p-2 font-bold text-center rounded text-[10px] uppercase">${statusText}</div>
            </td>
            <td class="p-4 text-center">
                <div class="text-[10px] font-mono mb-2">${j.ticket || '-'}</div>
                <div class="flex justify-center gap-2">
                    ${j.status !== 'Solved' ? `<button onclick="window.solveJob('${j.id}')" class="text-emerald-600 font-bold border border-emerald-600 px-2 py-1 rounded hover:bg-emerald-50 text-[10px]">Solve</button>` : ''}
                    <button onclick="window.deleteJob('${j.id}')" class="text-slate-300 hover:text-red-500 text-[10px]">×</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Same switchTab and renderCharts logic from previous version...
window.switchTab = (btnId, viewId) => {
    ['pTabBtn', 'cTabBtn', 'sTabBtn'].forEach(t => document.getElementById(t).className = "px-8 py-4 border-b-4 border-transparent text-slate-400");
    ['pV', 'cV', 'sV'].forEach(v => document.getElementById(v).classList.add('hidden'));
    document.getElementById(btnId).className = "px-8 py-4 border-b-4 border-blue-600 text-blue-600";
    document.getElementById(viewId).classList.remove('hidden');
};

function renderCharts(data) {
    const sV = document.getElementById('sV');
    const stats = data.reduce((acc, job) => {
        if (!acc[job.client]) acc[job.client] = { p: 0, c: 0, total: 0 };
        job.status === 'Solved' ? acc[job.client].c++ : acc[job.client].p++;
        acc[job.client].total++;
        return acc;
    }, {});
    sV.innerHTML = Object.entries(stats).map(([client, s]) => {
        const p = Math.round((s.c / s.total) * 100);
        return `<div class="bg-white p-4 border rounded shadow-sm flex items-center justify-between">
            <div class="font-bold uppercase text-xs">${client}</div>
            <div class="text-[10px] text-slate-400">Solved: ${s.c} / ${s.total} (${p}%)</div>
        </div>`;
    }).join('');
}
