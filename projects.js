// Gestión de proyectos para el generador de flujos IA
const projects = {
  // Proyectos guardados con versiones
  saved: {},
  current: null,
  currentVersion: null,

  // Inicializar
  init() {
    this.load();
    this.render();
  },

  // Guardar proyecto actual (ahora con versiones)
  saveProject(silent = false) {
    const name = document.getElementById('project-name').value.trim();
    if (!name) {
      if (!silent) {
        alert('Por favor, ingresa un nombre para el proyecto');
      }
      return false;
    }

    // Crear timestamp para la versión
    const now = new Date();
    const timestamp = now.toISOString();
    const displayTimestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;

    // Inicializar proyecto si no existe
    if (!this.saved[name]) {
      this.saved[name] = {
        name: name,
        created: timestamp,
        versions: {}
      };
    }

    // Crear nueva versión
    const versionData = {
      created: timestamp,
      data: this.getCurrentState()
    };

    // Guardar versión
    this.saved[name].versions[timestamp] = versionData;
    this.saved[name].modified = timestamp;
    
    // Establecer como versión actual
    this.current = name;
    this.currentVersion = timestamp;
    
    this.save();
    this.render();
    this.renderVersions();
    
    if (!silent) {
      alert(`Proyecto "${name}" guardado exitosamente\nNueva versión: ${displayTimestamp}`);
    }
    
    return true;
  },

  // Cargar proyecto
  loadProject(name) {
    if (!name) {
      // Nuevo proyecto vacío
      this.current = null;
      this.currentVersion = null;
      document.getElementById('project-name').value = '';
      this.resetState();
      this.renderVersions();
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
    
    // Cargar la versión más reciente por defecto
    const versions = Object.keys(project.versions);
    if (versions.length > 0) {
      const latestVersion = versions.sort().pop();
      this.currentVersion = latestVersion;
      this.loadState(project.versions[latestVersion].data);
    }
    
    // Actualizar UI
    this.renderVersions();
    renderAll();
    updatePrompt();
    
    console.log(`Proyecto "${name}" cargado exitosamente`);
  },

  // Cargar versión específica
  loadVersion(versionTimestamp) {
    if (!this.current || !versionTimestamp) {
      return;
    }

    const project = this.saved[this.current];
    const version = project?.versions[versionTimestamp];
    
    if (!version) {
      alert('Versión no encontrada');
      return;
    }

    this.currentVersion = versionTimestamp;
    this.loadState(version.data);
    
    // Actualizar UI
    renderAll();
    updatePrompt();
    
    const displayTime = new Date(versionTimestamp).toLocaleString();
    console.log(`Versión cargada: ${displayTime}`);
  },

  // Eliminar proyecto
  deleteProject() {
    if (!this.current || !this.saved[this.current]) {
      alert('No hay proyecto seleccionado para eliminar');
      return;
    }

    const versionCount = Object.keys(this.saved[this.current].versions || {}).length;
    if (confirm(`¿Eliminar el proyecto "${this.current}" con ${versionCount} versiones?`)) {
      delete this.saved[this.current];
      this.save();
      
      // Reset to new project
      this.current = null;
      this.currentVersion = null;
      document.getElementById('project-name').value = '';
      this.resetState();
      
      this.render();
      this.renderVersions();
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
      sections: state.sections,
      faqs: state.faqs,
      flows: state.flows,
      currentFlow: state.currentFlow,
      currentSection: state.currentSection,
      // IMPORTANTE: Incluir las funciones en el estado del proyecto
      functions: functions.getAll()
    };
  },

  // Cargar estado en la aplicación
  loadState(data) {
    // Cargar campo del negocio
    if (data.businessName !== undefined) {
      document.getElementById('business-name').value = data.businessName;
    }
    
    // Cargar datos del estado
    if (data.sections) state.sections = data.sections;
    if (data.faqs) state.faqs = data.faqs;
    if (data.flows) state.flows = data.flows;
    if (data.currentFlow !== undefined) state.currentFlow = data.currentFlow;
    if (data.currentSection !== undefined) state.currentSection = data.currentSection;
    
    // IMPORTANTE: Cargar las funciones del proyecto
    if (data.functions) {
      functions.available = data.functions;
      functions.save();
      functions.render();
    }

    // Migrar datos del formato anterior si existen
    this.migrateOldConfigData(data);
  },

  // Migrar configuración del formato anterior al nuevo
  migrateOldConfigData(data) {
    // Si existen datos del formato anterior, migrarlos
    if (data.tone || data.format || data.rules) {
      console.log('Migrando configuración al nuevo formato...');
      
      // Encontrar o crear sección de "Instrucciones Generales"
      let generalSection = state.sections.find(s => s.name === "Instrucciones Generales");
      if (!generalSection) {
        generalSection = { name: "Instrucciones Generales", fields: [] };
        state.sections.unshift(generalSection);
      }
      
      // Migrar tono y formato al nuevo formato (como items en lugar de value)
      if (data.tone && !generalSection.fields.find(f => f.label === "Tono")) {
        generalSection.fields.push({ type: "text", label: "Tono", items: [data.tone] });
      }
      if (data.format && !generalSection.fields.find(f => f.label === "Formato")) {
        generalSection.fields.push({ type: "text", label: "Formato", items: [data.format] });
      }
      
      // Migrar reglas
      if (data.rules && data.rules.length > 0) {
        let rulesSection = state.sections.find(s => s.name === "Reglas de comportamiento");
        if (!rulesSection) {
          rulesSection = { name: "Reglas de comportamiento", fields: [] };
          state.sections.push(rulesSection);
        }
        
        // Solo migrar si no existe ya una lista de reglas
        if (!rulesSection.fields.find(f => f.type === "list" && f.label === "Reglas")) {
          rulesSection.fields.push({
            type: "list",
            label: "Reglas",
            items: data.rules
          });
        }
      }
    }

    // Migrar campos de texto del formato anterior (value) al nuevo (items)
    state.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.type === 'text' && field.value && !field.items) {
          // Convertir de formato anterior (value) a nuevo (items)
          field.items = [field.value];
          delete field.value;
        }
      });
    });
  },

  // Resetear estado a valores por defecto
  resetState() {
    // Limpiar formulario
    document.getElementById('business-name').value = '';
    
    // Resetear secciones a valores por defecto
    state.sections = [
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
    state.currentSection = 0;
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
      const dateA = new Date(this.saved[a].modified || this.saved[a].created);
      const dateB = new Date(this.saved[b].modified || this.saved[b].created);
      return dateB - dateA;
    });
    
    sortedProjects.forEach(name => {
      const project = this.saved[name];
      const versionCount = Object.keys(project.versions || {}).length;
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name} (${versionCount} versiones)`;
      option.selected = name === this.current;
      selector.appendChild(option);
    });
  },

  // Renderizar selector de versiones
  renderVersions() {
    const selector = document.getElementById('version-selector');
    if (!selector) return;

    selector.innerHTML = '<option value="">Seleccionar versión...</option>';
    
    if (!this.current || !this.saved[this.current]) {
      return;
    }

    const project = this.saved[this.current];
    const versions = Object.keys(project.versions || {}).sort().reverse(); // Más recientes primero
    
    versions.forEach(timestamp => {
      const version = project.versions[timestamp];
      const date = new Date(timestamp);
      const option = document.createElement('option');
      option.value = timestamp;
      option.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      option.selected = timestamp === this.currentVersion;
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
    localStorage.setItem('currentVersion', this.currentVersion || '');
  },

  // Cargar desde localStorage
  load() {
    const saved = localStorage.getItem('projects');
    if (saved) {
      try {
        this.saved = JSON.parse(saved);
        // Migrar proyectos antiguos al nuevo formato
        this.migrateOldProjects();
      } catch (e) {
        console.error('Error loading projects:', e);
        this.saved = {};
      }
    }
    
    this.current = localStorage.getItem('currentProject') || null;
    this.currentVersion = localStorage.getItem('currentVersion') || null;
    
    // Si hay un proyecto actual, cargarlo
    if (this.current && this.saved[this.current]) {
      setTimeout(() => {
        this.loadProject(this.current);
      }, 100);
    }
  },

  // Migrar proyectos del formato anterior al nuevo con versiones
  migrateOldProjects() {
    Object.keys(this.saved).forEach(projectName => {
      const project = this.saved[projectName];
      
      // Si el proyecto no tiene el formato nuevo, migrarlo
      if (project.data && !project.versions) {
        const oldData = project.data;
        const timestamp = project.modified || project.created || new Date().toISOString();
        
        this.saved[projectName] = {
          name: projectName,
          created: project.created || timestamp,
          modified: timestamp,
          versions: {
            [timestamp]: {
              created: timestamp,
              data: oldData
            }
          }
        };
        
        console.log(`Migrado proyecto: ${projectName}`);
      }
    });
  }
};