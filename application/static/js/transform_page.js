import { getIconForDtype } from './icon_datatype.js';
import { exibirNotificacao } from './notifications.js';

let colunasAtuais = [];
let linhasAtuais = [];
let passosAplicados = [];
let totalRowCount = 0;
let originalFilename = '';

window.addEventListener('DOMContentLoaded', () => {
    
    const colunasDataEl = document.getElementById("colunas-json-data");
    const linhasDataEl = document.getElementById("linhas-json-data");
    const totalRowsDataEl = document.getElementById("total-rows-data");
    const originalFilenameDataEl = document.getElementById("original-filename-data");
    const fileInfoDisplayEl = document.getElementById("file-info-display");
    const operationSelect = document.getElementById('operation-select');
    const paramsContainer = document.getElementById('params-container');
    const addStepBtn = document.getElementById('add-step-btn');
    const recipeList = document.getElementById('recipe-list');
    const clearAllStepsBtn = document.getElementById('clear-all-steps-btn');
    const applyAllBtn = document.getElementById('apply-all-btn');
    const btnAvancarLoading = document.getElementById('btn-avancar-loading');
    const tableContainer = document.getElementById('data-table-container');
    const spinner = document.getElementById('loading-spinner');
    const dataSearchInput = document.getElementById('data-search-input');

    const macroListContainer = document.getElementById('macro-list-container');
    const saveMacroBtnTrigger = document.getElementById('save-macro-btn-modal-trigger');
    const saveMacroModalEl = document.getElementById('saveMacroModal');
    const saveMacroModal = new bootstrap.Modal(saveMacroModalEl);
    const saveMacroConfirmBtn = document.getElementById('save-macro-confirm-btn');
    const macroNameInput = document.getElementById('macro-name');
    const macroDescriptionInput = document.getElementById('macro-description');
    const MACRO_STORAGE_KEY = 'etl_macros';

    if (typeof TooltipService !== 'undefined') {
        TooltipService.applyNativeTooltips('operation-select');
    }

    function getCsrfToken() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    }

    function criarDropdownColunas(className, multiplo = false) {
        if (!colunasAtuais || colunasAtuais.length === 0) {
            return `<select class="form-select" disabled><option>Nenhuma coluna disponível</option></select>`;
        }
        let selectHtml = `<select class="form-select ${className}" ${multiplo ? 'multiple' : ''}>`;
        colunasAtuais.forEach(header => {
            selectHtml += `<option value="${header.name}">${header.name}</option>`;
        });
        
        selectHtml += `</select>`;
        return selectHtml;
    }

    function renderizarListaPassos() {
        recipeList.innerHTML = '';
        if (passosAplicados.length === 0) {
            recipeList.innerHTML = '<p class="text-muted">Nenhum passo adicionado ainda.</p>';
            if (clearAllStepsBtn) clearAllStepsBtn.disabled = true;
            return;
        }
        if (clearAllStepsBtn) clearAllStepsBtn.disabled = false;
        passosAplicados.forEach((passo, index) => {
            const stepDiv = document.createElement('div');
            stepDiv.className = 'recipe-step d-flex justify-content-between align-items-center mb-2';
            stepDiv.innerHTML = `<span>${index + 1}. ${passo.descricao}</span><button class="btn-close" data-index="${index}"></button>`;
            recipeList.appendChild(stepDiv);
        });
    }

    if (clearAllStepsBtn) {
        const popover = new bootstrap.Popover(clearAllStepsBtn, {
            sanitize: false,
            html: true,
        });

        clearAllStepsBtn.addEventListener('show.bs.popover', () => {
            const popoverContent = `
                <div>
                    <p class="small mb-2">Apagar todas as ${passosAplicados.length} etapas?</p>
                    <button class="btn btn-danger btn-sm w-100 mb-1" id="confirm-clear-steps">Sim, apagar</button>
                    <button class="btn btn-secondary btn-sm w-100" id="cancel-clear-steps">Cancelar</button>
                </div>
            `;
            popover.setContent({ '.popover-body': popoverContent });
        });

        clearAllStepsBtn.addEventListener('shown.bs.popover', () => {
            const confirmBtn = document.getElementById('confirm-clear-steps');
            const cancelBtn = document.getElementById('cancel-clear-steps');
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    passosAplicados = [];
                    renderizarListaPassos();
                    sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
                    popover.hide();
                });
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    popover.hide();
                });
            }
        });
    }

    function renderizarTabela(headers, rows) {
        if (!headers || headers.length === 0) {
            tableContainer.innerHTML = '<p class="text-muted">Nenhum dado para exibir.</p>';
            return;
        }
        colunasAtuais = headers; 
        const colCount = colunasAtuais.length;
        const rowCount = totalRowCount;
        const formattedRowCount = rowCount.toLocaleString('pt-BR');
        const formattedColCount = colCount.toLocaleString('pt-BR');

        if (fileInfoDisplayEl) {
            fileInfoDisplayEl.innerHTML = `
                Arquivo: <strong>"${originalFilename}"</strong> 
                <i class="text-muted">(${formattedRowCount} linhas x ${formattedColCount} colunas)</i>
            `;
        }
        let tableHtml = '<table class="table table-sm table-striped table-bordered">';
        
        
        tableHtml += '<thead id="table-header"><tr>';
        tableHtml += headers.map(h => 
            
            `<th class="text-center" data-column-name="${h.name}">
                ${getIconForDtype(h.type)} ${h.name}
            </th>`
        ).join('');
        tableHtml += '</tr></thead>';
        

        tableHtml += '<tbody>';
        rows.forEach(row => {
            
            tableHtml += '<tr>' + headers.map(h => {
                const valor = row[h.name] != null ? String(row[h.name]) : '';
                return `<td class="text-center">${valor}</td>`;
            }).join('') + '</tr>';
        });
        tableHtml += '</tbody></table>';
        tableContainer.innerHTML = tableHtml;

        const tableHeader = document.getElementById('table-header');
        if (tableHeader) {
            new Sortable(tableHeader.querySelector('tr'), {
                animation: 1000, 
                handle: 'th',
        
                onEnd: function(evt) {
                    const newOrder = Array.from(evt.to.children).map(th => th.dataset.columnName).filter(Boolean);
                    const oldOrder = colunasAtuais.map(h => h.name);
                    const orderChanged = newOrder.toString() !== oldOrder.toString();

                    if (orderChanged) {
                        colunasAtuais = newOrder.map(name => {
                            return colunasAtuais.find(h => h.name === name);
                        });

                        const reorderStep = {
                            operation: 'reorder_columns',
                            parameters: { column_order: newOrder },
                            descricao: `Colunas Reordenadas: ${newOrder.join(', ')}`
                        }; 
                        passosAplicados.push(reorderStep);
                        renderizarListaPassos();
                        sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
                    }
                    const rowLimit = parseInt(document.getElementById('row-limit-select')?.value || '-1');
                    const rowsToShow = rowLimit !== -1 ? linhasAtuais.slice(0, rowLimit) : linhasAtuais;
                    renderizarTabela(colunasAtuais, rowsToShow);
                },
                
            });
        }
    }

    function renderizarListaMacros() {
        const macros = getMacrosFromStorage();
        macroListContainer.innerHTML = '';
        if (!macros || macros.length === 0) {
            macroListContainer.innerHTML = '<p class="text-muted">Nenhuma macro salva ainda.</p>';
            return;
        }
        let listHtml = '<ul class="list-group">';
        macros.forEach(macro => {
            listHtml += `
                <li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center macro-list-item" data-id="${macro.id}" title="${macro.description || ''}">
                    ${macro.name}
                    <button class="btn btn-sm btn-outline-danger delete-macro-btn" data-id="${macro.id}" aria-label="Deletar macro"><i class="fas fa-trash-alt"></i></button>
                </li>`;
        });
        listHtml += '</ul>';
        macroListContainer.innerHTML = listHtml;
    }


    function getMacrosFromStorage() {
        return JSON.parse(localStorage.getItem(MACRO_STORAGE_KEY) || '[]');
    }

    function saveMacrosToStorage(macros) {
        localStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(macros));
    }

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
                    colunasAtuais = data.headers;
                    linhasAtuais = data.rows;
                    totalRowCount = data.rows.length;
                    renderizarTabela(data.headers, rows);
                }
            } else {
                exibirNotificacao('Erro ao aplicar transformações: ' + data.error, 'danger');
            }
        } catch (err) {
            exibirNotificacao('Erro de rede: ' + (err.message || err), 'danger');
        } finally {
            spinner.style.display = 'none';
        }
    }

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
            case 'remove_rows_by_value':
            case 'filter_rows_by_value':
                inputsHtml = `<label class="form-label">Coluna:</label>${criarDropdownColunas('param-column_name')}
                             <label class="form-label mt-2">Valores (separados por vírgula):</label><textarea class="form-control" id="param-value" rows="3" autocomplete="off"></textarea>`;
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
            case 'trim_spaces':
                inputsHtml = `<label class="form-label">Coluna para Cortar:</label>${criarDropdownColunas('param-column_name')}`;
                break;
            case 'rename_column':
                inputsHtml = `
                    <label class="form-label fw-bold">1. Coluna para Renomear:</label>
                    ${criarDropdownColunas('param-old_name')}
                    <label class="form-label fw-bold mt-2">2. Novo Nome:</label>
                    <input type="text" class="form-control" id="param-new_name" autocomplete="off" placeholder="Ex: NovoNomeDaColuna">`;
                break;
            case 'add_prefix':
                inputsHtml = `
                    <label class="form-label fw-bold">1. Adicionar Prefixo:</label>
                    <input type="text" class="form-control" id="param-prefix" autocomplete="off" placeholder="Ex: ID_">
                    <label class="form-label fw-bold mt-2">2. À Coluna:</label>
                    ${criarDropdownColunas('param-column_name')}`;
                break;

            case 'add_suffix':
                inputsHtml = `
                    <label class="form-label fw-bold">1. Adicionar Sufixo:</label>
                    <input type="text" class="form-control" id="param-suffix" autocomplete="off" placeholder="Ex: _BR">
                    <label class="form-label fw-bold mt-2">2. À Coluna:</label>
                    ${criarDropdownColunas('param-column_name')}`;
                break;
            case 'add_new_column':
                inputsHtml = `<label class="form-label">Nome da Nova Coluna:</label><input type="text" class="form-control" id="param-column_name" autocomplete="off">
                             <label class="form-label mt-2">Valor Padrão:</label><input type="text" class="form-control" id="param-default_value" autocomplete="off">`;
                break;
            case 'split_by_delimiter':
                inputsHtml = `<label class="form-label">Coluna:</label>${criarDropdownColunas('param-column_name')}
                             <label class="form-label mt-2">Delimitador:</label><input type="text" class="form-control" id="param-delimiter" autocomplete="off">
                             <label class="form-label mt-2">Nomes das Novas Colunas (vírgula):</label><input type="text" class="form-control" id="param-new_column_names" autocomplete="off">`;
                break;
            case 'merge_columns':
                inputsHtml = `
                    <label class="form-label fw-bold">1. Colunas para Mesclar (na ordem):</label>
                    <p class="form-text small mt-0">Selecione duas ou mais colunas.</p>
                    ${criarDropdownColunas('param-columns_to_merge', true)}
                    <label class="form-label fw-bold mt-2">2. Separador (Delimitador):</label>
                    <input type="text" class="form-control" id="param-delimiter" autocomplete="off" placeholder="Ex: (espaço), (vírgula), -">
                    <label class="form-label fw-bold mt-2">3. Nome da Nova Coluna:</label>
                    <input type="text" class="form-control" id="param-new_column_name" autocomplete="off" placeholder="Ex: Nome_Completo">`;
                break;
            case 'duplicate_column':
                inputsHtml = `
                    <label class="form-label fw-bold">1. Coluna para Duplicar:</label>
                    ${criarDropdownColunas('param-column_to_duplicate')}
                    <label class="form-label fw-bold mt-2">2. Nome da Nova Coluna (Opcional):</label>
                    <input type="text" class="form-control" id="param-new_column_name" autocomplete="off" placeholder="Automático: 'Nome - Copiar'">`;
                break;
            case 'extract_from_date':
                inputsHtml = `<label class="form-label">Coluna de Data:</label>${criarDropdownColunas('param-column_name')}`;
                break;
            case 'conditional_column':
                inputsHtml = `
                    <div id="conditional-column-ui">
                        <div class="mb-3"><label class="form-label fw-bold">Nome da Nova Coluna:</label><input type="text" class="form-control" id="param-new_column_name" autocomplete="off"></div><hr>
                        <div id="conditional-clauses-container"></div>
                        <div class="d-grid gap-2 mb-3"><button type="button" class="btn btn-outline-primary btn-sm" id="add-clause-btn"><i class="fas fa-plus me-1"></i> Adicionar Cláusula (Se...)</button></div><hr>
                        <div class="mb-3"><label class="form-label fw-bold">Senão (Valor Padrão):</label><input type="text" class="form-control" id="param-default_value" autocomplete="off" placeholder="Se nenhuma condição for atendida"></div>
                    </div>`;
                break;
            case 'group_by':
                inputsHtml = `
                    <div id="group-by-ui">
                        <div class="mb-3"><label class="form-label fw-bold">1. Agrupar por:</label><p class="form-text small mt-0">Colunas que definirão os grupos.</p>${criarDropdownColunas('param-group_by_columns', true)}</div><hr>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div><label class="form-label fw-bold">2. Novas Colunas (Agregações):</label><p class="form-text small mt-0">Crie novas colunas com cálculos.</p></div>
                                <button type="button" class="btn btn-sm btn-primary" id="add-aggregation-btn"><i class="fas fa-plus me-1"></i> Adicionar</button>
                            </div>
                            <div id="aggregations-list-container"></div>
                        </div>
                    </div>`;
                break;
            case 'split_date_time':
                inputsHtml = `
                    <label class="form-label">Coluna de Data/Hora:</label>${criarDropdownColunas('param-column_name')}
                    <label class="form-label mt-2">Nome da Nova Coluna (Data):</label><input type="text" class="form-control" id="param-new_date_column_name" autocomplete="off" />
                    <label class="form-label mt-2">Nome da Nova Coluna (Hora):</label><input type="text" class="form-control" id="param-new_time_column_name" autocomplete="off" />
                `;
                break;
            case 'sort_column':
                inputsHtml = `
                    <label class="form-label">Ordenar por Coluna(s):</label>
                    ${criarDropdownColunas('param-column_names', true)}
                    <label class="form-label mt-2">Direção:</label>
                    <select class="form-select" id="param-direction">
                        <option value="asc">Crescente (A-Z, 0-9)</option>
                        <option value="desc">Decrescente (Z-A, 9-0)</option>
                    </select>`;
                break;
            default:
                inputsHtml = '<p class="text-muted">Selecione uma operação.</p>';
                break;
        }

        paramsContainer.innerHTML = inputsHtml;

        if (operacao === 'conditional_column') {
            const container = document.getElementById('conditional-clauses-container');
            function criarLinhaClausula() {
                const clauseDiv = document.createElement('div');
                clauseDiv.className = 'card bg-light p-3 mb-3 clause-row';
                clauseDiv.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-2"><label class="form-label fw-bold small">Se...</label><button type="button" class="btn-close remove-clause-btn" aria-label="Remover Cláusula"></button></div><div class="row g-2"><div class="col-md-6"><label class="form-label small">Coluna</label>${criarDropdownColunas('if-column-select')}</div><div class="col-md-6"><label class="form-label small">Operador</label><select class="form-select operator-select"><option value="==">é igual a</option><option value="!=">é diferente de</option><option value=">">é maior que</option><option value=">=">é maior ou igual a</option><option value="<">é menor que</option><option value="<=">é menor ou igual a</option><option value="contains">contém</option><option value="starts_with">começa com</option></select></div><div class="col-md-6"><label class="form-label small">Valor</label><input type="text" class="form-control value-input" autocomplete="off"></div><div class="col-md-6"><label class="form-label small">Então (Saída)</label><input type="text" class="form-control then-value-input" autocomplete="off"></div></div>`;
                container.appendChild(clauseDiv);
            }
            document.getElementById('add-clause-btn').addEventListener('click', criarLinhaClausula);
            container.addEventListener('click', (e) => { if (e.target.classList.contains('remove-clause-btn')) e.target.closest('.clause-row').remove(); });
            criarLinhaClausula();
        } else if (operacao === 'group_by') {
            const aggContainer = document.getElementById('aggregations-list-container');
            function criarLinhaAgregacao() {
                const aggRow = document.createElement('div');
                aggRow.className = 'card bg-light p-3 mb-2 aggregation-row';
                const rowId = Date.now();
                aggRow.innerHTML = `
                    <div class="mb-2">
                        <label for="new-col-${rowId}" class="form-label small">Nome da Nova Coluna</label>
                        <input type="text" id="new-col-${rowId}" class="form-control form-control-sm new-column-name-input" placeholder="Ex: TotalDeVendas">
                    </div>
                    <div class="row g-2 align-items-end">
                        <div class="col-6">
                            <label for="op-${rowId}" class="form-label small">Operação</label>
                            <select id="op-${rowId}" class="form-select form-select-sm operation-select">
                                <option value="sum">Soma</option>
                                <option value="count">Contagem</option>
                                <option value="mean">Média</option>
                                <option value="min">Mínimo</option>
                                <option value="max">Máximo</option>
                            </select>
                        </div>
                        <div class="col-5">
                            <label for="col-${rowId}" class="form-label small">Da Coluna</label>
                            ${criarDropdownColunas('column-to-agg-select')}
                        </div>
                        <div class="col-1">
                            <button type="button" class="btn btn-sm btn-outline-danger remove-aggregation-btn w-100" aria-label="Remover">&times;</button>
                        </div>
                    </div>
                `;
                aggContainer.appendChild(aggRow);
                aggRow.querySelector('.column-to-agg-select').classList.add('form-select-sm');
            }
            document.getElementById('add-aggregation-btn').addEventListener('click', criarLinhaAgregacao);
            aggContainer.addEventListener('click', (e) => { if (e.target.classList.contains('remove-aggregation-btn')) e.target.closest('.aggregation-row').remove(); });
            criarLinhaAgregacao();
        }
        addStepBtn.disabled = !operacao || operacao === 'Selecione...';
    });

    addStepBtn.addEventListener('click', () => {
        const operacao = operationSelect.value;
        let parametros = {};
        let descricao = '';

        try {
            switch (operacao) {
                case 'drop_null_rows':
                case 'drop_duplicates': {
                    const selectEl = document.querySelector('.param-subset_columns');
                    const cols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    if (cols.length > 0) {
                        parametros = { subset_columns: cols };
                    }
                    descricao = `${operacao === 'drop_null_rows' ? 'Apagar Nulos' : 'Remover Duplicados'} ${cols.length > 0 ? 'em: ' + cols.join(', ') : 'em todas as colunas'}`;
                    break;
                }
                
                case 'drop_column': {
                    const selectEl = document.querySelector('.param-column_name');
                    const cols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    if (cols.length === 0) {
                        exibirNotificacao('Selecione ao menos uma coluna para remover.', 'warning');
                        return;
                    }
                    parametros = { column_name: cols };
                    descricao = `Remover colunas: ${cols.join(', ')}`;
                    break;
                }
                case 'remove_rows_by_value':
                case 'filter_rows_by_value': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const valueInput = document.getElementById('param-value');
                    
                    if (!columnSelect?.value) {
                        exibirNotificacao('Por favor, selecione uma coluna.', 'warning');
                        return;
                    }
                    if (!valueInput?.value.trim()) {
                        exibirNotificacao('Por favor, insira pelo menos um valor.', 'warning');
                        return;
                    }

                    const values = valueInput.value.split(',').map(s => s.trim());
                    
                    parametros = { column_name: columnSelect.value, value: values };
                    
                    descricao = `${operacao === 'remove_rows_by_value' ? 'Remover' : 'Manter'} linhas onde a coluna '${parametros.column_name}' está em [${values.join(', ')}]`;
                    break;
                }
                case 'change_case': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const caseSelect = document.getElementById('param-case');
                    if (!columnSelect || columnSelect.value === "") { exibirNotificacao('Por favor, selecione uma coluna.', 'warning'); return; }
                    parametros = { column_name: columnSelect.value, case: caseSelect.value };
                    descricao = `Mudar case de '${parametros.column_name}' para ${parametros.case}`;
                    break;
                }
                case 'split_date_time': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const newDateColInput = document.getElementById('param-new_date_column_name');
                    const newTimeColInput = document.getElementById('param-new_time_column_name');
                    
                    if (!columnSelect?.value || !newDateColInput?.value || !newTimeColInput?.value) {
                        exibirNotificacao('Por favor, preencha todos os campos.', 'warning');
                        return;
                    }

                    parametros = {
                        column_name: columnSelect.value,
                        new_date_column_name: newDateColInput.value,
                        new_time_column_name: newTimeColInput.value,
                    };
                    
                    descricao = `Separar '${parametros.column_name}' em '${parametros.new_date_column_name}' e '${parametros.new_time_column_name}'`;
                    break;
                }
                
                case 'change_column_type': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const typeSelect = document.getElementById('param-new_type');
                    if (!columnSelect || columnSelect.value === "") { exibirNotificacao('Por favor, selecione uma coluna.', 'warning'); return; }
                    parametros = { column_name: columnSelect.value, new_type: typeSelect.value };
                    descricao = `Mudar tipo de '${parametros.column_name}' para ${parametros.new_type}`;
                    break;
                }
                case 'replace_values': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const valueToReplaceInput = document.getElementById('param-value_to_replace');
                    const newValueInput = document.getElementById('param-new_value');
                    if (!columnSelect || columnSelect.value === "") { exibirNotificacao('Por favor, selecione uma coluna.', 'warning'); return; }
                    parametros = { column_name: columnSelect.value, value_to_replace: valueToReplaceInput.value, new_value: newValueInput.value };
                    descricao = `Substituir '${parametros.value_to_replace}' por '${parametros.new_value}' em '${parametros.column_name}'`;
                    break;
                }
                case 'trim_spaces': {
                    const columnSelect = document.querySelector('.param-column_name');
                    if (!columnSelect || columnSelect.value === "") { 
                        exibirNotificacao('Por favor, selecione uma coluna.', 'warning'); 
                        return; 
                    }
                    parametros = { column_name: columnSelect.value };
                    descricao = `Cortar espaços da coluna '${parametros.column_name}'`;
                    break;
                }
                case 'rename_column': {
                    const oldNameSelect = document.querySelector('.param-old_name');
                    const newNameInput = document.getElementById('param-new_name');

                    if (!oldNameSelect?.value) {
                        exibirNotificacao('Selecione a coluna que deseja renomear.', 'warning');
                        return;
                    }
                    if (!newNameInput.value.trim()) {
                        exibirNotificacao('Defina um novo nome para a coluna.', 'warning');
                        return;
                    }
                    
                    parametros = { 
                        old_name: oldNameSelect.value, 
                        new_name: newNameInput.value.trim() 
                    };
                    
                    descricao = `Coluna renomeada '${parametros.old_name}' para '${parametros.new_name}'`;
                    break;
                }
                case 'add_prefix': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const prefixInput = document.getElementById('param-prefix');

                    if (!columnSelect?.value) {
                        exibirNotificacao('Selecione a coluna.', 'warning');
                        return;
                    }
                    if (!prefixInput.value) { 
                        exibirNotificacao('Defina um prefixo.', 'warning'); 
                        return; 
                    }
                    
                    parametros = { 
                        column_name: columnSelect.value, 
                        prefix: prefixInput.value 
                    };
                    
                    descricao = `Prefixo adicionado '${parametros.prefix}' aos valores de '${parametros.column_name}'`;
                    break;
                }

                case 'add_suffix': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const suffixInput = document.getElementById('param-suffix');

                    if (!columnSelect?.value) {
                        exibirNotificacao('Selecione a coluna.', 'warning');
                        return;
                    }
                    if (!suffixInput.value) { 
                        exibirNotificacao('Defina um sufixo.', 'warning'); 
                        return; 
                    }
                    
                    parametros = { 
                        column_name: columnSelect.value, 
                        suffix: suffixInput.value 
                    };
                    
                    descricao = `Sufixo adicionado '${parametros.suffix}' aos valores de '${parametros.column_name}'`;
                    break;
                }
                case 'add_new_column': {
                    const columnNameInput = document.getElementById('param-column_name');
                    const defaultValueInput = document.getElementById('param-default_value');
                    if (!columnNameInput.value) { exibirNotificacao('Defina um nome para a nova coluna.', 'warning'); return; }
                    parametros = { column_name: columnNameInput.value, default_value: defaultValueInput.value };
                    descricao = `Coluna adicionada '${parametros.column_name}' com valor '${parametros.default_value}'`;
                    break;
                }
                case 'split_by_delimiter': {
                    const columnSelect = document.querySelector('.param-column_name');
                    const delimiterInput = document.getElementById('param-delimiter');
                    const newColumnNamesInput = document.getElementById('param-new_column_names');
                    if (!columnSelect || columnSelect.value === "") { exibirNotificacao('Por favor, selecione uma coluna.', 'warning'); return; }
                    const newColNames = (newColumnNamesInput.value || '').split(',').map(s => s.trim()).filter(Boolean);
                    if (newColNames.length === 0) { exibirNotificacao('Informe os nomes das novas colunas.', 'warning'); return; }
                    parametros = { column_name: columnSelect.value, delimiter: delimiterInput.value, new_column_names: newColNames };
                    descricao = `Separar '${parametros.column_name}' por '${parametros.delimiter}'`;
                    break;
                }
                case 'merge_columns': {
                    const selectEl = document.querySelector('.param-columns_to_merge');
                    const delimiterInput = document.getElementById('param-delimiter');
                    const newColumnNameInput = document.getElementById('param-new_column_name');

                    const cols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    
                    if (cols.length < 2) {
                        exibirNotificacao('Selecione pelo menos duas colunas para mesclar.', 'warning');
                        return;
                    }
                    if (!newColumnNameInput.value.trim()) {
                        exibirNotificacao('Defina um nome para a nova coluna.', 'warning');
                        return;
                    }                    
                    parametros = { 
                        columns_to_merge: cols, 
                        delimiter: delimiterInput.value, 
                        new_column_name: newColumnNameInput.value.trim() 
                    };
                    
                    descricao = `Colunas mescladas [${cols.join(', ')}] em '${parametros.new_column_name}'`;
                    break;
                }
                case 'duplicate_column': {
                    const columnSelect = document.querySelector('.param-column_to_duplicate');
                    const newColumnNameInput = document.getElementById('param-new_column_name');

                    if (!columnSelect?.value) {
                        exibirNotificacao('Selecione a coluna que deseja duplicar.', 'warning');
                        return;
                    }
                    const new_name = newColumnNameInput.value.trim();
                    
                    parametros = { 
                        column_to_duplicate: columnSelect.value, 
                        new_column_name: new_name
                    };

                    const desc_name = new_name ? `'${new_name}'` : "(nome automático)";
                    descricao = `Coluna duplicada '${parametros.column_to_duplicate}' para ${desc_name}`;
                    break;
                }
                case 'extract_from_date': {
                    const columnSelect = document.querySelector('.param-column_name');
                    if (!columnSelect || columnSelect.value === "") { exibirNotificacao('Por favor, selecione uma coluna.', 'warning'); return; }
                    parametros = { column_name: columnSelect.value };
                    descricao = `Extrair partes da data de '${parametros.column_name}'`;
                    break;
                }
                case 'conditional_column': {
                    const new_column_name = document.getElementById('param-new_column_name')?.value.trim();
                    if (!new_column_name) { exibirNotificacao('Por favor, defina um nome para a nova coluna.', 'warning'); return; }
                    const clauses = Array.from(document.querySelectorAll('.clause-row')).map(row => ({
                        if_column: row.querySelector('.if-column-select')?.value,
                        operator: row.querySelector('.operator-select')?.value,
                        value: row.querySelector('.value-input')?.value,
                        then_value: row.querySelector('.then-value-input')?.value
                    })).filter(c => c.if_column && c.operator && c.value.trim() !== '' && c.then_value.trim() !== '');
                    if (clauses.length === 0) { exibirNotificacao('Adicione e preencha pelo menos uma cláusula condicional.', 'warning'); return; }
                    parametros = { new_column_name, clauses, default_value: document.getElementById('param-default_value')?.value };
                    descricao = `Coluna condicional '${new_column_name}' com ${clauses.length} regra(s)`;
                    break;
                }
                case 'group_by': {
                    const selectEl = document.querySelector('#group-by-ui .param-group_by_columns');
                    const groupCols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    if (groupCols.length === 0) {
                        exibirNotificacao('Selecione pelo menos uma coluna para agrupar.', 'warning');
                        return;
                    }
                    const aggregations = Array.from(document.querySelectorAll('.aggregation-row')).map(row => {
                        return {
                            new_column_name: row.querySelector('.new-column-name-input').value.trim(),
                            operation: row.querySelector('.operation-select').value,
                            column_to_aggregate: row.querySelector('.column-to-agg-select').value
                        };
                    }).filter(agg => agg.new_column_name);
                    parametros = { group_by_columns: groupCols, aggregations: aggregations };
                    descricao = `Agrupar por ${groupCols.join(', ')} e calcular ${aggregations.length} agregação(ões)`;
                    break;
                }
                case 'sort_column': {
                    const selectEl = document.querySelector('.param-column_names');
                    const cols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    if (cols.length === 0) {
                        exibirNotificacao('Selecione ao menos uma coluna para ordenar.', 'warning');
                        return;
                    }
                    
                    const directionSelect = document.getElementById('param-direction');
                    const direction = directionSelect.value;
                    
                    parametros = { column_names: cols, direction: direction };
                    descricao = `Ordenar por ${cols.join(', ')} (${direction === 'asc' ? 'Crescente' : 'Decrescente'})`;
                    break;
                }
                default:
                    exibirNotificacao('Operação desconhecida ou não selecionada.', 'danger');
                    return;
            }

            passosAplicados.push({ operation: operacao, parameters: parametros, descricao });
            renderizarListaPassos();
            sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
            operationSelect.value = 'Selecione...';
            paramsContainer.innerHTML = '<p class="text-muted">Selecione uma operação.</p>';
            addStepBtn.disabled = true;

        } catch (e) {
            exibirNotificacao("Erro ao adicionar passo: " + e.message, 'danger');
        }
    });
 
    recipeList.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-close')) {
            const index = parseInt(e.target.dataset.index);
            if (!isNaN(index)) {
                passosAplicados.splice(index, 1);
                renderizarListaPassos();
                sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
            }
        }
    });

    applyAllBtn.addEventListener('click', () => aplicarEProcessar(false));
    btnAvancarLoading.addEventListener('click', () => aplicarEProcessar(true));
    document.getElementById('row-limit-select').addEventListener('change', () => aplicarEProcessar(false));

    saveMacroBtnTrigger.addEventListener('click', () => {
        if (passosAplicados.length === 0) {
            exibirNotificacao('Adicione pelo menos um passo à lista antes de salvar a macro.', 'warning');
            return;
        }
        macroNameInput.value = '';
        macroDescriptionInput.value = '';
        saveMacroModal.show();
    });

    saveMacroConfirmBtn.addEventListener('click', () => {
        const nome = macroNameInput.value.trim();
        if (!nome) { exibirNotificacao('Informe um nome para a macro.', 'warning'); return; }
        const macros = getMacrosFromStorage();
        if (macros.some(m => m.name.toLowerCase() === nome.toLowerCase())) {
            exibirNotificacao('Já existe uma macro com esse nome.', 'warning');
            return;
        }
        macros.push({ id: Date.now(), name: nome, description: macroDescriptionInput.value.trim(), steps: passosAplicados });
        saveMacrosToStorage(macros);
        renderizarListaMacros();
        saveMacroModal.hide();
        exibirNotificacao(`Macro "${nome}" salva com sucesso!`, 'success');
    });

    macroListContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.macro-list-item');
        if (!target) return;
        const macroId = parseInt(target.dataset.id);
        if (e.target.closest('.delete-macro-btn')) {
            if (confirm('Deseja realmente deletar essa macro?')) {
                saveMacrosToStorage(getMacrosFromStorage().filter(m => m.id !== macroId));
                renderizarListaMacros();
                exibirNotificacao('Macro deletada.', 'success');
            }
        } else {
            const macro = getMacrosFromStorage().find(m => m.id === macroId);
            if (macro) {
                passosAplicados = macro.steps;
                renderizarListaPassos();
                sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
                exibirNotificacao(`Macro "${macro.name}" carregada! Clique em "Aplicar e visualizar".`, 'info');
            }
        }
    });

    let debounceTimeout;
    dataSearchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            const texto = dataSearchInput.value.trim().toLowerCase();
            const tabela = tableContainer.querySelector('table');
            if (!tabela) return;
            tabela.querySelectorAll('tbody tr').forEach(linha => {
                linha.style.display = linha.textContent.toLowerCase().includes(texto) ? '' : 'none';
            });
        }, 250);
    });

    let headers = [];
    let rows = [];

    try {
        headers = JSON.parse(colunasDataEl.textContent);
        colunasAtuais = headers; 
    } catch (e) {
        console.error("Erro ao parsear JSON de colunas:", e);
    }
    
    try {
        if (linhasDataEl) {
            rows = JSON.parse(linhasDataEl.textContent);
            linhasAtuais = rows;
        }
    } catch (e) {
        console.error("Erro ao parsear JSON de linhas:", e);
    } 
    try {
        if (totalRowsDataEl) {
            totalRowCount = parseInt(totalRowsDataEl.textContent.trim(), 10);
        } else {
            totalRowCount = rows.length;
        }
    } catch (e) {
        console.error("Erro ao parsear contagem total de linhas:", e);
        totalRowCount = rows.length;
    }

    try {
        if (originalFilenameDataEl) {
            originalFilename = JSON.parse(originalFilenameDataEl.textContent);
        }
    } catch (e) {
        console.error("Erro ao parsear nome do arquivo:", e);
        originalFilename = 'arquivo.csv';
    }
    renderizarTabela(headers, rows);
    
    const savedSteps = sessionStorage.getItem('passosAplicados');
    if (savedSteps) {
        try {
            passosAplicados = JSON.parse(savedSteps);
        } catch (e) {
            console.warn('Erro ao restaurar passos da sessão:', e);
            passosAplicados = [];
        }
    }
    
    renderizarListaPassos();
    renderizarListaMacros();
});