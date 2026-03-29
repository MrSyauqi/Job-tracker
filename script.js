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

let globalData = [];
let sortedCustomerNames = []; 
let expandedSet = new Set(); 
let openLogsSet = new Set(); 

// --- DATABASE SYNC & STATUS ---
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    const dot = document.getElementById('connectionDot');
    const statusText = document.getElementById('connectionText');
    if (dot && statusText) {
        dot.style.backgroundColor = "#10b981"; 
        statusText.innerText = "DATABASE CONNECTOR";
        statusText.style.color = "#10b981";
    }
    globalData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (sortedCustomerNames.length === 0) window.updateSortOrder();
    updateDatalist(); 
    window.renderDashboard();
}, (error) => {
    const dot = document.getElementById('connectionDot');
    const statusText = document.getElementById('connectionText');
    if (dot && statusText) {
        dot.style.backgroundColor = "#ef4444"; 
        statusText.innerText = "DISCONNECTED";
    }
});

// --- LOGIC: DELAYED SORTING ---
window.updateSortOrder = () => {
    const groups = globalData.reduce((acc, j) => { (acc[j.client] = acc[j.client] || []).push(j); return acc; }, {});
    sortedCustomerNames = Object.keys(groups).sort((a, b) => {
        const score = (c) => groups[c].filter(j => j.status === 'Critical').length * 100 + groups[c].filter(j => j.status === 'Pending').length;
        return score(b) - score(a);
    });
};

window.toggleFolder = (name) => {
    if (expandedSet.has(name)) {
        expandedSet.delete(name);
        window.updateSortOrder(); // Resort only when folder is closed
    } else {
        expandedSet.add(name);
    }
    window.renderDashboard();
};

window.toggleLogs = (id) => {
    openLogsSet.has(id) ? openLogsSet.delete(id) : openLogsSet.add(id);
    window.renderDashboard();
};

// --- EDITING FUNCTIONS (RESTORED) ---
window.editField = async (id, field, oldVal) => {
    const newVal = prompt(`EDIT ${field.toUpperCase()}:`, oldVal);
    if (newVal !== null && newVal !== oldVal) {
        const updateObj = {};
        updateObj[field === 'date' ? 'dateStr' : 'ticket'] = newVal.toUpperCase();
        await updateDoc(doc(db, "jobs", id), updateObj);
    }
};

// --- ACTIONS ---
window.deleteJob = async (id) => {
    if (confirm("DELETE THIS CASE?")) await deleteDoc(doc(db, "jobs", id));
};

window.deleteLog = async (jobId, logIndex) => {
    const job = globalData.find(j => j.id === jobId);
    const newLogs = [...job.logs];
    newLogs.splice(logIndex, 1);
    await updateDoc(doc(db, "jobs", jobId), { logs: newLogs });
};

window.addLog = async (id) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input || !input.value) return;
    const newEntry = input.value.toUpperCase();
    await updateDoc(doc(db, "jobs", id), { logs: [...(globalData.find(j => j.id === id).logs || []), newEntry] });
    input.value = '';
};

window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Missing Info");
    await addDoc(jobsCol, {
        title: t.value.toUpperCase(),
        client: c.value.trim().toUpperCase(),
        priority: parseInt(p.value),
        ticket: r.value || "N/A",
        status: p.value == "1" ? 'Solved' : (p.value == "3" ? 'Critical' : 'Pending'),
        logs: [],
        createdAt: Date.now(),
        dateStr: new Date().toLocaleDateString('en-GB')
    });
    t.value = ''; r.value = '';
};

window.cycleStatus = async (id, current) => {
    const next = current === 'Pending' ? 'Critical' : (current === 'Critical' ? 'Solved' : 'Pending');
    const prio = next === 'Critical' ? 3 : (next === 'Pending' ? 2 : 1);
    await updateDoc(doc(db, "jobs", id), { status: next, priority: prio });
};

// --- UI RENDERER ---
window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    if (!container) return;
    const searchVal = document.getElementById('search').value.toUpperCase();
    const groups = globalData.reduce((acc, j) => { (acc[j.client] = acc[j.client] || []).push(j); return acc; }, {});

    container.innerHTML = sortedCustomerNames.filter(c => c.includes(searchVal)).map(name => {
        const jobs = groups[name] || [];
        const crits = jobs.filter(j => j.status === 'Critical').length;
        const pends = jobs.filter(j => j.status === 'Pending').length;
        jobs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        const isOpen = expandedSet.has(name);
        return `
            <div class="border-b">
                <div onclick="window.toggleFolder('${name}')" class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-black uppercase text-slate-800">${name}</span>
                        <div class="flex gap-1">
                            ${crits > 0 ? `<span class="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded animate-pulse">${crits} CRIT</span>` : ''}
                            ${pends > 0 ? `<span class="bg-orange-500 text-white text-[8px] font-black px-2 py-0.5 rounded">${pends} PEND</span>` : ''}
                        </div>
                    </div>
                    <button class="text-[9px] font-bold px-4 py-1 bg-slate-100 rounded text-slate-500 uppercase">${isOpen ? 'CLOSE' : 'OPEN'}</button>
                </div>
                <div class="${isOpen ? '' : 'hidden'} bg-white border-t">
                    <table class="w-full text-[10px] table-fixed">
                        <thead class="bg-slate-50 border-b text-slate-400 font-black uppercase text-[9px]">
                            <tr>
                                <th class="p-3 text-left w-24">Date</th>
                                <th class="p-3 text-left">Issue & Summary</th>
                                <th class="p-3 text-center w-28">Ticket</th>
                                <th class="p-3 text-center w-32">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${jobs.map(j => {
                                const isLogOpen = openLogsSet.has(j.id);
                                const logs = isLogOpen ? (j.logs || []) : (j.logs && j.logs.length > 0 ? [j.logs[j.logs.length - 1]] : []);

                                return `
                                <tr>
                                    <td onclick="window.editField('${j.id}','date','${j.dateStr}')" class="p-4 font-bold text-slate-400 align-top cursor-pointer hover:text-blue-500 transition">${j.dateStr}</td>
                                    <td class="p-4">
                                        <div class="font-black mb-2 text-sm uppercase text-slate-800">${j.title}</div>
                                        <div class="space-y-1 mb-3">
                                            ${logs.map((l, idx) => `
                                                <div class="group bg-blue-50 text-blue-700 p-2 rounded border-l-4 border-blue-400 font-bold uppercase text-[10px] flex justify-between">
                                                    <span>${l}</span>
                                                    <button onclick="window.deleteLog('${j.id}', ${isLogOpen ? idx : j.logs.length - 1})" class="text-red-400 ml-2 font-black opacity-0 group-hover:opacity-100 transition">×</button>
                                                </div>
                                            `).join('')}
                                            ${j.logs && j.logs.length > 1 ? `<button onclick="window.toggleLogs('${j.id}')" class="text-[9px] font-black text-blue-500 underline uppercase mt-1">${isLogOpen ? '↑ Less' : '↓ View All'}</button>` : ''}
                                        </div>
                                        <div class="flex gap-2">
                                            <input id="log-in-${j.id}" placeholder="ADD SUMMARY..." class="flex-1 border p-2 rounded text-[10px] uppercase font-bold bg-slate-50 outline-none focus:ring-1 focus:ring-slate-300">
                                            <button onclick="window.addLog('${j.id}')" class="bg-slate-800 text-white px-3 rounded text-[10px] font-black">ADD</button>
                                        </div>
                                    </td>
                                    <td onclick="window.editField('${j.id}','ticket','${j.ticket}')" class="p-4 text-center font-mono font-black text-slate-400 text-xs align-middle cursor-pointer hover:text-blue-500 transition">${j.ticket}</td>
                                    <td class="p-4 align-middle">
                                        <div class="flex items-center justify-center gap-2">
                                            <div onclick="window.cycleStatus('${j.id}','${j.status}')" class="flex-1 py-2 px-1 rounded font-black text-[9px] text-white text-center cursor-pointer transition ${j.status==='Solved'?'bg-emerald-500':(j.status==='Critical'?'bg-red-600 animate-pulse':'bg-orange-500')}">
                                                ${j.status}
                                            </div>
                                            <button onclick="window.deleteJob('${j.id}')" class="text-slate-300 hover:text-red-500 font-black text-lg p-1 transition-colors">×</button>
                                        </div>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }).join('');
};

function updateDatalist() {
    const list = document.getElementById('customerList');
    if (!list) return;
    const names = [...new Set(globalData.map(j => j.client))].sort();
    list.innerHTML = names.map(c => `<option value="${c}">`).join('');
}

document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
