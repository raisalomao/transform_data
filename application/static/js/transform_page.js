let colunasAtuais = [];
let passosAplicados = [];

window.addEventListener('DOMContentLoaded', () => {
    
    const colunasDataEl = document.getElementById("colunas-json-data");
    const operationSelect = document.getElementById('operation-select');
    const paramsContainer = document.getElementById('params-container');
    const addStepBtn = document.getElementById('add-step-btn');
    const recipeList = document.getElementById('recipe-list');
    const applyAllBtn = document.getElementById('apply-all-btn');
    const btnAvancarLoading = document.getElementById('btn-avancar-loading');
    const tableContainer = document.getElementById('data-table-container');
    const spinner = document.getElementById('loading-spinner');

    const macroListContainer = document.getElementById('macro-list-container');
    const saveMacroBtnTrigger = document.getElementById('save-macro-btn-modal-trigger');
    const saveMacroModalEl = document.getElementById('saveMacroModal');
    const saveMacroModal = new bootstrap.Modal(saveMacroModalEl);
    const saveMacroConfirmBtn = document.getElementById('save-macro-confirm-btn');
    const macroNameInput = document.getElementById('macro-name');
    const macroDescriptionInput = document.getElementById('macro-description');
    const MACRO_STORAGE_KEY = 'etl_macros';

    if (colunasDataEl) {
        try {
            colunasAtuais = JSON.parse(colunasDataEl.textContent);
        } catch (e) {
            console.error("Erro ao parsear JSON de colunas:", e);
        }
    } else {
        console.error("Elemento #colunas-json-data não encontrado!");
    }

    function getCsrfToken() {
        return document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    }

    function criarDropdownColunas(id, multiplo = false) {
        if (!colunasAtuais || colunasAtuais.length === 0) {
            return `<select class="form-select" id="${id}" disabled><option>Nenhuma coluna disponível</option></select>`;
        }
        let selectHtml = `<select class="form-select" id="${id}" ${multiplo ? 'multiple' : ''}>`;
        colunasAtuais.forEach(col => {
            selectHtml += `<option value="${col}">${col}</option>`;
        });
        selectHtml += `</select>`;
        return selectHtml;
    }

    function renderizarListaPassos() {
        recipeList.innerHTML = '';

        if (passosAplicados.length === 0) {
            recipeList.innerHTML = '<p class="text-muted">Nenhum passo adicionado ainda.</p>';
            return;
        }

        if (passosAplicados.length > 2) {
            console.log("Adicionando classe de rolagem");
            recipeList.classList.add('scrollable-list');
        } else {
            recipeList.classList.remove('scrollable-list');
        }

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

    function getMacrosFromStorage() {
        const macrosJson = localStorage.getItem(MACRO_STORAGE_KEY);
        return macrosJson ? JSON.parse(macrosJson) : [];
    }

    function saveMacrosToStorage(macros) {
        localStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(macros));
    }

    function renderizarListaMacros() {
        const macros = getMacrosFromStorage();
        if (!macros || macros.length === 0) {
            macroListContainer.innerHTML = '<div class="card-body" id="recipe-list" aria-live="polite" aria-atomic="true"><p class="text-muted">Nenhuma macro salva ainda.</p></div>';
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
            alert('Erro de rede: ' + err.message || err);
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
                              <label class="form-label mt-2">Nomes das Novas Colunas (vírgula):</label><input type="text" class="form-control" id="param-new_column_names" autocomplete="off">`;
                break;
            case 'extract_from_date':
                inputsHtml = `<label class="form-label">Coluna de Data:</label>${criarDropdownColunas('param-column_name')}`;
                break;
            case 'conditional_column':
                inputsHtml = `<label class="form-label">Nome da Nova Coluna:</label><input type="text" class="form-control" id="param-new_column_name" autocomplete="off">
                              <label class="form-label mt-2">Coluna Base:</label>${criarDropdownColunas('param-base_column')}
                              <label class="form-label mt-2">Valor Padrão:</label><input type="text" class="form-control" id="param-default_value" autocomplete="off">
                              <label class="form-label mt-2">Condições (JSON):</label>
                              <textarea class="form-control" id="param-conditions" rows="4" placeholder='Ex: [{"condition": ">= 5000", "value": "VIP"}]'></textarea>`;
                break;
            case 'group_by':
                inputsHtml = `<label class="form-label">Agrupar por:</label>${criarDropdownColunas('param-group_by_columns', true)}
                              <label class="form-label mt-2">Agregações (JSON):</label>
                              <textarea class="form-control" id="param-aggregations" rows="3" placeholder='Ex: {"Preco": "sum"}'></textarea>`;
                break;
            default:
                inputsHtml = '<p class="text-muted">Selecione uma operação.</p>';
        }

        paramsContainer.innerHTML = inputsHtml;
        addStepBtn.disabled = operacao === '' || operacao === null;
    });

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
                    descricao = `${operacao} ${colunasSubset.length ? 'em: ' + colunasSubset.join(', ') : 'em todas as colunas'}`;
                    break;
                }
                case 'drop_column': {
                    const selectEl = document.getElementById('param-column_name');
                    const cols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                    parametros = { column_name: cols };
                    descricao = `Remover: ${cols.join(', ')}`;
                    break;
                }
                case 'change_case':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value || '',
                        case: document.getElementById('param-case')?.value || ''
                    };
                    descricao = `Mudar case de '${parametros.column_name}' para ${parametros.case}`;
                    break;
                case 'change_column_type':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value || '',
                        new_type: document.getElementById('param-new_type')?.value || ''
                    };
                    descricao = `Mudar tipo de '${parametros.column_name}' para ${parametros.new_type}`;
                    break;
                case 'replace_values':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value || '',
                        value_to_replace: document.getElementById('param-value_to_replace')?.value || '',
                        new_value: document.getElementById('param-new_value')?.value || ''
                    };
                    descricao = `Substituir '${parametros.value_to_replace}' por '${parametros.new_value}' em '${parametros.column_name}'`;
                    break;
                case 'add_new_column':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value || '',
                        default_value: document.getElementById('param-default_value')?.value || ''
                    };
                    descricao = `Nova coluna '${parametros.column_name}' com valor '${parametros.default_value}'`;
                    break;
                case 'filter_rows_by_value':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value || '',
                        value: document.getElementById('param-value')?.value || ''
                    };
                    descricao = `Filtrar linhas onde '${parametros.column_name}' = '${parametros.value}'`;
                    break;
                case 'extract_from_date':
                    parametros = { column_name: document.getElementById('param-column_name')?.value || '' };
                    descricao = `Extrair partes da data de '${parametros.column_name}'`;
                    break;
                case 'split_by_delimiter':
                    parametros = {
                        column_name: document.getElementById('param-column_name')?.value || '',
                        delimiter: document.getElementById('param-delimiter')?.value || '',
                        new_column_names: (document.getElementById('param-new_column_names')?.value || '').split(',').map(s => s.trim()).filter(s => s)
                    };
                    descricao = `Separar '${parametros.column_name}' por '${parametros.delimiter}'`;
                    break;
                case 'conditional_column': {
                    try {
                        parametros = {
                            new_column_name: document.getElementById('param-new_column_name')?.value || '',
                            base_column: document.getElementById('param-base_column')?.value || '',
                            default_value: document.getElementById('param-default_value')?.value || '',
                            conditions: JSON.parse(document.getElementById('param-conditions')?.value || '[]')
                        };
                    } catch (e) {
                        alert('JSON inválido nas Condições: ' + e.message);
                        return;
                    }
                    descricao = `Nova coluna condicional '${parametros.new_column_name}'`;
                    break;
                }
                case 'group_by': {
                    try {
                        const selectEl = document.getElementById('param-group_by_columns');
                        const groupCols = selectEl ? Array.from(selectEl.selectedOptions).map(opt => opt.value) : [];
                        const aggs = JSON.parse(document.getElementById('param-aggregations')?.value || '{}');
                        parametros = {
                            group_by_columns: groupCols,
                            aggregations: aggs
                        };
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
            alert("Erro: " + e.message);
        }
    });

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

    applyAllBtn.addEventListener('click', () => aplicarEProcessar(false));
    btnAvancarLoading.addEventListener('click', () => aplicarEProcessar(true));

    saveMacroBtnTrigger.addEventListener('click', () => {
        if (passosAplicados.length === 0) {
            alert('Adicione pelo menos um passo à lista antes de salvar.');
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

        if (macros.find(m => m.name.toLowerCase() === nome.toLowerCase())) {
            alert('Já existe uma macro com esse nome. Use outro nome.');
            return;
        }

        const novaMacro = {
            id: Date.now(),
            name: nome,
            description: descricao,
            steps: passosAplicados
        };

        macros.push(novaMacro);
        saveMacrosToStorage(macros);
        renderizarListaMacros();
        saveMacroModal.hide();
    });

    macroListContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('delete-macro-btn')) {
            const macroId = parseInt(target.dataset.id);
            if (isNaN(macroId)) return;
            if (confirm('Deseja realmente deletar essa macro?')) {
                let macros = getMacrosFromStorage();
                macros = macros.filter(m => m.id !== macroId);
                saveMacrosToStorage(macros);
                renderizarListaMacros();
            }
            return;
        }

        let li = target.closest('li.macro-list-item');
        if (li) {
            const macroId = parseInt(li.dataset.id);
            if (isNaN(macroId)) return;

            const macros = getMacrosFromStorage();
            const macro = macros.find(m => m.id === macroId);
            if (macro) {
                passosAplicados = macro.steps;
                renderizarListaPassos();
                sessionStorage.setItem('passosAplicados', JSON.stringify(passosAplicados));
                alert(`A lista de transformações da sua macro "${macro.name}" foi adicionada com sucesso! \n\nClique em "Aplicar e visualizar" para ver os resultados.`);
            }
        }
    });

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

    renderizarListaMacros();

    document.getElementById('row-limit-select').addEventListener('change', () => {
        const rowLimit = parseInt(document.getElementById('row-limit-select')?.value || '-1');
        spinner.style.display = 'block';

        fetch(applyTransformUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify({ steps: passosAplicados })
        })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const rows = rowLimit !== -1 ? data.rows.slice(0, rowLimit) : data.rows;
                renderizarTabela(data.headers, rows);
            } else {
                alert('Erro: ' + data.error);
            }
        })
        .catch(err => alert('Erro: ' + err.message))
        .finally(() => spinner.style.display = 'none');
    });

    const dataSearchInput = document.getElementById('data-search-input');

    function filtrarTabelaPorTexto(texto) {
        texto = texto.trim().toLowerCase();
        const tabela = tableContainer.querySelector('table');
        if (!tabela) return;

        const linhas = tabela.querySelectorAll('tbody tr');
        linhas.forEach(linha => {
            const conteudoLinha = linha.textContent.toLowerCase();
            linha.style.display = conteudoLinha.includes(texto) ? '' : 'none';
        });
    }

    let debounceTimeout;
    if (dataSearchInput) {
        dataSearchInput.addEventListener('input', () => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                filtrarTabelaPorTexto(dataSearchInput.value);
            }, 100);
        });
    }

});