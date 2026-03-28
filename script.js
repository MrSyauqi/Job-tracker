// Replace your existing script.js functions with these updated versions

// 1. Updated Add Job with Priority
window.addJob = async () => {
    const t = document.getElementById('jt'), c = document.getElementById('jc'), p = document.getElementById('jp');
    if (!t.value) return;
    await addDoc(jobsCol, { 
        title: t.value, 
        client: c.value || "Site", 
        priority: parseInt(p.value), // Save as number 1, 2, or 3
        status: 'pending', 
        notes: [], 
        createdAt: Date.now() 
    });
    t.value = ''; c.value = '';
};

// 2. Updated Render with Sorting and History Log
function render(pending, history) {
    const pV = document.getElementById('pV'), cV = document.getElementById('cV');
    
    // SORTING: Sort by Priority (3 is highest) then by Date
    pending.sort((a, b) => b.priority - a.priority || b.createdAt - a.createdAt);

    document.getElementById('pC').innerText = pending.length;
    document.getElementById('cC').innerText = history.length;

    // Render Pending with Priority Colors
    pV.innerHTML = pending.map(j => `
        <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
            <div class="flex justify-between items-start">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <h3 class="font-bold text-slate-800">${j.priority === 3 ? '🚨 ' : ''}${j.title}</h3>
                    <p class="text-[10px] text-blue-600 font-bold uppercase">${j.client} <span id="arrow-${j.id}" class="ml-1 text-slate-400">▶</span></p>
                </div>
                <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs font-bold">Done</button>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-3 pt-3 border-t">
                <div class="space-y-1 mb-3">${j.notes.map(n => `<div class="text-[11px] bg-slate-50 p-2 border-l-2 border-blue-500 mb-1">${n}</div>`).join('')}</div>
                <div class="flex gap-2">
                    <input id="n-${j.id}" class="flex-1 text-xs p-2 border rounded" placeholder="Update log...">
                    <button onclick='window.addNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-2 py-1 rounded text-[10px]">Add</button>
                </div>
            </div>
        </div>
    `).join('');

    // Render History with Log Viewer
    cV.innerHTML = history.map(j => `
        <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm opacity-90 history-card">
            <div class="flex justify-between items-center">
                <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                    <div class="font-bold text-slate-500 line-through text-sm">${j.title}</div>
                    <div class="text-[9px] text-slate-400 uppercase font-bold">${j.client} • Fixed: ${j.date} <span id="arrow-${j.id}" class="text-blue-400">View Log</span></div>
                </div>
                <button onclick="window.restoreJob('${j.id}')" class="text-blue-400 text-[10px] font-bold px-2 py-1 border border-blue-100 rounded">Restore</button>
            </div>
            <div id="logbox-${j.id}" class="hidden mt-2 pt-2 border-t border-slate-100 bg-slate-50 p-2 rounded">
                <p class="text-[9px] font-bold text-slate-400 mb-2 uppercase">Resolution Log:</p>
                ${j.notes.map(n => `<div class="text-[10px] text-slate-600 mb-1 border-b border-slate-200 pb-1">${n}</div>`).join('') || '<p class="text-[10px] italic">No notes recorded.</p>'}
            </div>
        </div>
    `).join('');
}
