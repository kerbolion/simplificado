// Gestión de proyectos para el generador de flujos IA
const projects = {
  // Proyectos guardados
  saved: {},
  current: null,

  // Inicializar
  init() {
    this.load();
    this.render();
  },

  // Guardar proyecto actual
  saveProject(silent = false) {
    const name = document.getElementById('project-name').value.trim();
    if (!name) {
      if (!silent) {
        alert('Por favor, ingresa un nombre para el proyecto');
      }
      return false;
    }

    // Crear datos del proyecto
    const projectData = {
      name: name,
      created: this.saved[name]?.created || new Date().toISOString(),
      modified: new Date().toISOString(),
      data: this.getCurrentState()
    };

    this.saved[name] = projectData;
    this.current = name;
    
    this.save();
    this.render();
    
    if (!silent) {
      alert(`Proyecto "${name}" guardado exitosamente`);
    }
    
    return true;
  },

  // Cargar proyecto
  loadProject(name) {
    if (!name) {
      // Nuevo proyecto vacío
      this.current = null;
      document.getElementById('project-name').value = '';
      this.resetState();
      renderAll();
      updatePrompt();
      return;
    }

    const project = this.saved[name];
    if (!project) {
      alert('Proyecto no encontrado');
      return;
    }

    this.current = name;
    document.getElementById('project-name').value = name;
    
    // Cargar datos del proyecto
    this.loadState(project.data);
    
    // Actualizar UI
    renderAll();
    updatePrompt();
    
    console.log(`Proyecto "${name}" cargado exitosamente`);
  },

  // Eliminar proyecto
  deleteProject() {
    if (!this.current || !this.saved[this.current]) {
      alert('No hay proyecto seleccionado para eliminar');
      return;
    }

    if (confirm(`¿Eliminar el proyecto "${this.current}"?`)) {
      delete this.saved[this.current];
      this.save();
      
      // Reset to new project
      this.current = null;
      document.getElementById('project-name').value = '';
      this.resetState();
      
      this.render();
      renderAll();
      updatePrompt();
      
      alert('Proyecto eliminado exitosamente');
    }
  },

  // Exportar proyecto
  exportProject() {
    if (!this.current || !this.saved[this.current]) {
      alert('No hay proyecto seleccionado para exportar');
      return;
    }

    const project = this.saved[this.current];
    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.current}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Importar proyecto
  importProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const project = JSON.parse(e.target.result);
          
          // Validar estructura del proyecto
          if (!project.name || !project.data) {
            throw new Error('Archivo de proyecto inválido');
          }
          
          let projectName = project.name;
          
          // Si ya existe, preguntar si sobrescribir o renombrar
          if (this.saved[projectName]) {
            const action = confirm(
              `Ya existe un proyecto llamado "${projectName}".\n\n` +
              'OK = Sobrescribir\n' +
              'Cancelar = Crear con nuevo nombre'
            );
            
            if (!action) {
              // Generar nuevo nombre
              let counter = 1;
              while (this.saved[`${projectName} (${counter})`]) {
                counter++;
              }
              projectName = `${projectName} (${counter})`;
              project.name = projectName;
            }
          }
          
          // Guardar proyecto
          this.saved[projectName] = {
            ...project,
            modified: new Date().toISOString()
          };
          
          this.save();
          this.render();
          
          // Cargar el proyecto importado
          this.loadProject(projectName);
          
          alert(`Proyecto "${projectName}" importado exitosamente`);
          
        } catch (error) {
          alert('Error al importar proyecto: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  },

  // Obtener estado actual de la aplicación
  getCurrentState() {
    return {
      businessName: document.getElementById('business-name')?.value || '',
      welcomeMessage: document.getElementById('welcome-message')?.value || '',
      tone: document.getElementById('tone')?.value || '',
      format: document.getElementById('format')?.value || '',
      includeGreeting: document.getElementById('include-greeting')?.checked || false,
      includeFarewell: document.getElementById('include-farewell')?.checked || false,
      rules: state.rules,
      faqs: state.faqs,
      flows: state.flows,
      currentFlow: state.currentFlow,
      // IMPORTANTE: Incluir las funciones en el estado del proyecto
      functions: functions.getAll()
    };
  },

  // Cargar estado en la aplicación
  loadState(data) {
    // Cargar campos del formulario
    if (data.businessName !== undefined) {
      document.getElementById('business-name').value = data.businessName;
    }
    if (data.welcomeMessage !== undefined) {
      document.getElementById('welcome-message').value = data.welcomeMessage;
    }
    if (data.tone !== undefined) {
      document.getElementById('tone').value = data.tone;
    }
    if (data.format !== undefined) {
      document.getElementById('format').value = data.format;
    }
    if (data.includeGreeting !== undefined) {
      document.getElementById('include-greeting').checked = data.includeGreeting;
    }
    if (data.includeFarewell !== undefined) {
      document.getElementById('include-farewell').checked = data.includeFarewell;
    }
    
    // Cargar datos del estado
    if (data.rules) state.rules = data.rules;
    if (data.faqs) state.faqs = data.faqs;
    if (data.flows) state.flows = data.flows;
    if (data.currentFlow !== undefined) state.currentFlow = data.currentFlow;
    
    // IMPORTANTE: Cargar las funciones del proyecto
    if (data.functions) {
      functions.available = data.functions;
      functions.save();
      functions.render();
    }
  },

  // Resetear estado a valores por defecto
  resetState() {
    // Limpiar formulario
    document.getElementById('business-name').value = '';
    document.getElementById('welcome-message').value = '';
    document.getElementById('tone').value = 'Profesional, cordial y claro';
    document.getElementById('format').value = 'Respuestas breves, máximo 3 renglones';
    document.getElementById('include-greeting').checked = true;
    document.getElementById('include-farewell').checked = true;
    
    // Resetear estado
    state.rules = [
      "Pregunta una cosa a la vez",
      "Envía los enlaces sin formato",
      "No proporciones información fuera de este documento"
    ];
    
    state.faqs = [
      { question: "¿Cuáles son los horarios de atención?", answer: "Atendemos de lunes a domingo de 8:00 AM a 10:00 PM" },
      { question: "¿Hacen delivery?", answer: "Sí, hacemos delivery en un radio de 5km" }
    ];
    
    state.flows = [{
      name: "Flujo Principal",
      steps: [
        { text: "Saluda al cliente y pregúntale si desea retirar en tienda o envío a domicilio", functions: [] },
        { text: "Solicita el pedido (productos y cantidades) y, si aplica, la dirección para envío.", functions: [] }
      ]
    }];
    
    state.currentFlow = 0;
    state.currentTab = 0;
    
    // IMPORTANTE: Resetear funciones a las predeterminadas
    functions.loadDefaults();
  },

  // Renderizar selector de proyectos
  render() {
    const selector = document.getElementById('project-selector');
    if (!selector) return;

    selector.innerHTML = '<option value="">Nuevo proyecto...</option>';
    
    // Ordenar proyectos por fecha de modificación (más recientes primero)
    const sortedProjects = Object.keys(this.saved).sort((a, b) => {
      const dateA = new Date(this.saved[a].modified);
      const dateB = new Date(this.saved[b].modified);
      return dateB - dateA;
    });
    
    sortedProjects.forEach(name => {
      const project = this.saved[name];
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name} (${new Date(project.modified).toLocaleDateString()})`;
      option.selected = name === this.current;
      selector.appendChild(option);
    });
  },

  // Obtener lista de proyectos
  getProjectsList() {
    return Object.keys(this.saved).map(name => ({
      name,
      ...this.saved[name]
    }));
  },

  // Exportar todos los proyectos
  exportAll() {
    if (Object.keys(this.saved).length === 0) {
      alert('No hay proyectos para exportar');
      return;
    }

    const backup = {
      exported: new Date().toISOString(),
      version: '1.0',
      projects: this.saved
    };

    const data = JSON.stringify(backup, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-proyectos-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert(`Backup creado con ${Object.keys(this.saved).length} proyectos`);
  },

  // Importar backup completo
  importAll() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          
          if (!backup.projects) {
            throw new Error('Archivo de backup inválido');
          }
          
          const action = confirm(
            `Se encontraron ${Object.keys(backup.projects).length} proyectos.\n\n` +
            'OK = Sobrescribir todos\n' +
            'Cancelar = Fusionar (mantener existentes)'
          );
          
          if (action) {
            this.saved = backup.projects;
          } else {
            Object.assign(this.saved, backup.projects);
          }
          
          this.save();
          this.render();
          
          alert(`Importados ${Object.keys(backup.projects).length} proyectos exitosamente`);
          
        } catch (error) {
          alert('Error al importar backup: ' + error.message);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  },

  // Guardar en localStorage
  save() {
    localStorage.setItem('projects', JSON.stringify(this.saved));
    localStorage.setItem('currentProject', this.current || '');
  },

  // Cargar desde localStorage
  load() {
    const saved = localStorage.getItem('projects');
    if (saved) {
      try {
        this.saved = JSON.parse(saved);
      } catch (e) {
        console.error('Error loading projects:', e);
        this.saved = {};
      }
    }
    
    this.current = localStorage.getItem('currentProject') || null;
    
    // Si hay un proyecto actual, cargarlo
    if (this.current && this.saved[this.current]) {
      setTimeout(() => {
        this.loadProject(this.current);
      }, 100);
    }
  }
};