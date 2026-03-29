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
let expandedSet = new Set();

// Set Header Date
document.getElementById('currentDateTime').innerText = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

// Listen for Data
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snapshot) => {
    document.getElementById('connectionDot').className = "h-4 w-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm";
    globalData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    window.renderDashboard();
}, (err) => {
    document.getElementById('connectionDot').className = "h-4 w-4 bg-red-600 animate-pulse rounded-full border-2 border-white";
});

// EXPOSE FUNCTIONS TO HTML
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Fill Fields");
    const client = c.value.trim().toUpperCase();
    
    await addDoc(jobsCol, {
        title: t.value.toUpperCase(), client: client, priority: parseInt(p.value),
        ticket: r.value || "NA", status: p.value == "1" ? 'Solved' : (p.value == "3" ? 'Critical' : 'Pending'),
        logs: [], createdAt: Date.now(), dateStr: new Date().toLocaleDateString('en-GB')
    });
    expandedSet.add(client);
    t.value = ''; c.value = ''; r.value = '';
};

window.addLog = async (id) => {
    const input = document.getElementById(`log-in-${id}`);
    if (!input || !input.value) return;
    const job = globalData.find(j => j.id === id);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const updatedLogs = [...(job.logs || []), `[${time}] ${input.value.toUpperCase()}`];
    await updateDoc(doc(db, "jobs", id), { logs: updatedLogs });
    input.value = '';
};

window.changeStatus = async (id) => {
    const c = prompt("1: PENDING | 2: SOLVED | 3: CRITICAL | 4: DELETE");
    if (c === "1") await updateDoc(doc(db, "jobs", id), { status: 'Pending', priority: 2 });
    else if (c === "2") await updateDoc(doc(db, "jobs", id), { status: 'Solved', priority: 1 });
    else if (c === "3") await updateDoc(doc(db, "jobs", id), { status: 'Critical', priority: 3 });
    else if (c === "4") if(confirm("Delete Record?")) await deleteDoc(doc(db, "jobs", id));
};

window.toggleCust = (name) => {
    if (expandedSet.has(name)) expandedSet.delete(name);
    else expandedSet.add(name);
    window.renderDashboard();
};

window.editF = async (id, field, cur) => {
    const val = prompt(`Edit ${field.toUpperCase()}:`, cur);
    if (val) await updateDoc(doc(db, "jobs", id), { [field]: val.toUpperCase() });
};

window.renderDashboard = () => {
    const container = document.getElementById('customerGrid');
    const searchVal = document.getElementById('search').value.toUpperCase();
    const groups = globalData.reduce((acc, j) => { (acc[j.client] = acc[j.client] || []).push(j); return acc; }, {});
    
    container.innerHTML = Object.keys(groups).sort().filter(c => c.includes(searchVal)).map(name => {
        const jobs = groups[name].sort((a,b) => b.priority - a.priority);
        const isOpen = expandedSet.has(name);
        const pCount = jobs.filter(j => j.status !== 'Solved').length;

        return `
            <div class="border-b last:border-0">
                <div onclick="toggleCust('${name}')" class="p-5 flex justify-between items-center cursor-pointer hover:bg-slate-50">
                    <div class="flex items-center gap-3">
                        <span class="text-lg font-black tracking-tighter uppercase">${name}</span>
                        <span class="text-[9px] px-2 py-1 rounded ${pCount > 0 ? 'bg-red-600' : 'bg-slate-400'} text-white font-bold">${pCount} PENDING</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400">${isOpen ? 'CLOSE' : 'OPEN'}</span>
                </div>
                <div class="${isOpen ? '' : 'hidden'} bg-white border-t overflow-x-auto">
                    <table class="w-full text-[11px]">
                        <thead class="bg-slate-50 text-[9px] font-black text-slate-400 border-b">
                            <tr>
                                <th class="p-3 text-left border-r w-24">Date</th>
                                <th class="p-3 text-left border-r">Issue & Latest Log</th>
                                <th class="p-3 text-center border-r w-32">Status</th>
                                <th class="p-3 text-left w-32">Ticket ID</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            ${jobs.map(j => {
                                const lastLog = j.logs && j.logs.length > 0 ? j.logs[j.logs.length - 1] : null;
                                return `
                                <tr>
                                    <td onclick="editF('${j.id}','dateStr','${j.dateStr}')" class="p-3 border-r font-bold text-slate-400 cursor-pointer">${j.dateStr}</td>
                                    <td class="p-3 border-r">
                                        <div class="font-black mb-1 uppercase text-slate-800">${j.title}</div>
                                        ${lastLog ? `<div class="bg-blue-50 text-blue-700 p-1 px-2 rounded border-l-2 border-blue-400 font-bold mb-2 uppercase">${lastLog}</div>` : ''}
                                        <div class="flex gap-1">
                                            <input id="log-in-${j.id}" placeholder="LOG..." class="flex-1 bg-slate-50 border p-1 rounded text-[10px] uppercase font-semibold outline-none focus:border-blue-300">
                                            <button onclick="addLog('${j.id}')" class="bg-slate-800 text-white px-3 rounded text-[9px] font-bold transition active:scale-90">ADD</button>
                                        </div>
                                    </td>
                                    <td class="p-3 border-r text-center">
                                        <button onclick="changeStatus('${j.id}')" class="w-full py-2 rounded font-black text-[9px] text-white ${j.status==='Solved'?'bg-emerald-500':(j.status==='Critical'?'bg-red-600 animate-pulse':'bg-orange-500')}">${j.status}</button>
                                    </td>
                                    <td onclick="editF('${j.id}','ticket','${j.ticket}')" class="p-3 font-mono font-bold text-slate-400 cursor-pointer hover:text-blue-600">${j.ticket}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }).join('');
};
