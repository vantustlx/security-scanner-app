// areasUsuario.js — selector de áreas de un usuario (registro y edición) y filtros por área de los
// reportes de grupo; cargar antes del script de la vista.
//
// Cada fila es una combinación: área + carrera (solo si el área la requiere) + turnos (casillas)
// + si es la principal. Los catálogos llegan de la BD con ipcRenderer.invoke('obtener-catalogos').
// Formato: [{ id_area, id_carrera, turnos: [id_turno], principal }]
(function () {
  let contadorInstancias = 0;

  function crearElemento(etiqueta, props = {}, hijos = []) {
    const el = document.createElement(etiqueta);
    Object.assign(el, props);
    hijos.forEach((h) => el.append(h));
    return el;
  }

  function opcion(valor, texto) {
    return crearElemento('option', { value: String(valor), textContent: texto });
  }

  /**
   * contenedor: elemento donde se dibuja el selector.
   * catalogos: { areas: [{ id_area, nombre, requiere_carrera }], carreras: [{ id_carrera, nombre }], turnos: [{ id_turno, nombre }] }
   */
  function crear(contenedor, catalogos) {
    const grupoPrincipal = `area-principal-${++contadorInstancias}`;
    const lista = crearElemento('div', { className: 'areas-lista' });
    const btnAgregar = crearElemento('button', { type: 'button', className: 'areas-agregar', textContent: '+ Agregar área' });
    contenedor.append(lista, btnAgregar);

    const filas = () => [...lista.querySelectorAll('.areas-fila')];

    function actualizarControles() {
      const todas = filas();
      todas.forEach((f) => { f.querySelector('.areas-quitar').disabled = todas.length === 1; });
      // Siempre debe haber una principal
      if (todas.length && !todas.some((f) => f.querySelector('.areas-principal input').checked)) {
        todas[0].querySelector('.areas-principal input').checked = true;
      }
    }

    function crearFila(valor = {}) {
      const selectArea = crearElemento('select', { className: 'areas-area' }, [opcion('', 'Selecciona un área')]);
      selectArea.setAttribute('aria-label', 'Área');
      catalogos.areas.forEach((a) => selectArea.append(opcion(a.id_area, a.nombre)));

      const selectCarrera = crearElemento('select', { className: 'areas-carrera' }, [opcion('', 'Selecciona una carrera')]);
      selectCarrera.setAttribute('aria-label', 'Carrera');
      catalogos.carreras.forEach((c) => selectCarrera.append(opcion(c.id_carrera, c.nombre)));
      const campoCarrera = crearElemento('div', { className: 'areas-campo' }, [
        crearElemento('span', { className: 'areas-subtitulo', textContent: 'Carrera' }), selectCarrera
      ]);

      const turnos = crearElemento('div', { className: 'areas-turnos' });
      turnos.setAttribute('role', 'group');
      turnos.setAttribute('aria-label', 'Turnos');
      catalogos.turnos.forEach((t) => {
        const casilla = crearElemento('input', { type: 'checkbox', value: String(t.id_turno) });
        casilla.checked = (valor.turnos || []).some((v) => Number(v.id_turno ?? v) === t.id_turno);
        turnos.append(crearElemento('label', {}, [casilla, crearElemento('span', { textContent: t.nombre })]));
      });

      const radio = crearElemento('input', { type: 'radio', name: grupoPrincipal });
      radio.checked = Boolean(valor.principal);
      const principal = crearElemento('label', { className: 'areas-principal', title: 'Se muestra en el lector y en los reportes' }, [
        radio, crearElemento('span', { textContent: 'Principal' })
      ]);

      const quitar = crearElemento('button', { type: 'button', className: 'areas-quitar', textContent: '×', title: 'Quitar esta área' });
      quitar.setAttribute('aria-label', 'Quitar esta área');

      const fila = crearElemento('div', { className: 'areas-fila' }, [
        crearElemento('div', { className: 'areas-campo' }, [crearElemento('span', { className: 'areas-subtitulo', textContent: 'Área' }), selectArea]),
        campoCarrera,
        crearElemento('div', { className: 'areas-campo' }, [crearElemento('span', { className: 'areas-subtitulo', textContent: 'Turnos' }), turnos]),
        principal,
        quitar
      ]);

      // La carrera solo aplica a las áreas que la requieren
      const actualizarCarrera = () => {
        const area = catalogos.areas.find((a) => a.id_area === Number(selectArea.value));
        const aplica = Boolean(area && area.requiere_carrera);
        campoCarrera.classList.toggle('oculto', !aplica);
        selectCarrera.disabled = !aplica;
        if (!aplica) selectCarrera.value = '';
      };
      selectArea.addEventListener('change', () => { actualizarCarrera(); fila.classList.remove('invalida'); });
      fila.addEventListener('change', () => fila.classList.remove('invalida'));
      quitar.addEventListener('click', () => {
        fila.remove();
        actualizarControles();
        const primera = lista.querySelector('.areas-area');
        if (primera) primera.focus();
      });

      if (valor.id_area) selectArea.value = String(valor.id_area);
      actualizarCarrera();
      if (valor.id_carrera) selectCarrera.value = String(valor.id_carrera);
      lista.append(fila);
      actualizarControles();
      return fila;
    }

    btnAgregar.addEventListener('click', () => crearFila().querySelector('.areas-area').focus());

    function obtener() {
      return filas().map((f) => ({
        id_area: Number(f.querySelector('.areas-area').value) || null,
        id_carrera: Number(f.querySelector('.areas-carrera').value) || null,
        turnos: [...f.querySelectorAll('.areas-turnos input:checked')].map((c) => Number(c.value)),
        principal: f.querySelector('.areas-principal input').checked
      }));
    }

    // Misma validación que el proceso principal; marca las filas con problemas
    function validar() {
      const errores = [];
      const vistas = new Set();
      filas().forEach((f, i) => {
        const datos = obtener()[i];
        const area = catalogos.areas.find((a) => a.id_area === datos.id_area);
        const problemas = [];
        if (!area) problemas.push('selecciona un área');
        else if (area.requiere_carrera && !datos.id_carrera) problemas.push('selecciona una carrera');
        if (datos.turnos.length === 0) problemas.push('marca al menos un turno');
        const clave = `${datos.id_area}:${datos.id_carrera}`;
        if (area && vistas.has(clave)) problemas.push('está repetida');
        vistas.add(clave);
        f.classList.toggle('invalida', problemas.length > 0);
        if (problemas.length) errores.push(`Área ${i + 1}${area ? ` (${area.nombre})` : ''}: ${problemas.join(', ')}`);
      });
      if (filas().length === 0) errores.push('Agrega al menos un área');
      return errores;
    }

    function establecer(areas = []) {
      lista.replaceChildren();
      if (areas.length === 0) crearFila({ principal: true });
      else areas.forEach((a) => crearFila(a));
      actualizarControles();
    }

    establecer([]);
    return { obtener, validar, establecer };
  }

  /**
   * Llena los select de filtro (búsquedas y reportes de grupo) con los catálogos de la BD.
   * selects: { area, carrera, turno }; el valor '' significa "todas/todos".
   * La carrera solo se habilita cuando el área elegida puede llevarla.
   */
  function llenarFiltros(selects, catalogos) {
    selects.area.replaceChildren(opcion('', 'Todas las áreas'), ...catalogos.areas.map((a) => opcion(a.id_area, a.nombre)));
    selects.carrera.replaceChildren(opcion('', 'Todas las carreras'), ...catalogos.carreras.map((c) => opcion(c.id_carrera, c.nombre)));
    selects.turno.replaceChildren(opcion('', 'Todos los turnos'), ...catalogos.turnos.map((t) => opcion(t.id_turno, t.nombre)));

    const actualizarCarrera = () => {
      const area = catalogos.areas.find((a) => a.id_area === Number(selects.area.value));
      const aplica = !area || area.requiere_carrera;
      selects.carrera.disabled = !aplica;
      if (!aplica) selects.carrera.value = '';
    };
    selects.area.addEventListener('change', actualizarCarrera);
    actualizarCarrera();

    return {
      valores: () => ({ area: selects.area.value, carrera: selects.carrera.value, turno: selects.turno.value }),
      // Nombres de los filtros elegidos (para el PDF); los que están en "todos" se omiten
      nombres: () => Object.fromEntries(Object.entries(selects)
        .filter(([, s]) => s.value !== '')
        .map(([clave, s]) => [clave, s.selectedOptions[0].textContent]))
    };
  }

  window.AreasUsuario = { crear, llenarFiltros };
})();
