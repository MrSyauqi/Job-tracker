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
let expandedCustomers = new Set();
let expandedLogs = new Set(); // Track which logs are fully visible

document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('connectionDot').className = "h-4 w-4 bg-green-500 rounded-full shadow-sm";
    globalData = [];
    snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; globalData.push(d); });
    renderDashboard();
});

window.addJob = async (e) => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Fill Customer and Issue");
    
    await addDoc(jobsCol, { 
        title: t.value.toUpperCase(), client: c.value.trim().toUpperCase(), 
        priority: parseInt(p.value), ticket: r.value || "N/A",
        status: parseInt(p.value) === 1 ? 'Solved' : (parseInt(p.value) === 3 ? 'Critical' : 'Pending'), 
        logs: [], createdAt: Date.now(), dateStr: new Date().toLocaleDateString('en-GB')
    });
    t.value = ''; c.value = ''; r.value = '';
};

// Log Remark Logic
window.addLog = async (id, existingLogs) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input.value.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const newEntry = `[${time}] ${input.value.toUpperCase()}`;
    await updateDoc(doc(db, "jobs", id), { logs: [...existingLogs, newEntry] });
    input.value = '';
};

// Generic Inline Edit
window.editField = async (id, field, currentVal) => {
    const newVal = prompt(`Edit ${field.toUpperCase()}:`, currentVal);
    if (newVal !== null && newVal !== currentVal) {
        let update = {}; update[field] = newVal.toUpperCase();
        await updateDoc(doc(db, "jobs", id), update);
    }
};

window.changeStatus = async (id) => {
    const choice = prompt("SET STATUS:\n1. PENDING\n2. SOLVED\n3. CRITICAL\n4. DELETE");
    if (choice === "1") await updateDoc(doc(db, "jobs", id), { status: 'Pending', priority: 2 });
    else if (choice === "2") await updateDoc(doc(db, "jobs", id), { status: 'Solved', priority: 1 });
    else if (choice === "3") await updateDoc(doc(db, "jobs", id), { status: 'Critical', priority: 3 });
    else if (choice === "4") if(confirm("Delete Record?")) await deleteDoc(doc(db, "jobs", id));
};

window.toggleLogExpand = (id) => {
    expandedLogs.has(id) ? expandedLogs.delete(id) : expandedLogs.add(id);
    renderDashboard();
};

window.toggleCustomer = (client) => {
    expandedCustomers.has(client) ? expandedCustomers.delete(client) : expandedCustomers.add(client);
    renderDashboard();
};

window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    const search = document.getElementById('search').value.toUpperCase();
    const groups = globalData.reduce((acc, j) => {
        if (!acc[j.client]) acc[j.client] = [];
        acc[j.client].push(j); return acc;
    }, {});

    container.innerHTML = Object.keys(groups).sort().filter(c => c.includes(search)).map(client => {
        const jobs = groups[client].sort((a, b) => b.priority - a.priority);
        const isExp = expandedCustomers.has(client);
        const pCount = jobs.filter(j => j.status !== 'Solved').length;

        return `
            <div class="border-b">
                <div onclick="window.toggleCustomer('${client}')" class="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50">
                    <div class="flex items-center gap-4">
                        <span class="text-xl font-black text-slate-800 tracking-tighter">${client}</span>
                        <span class="${pCount > 0 ? 'bg-red-600' : 'bg-slate-300'} text-white text-[9px] px-2 py-1 rounded font-bold uppercase">${pCount} Pending</span>
                    </div>
                    <span class="text-slate-300 text-[10px] font-bold tracking-widest">${isExp ? 'CLOSE' : 'OPEN'}</span>
                </div>

                <div class="${isExp ? '' : 'hidden'} overflow-x-auto bg-white">
                    <table class="w-full text-[11px] border-collapse">
                        <thead class="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                            <tr>
                                <th class="p-3 text-left w-24 border-r">Date</th>
                                <th class="p-3 text-left border-r">Issue & History Logs</th>
                                <th class="p-3 text-center w-32 border-r">Status</th>
                                <th class="p-3 text-left w-32">Ticket ID</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${jobs.map(j => {
                                const logs = j.logs || [];
                                const isLogExp = expandedLogs.has(j.id);
                                const displayedLogs = isLogExp ? logs : logs.slice(0, 3);

                                return `
                                <tr class="hover:bg-slate-50/50">
                                    <td onclick="window.editField('${j.id}', 'dateStr', '${j.dateStr}')" class="p-3 font-bold text-slate-400 border-r cursor-pointer hover:text-blue-500">${j.dateStr}</td>
                                    <td class="p-3 border-r">
                                        <div class="font-black text-slate-800 uppercase mb-2">${j.title}</div>
                                        <div class="space-y-1 mb-2">
                                            ${displayedLogs.map(log => `<div class="bg-blue-50 text-blue-700 p-1 px-2 rounded-sm text-[10px] font-bold border-l-2 border-blue-400">${log}</div>`).join('')}
                                            ${logs.length > 3 ? `
                                                <button onclick="window.toggleLogExpand('${j.id}')" class="text-[9px] font-black text-blue-500 hover:underline mt-1">
                                                    ${isLogExp ? 'SHOW LESS ▲' : `SHOW ALL (${logs.length}) ▼`}
                                                </button>
                                            ` : ''}
                                        </div>
                                        <div class="flex gap-1">
                                            <input id="log-in-${j.id}" placeholder="ADD LOG UPDATE..." class="flex-1 bg-slate-50 border p-1 px-2 rounded text-[10px] outline-none focus:border-blue-400 uppercase font-semibold">
                                            <button onclick='window.addLog("${j.id}", ${JSON.stringify(logs)})' class="bg-slate-800 text-white px-3 rounded text-[9px] font-bold uppercase">Add</button>
                                        </div>
                                    </td>
                                    <td class="p-3 border-r text-center">
                                        <button onclick="window.changeStatus('${j.id}')" class="w-full py-2 rounded-sm font-black text-[9px] uppercase shadow-sm ${j.status === 'Solved' ? 'bg-emerald-500 text-white' : (j.status === 'Critical' ? 'bg-red-600 text-white animate-pulse' : 'bg-orange-500 text-white')}">
                                            ${j.status}
                                        </button>
                                    </td>
                                    <td onclick="window.editField('${j.id}', 'ticket', '${j.ticket}')" class="p-3 font-mono text-slate-400 font-bold uppercase cursor-pointer hover:text-blue-500">${j.ticket}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');
};
