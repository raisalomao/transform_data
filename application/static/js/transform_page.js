// Nome do arquivo: transform_page.js

let colunasAtuais = [];
let passosAplicados = [];

window.addEventListener('DOMContentLoaded', () => {
    // Seleção de elementos do DOM
    const colunasDataEl = document.getElementById("colunas-json-data");
    const operationSelect = document.getElementById('operation-select');
    const paramsContainer = document.getElementById('params-container');
    const addStepBtn = document.getElementById('add-step-btn');
    const recipeList = document.getElementById('recipe-list');
    const applyAllBtn = document.getElementById('apply-all-btn');
    const btnAvancarLoading = document.getElementById('btn-avancar-loading');
    const tableContainer = document.getElementById('data-table-container');
    const spinner = document.getElementById('loading-spinner');

    // Elementos relacionados a Macros
    const macroListContainer = document.getElementById('macro-list-container');
    const saveMacroBtnTrigger = document.getElementById('save-macro-btn-modal-trigger');
    const saveMacroModalEl = document.getElementById('saveMacroModal');
    const saveMacroModal = new bootstrap.Modal(saveMacroModalEl);
    const saveMacroConfirmBtn = document.getElementById('save-macro-confirm-btn');
    const macroNameInput = document.getElementById('macro-name');
    const macroDescriptionInput = document.getElementById('macro-description');
    const MACRO_STORAGE_KEY = 'etl_macros';

    // Carrega as colunas iniciais a partir do template Django
    if (colunasDataEl) {
        try {
            colunasAtuais = JSON.parse(colunasDataEl.textContent);
        } catch (e) {
            console.error("Erro ao parsear JSON de colunas:", e);
        }
    } else {
        console.error("Elemento #colunas-json-data não encontrado!");
    }

    // Função para obter o token CSRF dos cookies
    function getCsrfToken() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    }

    // Função para criar um dropdown de colunas
    function criarDropdownColunas(id, multiplo = false) {
        if (!colunasAtuais || colunasAtuais.length === 0) {
            return `<select class="form-select" id="${id}" disabled><option>Nenhuma coluna disponível</option></select>`;
        }
        let selectHtml = `<select class="form-select ${id}" id="${id}" ${multiplo ? 'multiple' : ''}>`;
        colunasAtuais.forEach(col => {
            selectHtml += `<option value="${col}">${col}</option>`;
        });
        selectHtml += `</select>`;
        return selectHtml;
    }

    // Função para criar a interface de uma cláusula condicional
    function criarLinhaClausula() {
        const clauseDiv = document.createElement('div');
        clauseDiv.className = 'card bg-light p-3 mb-3 clause-row';

        clauseDiv.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <label class="form-label fw-bold small">Se...</label>
                <button type="button" class="btn-close" aria-label="Remover Cláusula" onclick="this.closest('.clause-row').remove();"></button>
            </div>
            <div class="row g-2">
                <div class="col-md-6">
                    <label class="form-label small">Nome da Coluna</label>
                    ${criarDropdownColunas('if-column-select')}
                </div>
                <div class="col-md-6">
                    <label class="form-label small">Operador</label>
                    <select class="form-select operator-select">
                        <option value="==">é igual a</option>
                        <option value="!=">é diferente de</option>
                        <option value=">">é maior que</option>
                        <option value=">=">é maior ou igual a</option>
                        <option value="<">é menor que</option>
                        <option value="<=">é menor ou igual a</option>
                        <option value="contains">contém</option>
                        <option value="starts_with">começa com</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label small">Valor</label>
                    <input type="text" class="form-control value-input" autocomplete="off">
                </div>
                <div class="col-md-6">
                    <label class="form-label small">Então (Saída)</label>
                    <input type="text" class="form-control then-value-input" autocomplete="off">
                </div>
            </div>
        `;
        document.getElementById('conditional-clauses-container').appendChild(clauseDiv);
    }

    // Renderiza a lista de passos de transformação
    function renderizarListaPassos() {
        recipeList.innerHTML = '';
        if (passosAplicados.length === 0) {
            recipeList.innerHTML = '<p class="text-muted">Nenhum passo adicionado ainda.</p>';
            recipeList.classList.remove('scrollable-list');
            return;
        }
        recipeList.classList.toggle('scrollable-list', passosAplicados.length > 3);
        passosAplicados.forEach((passo, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'recipe-step d-flex justify-content-between align-items-center mb-2';
            stepDiv.innerHTML = `
                <span>${index + 1}. ${passo.descricao}</span>
                <button class="btn-close" data-index="${index}"></button>
            `;
            recipeList.appendChild(stepDiv);
        });
    }
    
    // Renderiza a tabela de dados
    function renderizarTabela(headers, rows) {
        if (!headers || headers.length === 0) {
            tableContainer.innerHTML = '<p class="text-muted">Nenhum dado para exibir.</p>';
            return;
        }
        colunasAtuais = headers;
        let tableHtml = '<table class="table table-sm table-striped table-bordered">';
        tableHtml += '<thead><tr>' + headers.map(h => `<th class="text-center">${h}</th>`).join('') + '</tr></thead>';
        tableHtml += '<tbody>';
        rows.forEach(row => {
            tableHtml += '<tr>' + headers.map(h => {
                const valor = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
                return `<td class="text-center">${valor}</td>`;
            }).join('') + '</tr>';
        });
        tableHtml += '</tbody></table>';
        tableContainer.innerHTML = tableHtml;
    }

    // Funções para gerir macros no localStorage
    function getMacrosFromStorage() {
        return JSON.parse(localStorage.getItem(MACRO_STORAGE_KEY) || '[]');
    }

    function saveMacrosToStorage(macros) {
        localStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(macros));
    }

    // Renderiza a lista de macros salvas
    function renderizarListaMacros() {
        const macros = getMacrosFromStorage();
        if (!macros || macros.length === 0) {
            macroListContainer.innerHTML = '<div class="card-body"><p class="text-muted">Nenhuma macro salva ainda.</p></div>';
            return;
        }
        let listHtml = '<ul class="list-group">';
        macros.forEach(macro => {
            listHtml += `
                <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center macro-list-item" data-id="${macro.id}" title="${macro.description || ''}">
                    ${macro.name}
                    <button class="btn btn-sm btn-outline-danger delete-macro-btn" data-id="${macro.id}" aria-label="Deletar macro"><i class="fas fa-trash-alt"></i></button>
                </li>
            `;
        });
        listHtml += '</ul>';
        macroListContainer.innerHTML = listHtml;
    }

    // Função central para aplicar transformações
    async function aplicarEProcessar(redirecionarParaLoad = false) {
        spinner.style.display = 'block';
        try {
            const response = await fetch(applyTransformUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify({ steps: passosAplicados })
            });
            const data = await response.json();
            if (data.success) {
                if (redirecionarParaLoad) {
                    window.location.href = loadingPageUrl;
                } else {
                    const rowLimit = parseInt(document.getElementById('row-limit-select')?.value || '-1');
                    const rows = rowLimit !== -1 ? data.rows.slice(0, rowLimit) : data.rows;
                    renderizarTabela(data.headers, rows);
                }
            } else {
                alert('Erro ao aplicar transformações: ' + data.error);
            }
        } catch (err) {
            alert('Erro de rede: ' + (err.message || err));
        } finally {
            spinner.style.display = 'none';
        }
    }

    // Listener para o seletor de operações
    operationSelect.addEventListener('change', () => {
        const operacao = operationSelect.value;
        paramsContainer.innerHTML = '';
        let inputsHtml = '';

        switch (operacao) {
            case 'drop_null_rows':
            case 'drop_duplicates':
                inputsHtml = `<label class="form-label">Verificar Colunas (opcional):</label>${criarDropdownColunas('param-subset_columns', true)}`;
                break;
            case 'drop_column':
                inputsHtml = `<label class="form-label">Colunas para Remover:</label>${criarDropdownColunas('param-column_name', true)}`;
                break;
            case 'filter_rows_by_value':
                inputsHtml = `<label class="form-label">Coluna:</label>${criarDropdownColunas('param-column_name')}
                              <label class="form-label mt-2">Valor a filtrar:</label><input type="text" class="form-control" id="param-value" autocomplete="off">`;
                break;
            case 'change_case':
                inputsHtml = `<label class="form-label">Coluna:</label>${criarDropdownColunas('param-column_name')}
                              <label class="form-label mt-2">Case:</label>
                              <select class="form-select" id="param-case">
                                  <option value="upper">MAIÚSCULAS</option>
                                  <option value="lower">minúsculas</option>
                                  <option value="title">Primeira Maiúscula</option>
                              </select>`;
                break;
            case 'change_column_type':
                inputsHtml = `<label class="form-label">Coluna:</label>${criarDropdownColunas('param-column_name')}
                              <label class="form-label mt-2">Novo Tipo:</label>
                              <select class="form-select" id="param-new_type">
                                  <option value="str">Texto</option>
                                  <option value="int64">Inteiro</option>
                                  <option value="float64">Decimal</option>
                                  <option value="datetime">Data/Hora</option>
                              </select>`;
                break;
            case 'replace_values':
                inputsHtml = `<label class="form-label">Coluna:</label>${criarDropdownColunas('param-column_name')}
                              <label class="form-label mt-2">Substituir valor:</label><input type="text" class="form-control" id="param-value_to_replace" autocomplete="off">
                              <label class="form-label mt-2">Pelo valor:</label><input type="text" class="form-control" id="param-new_value" autocomplete="off">`;
                break;
            case 'add_new_column':
                inputsHtml = `<label class="form-label">Nome da Nova Coluna:</label><input type="text" class="form-control" id="param-column_name" autocomplete="off">
                              <label class="form-label mt-2">Valor Padrão:</label><input type="text" class="form-control" id="param-default_value" autocomplete="off">`;
                break;
            case 'split_by_delimiter':
                inputsHtml = `<label class="form-label">Coluna:</label>${criarDropdownColunas('param-column_name')}
                              <label class="form-label mt-2">Delimitador:</label><input type="text" class="form-control" id="param-delimiter" autocomplete="off">
                              <label class="form-label mt-2">Nomes das Novas Colunas (separado por vírgula):</label><input type="text" class="form-control" id="param-new_column_names" autocomplete="off">`;
                break;
            case 'extract_from_date':
                inputsHtml = `<label class="form-label">Coluna de Data:</label>${criarDropdownColunas('param-column_name')}`;
                break;
            
            case 'conditional_column':
                inputsHtml = `
                    <div class="mb-3">
                        <label class="form-label fw-bold">Nome da Nova Coluna:</label>
                        <input type="text" class="form-control" id="param-new_column_name" autocomplete="off">
                    </div>
                    <hr>
                    <div id="conditional-clauses-container"></div>
                    <div class="d-grid gap-2 mb-3">
                        <button type="button" class="btn btn-outline-primary btn-sm" id="add-clause-btn">
                            <i class="fas fa-plus me-1"></i> Adicionar Cláusula (Se...)
                        </button>
                    </div>
                    <hr>
                    <div class="mb-3">
                        <label class="form-label fw-bold">Senão (Valor Padrão):</label>
                        <input type="text" class="form-control" id="param-default_value" autocomplete="off" placeholder="Se nenhuma condição for atendida">
                    </div>
                `;
                paramsContainer.innerHTML = inputsHtml;
                document.getElementById('add-clause-btn').addEventListener('click', criarLinhaClausula);
                criarLinhaClausula(); 
                break;

            case 'group_by':
                inputsHtml = `<label class="form-label">Agrupar por:</label>${criarDropdownColunas('param-group_by_columns', true)}
                              <label class="form-label mt-2">Agregações (JSON):</label>
                              <textarea class="form-control" id="param-aggregations" rows="3" placeholder='Ex: {"Preco": "sum"}'></textarea>`;
                break;
            default:
                inputsHtml = '<p class="text-muted">Selecione uma operação.</p>';
        }

        if (operacao !== 'conditional_column') {
            paramsContainer.innerHTML = inputsHtml;
        }
        addStepBtn.disabled = !operacao;
    });

    // Listener para adicionar um passo à lista
    addStepBtn.addEventListener('click', () => {
        const operacao = operationSelect.value;
        let parametros = {};
        let descricao = '';

        try {
            switch (operacao) {
                case 'drop_null_rows':
                case 'drop_duplicates': {
                    const selectEl = document.getElementById('param-subset_columns');
                    const colunasSubset = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    if (colunasSubset.length > 0) parametros = { subset_columns: colunasSubset };
                    descricao = `${operacao === 'drop_null_rows' ? 'Apagar Nulos' : 'Remover Duplicados'} ${colunasSubset.length ? 'em: ' + colunasSubset.join(', ') : 'em todas as colunas'}`;
                    break;
                }
                case 'drop_column': {
                    const selectEl = document.getElementById('param-column_name');
                    const cols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    if (cols.length === 0) { alert('Selecione ao menos uma coluna.'); return; }
                    parametros = { column_name: cols };
                    descricao = `Remover colunas: ${cols.join(', ')}`;
                    break;
                }
                case 'change_case':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value,
                        case: document.getElementById('param-case')?.value
                    };
                    descricao = `Mudar case de '${parametros.column_name}' para ${parametros.case}`;
                    break;
                case 'change_column_type':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value,
                        new_type: document.getElementById('param-new_type')?.value
                    };
                    descricao = `Mudar tipo de '${parametros.column_name}' para ${parametros.new_type}`;
                    break;
                case 'replace_values':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value,
                        value_to_replace: document.getElementById('param-value_to_replace')?.value,
                        new_value: document.getElementById('param-new_value')?.value
                    };
                    descricao = `Substituir '${parametros.value_to_replace}' por '${parametros.new_value}' em '${parametros.column_name}'`;
                    break;
                case 'add_new_column':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value,
                        default_value: document.getElementById('param-default_value')?.value
                    };
                    if (!parametros.column_name) { alert('Defina um nome para a nova coluna.'); return; }
                    descricao = `Nova coluna '${parametros.column_name}' com valor '${parametros.default_value}'`;
                    break;
                case 'filter_rows_by_value':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value,
                        value: document.getElementById('param-value')?.value
                    };
                    descricao = `Remover linhas onde '${parametros.column_name}' é '${parametros.value}'`;
                    break;
                case 'extract_from_date':
                    parametros = { column_name: document.getElementById('param-column_name')?.value };
                    descricao = `Extrair partes da data de '${parametros.column_name}'`;
                    break;
                case 'split_by_delimiter':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value,
                        delimiter: document.getElementById('param-delimiter')?.value,
                        new_column_names: (document.getElementById('param-new_column_names')?.value || '').split(',').map(s => s.trim()).filter(Boolean)
                    };
                    if (parametros.new_column_names.length === 0) { alert('Informe os nomes das novas colunas.'); return; }
                    descricao = `Separar '${parametros.column_name}' por '${parametros.delimiter}'`;
                    break;
                
                case 'conditional_column': {
                    const new_column_name = document.getElementById('param-new_column_name')?.value.trim();
                    const default_value = document.getElementById('param-default_value')?.value;
                    
                    if (!new_column_name) {
                        alert('Por favor, defina um nome para a nova coluna.');
                        return;
                    }

                    const clauses = [];
                    document.querySelectorAll('.clause-row').forEach(row => {
                        const if_column = row.querySelector('.if-column-select')?.value;
                        const operator = row.querySelector('.operator-select')?.value;
                        const value = row.querySelector('.value-input')?.value;
                        const then_value = row.querySelector('.then-value-input')?.value;
                        
                        if (if_column && operator && value.trim() !== '' && then_value.trim() !== '') {
                            clauses.push({ if_column, operator, value, then_value });
                        }
                    });

                    if (clauses.length === 0) {
                        alert('Adicione e preencha pelo menos uma cláusula condicional.');
                        return;
                    }
                    
                    parametros = { new_column_name, clauses, default_value };
                    descricao = `Coluna condicional '${new_column_name}' com ${clauses.length} regra(s)`;
                    break;
                }
                
                case 'group_by': {
                    try {
                        const selectEl = document.getElementById('param-group_by_columns');
                        const groupCols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                        if (groupCols.length === 0) { alert('Selecione ao menos uma coluna para agrupar.'); return; }
                        const aggs = JSON.parse(document.getElementById('param-aggregations')?.value || '{}');
                        parametros = { group_by_columns: groupCols, aggregations: aggs };
                        descricao = `Agrupar por ${groupCols.join(', ')}`;
                    } catch (e) {
                        alert('JSON inválido nas Agregações: ' + e.message);
                        return;
                    }
                    break;
                }
                default:
                    alert('Operação desconhecida.');
                    return;
            }

            passosAplicados.push({ operation: operacao, parameters: parametros, descricao });
            renderizarListaPassos();
            sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
        } catch (e) {
            alert("Erro ao adicionar passo: " + e.message);
        }
    });

    // Listener para remover um passo da lista
    recipeList.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-close')) {
            const index = parseInt(event.target.dataset.index);
            if (!isNaN(index)) {
                passosAplicados.splice(index, 1);
                renderizarListaPassos();
                sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
            }
        }
    });

    // Listeners para os botões de ação principais
    applyAllBtn.addEventListener('click', () => aplicarEProcessar(false));
    btnAvancarLoading.addEventListener('click', () => aplicarEProcessar(true));

    // Listeners para salvar e carregar macros
    saveMacroBtnTrigger.addEventListener('click', () => {
        if (passosAplicados.length === 0) {
            alert('Adicione pelo menos um passo à lista antes de salvar a macro.');
            return;
        }
        macroNameInput.value = '';
        macroDescriptionInput.value = '';
        saveMacroModal.show();
    });

    saveMacroConfirmBtn.addEventListener('click', () => {
        const nome = macroNameInput.value.trim();
        const descricao = macroDescriptionInput.value.trim();
        if (!nome) {
            alert('Informe um nome para a macro.');
            return;
        }
        const macros = getMacrosFromStorage();
        if (macros.some(m => m.name.toLowerCase() === nome.toLowerCase())) {
            alert('Já existe uma macro com esse nome. Use outro nome.');
            return;
        }
        const novaMacro = { id: Date.now(), name: nome, description: descricao, steps: passosAplicados };
        macros.push(novaMacro);
        saveMacrosToStorage(macros);
        renderizarListaMacros();
        saveMacroModal.hide();
    });

    macroListContainer.addEventListener('click', (event) => {
        const target = event.target.closest('.macro-list-item');
        if (target) {
            if (event.target.closest('.delete-macro-btn')) {
                const macroId = parseInt(event.target.closest('.delete-macro-btn').dataset.id);
                if (confirm('Deseja realmente deletar essa macro?')) {
                    let macros = getMacrosFromStorage().filter(m => m.id !== macroId);
                    saveMacrosToStorage(macros);
                    renderizarListaMacros();
                }
            } else {
                const macroId = parseInt(target.dataset.id);
                const macro = getMacrosFromStorage().find(m => m.id === macroId);
                if (macro) {
                    passosAplicados = macro.steps;
                    renderizarListaPassos();
                    sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
                    alert(`A lista de transformações da sua macro "${macro.name}" foi carregada! \n\nClique em "Aplicar e visualizar" para ver os resultados.`);
                }
            }
        }
    });

    // Restaura passos da sessionStorage ao carregar a página
    const savedSteps = sessionStorage.getItem('passosAplicados');
    if (savedSteps) {
        try {
            passosAplicados = JSON.parse(savedSteps);
            renderizarListaPassos();
        } catch (e) {
            console.warn('Erro ao restaurar passos da sessão:', e);
            passosAplicados = [];
        }
    }
    
    // Renderiza macros salvas ao carregar a página
    renderizarListaMacros();

    // Listener para o seletor de limite de linhas
    document.getElementById('row-limit-select').addEventListener('change', () => {
        aplicarEProcessar(false);
    });

    // Lógica para a barra de pesquisa da tabela
    const dataSearchInput = document.getElementById('data-search-input');
    let debounceTimeout;
    if (dataSearchInput) {
        dataSearchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const texto = dataSearchInput.value.trim().toLowerCase();
                const tabela = tableContainer.querySelector('table');
                if (!tabela) return;
                const linhas = tabela.querySelectorAll('tbody tr');
                linhas.forEach(linha => {
                    linha.style.display = linha.textContent.toLowerCase().includes(texto) ? '' : 'none';
                });
            }, 250);
        });
    }
});