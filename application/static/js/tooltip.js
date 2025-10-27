

const TooltipService = (() => {

    
    const OPERATION_TOOLTIPS = {
        'drop_null_rows': 'Remove todas as linhas que contêm valores nulos (vazios) nas colunas especificadas (ou em todas).',
        'drop_duplicates': 'Remove linhas inteiras que são duplicatas exatas de outras linhas, com base nas colunas especificadas (ou em todas).',
        'drop_column': 'Apaga uma ou mais colunas selecionadas da sua tabela.',
        'remove_rows_by_value': 'Remove todas as linhas onde a coluna selecionada contém um dos valores exatos que você listar.',
        'filter_rows_by_value': 'Mantém apenas as linhas onde a coluna selecionada contém um dos valores que você listar.',
        'sort_column': 'Ordena a tabela inteira com base nos valores da(s) coluna(s) selecionada(s).',
        'change_case': 'Converte o texto da coluna selecionada para MAIÚSCULAS, minúsculas ou Primeira Letra Maiúscula (Título).',
        'change_column_type': 'Força a conversão da coluna para um novo tipo.',
        'replace_values': 'Encontra um valor específico em uma coluna e o substitui por um novo valor.',
        'trim_spaces': 'Remove espaços em branco desnecessários do início e do fim do texto.',
        'add_prefix': 'Adiciona um prefixo fixo aos valores existentes na coluna selecionada.',
        'add_suffix': 'Adiciona um sufixo fixo aos valores existentes na coluna selecionada.',
        'rename_column': 'Altera o nome de uma coluna existente para um novo nome fornecido.',
        'add_new_column': 'Adiciona uma nova coluna ao final da tabela com um valor padrão fixo para todas as linhas.',
        'split_by_delimiter': 'Divide o texto de uma coluna em várias novas colunas com base em um separador.',
        'merge_columns': 'Une o texto de duas ou mais colunas em uma única nova coluna, usando um separador.',
        'duplicate_column': 'Cria uma cópia exata de uma coluna existente, dando a ela um novo nome (ou gerando um nome automaticamente).',
        'extract_from_date': 'Lê uma coluna de data e cria novas colunas separadas para Ano, Mês e Dia.',
        'conditional_column': 'Cria uma nova coluna onde o valor de cada linha é baseado em regras lógicas.',
        'split_date_time': 'Divide uma coluna que contém data e hora em duas colunas separadas: uma para a data e outra para a hora.',
        'group_by': 'Agrupa todas as linhas que têm valores iguais e permite calcular agregações para cada grupo.'
    };

    function applyToOptions(selectElementId) {
        try {
            const selectEl = document.getElementById(selectElementId);
            if (!selectEl) {
                console.warn(`TooltipService: Elemento '${selectElementId}' não encontrado.`);
                return;
            }

            const options = selectEl.querySelectorAll('option');

            options.forEach(option => {
                const operacao = option.value;
                const descricao = OPERATION_TOOLTIPS[operacao];
                
                if (descricao) {
                    
                    option.title = descricao;
                }
            });
        } catch (e) {
            console.error("Erro ao aplicar tooltips nativos:", e);
        }
    }

    return {
        applyNativeTooltips: applyToOptions
    };

})(); 