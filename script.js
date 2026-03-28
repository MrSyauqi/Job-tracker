// PENDING LIST
pV.innerHTML = pending.map(j => {
    const isOpen = openLogs.has(j.id) ? '' : 'hidden';
    return `
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200 priority-${j.priority}">
        <div class="flex justify-between items-start">
            <div onclick="window.toggleLog('${j.id}')" class="flex-1 cursor-pointer">
                <h3 class="font-black text-slate-800 text-lg uppercase leading-tight">${j.client}</h3>
                <p class="text-xs text-blue-600 font-bold mt-1 uppercase tracking-tight">${j.title}</p>
                <span class="text-[9px] text-slate-300 font-bold uppercase mt-1 inline-block tracking-widest">▼ LOG</span>
            </div>
            <button onclick="window.finishJob('${j.id}')" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md active:scale-90 transition">Done</button>
        </div>
        <div id="logbox-${j.id}" class="${isOpen} mt-3 pt-3 border-t">
            <div class="space-y-1 mb-3">${j.notes.map(n => `<div class="text-[11px] bg-slate-50 p-2 border-l-2 border-blue-500 rounded font-medium text-slate-700">${n}</div>`).join('')}</div>
            <div class="flex gap-2">
                <input id="n-${j.id}" class="flex-1 text-xs p-3 border rounded-lg bg-slate-50 outline-none focus:ring-2 focus:ring-blue-400" placeholder="Add update...">
                <button onclick='window.saveNote("${j.id}", ${JSON.stringify(j.notes)})' class="bg-slate-800 text-white px-4 py-1 rounded-lg text-[10px] font-bold">Update</button>
            </div>
        </div>
    </div>
`}).join('');
