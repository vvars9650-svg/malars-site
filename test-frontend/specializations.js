(() => {
  const C = window.MalarsSpecializationCatalog;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyFor = id => 'malars-specializations:' + C.version + ':' + (id || 'unsaved');
  const memory = new Map();
  const limitation = 'Детализация сохраняется только в этом браузере и пока не передаётся в МАЛАРС.';
  function read(id) {
    try { return JSON.parse(localStorage.getItem(keyFor(id)) || 'null') || memory.get(keyFor(id)) || {}; }
    catch (_) { return memory.get(keyFor(id)) || {}; }
  }
  function mount(host, answers, intakeId, legacy) {
    const catalog = C.create(legacy);
    const saved = read(intakeId);
    const state = {};
    let query = '', onlySelected = false, message = '', storageError = false;
    const initialProfile = new Set(C.directionsFor(answers.mainCategories || [], legacy));
    const open = new Set(initialProfile);
    let additionalOpen = false;
    let phase = 'systems';
    let validationError = false;
    const bulk = new Set();
    const codeOf = value => String(value).split(' — ')[0];
    const hasLegacy = code => (answers.competencies || []).some(value => codeOf(value) === code);
    for (const sys of catalog) {
      const previous = saved.systems?.[sys.id] || {};
      const selected = sys.specializations.filter(s => s.legacy ? hasLegacy(s.id) : (previous.specializations || []).includes(s.id)).map(s=>s.id);
      state[sys.id] = {enabled: Boolean(previous.enabled || selected.length), specializations:selected, operations:(previous.operations || []).filter(op=>C.operations.some(([id])=>id===op))};
    }
    const known = new Set(catalog.flatMap(s=>s.specializations.filter(x=>x.legacy).map(x=>x.id)));
    function persist() {
      const payload = {version:C.version, systems:state};
      memory.set(keyFor(intakeId),payload);
      try { localStorage.setItem(keyFor(intakeId),JSON.stringify(payload)); storageError=false; }
      catch (_) { storageError=true; }
    }
    function updateLegacy(spec, checked) {
      answers.competencies ||= [];
      if (checked && !hasLegacy(spec.id)) answers.competencies.push(spec.id + ' — ' + spec.name);
      if (!checked) answers.competencies = answers.competencies.filter(value=>codeOf(value)!==spec.id);
    }
    function includeDirection(system) {
      answers.mainCategories = C.changeDirection(answers.mainCategories || [],system.direction,true,legacy);
    }
    function render(focusKey) {
      const scrollX=window.scrollX, scrollY=window.scrollY;
      const searchFocus = host.contains(document.activeElement) && document.activeElement.matches('[data-spec-search]');
      const caret = searchFocus ? document.activeElement.selectionStart : null;
      const selectedCount = catalog.filter(s=>state[s.id].enabled).length;
      let found = 0;
      const profile = new Set([...C.directionsFor(answers.mainCategories || [],legacy), ...catalog.filter(s=>state[s.id].enabled).map(s=>s.direction)]);
      const mainGroups = [], otherGroups = [];
      C.directions.forEach(([id,name]) => {
        const systems = catalog.filter(s=>s.direction===id);
        const visible = systems.filter(s=>C.matches(s,query,name) && (!onlySelected || state[s.id].enabled));
        if (!visible.length) return;
        found += visible.length;
        const count = systems.filter(s=>state[s.id].enabled).length;
        const html = `<details class="spec-direction" data-direction="${id}" ${query || onlySelected || open.has(id) ? 'open' : ''}><summary><span>${esc(name)}</span><small>${count ? `Выбрано: ${count}` : ''}</small></summary><div class="spec-systems">${visible.map(system => {
          const s = state[system.id];
          const norm = system.mark ? `<span class="spec-mark">Марка РД: ${esc(system.mark)}</span><span>${esc(system.markTitle)}</span>` : '';
          return `<details class="spec-system" data-system="${system.id}" ${query || open.has(system.id) ? 'open' : ''}><summary><span class="spec-system-name">${esc(system.name)}</span><small>${s.enabled ? `Выбрано · специализаций: ${s.specializations.length} · видов работ: ${s.operations.length}` : ''}</small></summary><div class="spec-system-body"><label class="intake-choice"><input type="checkbox" data-spec-enabled="${system.id}" ${s.enabled?'checked':''}><span>Выбрать подсистему</span></label>${norm ? `<div class="spec-meta">${norm}</div>` : ''}<fieldset><legend>Конкретные специализации</legend><div class="spec-options">${system.specializations.map(spec=>`<label class="intake-choice"><input type="checkbox" data-spec-item="${spec.id}" data-owner="${system.id}" ${s.specializations.includes(spec.id)?'checked':''}><span>${esc(spec.name)}</span></label>`).join('')}</div></fieldset><fieldset><legend>Виды работ для этой подсистемы</legend><div class="spec-operations">${C.operations.filter(([id])=>system.operations.includes(id) || s.operations.includes(id)).map(([id,label])=>`<label class="intake-choice"><input type="checkbox" data-spec-operation="${id}" data-owner="${system.id}" ${s.operations.includes(id)?'checked':''}><span>${label}${!system.operations.includes(id) ? " — прежний выбор, требуется уточнить" : ""}</span></label>`).join('')}</div><p class="field-hint">Показаны применимые виды работ. Выбор вида работ также выбирает подсистему.</p></fieldset></div></details>`;
        }).join('')}</div></details>`;
        if (profile.has(id) || query || onlySelected) mainGroups.push(html);
        else otherGroups.push(html);
      });
      const groups = mainGroups.join('');
      const additional = otherGroups.length ? `<details class="spec-additional" data-spec-additional ${additionalOpen ? 'open' : ''}><summary>Другие направления</summary><p class="field-hint">Если что-то упустили на первом шаге, выберите здесь. Можно также воспользоваться поиском выше.</p><div class="spec-other-groups">${otherGroups.join('')}</div></details>` : '';
      const unmatched = (answers.competencies || []).filter(value=>!known.has(codeOf(value)));
      host.innerHTML = `<div class="spec-editor"><p class="field-hint">Уточните свой профиль. Если чего-то не хватает, найдите через поиск или откройте другие направления ниже.</p><aside class="spec-notice" role="note">${limitation}</aside><label class="spec-search">Найти специализацию<input type="search" data-spec-search placeholder="Например: вентиляция, СКУД, ПЛК, метрология" value="${esc(query)}"></label><div class="spec-toolbar"><strong data-spec-total>Выбрано подсистем: ${selectedCount}</strong><label class="intake-choice"><input type="checkbox" data-spec-filter ${onlySelected?'checked':''}><span>Только выбранные</span></label><button type="button" class="button button-secondary" data-spec-collapse>Свернуть всё</button></div><details class="spec-bulk"><summary>Применить виды работ к выбранным подсистемам (${selectedCount})</summary><div class="spec-operations">${C.operations.map(([id,label])=>`<label class="intake-choice"><input type="checkbox" data-spec-bulk="${id}" ${bulk.has(id)?'checked':''}><span>${label}</span></label>`).join('')}</div><p class="field-hint">Применяется ко всем выбранным подсистемам, включая скрытые поиском. Неприменимые виды работ пропускаются. Существующие выборы сохраняются.</p><button type="button" class="button button-secondary" data-spec-apply ${!selectedCount?'disabled':''}>Добавить выбранные виды работ</button></details><p class="spec-feedback" data-spec-feedback role="status" aria-live="polite">${esc(storageError?'Хранилище браузера недоступно. Детализация находится только в памяти страницы и потеряется при обновлении.':message)}</p>${query ? `<p data-spec-found class="field-hint">Найдено подсистем: ${found}</p>` : ''}${groups || (query || onlySelected ? '<p class="spec-empty">Ничего не найдено. Измените запрос или отключите «Только выбранные».</p>' : '<p class="field-hint">Выберите направление ниже или найдите нужную специализацию.</p>')}${additional}${unmatched.length?`<details class="spec-legacy" open><summary>Ранее выбранные значения (${unmatched.length})</summary><p class="field-hint">В текущем справочнике нет точного соответствия. Значения сохранены без изменения; снять выбор можно явно.</p>${unmatched.map((v,i)=>`<label class="intake-choice"><input type="checkbox" data-spec-legacy="${i}" checked><span>${esc(C.displayValue(v,legacy))}</span></label>`).join('')}</details>`:''}</div>`;
      // Explicit sequence: systems, then work types, then remaining form fields.
      const editor=host.querySelector('.spec-editor');
      const bulkPanel=host.querySelector('.spec-bulk');
      const workPanels=[];
      host.querySelectorAll('.spec-system').forEach(panel=>{
        const system=catalog.find(sys=>sys.id===panel.dataset.system);
        const work=panel.querySelector('.spec-operations')?.closest('fieldset');
        if(work && state[system.id].enabled) {
          work.querySelector('legend').textContent=system.name;
          workPanels.push(work);
        }
        if(work)work.remove();
      });
      bulkPanel.remove();
      const stage=document.createElement('div');stage.className='spec-stage';
      const title=document.createElement('h3');
      title.textContent=phase==='systems'?'1. Выберите подсистемы':phase==='works'?'2. Выберите виды работ':'3. Как выполняете работы';
      editor.prepend(title);
      if(phase!=='systems') {
        editor.querySelectorAll('.spec-direction,.spec-additional,.spec-search,.spec-toolbar,.spec-legacy,.spec-empty').forEach(el=>el.hidden=true);
      }
      if(phase==='works') {
        bulkPanel.open=false;stage.append(bulkPanel,...workPanels);
      }
      const button=document.createElement('button');button.type='button';button.className='button';
      button.dataset.specStage=phase==='systems'?'works':phase==='works'?'rest':'systems';
      button.textContent=phase==='systems'?'Далее: виды работ':phase==='works'?'Далее: как выполняете работы':'Изменить подсистемы и виды работ';
      if(validationError) {
        const alert=document.createElement('p');alert.className='form-validation-error';alert.setAttribute('role','alert');alert.setAttribute('aria-live','assertive');alert.textContent=message;stage.append(alert);
        for(const panel of workPanels) {
          const inputs=[...panel.querySelectorAll('[data-spec-operation]')];
          const sys=catalog.find(sys=>sys.id===inputs[0]?.dataset.owner);
          if(sys && (!state[sys.id].operations.length || state[sys.id].operations.some(op=>!sys.operations.includes(op)))) {
            panel.classList.add('field-error');inputs.forEach(input=>input.setAttribute('aria-invalid','true'));
            const note=document.createElement('p');note.className='field-error-text';note.textContent=!state[sys.id].operations.length?'Выберите виды работ':'Снимите неприменимые виды работ';panel.append(note);
          }
        }
        if(phase==='systems')host.querySelector('.spec-toolbar')?.classList.add('field-error');
        requestAnimationFrame(()=>{const first=host.querySelector('.field-error') || alert;first.scrollIntoView({behavior:'smooth',block:'center'});});
      }
      stage.append(button);
      if(phase==='works') {
        const back=document.createElement('button');back.type='button';back.className='button button-secondary';back.dataset.specStage='systems';back.textContent='Назад к подсистемам';stage.append(back);
      }
      editor.append(stage);
      const form=host.closest('#participantIntake');
      form?.querySelectorAll('.intake-stack > .intake-field').forEach(field=>{if(!field.contains(host))field.hidden=phase!=='rest';});
      const next=form?.querySelector('[data-action="next"]');if(next)next.hidden=phase!=='rest';
      host.querySelector('[data-spec-additional]')?.addEventListener('toggle', event=>{ if(event.target.isConnected) additionalOpen=event.target.open; });
      host.querySelectorAll('details[data-direction],details[data-system]').forEach(el=>el.addEventListener('toggle',()=>{
        if (!el.isConnected || query || onlySelected) return;
        const id=el.dataset.direction || el.dataset.system;
        if(el.open)open.add(id);else open.delete(id);
      }));
      if(searchFocus) {
        const input=host.querySelector('[data-spec-search]');input.focus({preventScroll:true});input.setSelectionRange(caret,caret);
      } else if (focusKey) host.querySelector(focusKey)?.focus({preventScroll:true});
      if(!validationError){window.scrollTo({left:scrollX,top:scrollY,behavior:'instant'});requestAnimationFrame(()=>window.scrollTo({left:scrollX,top:scrollY,behavior:'instant'}));}
    }
    host.addEventListener('input',event=>{
      if(event.target.matches('[data-spec-search]')) {query=event.target.value;if(query.trim())onlySelected=false;render();}
    });
    host.addEventListener('change',event=>{
      validationError=false;message='';
      const el=event.target;
      if(el.matches('[data-spec-filter]')) {onlySelected=el.checked;render('[data-spec-filter]');return;}
      if(el.dataset.specBulk) {el.checked?bulk.add(el.dataset.specBulk):bulk.delete(el.dataset.specBulk);return;}
      if(el.dataset.specEnabled) {
        const sys=catalog.find(s=>s.id===el.dataset.specEnabled), s=state[sys.id];
        s.enabled=el.checked;
        if(el.checked)includeDirection(sys);
        if(!el.checked) {sys.specializations.filter(x=>x.legacy).forEach(x=>updateLegacy(x,false));s.specializations=[];s.operations=[];}
        open.add(sys.id);persist();render(`[data-spec-enabled="${sys.id}"]`);return;
      }
      if(el.dataset.owner) {
        const sys=catalog.find(s=>s.id===el.dataset.owner), s=state[sys.id];
        const op=el.dataset.specOperation, id=op || el.dataset.specItem;
        const field=op?'operations':'specializations';
        s[field]=s[field].filter(value=>value!==id);
        if(el.checked) {s[field].push(id);s.enabled=true;includeDirection(sys);}
        if(!op) {const spec=sys.specializations.find(x=>x.id===id);if(spec.legacy)updateLegacy(spec,el.checked);}
        open.add(sys.id);persist();render(`[data-owner="${sys.id}"][${op?'data-spec-operation':'data-spec-item'}="${id}"]`);return;
      }
      if(el.dataset.specLegacy != null) {
        const unmatched=(answers.competencies||[]).filter(value=>!known.has(codeOf(value)));
        const value=unmatched[Number(el.dataset.specLegacy)];
        answers.competencies=answers.competencies.filter(x=>x!==value);persist();render();
      }
    });
    host.addEventListener('click',event=>{
      const stageButton=event.target.closest('[data-spec-stage]');
      if(stageButton) {
        const target=stageButton.dataset.specStage;
        const error=target==='works' && !catalog.some(sys=>state[sys.id].enabled)?'Выберите хотя бы одну подсистему.':target==='rest'?validate(intakeId):'';
        if(error){message=error;validationError=true;render();return;}
        phase=target;query='';onlySelected=false;message='';validationError=false;render();requestAnimationFrame(()=>{const form=host.closest('#participantIntake') || host;window.scrollTo({top:Math.max(0,form.getBoundingClientRect().top+window.scrollY-100),behavior:'instant'});});return;
      }
      if(event.target.closest('[data-spec-collapse]')) {query='';onlySelected=false;open.clear();render('[data-spec-collapse]');}
      if(event.target.closest('[data-spec-apply]')) {
        let added=0, skipped=0;
        for(const sys of catalog.filter(x=>state[x.id].enabled)) for(const op of bulk) {
          if(!sys.operations.includes(op)) {skipped++;continue;}
          if(!state[sys.id].operations.includes(op)) {state[sys.id].operations.push(op);added++;}
        }
        message=bulk.size?`Добавлено связей: ${added}. Неприменимых пропущено: ${skipped}. Детализация сохранена только в браузере.`:'Сначала выберите виды работ для массового применения.';
        persist();render('[data-spec-apply]');
      }
    });
    host.addEventListener('spec:invalid',event=>{
      const missingSpecs=!(answers.competencies||[]).length;
      phase=missingSpecs?'systems':validate(intakeId)?'works':'rest';
      message=event.detail.message;validationError=true;
      if(missingSpecs)for(const sys of catalog.filter(sys=>state[sys.id].enabled))open.add(sys.id);
      render();
      if(missingSpecs)host.querySelectorAll('.spec-system[open] .spec-options').forEach(el=>el.closest('fieldset').classList.add('field-error'));
    });
    persist();render();
  }
  function validate(id) {
    const catalog=C.create(window.MALARS_TEST_DATA?.WORKS || []);
    const saved=read(id).systems || {};
    const selected=catalog.filter(sys=>saved[sys.id]?.enabled);
    if(!selected.length)return 'Выберите хотя бы одну подсистему.';
    const invalid=selected.filter(sys=>saved[sys.id].operations?.some(op=>!sys.operations.includes(op)));
    if(invalid.length)return 'Уточните прежние виды работ: '+invalid.map(sys=>sys.name).join(', ')+'. Снимите неприменимые варианты.';
    const missing=selected.filter(sys=>!saved[sys.id].operations?.length);
    if(missing.length)return 'Выберите виды работ для каждой подсистемы';
    return '';
  }
  function summary(id) {
    const systems=Object.values(read(id).systems || {}).filter(s=>s.enabled);
    if(!systems.length)return limitation;
    return `Локальная детализация: ${systems.length} подсистем, ${systems.reduce((n,s)=>n+s.operations.length,0)} связей с видами работ. ${limitation}`;
  }
  window.MalarsSpecializations = {mount,summary,limitation,validate};
})();
