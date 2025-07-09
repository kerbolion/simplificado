// Gestión de funciones para el generador de flujos IA
const functions = {
  // Funciones disponibles
  available: {},
  
  // Inicializar funciones
  init() {
    this.load();
    // Solo cargar defaults si no hay funciones guardadas
    if (Object.keys(this.available).length === 0) {
      this.loadDefaults();
    }
    this.render();
  },

  // Cargar funciones predeterminadas
  loadDefaults() {
    this.available = {
      'formularios': {
        name: 'Formularios',
        description: 'Crea un formulario dinámico con campos personalizables',
        params: [
          { 
            name: 'nombre_formulario', 
            label: 'Nombre del formulario *', 
            type: 'text', 
            required: true 
          }
        ]
      },
      'manage_contact_tags': {
        name: 'Gestionar tags de contacto',
        description: 'Permite agregar o eliminar tags de contactos',
        params: []
      },
      'send_ai_match_rule_to_user': {
        name: 'Enviar regla de IA al usuario',
        description: 'Envía una regla de coincidencia específica de IA al usuario',
        params: []
      },
      'send_notification_message': {
        name: 'Enviar notificación',
        description: 'Envía una notificación por WhatsApp al encargado del negocio',
        params: []
      }
    };
    
    this.save();
    this.render();
  },

  // Agregar nueva función
  addFunction() {
    const name = prompt('Nombre clave de la función (ej: my_function):');
    if (!name || this.available[name]) {
      alert(this.available[name] ? 'Ya existe una función con ese nombre' : 'Nombre requerido');
      return;
    }

    const label = prompt('Nombre descriptivo:') || name;
    const description = prompt('Descripción de la función:') || '';

    this.available[name] = {
      name: label,
      description: description,
      params: []
    };

    this.save();
    this.render();
    this.editFunction(name);
  },

  // Editar función existente
  editFunction(key) {
    const func = this.available[key];
    if (!func) return;

    // Abrir modal de edición (simulado con prompts)
    const newName = prompt('Nombre descriptivo:', func.name);
    if (newName === null) return;

    const newDescription = prompt('Descripción:', func.description);
    if (newDescription === null) return;

    func.name = newName || func.name;
    func.description = newDescription || func.description;

    this.save();
    this.render();
    
    // Actualizar prompt cuando se edita una función
    updatePrompt();
  },

  // Eliminar función
  deleteFunction(key) {
    if (confirm(`¿Eliminar la función "${this.available[key].name}"?`)) {
      delete this.available[key];
      this.save();
      this.render();
      
      // Actualizar steps que usen esta función
      state.flows.forEach(flow => {
        flow.steps.forEach(step => {
          step.functions = step.functions.filter(f => f.type !== key);
        });
      });
      
      renderSteps();
      updatePrompt();
    }
  },

  // Agregar parámetro a función
  addParam(functionKey) {
    const func = this.available[functionKey];
    if (!func) return;

    const paramName = prompt('Nombre del parámetro (clave):');
    if (!paramName) return;

    const paramLabel = prompt('Etiqueta del parámetro:') || paramName;
    const paramType = prompt('Tipo (text/textarea/select):') || 'text';

    const param = {
      name: paramName,
      label: paramLabel,
      type: paramType,
      required: confirm('¿Es requerido?')
    };

    if (paramType === 'select') {
      const options = prompt('Opciones separadas por coma:');
      if (options) {
        param.options = options.split(',').map(o => o.trim());
      }
    }

    func.params.push(param);
    this.save();
    this.render();
    updatePrompt();
  },

  // Eliminar parámetro
  deleteParam(functionKey, paramIndex) {
    const func = this.available[functionKey];
    if (!func || !confirm('¿Eliminar este parámetro?')) return;

    func.params.splice(paramIndex, 1);
    this.save();
    this.render();
    updatePrompt();
  },

  // Renderizar lista de funciones
  render() {
    const container = document.getElementById('functions-list');
    if (!container) return;

    container.innerHTML = Object.keys(this.available).map(key => {
      const func = this.available[key];
      return `
        <div class="function-definition ${this.isUsed(key) ? 'active' : ''}">
          <div class="function-header">
            <div>
              <strong>${func.name}</strong>
              <small style="color: var(--text-secondary); margin-left: 8px;">(${key})</small>
            </div>
            <div>
              <button class="btn-small" onclick="functions.editFunction('${key}')">✏️ Editar</button>
              <button class="btn-small btn-danger" onclick="functions.deleteFunction('${key}')">🗑️</button>
            </div>
          </div>
          
          <div class="function-meta">
            <p style="margin-bottom: 8px; font-size: 13px;">${func.description}</p>
            <div><strong>Parámetros:</strong></div>
            <div class="function-params">
              ${func.params.map((param, index) => `
                <div class="param-item">
                  <span><strong>${param.label}</strong> (${param.name})</span>
                  <span style="margin-left: 8px; color: var(--text-secondary);">
                    ${param.type}${param.required ? ' *' : ''}
                  </span>
                  <button class="btn-small btn-danger" style="float: right; margin: -4px;" 
                          onclick="functions.deleteParam('${key}', ${index})">×</button>
                </div>
              `).join('')}
              <button class="btn-small" onclick="functions.addParam('${key}')">➕ Agregar Parámetro</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Verificar si una función está siendo usada
  isUsed(functionKey) {
    return state.flows.some(flow => 
      flow.steps.some(step => 
        step.functions.some(func => func.type === functionKey)
      )
    );
  },

  // Obtener función por clave
  get(key) {
    return this.available[key];
  },

  // Obtener todas las funciones
  getAll() {
    return this.available;
  },

  // Establecer todas las funciones (usado por projects.js)
  setAll(functions) {
    this.available = functions;
    this.save();
    this.render();
  },

  // Validar parámetros de función
  validateParams(functionKey, params) {
    const func = this.available[functionKey];
    if (!func) return { valid: false, errors: ['Función no encontrada'] };

    const errors = [];
    func.params.forEach(param => {
      if (param.required && (!params[param.name] || params[param.name].trim() === '')) {
        errors.push(`El parámetro "${param.label}" es requerido`);
      }
    });

    return { valid: errors.length === 0, errors };
  },

  // Guardar en localStorage
  save() {
    localStorage.setItem('functions', JSON.stringify(this.available));
  },

  // Cargar desde localStorage
  load() {
    const saved = localStorage.getItem('functions');
    if (saved) {
      try {
        this.available = JSON.parse(saved);
      } catch (e) {
        console.error('Error loading functions:', e);
        this.available = {};
      }
    } else {
      this.available = {};
    }
  },

  // Exportar funciones
  export() {
    const data = JSON.stringify(this.available, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'functions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Importar funciones
  import() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          if (confirm('¿Sobrescribir funciones actuales?')) {
            this.available = imported;
          } else {
            Object.assign(this.available, imported);
          }
          this.save();
          this.render();
          updatePrompt();
        } catch (error) {
          alert('Error al importar archivo: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }
};