// Aplicación principal para el generador de flujos IA
const state = {
  currentTab: 0,
  currentFlow: 0,
  currentSection: 0,
  flows: [{
    name: "Flujo Principal",
    steps: [
      { text: "Saluda al cliente y pregúntale si desea retirar en tienda o envío a domicilio", functions: [] },
      { text: "Solicita el pedido (productos y cantidades) y, si aplica, la dirección para envío.", functions: [] }
    ]
  }],
  sections: [
    {
      name: "Instrucciones Generales",
      fields: [
        { type: "text", label: "Configuración", items: ["Profesional, cordial y claro", "Respuestas breves, máximo 3 renglones"] },
        { type: "textarea", label: "Contexto", value: "Actúa como encargado de tomar pedidos por WhatsApp" }
      ]
    },
    {
      name: "Reglas de comportamiento", 
      fields: [
        { 
          type: "list", 
          label: "Reglas", 
          items: [
            "Pregunta una cosa a la vez",
            "Envía los enlaces sin formato", 
            "No proporciones información fuera de este documento"
          ]
        }
      ]
    }
  ],
  faqs: [
    { question: "¿Cuáles son los horarios de atención?", answer: "Atendemos de lunes a domingo de 8:00 AM a 10:00 PM" },
    { question: "¿Hacen delivery?", answer: "Sí, hacemos delivery en un radio de 5km" }
  ]
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  functions.load();
  functions.init();
  projects.init();
  renderAll();
  updatePrompt();
});

// ==========================================
// GESTIÓN DE PESTAÑAS
// ==========================================
function showTab(index) {
  document.querySelectorAll('.tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === index);
  });
  document.querySelectorAll('.tab-content').forEach((content, i) => {
    content.classList.toggle('active', i === index);
  });
  state.currentTab = index;
}

// ==========================================
// GESTIÓN DE SECCIONES
// ==========================================
function addSection() {
  const name = prompt("Nombre de la nueva sección:", `Sección ${state.sections.length + 1}`);
  if (name && name.trim()) {
    state.sections.push({ 
      name: name.trim(), 
      fields: [] 
    });
    state.currentSection = state.sections.length - 1;
    renderSections();
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function deleteSection() {
  if (state.sections.length <= 1) {
    alert("Debe haber al menos una sección");
    return;
  }
  
  if (confirm(`¿Eliminar la sección "${state.sections[state.currentSection].name}"?`)) {
    state.sections.splice(state.currentSection, 1);
    state.currentSection = Math.max(0, state.currentSection - 1);
    renderSections();
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function changeSection() {
  state.currentSection = parseInt(document.getElementById('section-selector').value);
  renderSectionContent();
  document.getElementById('section-name').value = state.sections[state.currentSection].name;
}

function renameSection() {
  const newName = document.getElementById('section-name').value.trim();
  if (newName) {
    state.sections[state.currentSection].name = newName;
    renderSections();
    updatePrompt();
    scheduleAutoSave();
  }
}

function renderSections() {
  const selector = document.getElementById('section-selector');
  selector.innerHTML = state.sections.map((section, index) => 
    `<option value="${index}" ${index === state.currentSection ? 'selected' : ''}>${escapeHtml(section.name)}</option>`
  ).join('');
  
  if (document.getElementById('section-name')) {
    document.getElementById('section-name').value = state.sections[state.currentSection].name;
  }
}

// ==========================================
// GESTIÓN DE CONTENIDO DE SECCIONES
// ==========================================
function addTextField() {
  const label = prompt("Etiqueta del campo:");
  if (label && label.trim()) {
    state.sections[state.currentSection].fields.push({
      type: "text",
      label: label.trim(),
      items: [""]
    });
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function addTextAreaField() {
  const label = prompt("Etiqueta del área de texto:");
  if (label && label.trim()) {
    state.sections[state.currentSection].fields.push({
      type: "textarea",
      label: label.trim(),
      value: ""
    });
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function addListField() {
  const label = prompt("Título de la lista:");
  if (label && label.trim()) {
    state.sections[state.currentSection].fields.push({
      type: "list",
      label: label.trim(),
      items: [""]
    });
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function removeField(fieldIndex) {
  if (confirm("¿Eliminar este campo?")) {
    state.sections[state.currentSection].fields.splice(fieldIndex, 1);
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function moveField(fieldIndex, direction) {
  const fields = state.sections[state.currentSection].fields;
  const newIndex = fieldIndex + direction;
  
  if (newIndex >= 0 && newIndex < fields.length) {
    [fields[fieldIndex], fields[newIndex]] = [fields[newIndex], fields[fieldIndex]];
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function updateTextField(fieldIndex, value) {
  state.sections[state.currentSection].fields[fieldIndex].value = value;
  updatePrompt();
  scheduleAutoSave();
}

// Nuevas funciones para campos de texto como listas
function addTextItem(fieldIndex) {
  state.sections[state.currentSection].fields[fieldIndex].items.push('');
  renderSectionContent();
  scheduleAutoSave();
}

function removeTextItem(fieldIndex, itemIndex) {
  if (confirm('¿Eliminar este elemento?')) {
    state.sections[state.currentSection].fields[fieldIndex].items.splice(itemIndex, 1);
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function moveTextItem(fieldIndex, itemIndex, direction) {
  const items = state.sections[state.currentSection].fields[fieldIndex].items;
  const newIndex = itemIndex + direction;
  
  if (newIndex >= 0 && newIndex < items.length) {
    [items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]];
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function updateTextItem(fieldIndex, itemIndex, value) {
  state.sections[state.currentSection].fields[fieldIndex].items[itemIndex] = value;
  updatePrompt();
  scheduleAutoSave();
}

function addListItem(fieldIndex) {
  state.sections[state.currentSection].fields[fieldIndex].items.push('');
  renderSectionContent();
  scheduleAutoSave();
}

function removeListItem(fieldIndex, itemIndex) {
  if (confirm('¿Eliminar este elemento?')) {
    state.sections[state.currentSection].fields[fieldIndex].items.splice(itemIndex, 1);
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function moveListItem(fieldIndex, itemIndex, direction) {
  const items = state.sections[state.currentSection].fields[fieldIndex].items;
  const newIndex = itemIndex + direction;
  
  if (newIndex >= 0 && newIndex < items.length) {
    [items[itemIndex], items[newIndex]] = [items[newIndex], items[itemIndex]];
    renderSectionContent();
    updatePrompt();
    scheduleAutoSave();
  }
}

function updateListItem(fieldIndex, itemIndex, value) {
  state.sections[state.currentSection].fields[fieldIndex].items[itemIndex] = value;
  updatePrompt();
  scheduleAutoSave();
}

function renderSectionContent() {
  const container = document.getElementById('section-content-container');
  const currentSection = state.sections[state.currentSection];
  
  container.innerHTML = currentSection.fields.map((field, fieldIndex) => {
    // Controles de reorganización para campos
    const fieldControls = `
      <div class="step-controls">
        ${fieldIndex > 0 ? `<button class="step-btn" onclick="moveField(${fieldIndex}, -1)" title="Subir">↑</button>` : ''}
        ${fieldIndex < currentSection.fields.length - 1 ? `<button class="step-btn" onclick="moveField(${fieldIndex}, 1)" title="Bajar">↓</button>` : ''}
        <button class="step-btn btn-danger" onclick="removeField(${fieldIndex})" title="Eliminar">×</button>
      </div>
    `;

    if (field.type === 'text') {
      // Asegurar que items existe
      if (!field.items) field.items = [field.value || ''];
      
      return `
        <div class="step">
          <div class="step-header">
            <span class="step-number">📝 ${escapeHtml(field.label)}</span>
            ${fieldControls}
          </div>
          
          <div class="dynamic-list">
            ${field.items.map((item, itemIndex) => `
              <div class="list-item">
                <input type="text" value="${escapeHtml(item)}" placeholder="Nuevo elemento..." 
                       oninput="updateTextItem(${fieldIndex}, ${itemIndex}, this.value)">
                <div class="list-item-controls">
                  ${itemIndex > 0 ? `<button class="btn-small" onclick="moveTextItem(${fieldIndex}, ${itemIndex}, -1)" title="Subir">↑</button>` : ''}
                  ${itemIndex < field.items.length - 1 ? `<button class="btn-small" onclick="moveTextItem(${fieldIndex}, ${itemIndex}, 1)" title="Bajar">↓</button>` : ''}
                  <button class="btn-small btn-danger" onclick="removeTextItem(${fieldIndex}, ${itemIndex})">×</button>
                </div>
              </div>
            `).join('')}
            <button type="button" class="btn-small" onclick="addTextItem(${fieldIndex})">➕ Agregar Elemento</button>
          </div>
        </div>
      `;
    } else if (field.type === 'textarea') {
      return `
        <div class="step">
          <div class="step-header">
            <span class="step-number">📄 ${escapeHtml(field.label)}</span>
            ${fieldControls}
          </div>
          
          <div class="form-group">
            <textarea placeholder="Ingresa el texto..." 
                      oninput="updateTextField(${fieldIndex}, this.value)">${escapeHtml(field.value)}</textarea>
          </div>
        </div>
      `;
    } else if (field.type === 'list') {
      return `
        <div class="step">
          <div class="step-header">
            <span class="step-number">📋 ${escapeHtml(field.label)}</span>
            ${fieldControls}
          </div>
          
          <div class="dynamic-list">
            ${field.items.map((item, itemIndex) => `
              <div class="list-item">
                <input type="text" value="${escapeHtml(item)}" placeholder="Nuevo elemento..." 
                       oninput="updateListItem(${fieldIndex}, ${itemIndex}, this.value)">
                <div class="list-item-controls">
                  ${itemIndex > 0 ? `<button class="btn-small" onclick="moveListItem(${fieldIndex}, ${itemIndex}, -1)" title="Subir">↑</button>` : ''}
                  ${itemIndex < field.items.length - 1 ? `<button class="btn-small" onclick="moveListItem(${fieldIndex}, ${itemIndex}, 1)" title="Bajar">↓</button>` : ''}
                  <button class="btn-small btn-danger" onclick="removeListItem(${fieldIndex}, ${itemIndex})">×</button>
                </div>
              </div>
            `).join('')}
            <button type="button" class="btn-small" onclick="addListItem(${fieldIndex})">➕ Agregar Elemento</button>
          </div>
        </div>
      `;
    }
    return '';
  }).join('');
}

// ==========================================
// GESTIÓN DE FAQ
// ==========================================
function addFAQ() {
  state.faqs.push({ question: '', answer: '' });
  renderFAQs();
  scheduleAutoSave();
}

function removeFAQ(index) {
  if (confirm('¿Eliminar esta pregunta frecuente?')) {
    state.faqs.splice(index, 1);
    renderFAQs();
    updatePrompt();
    scheduleAutoSave();
  }
}

function updateFAQ(index, field, value) {
  state.faqs[index][field] = value;
  updatePrompt();
  scheduleAutoSave();
}

function renderFAQs() {
  const container = document.getElementById('faq-container');
  container.innerHTML = state.faqs.map((faq, index) => `
    <div class="list-item" style="flex-direction: column; align-items: stretch; background: var(--bg-tertiary); padding: 12px; border-radius: 6px; border: 1px solid var(--border-secondary); position: relative; margin-bottom: 12px;">
      <button class="delete-btn" onclick="removeFAQ(${index})">×</button>
      <label>Pregunta:</label>
      <input type="text" value="${escapeHtml(faq.question)}" placeholder="Pregunta frecuente..."
             oninput="updateFAQ(${index}, 'question', this.value)" style="margin-bottom: 8px;">
      <label>Respuesta:</label>
      <textarea placeholder="Respuesta..." oninput="updateFAQ(${index}, 'answer', this.value)">${escapeHtml(faq.answer)}</textarea>
    </div>
  `).join('');
}

// ==========================================
// GESTIÓN DE FLUJOS
// ==========================================
function addFlow() {
  const name = prompt("Nombre del nuevo flujo:", `Flujo ${state.flows.length + 1}`);
  if (name && name.trim()) {
    state.flows.push({ 
      name: name.trim(), 
      steps: [{ text: '', functions: [] }] 
    });
    state.currentFlow = state.flows.length - 1;
    renderFlows();
    renderSteps();
    updatePrompt();
    scheduleAutoSave();
  }
}

function deleteFlow() {
  if (state.flows.length <= 1) {
    alert("Debe haber al menos un flujo");
    return;
  }
  
  if (confirm(`¿Eliminar el flujo "${state.flows[state.currentFlow].name}"?`)) {
    state.flows.splice(state.currentFlow, 1);
    state.currentFlow = Math.max(0, state.currentFlow - 1);
    renderFlows();
    renderSteps();
    updatePrompt();
    scheduleAutoSave();
  }
}

function changeFlow() {
  state.currentFlow = parseInt(document.getElementById('flow-selector').value);
  renderSteps();
  document.getElementById('flow-name').value = state.flows[state.currentFlow].name;
}

function renameFlow() {
  const newName = document.getElementById('flow-name').value.trim();
  if (newName) {
    state.flows[state.currentFlow].name = newName;
    renderFlows();
    updatePrompt();
    scheduleAutoSave();
  }
}

function renderFlows() {
  const selector = document.getElementById('flow-selector');
  selector.innerHTML = state.flows.map((flow, index) => 
    `<option value="${index}" ${index === state.currentFlow ? 'selected' : ''}>${escapeHtml(flow.name)}</option>`
  ).join('');
  
  if (document.getElementById('flow-name')) {
    document.getElementById('flow-name').value = state.flows[state.currentFlow].name;
  }
}

// ==========================================
// GESTIÓN DE PASOS
// ==========================================
function addStep() {
  state.flows[state.currentFlow].steps.push({ text: '', functions: [] });
  renderSteps();
  updatePrompt();
  scheduleAutoSave();
}

function removeStep(index) {
  if (confirm("¿Eliminar este paso?")) {
    state.flows[state.currentFlow].steps.splice(index, 1);
    renderSteps();
    updatePrompt();
    scheduleAutoSave();
  }
}

function moveStep(index, direction) {
  const steps = state.flows[state.currentFlow].steps;
  const newIndex = index + direction;
  
  if (newIndex >= 0 && newIndex < steps.length) {
    [steps[index], steps[newIndex]] = [steps[newIndex], steps[index]];
    renderSteps();
    updatePrompt();
    scheduleAutoSave();
  }
}

function updateStepText(index, value) {
  state.flows[state.currentFlow].steps[index].text = value;
  updatePrompt();
  scheduleAutoSave();
}

function renderSteps() {
  const container = document.getElementById('steps-container');
  const currentFlow = state.flows[state.currentFlow];
  
  container.innerHTML = currentFlow.steps.map((step, index) => `
    <div class="step">
      <div class="step-header">
        <span class="step-number">Paso ${index + 1}</span>
        <div class="step-controls">
          ${index > 0 ? `<button class="step-btn" onclick="moveStep(${index}, -1)" title="Subir">↑</button>` : ''}
          ${index < currentFlow.steps.length - 1 ? `<button class="step-btn" onclick="moveStep(${index}, 1)" title="Bajar">↓</button>` : ''}
          <button class="step-btn btn-danger" onclick="removeStep(${index})" title="Eliminar">×</button>
        </div>
      </div>
      
      <div class="form-group">
        <label>Mensaje del paso:</label>
        <textarea placeholder="Descripción de lo que debe hacer el asistente en este paso..." 
                  oninput="updateStepText(${index}, this.value)">${escapeHtml(step.text)}</textarea>
      </div>
      
      ${renderStepFunctions(index, step.functions)}
    </div>
  `).join('');
}

// ==========================================
// GESTIÓN DE FUNCIONES EN PASOS
// ==========================================
function renderStepFunctions(stepIndex, stepFunctions) {
  const availableFunctions = functions.getAll();
  
  if (Object.keys(availableFunctions).length === 0) {
    return `
      <div style="margin-top: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 6px; color: var(--text-secondary);">
        <em>No hay funciones disponibles. Ve a la pestaña "Funciones" para crear algunas.</em>
      </div>
    `;
  }
  
  return `
    <div style="margin-top: 12px;">
      <label style="margin-bottom: 8px;">Funciones a ejecutar:</label>
      ${stepFunctions.map((func, funcIndex) => 
        renderStepFunction(stepIndex, funcIndex, func)
      ).join('')}
      <button type="button" class="btn-small" onclick="addFunction(${stepIndex})">➕ Agregar Función</button>
    </div>
  `;
}

function renderStepFunction(stepIndex, funcIndex, func) {
  const availableFunctions = functions.getAll();
  const funcDef = availableFunctions[func.type];
  
  if (!funcDef) {
    return `
      <div class="function" style="border-color: var(--danger);">
        <div class="function-header">
          <strong style="color: var(--danger);">⚠️ Función no encontrada: ${func.type}</strong>
          <button class="delete-btn" onclick="removeFunction(${stepIndex}, ${funcIndex})">×</button>
        </div>
      </div>
    `;
  }
  
  return `
    <div class="function">
      <div class="function-header">
        <strong>${funcDef.name}</strong>
        <button class="delete-btn" onclick="removeFunction(${stepIndex}, ${funcIndex})">×</button>
      </div>
      
      <div class="form-group">
        <label>Función:</label>
        <select onchange="changeFunctionType(${stepIndex}, ${funcIndex}, this.value)">
          ${Object.keys(availableFunctions).map(key => 
            `<option value="${key}" ${key === func.type ? 'selected' : ''}>${availableFunctions[key].name}</option>`
          ).join('')}
        </select>
      </div>
      
      ${renderPredefinedParams(stepIndex, funcIndex, func, funcDef)}
      ${renderCustomFields(stepIndex, funcIndex, func)}
    </div>
  `;
}

function renderPredefinedParams(stepIndex, funcIndex, func, funcDef) {
  if (!funcDef.params || funcDef.params.length === 0) {
    return '';
  }
  
  return `
    <div style="margin-top: 12px;">
      ${funcDef.params.map(param => {
        const value = func.params ? func.params[param.name] || '' : '';
        const required = param.required ? ' *' : '';
        
        if (param.type === 'select' && param.options) {
          return `
            <div class="form-group">
              <label>${param.label}${required}:</label>
              <select onchange="updateFunctionParam(${stepIndex}, ${funcIndex}, '${param.name}', this.value)">
                <option value="">Seleccionar...</option>
                ${param.options.map(option => 
                  `<option value="${option}" ${value === option ? 'selected' : ''}>${option}</option>`
                ).join('')}
              </select>
            </div>
          `;
        } else if (param.type === 'textarea') {
          return `
            <div class="form-group">
              <label>${param.label}${required}:</label>
              <textarea placeholder="Ingresa ${param.label.toLowerCase()}..." 
                        oninput="updateFunctionParam(${stepIndex}, ${funcIndex}, '${param.name}', this.value)">${escapeHtml(value)}</textarea>
            </div>
          `;
        } else {
          return `
            <div class="form-group">
              <label>${param.label}${required}:</label>
              <input type="text" value="${escapeHtml(value)}" 
                     placeholder="Ingresa ${param.label.toLowerCase()}..."
                     oninput="updateFunctionParam(${stepIndex}, ${funcIndex}, '${param.name}', this.value)">
            </div>
          `;
        }
      }).join('')}
    </div>
  `;
}

function updateFunctionParam(stepIndex, funcIndex, paramName, value) {
  const func = state.flows[state.currentFlow].steps[stepIndex].functions[funcIndex];
  if (!func.params) func.params = {};
  func.params[paramName] = value;
  updatePrompt();
  scheduleAutoSave();
}

function renderCustomFields(stepIndex, funcIndex, func) {
  const customFields = func.customFields || [];
  
  return `
    <div style="margin-top: 12px;">
      <label style="color: var(--text-accent); margin-bottom: 8px; display: block;">Campos personalizados:</label>
      
      ${customFields.map((field, fieldIndex) => `
        <div class="custom-field" style="background: var(--bg-tertiary); border: 1px solid var(--border-secondary); border-radius: 6px; padding: 12px; margin-bottom: 8px; position: relative;">
          <button class="delete-btn" onclick="removeCustomField(${stepIndex}, ${funcIndex}, ${fieldIndex})" style="top: 4px; right: 4px;">×</button>
          
          <div class="form-group">
            <label>Nombre del campo:</label>
            <input type="text" value="${escapeHtml(field.name || '')}" 
                   placeholder="Ej: nombre_formulario, whatsapp, mensaje..."
                   oninput="updateCustomField(${stepIndex}, ${funcIndex}, ${fieldIndex}, 'name', this.value)">
          </div>
          
          <div class="form-group">
            <label>Valor:</label>
            <textarea placeholder="Valor del campo..." 
                      oninput="updateCustomField(${stepIndex}, ${funcIndex}, ${fieldIndex}, 'value', this.value)">${escapeHtml(field.value || '')}</textarea>
          </div>
        </div>
      `).join('')}
      
      <button type="button" class="btn-small" onclick="addCustomField(${stepIndex}, ${funcIndex})">➕ Agregar Campo</button>
    </div>
  `;
}

function addFunction(stepIndex) {
  const availableFunctions = functions.getAll();
  const firstFunc = Object.keys(availableFunctions)[0];
  
  if (!firstFunc) {
    alert('No hay funciones disponibles. Ve a la pestaña "Funciones" para crear algunas.');
    return;
  }
  
  state.flows[state.currentFlow].steps[stepIndex].functions.push({
    type: firstFunc,
    customFields: []
  });
  
  renderSteps();
  updatePrompt();
  scheduleAutoSave();
}

function removeFunction(stepIndex, funcIndex) {
  if (confirm('¿Eliminar esta función?')) {
    state.flows[state.currentFlow].steps[stepIndex].functions.splice(funcIndex, 1);
    renderSteps();
    updatePrompt();
    scheduleAutoSave();
  }
}

function changeFunctionType(stepIndex, funcIndex, newType) {
  state.flows[state.currentFlow].steps[stepIndex].functions[funcIndex] = {
    type: newType,
    customFields: []
  };
  renderSteps();
  updatePrompt();
  scheduleAutoSave();
}

function addCustomField(stepIndex, funcIndex) {
  const func = state.flows[state.currentFlow].steps[stepIndex].functions[funcIndex];
  if (!func.customFields) func.customFields = [];
  
  func.customFields.push({
    name: '',
    value: ''
  });
  
  renderSteps();
  scheduleAutoSave();
}

function removeCustomField(stepIndex, funcIndex, fieldIndex) {
  if (confirm('¿Eliminar este campo?')) {
    const func = state.flows[state.currentFlow].steps[stepIndex].functions[funcIndex];
    func.customFields.splice(fieldIndex, 1);
    renderSteps();
    updatePrompt();
    scheduleAutoSave();
  }
}

function updateCustomField(stepIndex, funcIndex, fieldIndex, property, value) {
  const func = state.flows[state.currentFlow].steps[stepIndex].functions[funcIndex];
  if (!func.customFields) func.customFields = [];
  if (!func.customFields[fieldIndex]) func.customFields[fieldIndex] = {};
  
  func.customFields[fieldIndex][property] = value;
  updatePrompt();
  scheduleAutoSave();
}

// ==========================================
// GENERACIÓN DE PROMPTS ACTUALIZADA
// ==========================================
function updatePrompt() {
  const businessName = document.getElementById('business-name')?.value || '[Nombre negocio]';

  let html = '';
  
  // Título principal con color
  html += `<span class="output-title">Prompt para Asistente IA – "${businessName}"</span>\n\n`;

  // Secciones dinámicas
  state.sections.forEach(section => {
    const validFields = section.fields.filter(field => {
      if (field.type === 'text') return field.items && field.items.some(item => item.trim());
      if (field.type === 'textarea') return field.value && field.value.trim();
      if (field.type === 'list') return field.items && field.items.some(item => item.trim());
      return false;
    });
    
    if (validFields.length > 0) {
      html += `<span class="output-section">**${section.name}:**</span>\n`;
      
      validFields.forEach(field => {
        if (field.type === 'text') {
          const validItems = field.items.filter(item => item.trim());
          if (validItems.length > 0) {
            validItems.forEach((item) => {
              html += `- ${item}\n`;
            });
          }
        } else if (field.type === 'textarea') {
          html += `${field.value}\n`;
        } else if (field.type === 'list') {
          const validItems = field.items.filter(item => item.trim());
          if (validItems.length > 0) {
            validItems.forEach((item, index) => {
              html += `<span class="output-step-number">${index + 1}.</span> ${item}\n`;
            });
          }
        }
      });
      html += '\n';
    }
  });

  // Flujos
  state.flows.forEach((flow, flowIndex) => {
    const title = state.flows.length === 1 ? "**Flujo principal:**" : `**${flow.name}:**`;
    html += `<span class="output-section">${title}</span>\n\n`;
    
    flow.steps.forEach((step, stepIndex) => {
      html += `<span class="output-step-number">${stepIndex + 1}.</span> ${step.text}`;
      
      // Agregar funciones del paso con colores
      if (step.functions && step.functions.length > 0) {
        step.functions.forEach(func => {
          const funcDef = functions.get(func.type);
          if (funcDef) {
            const customFields = func.customFields || [];
            const params = func.params || {};
            
            // Determinar el nombre de la función a mostrar
            let functionName = func.type; // Usar el nombre técnico por defecto
            let displayParams = [];
            
            // Para la función "formularios", usar el parámetro nombre_formulario como nombre
            if (func.type === 'formularios' && params.nombre_formulario) {
              functionName = params.nombre_formulario;
              // Solo agregar campos personalizados como parámetros
              displayParams = customFields
                .filter(field => field.name && field.value)
                .map(field => `<span class="output-keyword">${field.name}</span>: <span class="output-string">"${field.value}"</span>`);
            } else {
              // Para otras funciones, usar el nombre técnico y agregar todos los parámetros
              const predefinedParams = Object.entries(params)
                .filter(([key, value]) => value)
                .map(([key, value]) => `<span class="output-keyword">${key}</span>: <span class="output-string">"${value}"</span>`);
              
              const customParams = customFields
                .filter(field => field.name && field.value)
                .map(field => `<span class="output-keyword">${field.name}</span>: <span class="output-string">"${field.value}"</span>`);
              
              displayParams = [...predefinedParams, ...customParams];
            }
            
            const allParams = displayParams.join(', ');
            html += `\n    <span class="output-function">Ejecuta la función: ${functionName}({${allParams}})</span>`;
          }
        });
      }
      html += '\n\n';
    });
  });

  // Preguntas frecuentes (movidas al final)
  const validFaqs = state.faqs.filter(f => f.question.trim() && f.answer.trim());
  if (validFaqs.length > 0) {
    html += `<span class="output-section">**Preguntas Frecuentes:**</span>\n`;
    validFaqs.forEach(faq => {
      html += `- <span class="output-question">**${faq.question}**</span>\n`;
      html += `  <span class="output-answer">${faq.answer}</span>\n`;
    });
    html += '\n';
  }

  // Actualizar output con HTML coloreado
  document.getElementById('output').innerHTML = html.trim();
}

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================
function renderAll() {
  renderFAQs();
  renderFlows();
  renderSteps();
  renderSections();
  renderSectionContent();
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function copyPrompt(event) {
  // Para copiar, obtenemos solo el texto sin HTML
  const outputElement = document.getElementById('output');
  const text = outputElement.textContent || outputElement.innerText;
  
  navigator.clipboard.writeText(text).then(() => {
    const btn = event ? event.target.closest('.copy-btn') : document.querySelector('.copy-btn');
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = '<span>✅</span><span>¡Copiado!</span>';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.style.background = 'linear-gradient(135deg, var(--success), #059669)';
    }, 2000);
  }).catch(err => {
    console.error('Error al copiar:', err);
    alert('Error al copiar al portapapeles');
  });
}

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// ==========================================
// INICIALIZACIÓN DEL TEMA
// ==========================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Cargar tema al iniciar
initTheme();

// ==========================================
// ATAJOS DE TECLADO
// ==========================================
document.addEventListener('keydown', function(e) {
  // Ctrl/Cmd + S para guardar proyecto
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    projects.saveProject();
  }
  
  // Ctrl/Cmd + Shift + C para copiar prompt
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
    e.preventDefault();
    copyPrompt();
  }
  
  // Ctrl/Cmd + Shift + D para cambiar tema
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    toggleTheme();
  }
});

// ==========================================
// AUTO-GUARDADO SILENCIOSO
// ==========================================
let autoSaveTimeout;

function scheduleAutoSave() {
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(() => {
    const projectName = document.getElementById('project-name').value.trim();
    if (projectName) {
      console.log('Auto-guardando proyecto...');
      const success = projects.saveProject(true); // true = modo silencioso
      if (success) {
        // Opcional: mostrar indicador visual sutil de guardado
        showAutoSaveIndicator();
      }
    }
  }, 5000); // Auto-guardar cada 5 segundos después de cambios
}

// Función opcional para mostrar indicador visual sutil
function showAutoSaveIndicator() {
  // Buscar el botón de guardar para mostrar feedback visual
  const saveBtn = document.querySelector('button[onclick="projects.saveProject()"]');
  if (saveBtn) {
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '✅ Guardado';
    saveBtn.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
      saveBtn.style.background = '';
    }, 2000);
  }
}

// Programar auto-guardado cuando hay cambios
document.addEventListener('input', () => {
  updatePrompt();
  scheduleAutoSave();
});

document.addEventListener('change', () => {
  updatePrompt();
  scheduleAutoSave();
});

// Auto-guardar también cuando se pierda el foco del nombre del proyecto
document.addEventListener('DOMContentLoaded', function() {
  // Agregar listener para auto-guardar cuando se cambie el nombre
  const projectNameInput = document.getElementById('project-name');
  if (projectNameInput) {
    projectNameInput.addEventListener('blur', () => {
      scheduleAutoSave();
    });
  }
});