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

// CONNECTION CHECKER
onSnapshot(query(jobsCol, orderBy("createdAt", "desc")), (snap) => {
    document.getElementById('connectionDot').className = "h-3 w-3 bg-green-500 rounded-full";
    globalData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
}, (err) => {
    console.error(err);
    document.getElementById('connectionDot').className = "h-3 w-3 bg-red-500 animate-pulse rounded-full";
});

window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp'), r = document.getElementById('rt');
    if (!t.value || !c.value) return alert("Fill fields");
    await addDoc(jobsCol, { 
        title: t.value.toUpperCase(), client: c.value.toUpperCase(), 
        priority: parseInt(p.value), ticket: r.value || "NA",
        status: p.value == "1" ? 'Solved' : (p.value == "3" ? 'Critical' : 'Pending'), 
        logs: [], createdAt: Date.now(), dateStr: new Date().toLocaleDateString('en-GB')
    });
    t.value = ''; r.value = '';
};

window.addLog = async (id, logs) => {
    const input = document.getElementById(`log-${id}`);
    if (!input.value) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    await updateDoc(doc(db, "jobs", id), { logs: [...logs, `[${time}] ${input.value.toUpperCase()}`] });
    input.value = '';
};

window.changeStatus = async (id) => {
    const c = prompt("1:PENDING 2:SOLVED 3:CRITICAL 4:DELETE");
    if (c === "1") await updateDoc(doc(db, "jobs", id), { status: 'Pending', priority: 2 });
    else if (c === "2") await updateDoc(doc(db, "jobs", id), { status: 'Solved', priority: 1 });
    else if (c === "3") await updateDoc(doc(db, "jobs", id), { status: 'Critical', priority: 3 });
    else if (c === "4") if(confirm("Delete?")) await deleteDoc(doc(db, "jobs", id));
};

function render() {
    const container = document.getElementById('customerGrid');
    const groups = globalData.reduce((acc, j) => { (acc[j.client] = acc[j.client] || []).push(j); return acc; }, {});

    container.innerHTML = Object.keys(groups).sort().map(client => {
        const jobs = groups[client];
        return `
            <div class="p-4 bg-slate-50 font-black border-b uppercase">${client}</div>
            <table class="w-full text-[11px] bg-white">
                <tr class="bg-slate-100 text-[9px] uppercase text-slate-400">
                    <th class="p-2 text-left border-r w-24">Date</th>
                    <th class="p-2 text-left border-r">Issue & Latest Log</th>
                    <th class="p-2 text-center border-r w-32">Status</th>
                    <th class="p-2 text-left w-32">Ticket ID</th>
                </tr>
                ${jobs.map(j => `
                    <tr class="border-b">
                        <td class="p-2 border-r font-bold text-slate-400">${j.dateStr}</td>
                        <td class="p-2 border-r">
                            <div class="font-black">${j.title}</div>
                            ${j.logs.length ? `<div class="bg-blue-50 text-blue-700 p-1 rounded border-l-2 border-blue-400 font-bold my-1">${j.logs.slice(-1)}</div>` : ''}
                            <div class="flex gap-1 mt-1">
                                <input id="log-${j.id}" placeholder="LOG..." class="flex-1 border p-1 rounded text-[10px] uppercase">
                                <button onclick='window.addLog("${j.id}", ${JSON.stringify(j.logs)})' class="bg-slate-800 text-white px-2 rounded text-[9px]">ADD</button>
                            </div>
                        </td>
                        <td class="p-2 border-r text-center">
                            <button onclick="window.changeStatus('${j.id}')" class="w-full py-2 rounded font-black text-[9px] text-white ${j.status === 'Solved' ? 'bg-emerald-500' : (j.priority === 3 ? 'bg-red-600' : 'bg-orange-500')}">${j.status}</button>
                        </td>
                        <td class="p-2 font-mono font-bold text-slate-400">${j.ticket}</td>
                    </tr>`).join('')}
            </table>`;
    }).join('');
}
